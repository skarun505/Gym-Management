import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Admin client — uses service role key (auto-available in Edge Functions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Regular client — verifies the calling user via their JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // 1. Verify caller is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify caller is super_admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only super admins can create gyms' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse request body
    const { gymName, ownerName, email, password, phone, address, plan, themeColor } = await req.json();

    if (!gymName || !ownerName || !email || !password) {
      return new Response(JSON.stringify({ error: 'gymName, ownerName, email, password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Generate gym code
    const prefix = gymName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const gymCode = `GYM_${prefix}${suffix}`;

    // 5. Create Supabase auth user (admin operation — works with service role key)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Create gym row
    const { data: gym, error: gymError } = await supabaseAdmin
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
      .select()
      .single();

    if (gymError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: gymError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Create profile for gym owner
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        gym_id: gym.id,
        full_name: ownerName,
        role: 'gym_owner',
        status: 'active',
      });

    if (profileError) {
      // Rollback both
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('gyms').delete().eq('id', gym.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 8. Seed default subscription plans
    await supabaseAdmin.from('subscription_plans').insert([
      { gym_id: gym.id, plan_name: 'Monthly Basic', duration: 'monthly', price: 999 },
      { gym_id: gym.id, plan_name: 'Quarterly', duration: 'quarterly', price: 2499 },
      { gym_id: gym.id, plan_name: 'Annual', duration: 'yearly', price: 7999 },
    ]);

    // 9. Return success + credentials
    return new Response(
      JSON.stringify({
        success: true,
        gym: { id: gym.id, name: gym.name, gymCode: gym.gym_code },
        credentials: { email, password, gymCode: gym.gym_code, gymName: gym.name },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
