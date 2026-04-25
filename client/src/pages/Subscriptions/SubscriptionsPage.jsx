import { useEffect, useState } from 'react';
import { Plus, X, CreditCard, Trash2, Edit2, Save, IndianRupee, Wallet, History, CheckCircle2, Banknote, Smartphone, Landmark, AlertTriangle } from 'lucide-react';
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
  else if (duration === 'half_yearly') d.setMonth(d.getMonth() + 6);
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

// ── Edit Plan Modal ────────────────────────────────────────────
function EditPlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({ plan_name: plan.plan_name, duration: plan.duration, price: plan.price });
  const [saving, setSaving] = useState(false);
  const onSubmit = async () => {
    if (!form.plan_name || !form.price) { toast.error('Name and price required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('subscription_plans').update({
        plan_name: form.plan_name,
        duration:  form.duration,
        price:     Number(form.price),
      }).eq('id', plan.id);
      if (error) throw error;
      toast.success('Plan updated!');
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Plan Name *</label>
            <input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} className="input-field" placeholder="Gold Monthly" />
          </div>
          <div>
            <label className="label">Duration</label>
            <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="input-field">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly (6 months)</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="label">Price (₹) *</label>
            <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" className="input-field" placeholder="999" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onSubmit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Subscription Modal ────────────────────────────────────
