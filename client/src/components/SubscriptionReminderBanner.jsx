import { useState } from 'react';
import { Bell, CheckCircle, X, AlertTriangle, Clock } from 'lucide-react';
import { markPaid } from '../utils/subscriptionReminders';
import toast from 'react-hot-toast';

// Config per tier
const TIER_CONFIG = {
  critical: {
    bg:    'bg-red-500/10 border-red-500/30',
    icon:  AlertTriangle,
    iconC: 'text-red-400',
    label: '⚠️ Expiring in < 24 hours',
    labelC: 'text-red-300',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
  },
  warning: {
    bg:    'bg-orange-500/10 border-orange-500/30',
    icon:  Clock,
    iconC: 'text-orange-400',
    label: '🔔 Expiring in 3 days',
    labelC: 'text-orange-300',
    badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  },
  caution: {
    bg:    'bg-amber-500/10 border-amber-500/30',
    icon:  Bell,
    iconC: 'text-amber-400',
    label: '📅 Expiring in 7 days',
    labelC: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
};

/**
 * SubscriptionReminderBanner
 * 
 * Props:
 *   items      — array from fetchExpiringSubscriptions()
 *   onPaid     — callback after marking paid (to refresh parent)
 *   compact    — boolean, show compact single-line version (for dashboard)
 */
export default function SubscriptionReminderBanner({ items, onPaid, compact = false }) {
  const [dismissing, setDismissing] = useState({});

  if (!items || items.length === 0) return null;

  // Group by tier
  const criticals = items.filter(i => i.tier === 'critical');
  const warnings  = items.filter(i => i.tier === 'warning');
  const cautions  = items.filter(i => i.tier === 'caution');

  const handleMarkPaid = async (subId, memberName) => {
    setDismissing(d => ({ ...d, [subId]: true }));
    const err = await markPaid(subId);
    if (err) {
      toast.error('Failed to mark as paid');
      setDismissing(d => ({ ...d, [subId]: false }));
    } else {
      toast.success(`${memberName} marked as paid ✓`);
      onPaid?.();
    }
  };

  // ── Compact (single banner for Dashboard) ────────────────
  if (compact) {
    const mostUrgent = criticals[0] || warnings[0] || cautions[0];
    if (!mostUrgent) return null;
    const cfg = TIER_CONFIG[mostUrgent.tier];
    const Icon = cfg.icon;
    const total = items.length;

    return (
      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${cfg.bg}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
          <Icon className={`w-4.5 h-4.5 ${cfg.iconC}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${cfg.labelC}`}>
            {total} subscription{total > 1 ? 's' : ''} need{total === 1 ? 's' : ''} attention
          </p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {items.map(i => `${i.memberName} (${i.daysLeft}d)`).join(' · ')}
          </p>
        </div>
        <a href="/subscriptions" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
          View →
        </a>
      </div>
    );
  }

  // ── Full reminder panel (for SubscriptionsPage) ───────────
  const renderGroup = (groupItems, tier) => {
    if (groupItems.length === 0) return null;
    const cfg = TIER_CONFIG[tier];
    const Icon = cfg.icon;

    return (
      <div key={tier} className={`rounded-2xl border p-4 space-y-3 ${cfg.bg}`}>
        {/* Group header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${cfg.iconC}`} />
          <p className={`font-semibold text-sm ${cfg.labelC}`}>
            {cfg.label} — {groupItems.length} member{groupItems.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Member rows */}
        {groupItems.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {item.memberName?.charAt(0) || '?'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{item.memberName}</p>
              <p className="text-gray-500 text-xs">
                {item.planName} · expires {new Date(item.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {(item.phone || item.email) && (
                <p className="text-gray-600 text-[11px] mt-0.5">{item.phone || item.email}</p>
              )}
            </div>

            {/* Days badge */}
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${cfg.badge}`}>
              {item.daysLeft <= 0 ? 'Today!' : item.daysLeft === 1 ? '<24h' : `${item.daysLeft}d`}
            </span>

            {/* Action: Mark as Paid */}
            <button
              onClick={() => handleMarkPaid(item.id, item.memberName)}
              disabled={!!dismissing[item.id]}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {dismissing[item.id]
                ? <div className="w-3 h-3 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                : <CheckCircle className="w-3 h-3" />}
              Paid
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderGroup(criticals, 'critical')}
      {renderGroup(warnings,  'warning')}
      {renderGroup(cautions,  'caution')}
    </div>
  );
}
