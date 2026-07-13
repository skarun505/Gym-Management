import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL     = 'GymPro <onboarding@resend.dev>'; // Default Resend domain — works immediately, no custom domain needed

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Email Templates ──────────────────────────────────────────────
function expiryTemplate(memberName: string, gymName: string, daysLeft: number, planName: string, endDate: string) {
  const urgencyColor = daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f97316' : '#f59e0b';
  const urgencyLabel = daysLeft <= 1 ? '🚨 Expires TOMORROW' : daysLeft <= 3 ? '⚠️ Expiring in 3 Days' : '📅 Expiring in 7 Days';
  return {
    subject: `${urgencyLabel} — ${gymName} Membership`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#a21cce,#7c3aed);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;margin-bottom:8px;">🏋️</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${gymName}</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Membership Renewal Reminder</p>
    </div>
    <!-- Card -->
    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
      <p style="color:#9ca3af;font-size:14px;margin:0 0 6px;">Hello,</p>
      <h2 style="color:#fff;font-size:18px;margin:0 0 16px;">${memberName} 👋</h2>
      <!-- Alert box -->
      <div style="background:${urgencyColor}18;border:1px solid ${urgencyColor}44;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:${urgencyColor};font-size:22px;font-weight:700;margin:0 0 4px;">${urgencyLabel}</p>
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Your <strong style="color:#fff;">${planName}</strong> membership ends on <strong style="color:#fff;">${endDate}</strong></p>
      </div>
      ${daysLeft <= 1 ? '<p style="color:#ef4444;font-weight:600;font-size:14px;text-align:center;margin-bottom:16px;">⏰ This is your final reminder! Renew today to avoid interruption.</p>' : ''}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">Visit the gym or contact your trainer to renew your membership and continue your fitness journey without any break.</p>
    </div>
    <!-- Footer -->
    <p style="color:#374151;font-size:11px;text-align:center;margin-top:20px;">Sent by ${gymName} via GymPro · Manage notifications in your member portal</p>
  </div>
</body></html>`
  };
}

function birthdayTemplate(memberName: string, gymName: string) {
  return {
    subject: `🎂 Happy Birthday ${memberName}! — ${gymName}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#a21cce,#ec4899);border-radius:16px;padding:32px;text-align:center;">
      <div style="font-size:56px;margin-bottom:12px;">🎂🎉</div>
      <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:800;">Happy Birthday!</h1>
      <h2 style="color:rgba(255,255,255,0.9);margin:0 0 16px;font-size:20px;font-weight:600;">${memberName}</h2>
      <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:16px;">
        <p style="color:rgba(255,255,255,0.9);font-size:14px;line-height:1.6;margin:0;">
          Wishing you a wonderful birthday from all of us at <strong>${gymName}</strong>! 💪<br><br>
          Keep crushing your fitness goals — you're an inspiration to us all!
        </p>
      </div>
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:16px 0 0;">With love from your gym family 🏋️</p>
    </div>
  </div>
</body></html>`
  };
}

function welcomeTemplate(memberName: string, gymName: string, memberCode: string, ownerPhone: string) {
  return {
    subject: `Welcome to ${gymName}! 🏋️ Your membership is active`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">💪</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Welcome to ${gymName}!</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Your fitness journey starts today</p>
    </div>
    <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
      <p style="color:#fff;font-size:16px;font-weight:600;margin:0 0 16px;">Hello ${memberName}! 👋</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">We're thrilled to have you as a member. Your membership has been successfully activated.</p>
      <!-- Member ID card -->
      <div style="background:#0f0f17;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Your Member ID</p>
        <p style="color:#a21cce;font-size:22px;font-weight:800;font-family:monospace;margin:0;">${memberCode}</p>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">📞 Gym Contact: <span style="color:#d1d5db;">${ownerPhone || 'Available at reception'}</span></p>
        <p style="color:#6b7280;font-size:13px;margin:0;">🏋️ Gym: <span style="color:#d1d5db;">${gymName}</span></p>
      </div>
    </div>
    <p style="color:#374151;font-size:11px;text-align:center;margin-top:20px;">Welcome aboard! See you in the gym 💪</p>
  </div>
</body></html>`
  };
}

// ── Send via Resend ───────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return false;
  }
  if (!to || !to.includes('@')) {
    console.warn('Invalid email address:', to);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error('Resend error:', json);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Email send failed:', e);
    return false;
  }
}

