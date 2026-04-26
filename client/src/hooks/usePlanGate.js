import useAuthStore from '../store/authStore';

// ── Plan tier definitions ─────────────────────────────────────────────────────
export const PLAN_CONFIG = {
  trial: {
    label:      'Trial',
    price:      0,
    color:      'amber',
    maxMembers: 50,
    maxStaff:   1,
    features: {
      revenue:       true,   // trial gets full pro access to hook them
      reports:       true,
      inventory:     true,
      announcements: true,
      memberPortal:  true,
      staff:         true,
    },
  },
  starter: {
    label:      'Starter',
    price:      499,
    color:      'blue',
    maxMembers: 100,
    maxStaff:   1,
    features: {
      revenue:       false,
      reports:       false,
      inventory:     false,
      announcements: false,
      memberPortal:  false,
      staff:         false,
    },
  },
  pro: {
    label:      'Pro',
    price:      999,
    color:      'violet',
    maxMembers: 300,
    maxStaff:   5,
    features: {
      revenue:       true,
      reports:       true,
      inventory:     true,
      announcements: true,
      memberPortal:  true,
      staff:         true,
    },
  },
  elite: {
    label:      'Elite',
    price:      1999,
    color:      'amber',
    maxMembers: 999999,
    maxStaff:   999,
    features: {
      revenue:       true,
      reports:       true,
      inventory:     true,
      announcements: true,
      memberPortal:  true,
      staff:         true,
      prioritySupport: true,
    },
  },
};

// ── Which features are locked at each tier (for upgrade messaging) ────────────
export const FEATURE_LABELS = {
  revenue:       { label: 'Revenue & Finance',   requiredPlan: 'pro' },
  reports:       { label: 'Reports & Export',    requiredPlan: 'pro' },
  inventory:     { label: 'Inventory',           requiredPlan: 'pro' },
  announcements: { label: 'Announcements',       requiredPlan: 'pro' },
  memberPortal:  { label: 'Member Portal',       requiredPlan: 'pro' },
  staff:         { label: 'Staff Management',    requiredPlan: 'pro' },
  prioritySupport: { label: 'Priority Support',  requiredPlan: 'elite' },
};

// ── Main hook ─────────────────────────────────────────────────────────────────
export function usePlanGate() {
  const { user } = useAuthStore();
  const plan    = user?.gym?.plan || 'starter';
  const config  = PLAN_CONFIG[plan] || PLAN_CONFIG.starter;

  // Check if trial has expired
  const planExpiresAt = user?.gym?.plan_expires_at;
  const isExpired = plan === 'trial' && planExpiresAt
    ? new Date(planExpiresAt) < new Date()
    : false;

  // If trial expired, treat as starter
  const effectivePlan   = isExpired ? 'starter' : plan;
  const effectiveConfig = PLAN_CONFIG[effectivePlan] || PLAN_CONFIG.starter;

  const canAccess = (feature) => {
    return effectiveConfig.features[feature] ?? false;
  };

  const isAtMemberLimit = (currentCount) => {
    return currentCount >= effectiveConfig.maxMembers;
  };

  const isAtStaffLimit = (currentCount) => {
    return currentCount >= effectiveConfig.maxStaff;
  };

  // Days remaining for trial
  const trialDaysLeft = (plan === 'trial' && planExpiresAt)
    ? Math.max(0, Math.ceil((new Date(planExpiresAt) - new Date()) / 86400000))
    : null;

  // Days until paid plan expires
  const planDaysLeft = (plan !== 'trial' && planExpiresAt)
    ? Math.max(0, Math.ceil((new Date(planExpiresAt) - new Date()) / 86400000))
    : null;

  return {
    plan:          effectivePlan,
    planLabel:     effectiveConfig.label,
    planPrice:     effectiveConfig.price,
    planColor:     effectiveConfig.color,
    maxMembers:    effectiveConfig.maxMembers,
    maxStaff:      effectiveConfig.maxStaff,
    isTrialExpired: isExpired,
    trialDaysLeft,
    planDaysLeft,
    canAccess,
    isAtMemberLimit,
    isAtStaffLimit,
    config:        effectiveConfig,
  };
}
