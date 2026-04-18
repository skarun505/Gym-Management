import { useEffect, useState } from 'react';
import { Plus, X, CreditCard, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { fetchExpiringSubscriptions } from '../../utils/subscriptionReminders';
import SubscriptionReminderBanner from '../../components/SubscriptionReminderBanner';

// ── Auto-compute end date from plan duration ─────────────────
function computeEndDate(startDate, duration) {
  const d = new Date(startDate);
  if (duration === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (duration === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (duration === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// ── Assign Plan Modal ─────────────────────────────────────────
function AssignModal({ plans, members, gymId, onClose, onSave }) {
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: { start_date: new Date().toISOString().split('T')[0] },
  });
  const planId = watch('plan_id');
  const startDate = watch('start_date');

  // Auto-fill end date when plan + start date change
  useEffect(() => {
    if (planId && startDate) {
      const plan = plans.find(p => p.id === planId);
      if (plan) setValue('end_date', computeEndDate(startDate, plan.duration));
    }
  }, [planId, startDate]);

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from('member_subscriptions').insert({
        gym_id: gymId,
        member_id: data.member_id,
        plan_id: data.plan_id,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes,
        status: 'active',
      });
      if (error) throw error;
      toast.success('Plan assigned!');
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Assign Plan to Member</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Member *</label>
            <select {...register('member_id', { required: true })} className="input-field">
              <option value="">Select member...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Plan *</label>
            <select {...register('plan_id', { required: true })} className="input-field">
              <option value="">Select plan...</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.plan_name} — ₹{p.price} ({p.duration})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input {...register('start_date', { required: true })} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input {...register('end_date', { required: true })} type="date" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : 'Assign Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Plan Modal ─────────────────────────────────────────
function PlanModal({ gymId, onClose, onSave }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from('subscription_plans').insert({
        gym_id: gymId,
        plan_name: data.plan_name,
        duration: data.duration,
        price: Number(data.price),
      });
      if (error) throw error;
      toast.success('Plan created!');
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Plan Name *</label>
            <input {...register('plan_name', { required: true })} className="input-field" placeholder="Gold Monthly" />
          </div>
          <div>
            <label className="label">Duration *</label>
            <select {...register('duration', { required: true })} className="input-field">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="label">Price (₹) *</label>
            <input {...register('price', { required: true })} type="number" className="input-field" placeholder="999" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const { user } = useAuthStore();

  const fetchAll = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    const gymId = user.gym_id;
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    try {
      const [subsRes, plansRes, membersRes] = await Promise.all([
        supabase.from('member_subscriptions')
          .select('*, members(full_name, member_code), subscription_plans(plan_name, duration, price)')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('*').eq('gym_id', gymId).order('price'),
        supabase.from('members').select('id, full_name, member_code').eq('gym_id', gymId).eq('status', 'active'),
      ]);

      const expiringItems = await fetchExpiringSubscriptions(gymId);

      setSubscriptions((subsRes.data || []).map(s => ({
        ...s,
        full_name: s.members?.full_name,
        member_code: s.members?.member_code,
        plan_name: s.subscription_plans?.plan_name,
        duration: s.subscription_plans?.duration,
        price: s.subscription_plans?.price,
      })));
      setPlans(plansRes.data || []);
      setMembers(membersRes.data || []);
      setExpiring(expiringItems);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [user?.gym_id]);

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from('member_subscriptions').update({ status }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Status updated');
    fetchAll();
  };

  const handleDeletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) { toast.error('Cannot delete — it may have active subscriptions'); return; }
    toast.success('Plan deleted');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">{subscriptions.length} total subscriptions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPlan(true)} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Plan
          </button>
          <button onClick={() => setShowAssign(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Assign Plan
          </button>
        </div>
      </div>

      {/* Reminder Banner - tiered 24h / 3d / 7d */}
      <SubscriptionReminderBanner
        items={expiring}
        onPaid={fetchAll}
      />

      {/* Plans Grid */}
      <div>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-400" /> Available Plans
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-dark-700" />)
            : plans.map(p => (
                <div key={p.id} className="card group hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold">{p.plan_name}</p>
                      <p className="text-3xl font-bold text-gradient mt-1">₹{p.price}</p>
                      <span className="badge-active mt-2 capitalize">{p.duration}</span>
                    </div>
                    <button onClick={() => handleDeletePlan(p.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          <button onClick={() => setShowPlan(true)}
            className="card border-dashed border-white/10 flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[7rem]">
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold">All Subscriptions</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No subscriptions yet</td></tr>
              ) : subscriptions.map(s => (
                <tr key={s.id}>
                  <td>
                    <div>
                      <p className="text-white font-medium">{s.full_name}</p>
                      <p className="text-gray-500 text-xs font-mono">{s.member_code}</p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-gray-300">{s.plan_name}</p>
                      <p className="text-gray-500 text-xs capitalize">{s.duration} · ₹{s.price}</p>
                    </div>
                  </td>
                  <td className="text-gray-400 text-sm">{s.start_date}</td>
                  <td className={`text-sm font-medium ${s.status === 'active' && s.end_date <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] ? 'text-amber-400' : 'text-gray-400'}`}>{s.end_date}</td>
                  <td>
                    <span className={s.status === 'active' ? 'badge-active' : s.status === 'expired' ? 'badge-expired' : 'badge-pending'}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                      className="bg-dark-700 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 cursor-pointer">
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAssign && <AssignModal plans={plans} members={members} gymId={user.gym_id} onClose={() => setShowAssign(false)} onSave={() => { setShowAssign(false); fetchAll(); }} />}
      {showPlan && <PlanModal gymId={user.gym_id} onClose={() => setShowPlan(false)} onSave={() => { setShowPlan(false); fetchAll(); }} />}
    </div>
  );
}