// ── Log notification (with dedup check) ──────────────────────────
async function logNotification(
  gymId: string,
  memberId: string,
  type: string,
  channel: string,
  subject: string,
  status: string,
  error?: string
) {
  await supabase.from('notification_logs').insert({
    gym_id: gymId, member_id: memberId,
    type, channel, subject, status,
    error_msg: error || null,
  }).onConflict('member_id, type, channel, sent_date').ignore();
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const today      = new Date().toISOString().split('T')[0];
  const in1day     = new Date(Date.now() + 1  * 86400000).toISOString().split('T')[0];
  const in3days    = new Date(Date.now() + 3  * 86400000).toISOString().split('T')[0];
  const in7days    = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
  const todayMMDD  = today.slice(5); // MM-DD for birthday match

  // Check for specific member IDs passed (e.g. welcome trigger)
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const results: Record<string, any> = {
    expiry_1d: 0, expiry_3d: 0, expiry_7d: 0,
    birthdays: 0, welcome: 0, errors: 0,
  };

  // ── A. Expiry reminders ───────────────────────────────────────
  const expiryPoints = [
    { date: in1day,  type: 'expiry_1d', days: 1 },
    { date: in3days, type: 'expiry_3d', days: 3 },
    { date: in7days, type: 'expiry_7d', days: 7 },
  ];

  for (const { date, type, days } of expiryPoints) {
    const { data: subs } = await supabase
      .from('member_subscriptions')
      .select('id, member_id, gym_id, end_date, subscription_plans(plan_name), members(full_name, email), gyms(name, phone)')
      .eq('status', 'active')
      .eq('end_date', date);

    for (const sub of subs || []) {
      const member  = (sub as any).members;
      const gym     = (sub as any).gyms;
      const plan    = (sub as any).subscription_plans;
      const email   = member?.email;
      if (!email) continue;

      // Check dedup
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('member_id', sub.member_id)
        .eq('type', type)
        .eq('channel', 'email')
        .eq('sent_date', today)
        .maybeSingle();
      if (existing) continue;

      const tpl    = expiryTemplate(member.full_name, gym.name, days, plan.plan_name, sub.end_date);
      const ok     = await sendEmail(email, tpl.subject, tpl.html);
      await logNotification(sub.gym_id, sub.member_id, type, 'email', tpl.subject, ok ? 'sent' : 'failed');
      if (ok) results[type as keyof typeof results] = (results[type as keyof typeof results] as number) + 1;
      else results.errors++;
    }
  }

  // ── B. Birthday messages ──────────────────────────────────────
  const { data: birthdayMembers } = await supabase
    .from('members')
    .select('id, gym_id, full_name, email, dob, gyms(name)')
    .not('dob', 'is', null)
    .not('email', 'is', null)
    .eq('status', 'active');

  for (const m of birthdayMembers || []) {
    const dob = (m as any).dob as string;
    if (!dob) continue;
    const memberMMDD = dob.slice(5); // MM-DD
    if (memberMMDD !== todayMMDD) continue;

    const { data: existing } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('member_id', m.id)
      .eq('type', 'birthday')
      .eq('channel', 'email')
      .eq('sent_date', today)
      .maybeSingle();
    if (existing) continue;

    const gym = (m as any).gyms;
    const tpl  = birthdayTemplate(m.full_name, gym.name);
    const ok   = await sendEmail((m as any).email, tpl.subject, tpl.html);
    await logNotification(m.gym_id, m.id, 'birthday', 'email', tpl.subject, ok ? 'sent' : 'failed');
    if (ok) results.birthdays++;
    else results.errors++;
  }

  // ── C. Welcome email (triggered directly with member_id) ──────
  if (body.welcome && body.member_id) {
    const { data: m } = await supabase
      .from('members')
      .select('id, gym_id, full_name, email, member_code, gyms(name, phone)')
      .eq('id', body.member_id)
      .single();

    if (m && (m as any).email) {
      const gym = (m as any).gyms;
      const tpl = welcomeTemplate(m.full_name, gym.name, m.member_code, gym.phone || '');
      const ok  = await sendEmail((m as any).email, tpl.subject, tpl.html);
      await logNotification(m.gym_id, m.id, 'welcome', 'email', tpl.subject, ok ? 'sent' : 'failed');
      if (ok) results.welcome++;
      else results.errors++;
    }
  }

  console.log('Reminder run complete:', results);
  return new Response(JSON.stringify({ success: true, date: today, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
