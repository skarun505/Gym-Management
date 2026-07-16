import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gympro.app';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Base64url helpers
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Build VAPID JWT
async function buildVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now    = Math.floor(Date.now() / 1000);
  const payload = {
    aud: new URL(audience).origin,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const enc = (obj: object) =>
    uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${enc(header)}.${enc(payload)}`;

  const privKey = await crypto.subtle.importKey(
    'raw',
    base64urlToUint8Array(VAPID_PRIVATE),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
}

// Send push to a single subscription endpoint
async function sendPush(
  endpoint: string,
  p256dh: string,
  authKey: string,
  payload: { title: string; body: string; icon?: string; badge?: string; data?: object }
): Promise<boolean> {
  try {
    const vapidJwt   = await buildVapidJwt(endpoint);
    const authHeader = `vapid t=${vapidJwt},k=${VAPID_PUBLIC}`;

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization':  authHeader,
        'Content-Type':   'application/octet-stream',
        'TTL':            '86400',
        'Content-Length': String(payloadBytes.length),
      },
      body: payloadBytes,
    });

    if (res.status === 201 || res.status === 200) return true;
    if (res.status === 410 || res.status === 404) {
      // Subscription expired — remove it
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
    console.warn('Push failed:', res.status, await res.text());
    return false;
  } catch (e) {
    console.error('Push send error:', e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // No platform-level restriction gates this endpoint, so it must check
  // the caller itself — otherwise anyone holding the public anon key
  // could push arbitrary notification content to any gym's members.
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return new Response('Unauthorized', { status: 401 });

  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !caller) return new Response('Invalid token', { status: 401 });

  const { data: callerProfile } = await supabase
    .from('profiles').select('role, gym_id').eq('id', caller.id).single();
  const callerRole = callerProfile?.role ?? '';
  if (!['gym_owner', 'staff', 'super_admin'].includes(callerRole)) {
    return new Response('Forbidden', { status: 403 });
  }

  let body: {
    gym_id?: string;
    member_id?: string;
    profile_id?: string;
    title: string;
    body: string;
    icon?: string;
    data?: object;
  };

  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  if (!body.title || !body.body) {
    return new Response('title and body required', { status: 400 });
  }

  // Find target subscriptions
  let query = supabase.from('push_subscriptions').select('*');
  if (body.profile_id) query = query.eq('profile_id', body.profile_id);
  else if (body.member_id) {
    // Get profile_id from member
    const { data: m } = await supabase
      .from('members').select('profile_id').eq('id', body.member_id).single();
    if (m?.profile_id) query = query.eq('profile_id', m.profile_id);
  } else if (body.gym_id) {
    query = query.eq('gym_id', body.gym_id);
  } else {
    return new Response('Provide gym_id, member_id, or profile_id', { status: 400 });
  }

  const { data: subs } = await query;
  if (!subs?.length) {
    return new Response(JSON.stringify({ success: true, sent: 0, message: 'No push subscriptions found' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = {
    title: body.title,
    body:  body.body,
    icon:  body.icon  || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data:  body.data  || {},
  };

  let sent = 0;
  for (const sub of subs) {
    const ok = await sendPush(sub.endpoint, sub.p256dh, sub.auth, payload);
    if (ok) sent++;
  }

  return new Response(JSON.stringify({ success: true, sent, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
