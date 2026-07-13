import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * create-gym
 * super_admin-only. Creates a gym and invites the owner by email —
 * no password is ever set by an admin; the owner picks their own via
 * the invite link (client/src/pages/Auth/SetPasswordPage.jsx).
 * Idempotent: safe to retry. See resend-gym-invite for re-sending
 * the email to an owner who hasn't accepted yet.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Unauthorized' }, 401);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: 'Unauthorized: ' + (userError?.message || 'Invalid token') }, 401);
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single();

    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Only super admins can create gyms' }, 403);
    }

    const { gymName, ownerName, email, phone, address, plan, themeColor, redirectTo } = await req.json();

    if (!gymName || !ownerName || !email) {
      return json({ error: 'gymName, ownerName, email are required' }, 400);
    }

    // ── Check-and-resume: is this a retry of an earlier attempt? ──
    // gyms.email is unique, so it's the natural idempotency key.
    const { data: existingGym } = await supabaseAdmin
      .from('gyms')
      .select('id, gym_code, name, owner_auth_id')
      .eq('email', email)
      .maybeSingle();

    let gym = existingGym;

    if (!gym) {
      // Fresh attempt — create the gym row first. Everything after
      // this point can be resumed from the row itself on retry.
      const prefix = gymName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const gymCode = `GYM_${prefix}${suffix}`;

      const { data: newGym, error: gymError } = await supabaseAdmin
        .from('gyms')
        .insert({
          gym_code: gymCode,
          name: gymName,
          owner_name: ownerName,
          email,
          phone: phone || null,
          address: address || null,
          plan: plan || 'trial',
          theme_color: themeColor || '#a21cce',
        })
        .select('id, gym_code, name, owner_auth_id')
        .single();

      if (gymError) return json({ error: gymError.message }, 400);
      gym = newGym;
    }

    // Already fully provisioned? (owner_auth_id set + matching profile exists)
    if (gym.owner_auth_id) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles').select('id').eq('id', gym.owner_auth_id).maybeSingle();

      if (existingProfile) {
        return json({
          success: true,
          alreadyProvisioned: true,
          gym: { id: gym.id, name: gym.name, gymCode: gym.gym_code },
        });
      }
      // owner_auth_id set but no profile row — a prior attempt died
      // between inviting the owner and creating the profile. Fall
      // through and create the missing profile using that id.
    } else {
      // No auth user yet for this gym — invite the owner now. This
      // sends them an email with a link to set their own password;
      // no password is ever known to (or set by) this function.
      const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo || undefined,
        data: { full_name: ownerName },
      });

      if (inviteError) return json({ error: inviteError.message }, 400);

      const { error: linkError } = await supabaseAdmin
        .from('gyms')
        .update({ owner_auth_id: authData.user.id })
        .eq('id', gym.id);

      if (linkError) {
        // Invite went out but we couldn't record it — surface a
        // clear error instead of deleting the invited user (that's
        // what caused orphans before; the invite and gym row are
        // both left intact and a retry can resume once this
        // transient failure is fixed).
        return json({ error: 'Gym created but failed to link owner account: ' + linkError.message }, 500);
      }

      gym = { ...gym, owner_auth_id: authData.user.id };
    }

    // Create profile for gym owner (resumed path lands here too)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: gym.owner_auth_id,
        gym_id: gym.id,
        full_name: ownerName,
        role: 'gym_owner',
        status: 'active',
      });

    if (profileError) return json({ error: profileError.message }, 400);

    // Seed default subscription plans — only if this gym doesn't have any yet
    const { count: planCount } = await supabaseAdmin
      .from('subscription_plans')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id);

    if (!planCount) {
      await supabaseAdmin.from('subscription_plans').insert([
        { gym_id: gym.id, plan_name: 'Monthly Basic', duration: 'monthly', price: 999 },
        { gym_id: gym.id, plan_name: 'Quarterly', duration: 'quarterly', price: 2499 },
        { gym_id: gym.id, plan_name: 'Annual', duration: 'yearly', price: 7999 },
      ]);
    }

    return json({
      success: true,
      invited: true,
      gym: { id: gym.id, name: gym.name, gymCode: gym.gym_code },
      email,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: msg }, 500);
  }
});