function EditSubscriptionModal({ sub, plans, onClose, onSave }) {
  const [form, setForm] = useState({
    plan_id:    sub.plan_id,
    start_date: sub.start_date,
    end_date:   sub.end_date,
    status:     sub.status,
    notes:      sub.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    setForm(f => ({
      ...f,
      plan_id: planId,
      ...(plan && f.start_date ? { end_date: computeEndDate(f.start_date, plan.duration) } : {}),
    }));
  };
  const handleStartChange = (date) => {
    const plan = plans.find(p => p.id === form.plan_id);
    setForm(f => ({
      ...f,
      start_date: date,
      ...(plan && date ? { end_date: computeEndDate(date, plan.duration) } : {}),
    }));
  };

  const onSubmit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('member_subscriptions').update({
        plan_id:    form.plan_id,
        start_date: form.start_date,
        end_date:   form.end_date,
        status:     form.status,
        notes:      form.notes,
      }).eq('id', sub.id);
      if (error) throw error;
      toast.success('Subscription updated!');
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Subscription</h2>
            <p className="text-xs text-gray-500 mt-0.5">{sub.full_name} · {sub.member_code}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Subscription Plan</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {plans.map(p => (
                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.plan_id === p.id ? 'border-primary-500 bg-primary-600/15' : 'border-white/8 hover:border-white/20 bg-dark-700/40'
                }`}>
                  <input type="radio" name="edit_plan" value={p.id} checked={form.plan_id === p.id} onChange={() => handlePlanChange(p.id)} className="accent-primary-500 w-4 h-4" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.plan_name}</p>
                    <p className="text-gray-400 text-xs">₹{p.price} · <span className="capitalize">{p.duration}</span></p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => handleStartChange(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">End Date <span className="text-primary-400 text-[10px]">(auto)</span></label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onSubmit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
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
              <option value="half_yearly">Half Yearly (6 months)</option>
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

// ── Record Payment Modal ─────────────────────────────────
function PaymentModal({ sub, gymId, onClose, onSave }) {
  const totalDue   = Number(sub.price || 0);
  const totalPaid  = Number(sub.total_paid || 0);
  const balance    = Math.max(0, totalDue - totalPaid);

  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState('cash');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt > balance + 0.01) { toast.error(`Amount exceeds balance (₹${balance.toFixed(2)})`); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('fee_payments').insert({
        gym_id:          gymId,
        member_id:       sub.member_id,
        subscription_id: sub.id,
        amount_paid:     amt,
        payment_date:    date,
        payment_method:  method,
        notes:           notes || null,
      });
      if (error) throw error;

      // If fully paid, mark paid_confirmed = true on subscription
      const newBalance = balance - amt;
      if (newBalance <= 0.01) {
        await supabase.from('member_subscriptions')
          .update({ paid_confirmed: true })
          .eq('id', sub.id);
      }

      toast.success(newBalance <= 0.01 ? '✅ Fully paid!' : `₹${amt} recorded. Balance: ₹${newBalance.toFixed(2)}`);
      onSave();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const pct = totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0;
  const METHODS = [
    { id: 'cash',          label: 'Cash',     icon: <Banknote className="w-5 h-5" /> },
    { id: 'upi',           label: 'UPI',      icon: <Smartphone className="w-5 h-5" /> },
    { id: 'card',          label: 'Card',     icon: <CreditCard className="w-5 h-5" /> },
    { id: 'bank_transfer', label: 'Transfer', icon: <Landmark className="w-5 h-5" /> },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Record Payment</h2>
              <p className="text-gray-500 text-xs mt-0.5">{sub.full_name} · {sub.plan_name}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Fee summary card */}
          <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Fee</span>
              <span className="text-white font-semibold">₹{totalDue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Paid So Far</span>
              <span className="text-emerald-400 font-semibold">₹{totalPaid.toLocaleString('en-IN')}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-dark-600 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{pct.toFixed(0)}% paid</span>
                <span className={`font-bold ${balance <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {balance <= 0
                    ? <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Fully Paid</span>
                    : `Balance: ₹${balance.toLocaleString('en-IN')}`}
                </span>
            </div>
          </div>

          {balance <= 0 ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-white font-semibold">All dues cleared!</p>
              <p className="text-gray-500 text-sm mt-1">No pending balance for this subscription.</p>
            </div>
          ) : (
            <>
              {/* Amount input */}
              <div>
                <label className="label">Amount to Pay (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field pl-8"
                    placeholder={`Max: ₹${balance}`}
                    max={balance}
                    min={1}
                    step="any"
                  />
                </div>
                {/* Quick fill buttons */}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount((balance * p / 100).toFixed(0))}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-white/8 transition-colors"
                    >
                      {p === 100 ? 'Full' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                        method === m.id
                          ? 'border-primary-500 bg-primary-600/20 text-white'
                          : 'border-white/8 bg-dark-700/40 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-primary-400">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Payment Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} className="input-field" placeholder="Optional..." />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handlePay}
                  disabled={saving || !amount}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <IndianRupee className="w-4 h-4" />}
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Payment History Modal ────────────────────────────────
function PaymentHistoryModal({ sub, gymId, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from('fee_payments')
      .select('*')
      .eq('subscription_id', sub.id)
      .order('payment_date', { ascending: false })
      .then(({ data }) => { setPayments(data || []); setLoading(false); });
  }, [sub.id]);

  const METHOD_ICON = { cash: <Banknote className="w-5 h-5" />, upi: <Smartphone className="w-5 h-5" />, card: <CreditCard className="w-5 h-5" />, bank_transfer: <Landmark className="w-5 h-5" /> };
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <History className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Payment History</h2>
              <p className="text-gray-500 text-xs mt-0.5">{sub.full_name} · {sub.plan_name}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[{
              label: 'Total Fee', value: `₹${Number(sub.price).toLocaleString('en-IN')}`, color: 'text-white',
            }, {
              label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'text-emerald-400',
            }, {
              label: 'Balance', value: `₹${Math.max(0, Number(sub.price) - totalPaid).toLocaleString('en-IN')}`, color: 'text-red-400',
            }].map(item => (
              <div key={item.label} className="bg-dark-700/60 rounded-xl p-3 text-center border border-white/5">
                <p className="text-gray-500 text-[11px] uppercase tracking-wider">{item.label}</p>
                <p className={`font-bold text-lg mt-1 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Payment list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-dark-600 flex items-center justify-center text-primary-400 flex-shrink-0">
                      {METHOD_ICON[p.payment_method] || <Banknote className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className="text-white font-semibold text-sm">₹{Number(p.amount_paid).toLocaleString('en-IN')}</p>
                      <p className="text-gray-500 text-xs">{p.payment_date} · <span className="capitalize">{p.payment_method?.replace('_', ' ')}</span></p>
                      {p.notes && <p className="text-gray-600 text-xs italic">{p.notes}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">#{payments.length - i}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [payTarget, setPayTarget]   = useState(null); // sub to record payment for
  const [histTarget, setHistTarget] = useState(null); // sub to show payment history
  const { user } = useAuthStore();

  const fetchAll = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    const gymId = user.gym_id;
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    try {
      const [subsRes, plansRes, membersRes, paymentsRes] = await Promise.all([
        supabase.from('member_subscriptions')
          .select('*, members(full_name, member_code), subscription_plans(plan_name, duration, price)')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('*').eq('gym_id', gymId).order('price'),
        supabase.from('members').select('id, full_name, member_code').eq('gym_id', gymId).eq('status', 'active'),
        supabase.from('fee_payments').select('subscription_id, amount_paid').eq('gym_id', gymId),
      ]);

      const expiringItems = await fetchExpiringSubscriptions(gymId);

      // Build a map: subscription_id -> total_paid
      const paidMap = {};
      (paymentsRes.data || []).forEach(p => {
        paidMap[p.subscription_id] = (paidMap[p.subscription_id] || 0) + Number(p.amount_paid);
      });

      setSubscriptions((subsRes.data || []).map(s => ({
        ...s,
        full_name:   s.members?.full_name,
        member_code: s.members?.member_code,
        plan_name:   s.subscription_plans?.plan_name,
        duration:    s.subscription_plans?.duration,
        price:       s.subscription_plans?.price,
        total_paid:  paidMap[s.id] || 0,
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
              <div className="card group hover:-translate-y-0.5 transition-transform relative" key={p.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold">{p.plan_name}</p>
                      <p className="text-3xl font-bold text-gradient mt-1">₹{p.price}</p>
                      <span className="badge-active mt-2 capitalize">{p.duration}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditPlan(p)} className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit plan">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePlan(p.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete plan">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                <th>Fees</th>
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
                  {/* ── Fees / Payment Progress ── */}
                  <td className="min-w-[140px]">
                    {(() => {
                      const due     = Number(s.price || 0);
                      const paid    = Number(s.total_paid || 0);
                      const bal     = Math.max(0, due - paid);
                      const pct     = due > 0 ? Math.min(100, (paid / due) * 100) : 0;
                      const fullPaid = pct >= 100;
                      return (
                        <div className="space-y-1">
                          {/* Mini progress bar */}
                          <div className="w-full bg-dark-600 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: fullPaid ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-500">₹{paid.toLocaleString('en-IN')} / ₹{due.toLocaleString('en-IN')}</span>
                            {fullPaid
                              ? <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                              : <span className="text-[10px] text-red-400 font-semibold">-₹{bal.toLocaleString('en-IN')}</span>}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={s.status === 'active' ? 'badge-active' : s.status === 'expired' ? 'badge-expired' : 'badge-pending'}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {/* Record payment */}
                      <button
                        onClick={() => setPayTarget(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Record payment"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                      </button>
                      {/* Payment history */}
                      <button
                        onClick={() => setHistTarget(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Payment history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit subscription */}
                      <button
                        onClick={() => setEditSub(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                        title="Edit subscription"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                        className="bg-dark-700 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 cursor-pointer">
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAssign && <AssignModal plans={plans} members={members} gymId={user.gym_id} onClose={() => setShowAssign(false)} onSave={() => { setShowAssign(false); fetchAll(); }} />}
      {showPlan && <PlanModal gymId={user.gym_id} onClose={() => setShowPlan(false)} onSave={() => { setShowPlan(false); fetchAll(); }} />}
      {editPlan && <EditPlanModal plan={editPlan} onClose={() => setEditPlan(null)} onSave={() => { setEditPlan(null); fetchAll(); }} />}
      {editSub && <EditSubscriptionModal sub={editSub} plans={plans} onClose={() => setEditSub(null)} onSave={() => { setEditSub(null); fetchAll(); }} />}
      {payTarget && <PaymentModal sub={payTarget} gymId={user.gym_id} onClose={() => setPayTarget(null)} onSave={() => { setPayTarget(null); fetchAll(); }} />}
      {histTarget && <PaymentHistoryModal sub={histTarget} gymId={user.gym_id} onClose={() => setHistTarget(null)} />}
    </div>
  );
}
