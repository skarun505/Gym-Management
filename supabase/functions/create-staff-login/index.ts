import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * create-staff-login
 * gym_owner-only. Invites an existing staff member by email — no
 * password is ever set by the owner; the staff member picks their own
 * via the invite link (client/src/pages/Auth/SetPasswordPage.jsx).
 * Body: { staff_id: string, email: string, full_name?: string, redirectTo?: string }
 * Doubles as resend: calling it again for a staff login that hasn't
 * accepted yet re-sends the invite instead of erroring. Recovered from
 * a live-only deployment (see Development guide.md) — converted from
 * admin-set passwords to invites in the same pass as create-gym /
 * create-member-login.
 */
Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const { data: callerProfile } = await callerClient
      .from('profiles').select('role, gym_id').eq('id', caller.id).single();
    if (callerProfile?.role !== 'gym_owner') {
      return json({ error: 'Only gym owners can create staff logins' }, 403);
    }

    const { staff_id, email, full_name, redirectTo } = await req.json();
    if (!staff_id || !email) return json({ error: 'staff_id and email are required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: staffRow } = await admin
      .from('staff').select('id, gym_id, profile_id, role, full_name').eq('id', staff_id).single();
    if (!staffRow || staffRow.gym_id !== callerProfile.gym_id) {
      return json({ error: 'Staff not found in your gym' }, 404);
    }

    const staffName = full_name || staffRow.full_name;

    // ── Check-and-resume ──
    if (staffRow.profile_id) {
      const { data: existingAuth } = await admin.auth.admin.getUserById(staffRow.profile_id);

      if (!existingAuth?.user) {
        // Auth user was deleted out from under us — clean up the
        // orphaned link and fall through to a fresh invite below.
        await admin.from('profiles').delete().eq('id', staffRow.profile_id);
        await admin.from('staff').update({ profile_id: null }).eq('id', staff_id);
      } else if (existingAuth.user.email_confirmed_at) {
        return json({ error: 'This staff member already has a login account', alreadyExists: true }, 409);
      } else {
        // Not yet accepted — this call is a legitimate resend.
        const { error: resendErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirectTo || undefined });
        if (!resendErr) return json({ success: true, invited: true, resent: true, userId: staffRow.profile_id, email });

        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: 'invite', email, options: { redirectTo: redirectTo || undefined },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          return json({ error: resendErr.message || 'Could not resend invite' }, 500);
        }
        return json({ success: true, invited: true, resent: false, manualLink: linkData.properties.action_link, userId: staffRow.profile_id, email });
      }
    }

    const { data: authData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: { full_name: staffName },
    });

    if (inviteErr) {
      if (inviteErr.message.includes('already registered') || inviteErr.message.includes('already exists')) {
        return json({ error: `Email "${email}" is already registered. Use a different email or resend their invite.` }, 409);
      }
      throw new Error(inviteErr.message);
    }

    const newUserId = authData.user.id;

    // Link immediately so a crash before the profile row is created is
    // resumable via the profile_id branch above, instead of orphaning
    // the invited auth user.
    const { error: linkErr2 } = await admin.from('staff').update({ profile_id: newUserId, email }).eq('id', staff_id);
    if (linkErr2) throw new Error('Failed to link profile: ' + linkErr2.message);

    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId, gym_id: callerProfile.gym_id, full_name: staffName,
      role: 'staff', sub_role: staffRow.role || 'staff', status: 'active',
    });
    if (profileErr) throw new Error('Profile creation failed: ' + profileErr.message);

    return json({ success: true, invited: true, userId: newUserId, email });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[create-staff-login] Error:', msg);
    return json({ error: msg }, 500);
  }
});
