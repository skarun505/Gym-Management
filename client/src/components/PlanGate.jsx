import { X, Lock, Zap, Star, Crown, Check, ArrowRight, MessageCircle } from 'lucide-react';
import { PLAN_CONFIG } from '../hooks/usePlanGate';

// ── Upgrade contact links (update these to your own) ─────────────────────────
const WHATSAPP_LINK = 'https://wa.me/919585495862?text=Hi%2C%20I%20want%20to%20upgrade%20my%20gym%20plan';
const EMAIL_LINK    = 'mailto:support@gympro.in?subject=Plan%20Upgrade%20Request';

// ── Plan Icons ────────────────────────────────────────────────────────────────
const PLAN_ICONS = {
  starter: Zap,
  pro:     Star,
  elite:   Crown,
};

const PLAN_GRADIENTS = {
  starter: 'from-blue-600 to-cyan-500',
  pro:     'from-violet-600 to-purple-500',
  elite:   'from-amber-500 to-orange-500',
};

// ── Feature list per plan (for display) ──────────────────────────────────────
const PLAN_HIGHLIGHTS = {
  starter: ['Up to 100 members', '1 Staff account', 'Attendance & Subscriptions', 'Basic dashboard'],
  pro:     ['Up to 300 members', '5 Staff accounts', 'Revenue & Finance', 'Reports & Export', 'Inventory', 'Announcements', 'Member Portal app'],
  elite:   ['Unlimited members', 'Unlimited Staff', 'Everything in Pro', 'Priority Support', 'WhatsApp Reminders (coming)'],
};

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
export function UpgradeModal({ feature, currentPlan, onClose }) {
  const featureLabel = feature
    ? {
        revenue:       'Revenue & Finance',
        reports:       'Reports & Export',
        inventory:     'Inventory Management',
        announcements: 'Announcements',
        memberPortal:  'Member Portal',
        staff:         'Staff Management',
        members:       'Member Limit Reached',
      }[feature] || feature
    : null;

  const plans = ['pro', 'elite'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Upgrade Your Plan</h2>
              {featureLabel && (
                <p className="text-gray-500 text-sm mt-0.5">
                  <span className="text-violet-400 font-medium">{featureLabel}</span> requires a higher plan
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current plan */}
          <div className="bg-dark-700/60 border border-white/8 rounded-xl p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <p className="text-gray-400 text-sm">
              You are on the <span className="text-white font-semibold capitalize">{currentPlan}</span> plan
              {currentPlan === 'starter' && <span className="text-gray-500"> · ₹499/mo</span>}
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((planKey, i) => {
              const config   = PLAN_CONFIG[planKey];
              const Icon     = PLAN_ICONS[planKey];
              const gradient = PLAN_GRADIENTS[planKey];
              const isRecommended = planKey === 'pro';

              return (
                <div
                  key={planKey}
                  className={`relative rounded-2xl border p-5 space-y-4 transition-all ${
                    isRecommended
                      ? 'border-violet-500/50 bg-violet-500/8'
                      : 'border-white/10 bg-dark-700/40'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                        ⭐ MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{config.label}</p>
                      <p className="text-2xl font-bold text-white">
                        ₹{config.price.toLocaleString('en-IN')}
                        <span className="text-gray-500 text-sm font-normal">/mo</span>
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {PLAN_HIGHLIGHTS[planKey].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp to Upgrade
            </a>
            <a
              href={EMAIL_LINK}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Email us to Upgrade
            </a>
            <p className="text-center text-gray-600 text-xs">
              We'll activate your plan within minutes of payment confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Plan Badge ────────────────────────────────────────────────────────────────
export function PlanBadge({ plan, small = false }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.starter;
  const Icon   = PLAN_ICONS[plan] || Zap;

  const colors = {
    starter: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    pro:     'bg-violet-500/15 text-violet-300 border-violet-500/30',
    elite:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
    trial:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };

  if (small) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${colors[plan] || colors.starter}`}>
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors[plan] || colors.starter}`}>
      <Icon className="w-4 h-4" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider">{config.label} Plan</p>
        {config.price > 0 && (
          <p className="text-[10px] opacity-70">₹{config.price}/month</p>
        )}
      </div>
    </div>
  );
}

// ── Locked Feature Wrapper ────────────────────────────────────────────────────
// Wraps any page — if access denied, shows a full upgrade prompt instead
export function LockedPage({ feature, plan, children }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.starter;
  const hasAccess = config.features[feature] ?? false;
  if (hasAccess) return children;

  return <UpgradeWall feature={feature} currentPlan={plan} />;
}

// ── Full-page upgrade wall ────────────────────────────────────────────────────
export function UpgradeWall({ feature, currentPlan }) {
  const featureLabel = {
    revenue:       'Revenue & Finance',
    reports:       'Reports & Export',
    inventory:     'Inventory Management',
    announcements: 'Announcements',
    memberPortal:  'Member Portal',
    staff:         'Staff Management',
  }[feature] || 'This Feature';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      {/* Lock icon */}
      <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Lock className="w-9 h-9 text-violet-400" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white">{featureLabel}</h2>
        <p className="text-gray-400 mt-2 max-w-md">
          This feature is available on the <span className="text-violet-400 font-semibold">Pro</span> and{' '}
          <span className="text-amber-400 font-semibold">Elite</span> plans.
          Upgrade to unlock it for your gym.
        </p>
      </div>

      {/* Pill showing current plan */}
      <PlanBadge plan={currentPlan} />

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <MessageCircle className="w-4 h-4" />
          Upgrade via WhatsApp
        </a>
        <a
          href={EMAIL_LINK}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          Email Us
        </a>
      </div>

      <p className="text-gray-600 text-xs">
        Pro — ₹999/mo &nbsp;·&nbsp; Elite — ₹1,999/mo &nbsp;·&nbsp; Activated within minutes
      </p>
    </div>
  );
}
