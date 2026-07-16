import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * resend-gym-invite
 * super_admin-only. Re-sends the owner invite email for a gym whose
 * owner hasn't accepted it yet (invite links expire — configurable
 * in Supabase Dashboard → Authentication → Email → OTP/link expiry).
 * Body: { gymId: string, redirectTo?: string }
 */
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !caller) return json({ error: 'Invalid token' }, 401);

    const { data: callerProfile } = await admin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Only super admins can resend gym invites' }, 403);
    }

    const { gymId, redirectTo } = await req.json();
    if (!gymId) return json({ error: 'gymId is required' }, 400);

    const { data: gym, error: gymErr } = await admin
      .from('gyms').select('id, name, email, owner_auth_id').eq('id', gymId).single();
    if (gymErr || !gym) return json({ error: 'Gym not found' }, 404);
    if (!gym.owner_auth_id) return json({ error: 'This gym has no owner invite to resend — create it again instead' }, 400);

    const { data: ownerAuth, error: getUserErr } = await admin.auth.admin.getUserById(gym.owner_auth_id);
    if (getUserErr || !ownerAuth?.user) return json({ error: 'Owner account not found' }, 404);

    if (ownerAuth.user.email_confirmed_at) {
      return json({ error: 'This owner has already accepted their invite and set a password' }, 409);
    }

    // Try a normal invite resend first.
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(gym.email, {
      redirectTo: redirectTo || undefined,
    });

    if (!inviteErr) {
      await admin.from('audit_logs').insert({
        actor_id: caller.id, action: 'resend_gym_invite', target_gym_id: gymId, detail: { resent: true },
      });
      return json({ success: true, resent: true, email: gym.email });
    }

    // Supabase rejects a second inviteUserByEmail for an existing
    // (even unconfirmed) auth user — fall back to generating a fresh
    // link directly. This doesn't send an email by itself, so hand
    // the link back for the super_admin to share manually.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: gym.email,
      options: { redirectTo: redirectTo || undefined },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: inviteErr.message || 'Could not resend invite' }, 500);
    }

    await admin.from('audit_logs').insert({
      actor_id: caller.id, action: 'resend_gym_invite', target_gym_id: gymId, detail: { resent: false, manualLink: true },
    });

    return json({
      success: true,
      resent: false,
      manualLink: linkData.properties.action_link,
      email: gym.email,
      note: 'Automatic resend was not available for this account — share this link with the owner directly.',
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: msg }, 500);
  }
});
