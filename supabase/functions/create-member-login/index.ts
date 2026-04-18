import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * create-member-login
 * Provisions a Supabase Auth account for an existing member row.
 * Body: { memberId: string, password?: string }
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      .from('profiles').select('role, gym_id').eq('id', caller.id).single();

    if (!['gym_owner', 'staff'].includes(callerProfile?.role ?? '')) {
      return json({ error: 'Only gym owners and staff can create member logins' }, 403);
    }

    const gymId = callerProfile!.gym_id;
    const { memberId, password: customPassword } = await req.json();
    if (!memberId) return json({ error: 'memberId is required' }, 400);

    const { data: member, error: memberErr } = await admin
      .from('members')
      .select('id, full_name, email, phone, gym_id, profile_id, member_code')
      .eq('id', memberId).eq('gym_id', gymId).single();

    if (memberErr || !member) return json({ error: 'Member not found or access denied' }, 404);
    if (member.profile_id) return json({ error: 'This member already has a login account', alreadyExists: true }, 409);
    if (!member.email) return json({ error: 'Member has no email address. Please add an email first.' }, 400);

    const password = customPassword ||
      `Gym@${new Date().getFullYear()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;

    const { data: authData, error: authCreateErr } = await admin.auth.admin.createUser({
      email: member.email, password, email_confirm: true,
      user_metadata: { full_name: member.full_name },
    });

    if (authCreateErr) {
      if (authCreateErr.message.includes('already registered') || authCreateErr.message.includes('already exists')) {
        return json({ error: `Email "${member.email}" is already registered. Use a different email or reset their password.` }, 409);
      }
      throw new Error(authCreateErr.message);
    }

    const newUserId = authData.user.id;

    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId, gym_id: gymId, full_name: member.full_name, role: 'member', status: 'active',
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(newUserId);
      throw new Error('Profile creation failed: ' + profileErr.message);
    }

    const { error: linkErr } = await admin.from('members').update({ profile_id: newUserId }).eq('id', memberId);

    if (linkErr) {
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from('profiles').delete().eq('id', newUserId);
      throw new Error('Failed to link profile: ' + linkErr.message);
    }

    return json({
      success: true,
      memberName: member.full_name,
      memberCode: member.member_code,
      email: member.email,
      password,
      profileId: newUserId,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: msg }, 500);
  }
});
