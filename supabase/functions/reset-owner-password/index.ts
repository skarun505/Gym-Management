import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is super_admin
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: { user: caller } } = await admin.auth.getUser(jwt);
    if (!caller) return json({ error: 'Invalid token' }, 401);

    const { data: callerProfile } = await admin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Only super admins can reset gym owner passwords' }, 403);
    }

    const { gymId, newPassword } = await req.json();
    if (!gymId || !newPassword) return json({ error: 'gymId and newPassword required' }, 400);
    if (newPassword.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    // Find gym_owner profile for this gym
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('gym_id', gymId)
      .eq('role', 'gym_owner')
      .single();

    if (!ownerProfile) return json({ error: 'No gym owner found for this gym' }, 404);

    // Update auth password via service role
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      ownerProfile.id,
      { password: newPassword }
    );
    if (updateErr) throw updateErr;

    return json({ success: true, ownerName: ownerProfile.full_name });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return json({ error: msg }, 500);
  }
});
