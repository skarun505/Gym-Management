import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * create-member-login
 * Invites an existing member by email — no password is ever set by
 * staff/gym_owner; the member picks their own via the invite link
 * (client/src/pages/Auth/SetPasswordPage.jsx).
 * Body: { memberId: string, email?: string, redirectTo?: string }
 * `email` is only needed if the member has none on file yet — it's
 * saved onto the member row before inviting.
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
    const { memberId, email: emailInput, redirectTo } = await req.json();
    if (!memberId) return json({ error: 'memberId is required' }, 400);

    const { data: member, error: memberErr } = await admin
      .from('members')
      .select('id, full_name, email, phone, gym_id, profile_id, member_code')
      .eq('id', memberId).eq('gym_id', gymId).single();

    if (memberErr || !member) return json({ error: 'Member not found or access denied' }, 404);

    // Member has no email on file yet, but one was provided in this
    // call (e.g. typed into the "Create Login" form) — save it before
    // inviting, so it's consistent with what actually gets invited.
    if (!member.email && emailInput?.trim()) {
      const { error: emailUpdateErr } = await admin
        .from('members').update({ email: emailInput.trim() }).eq('id', memberId);
      if (emailUpdateErr) return json({ error: 'Could not save member email: ' + emailUpdateErr.message }, 400);
      member.email = emailInput.trim();
    }

    if (!member.email) return json({ error: 'Member has no email address. Please add one to send a login invite.' }, 400);

    // ── Check-and-resume ──
    // members.profile_id is set as soon as the invite is sent (before
    // the profiles row exists), so a crash between those two steps is
    // resumable: profile_id is set but no matching profiles row
    // exists yet. That state finishes here without sending a second
    // invite; a fully-linked member (profile_id + matching profiles
    // row) short-circuits with the original 409.
    if (member.profile_id) {
      const { data: existingProfile } = await admin
        .from('profiles').select('id').eq('id', member.profile_id).maybeSingle();

      if (existingProfile) {
        // Fully provisioned in our DB — but has the member actually
        // accepted the invite yet? If not, calling this again is a
        // legitimate resend, not an error.
        const { data: memberAuth } = await admin.auth.admin.getUserById(member.profile_id);
        if (memberAuth?.user?.email_confirmed_at) {
          return json({ error: 'This member already has a login account', alreadyExists: true }, 409);
        }

        const { error: resendErr } = await admin.auth.admin.inviteUserByEmail(member.email, {
          redirectTo: redirectTo || undefined,
        });
        if (!resendErr) {
          return json({ success: true, invited: true, resent: true, memberName: member.full_name, memberCode: member.member_code, email: member.email });
        }

        // Supabase rejects a second inviteUserByEmail for an existing
        // unconfirmed user — fall back to a fresh link.
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: 'invite', email: member.email, options: { redirectTo: redirectTo || undefined },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          return json({ error: resendErr.message || 'Could not resend invite' }, 500);
        }
        return json({
          success: true, invited: true, resent: false,
          manualLink: linkData.properties.action_link,
          memberName: member.full_name, memberCode: member.member_code, email: member.email,
        });
      }

      const { error: resumeProfileErr } = await admin.from('profiles').insert({
        id: member.profile_id, gym_id: gymId, full_name: member.full_name, role: 'member', status: 'active',
      });
      if (resumeProfileErr) throw new Error('Profile creation failed: ' + resumeProfileErr.message);

      return json({
        success: true,
        resumed: true,
        memberName: member.full_name,
        memberCode: member.member_code,
        email: member.email,
        profileId: member.profile_id,
      });
    }

    const { data: authData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(member.email, {
      redirectTo: redirectTo || undefined,
      data: { full_name: member.full_name },
    });

    if (inviteErr) {
      if (inviteErr.message.includes('already registered') || inviteErr.message.includes('already exists')) {
        return json({ error: `Email "${member.email}" is already registered. Use a different email or resend their invite.` }, 409);
      }
      throw new Error(inviteErr.message);
    }

    const newUserId = authData.user.id;

    // Link immediately — this is what makes the next retry resumable
    // instead of erroring on "already registered" with nothing to
    // resume from. No rollback on later failure: the member row now
    // points at a real (if not yet fully set up) auth account, and a
    // retried call will finish the job via the profile_id branch above.
    const { error: linkErr } = await admin.from('members').update({ profile_id: newUserId }).eq('id', memberId);
    if (linkErr) throw new Error('Failed to link profile: ' + linkErr.message);

    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId, gym_id: gymId, full_name: member.full_name, role: 'member', status: 'active',
    });
    if (profileErr) throw new Error('Profile creation failed: ' + profileErr.message);

    return json({
      success: true,
      invited: true,
      memberName: member.full_name,
      memberCode: member.member_code,
      email: member.email,
      profileId: newUserId,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: msg }, 500);
  }
});
