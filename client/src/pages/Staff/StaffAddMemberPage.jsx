import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import {
  UserPlus, CreditCard, CheckCircle, Loader2,
  Phone, Mail, MapPin, Target, CalendarDays, IndianRupee,
  ChevronDown, ArrowRight, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Step indicator ────────────────────────────────────────────
function StepDot({ step, current, label }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
        done   ? 'bg-emerald-500 border-emerald-500 text-white' :
        active ? 'bg-primary-600 border-primary-500 text-white scale-110' :
                 'bg-dark-700 border-white/10 text-gray-500'
      }`}>
        {done ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}

const INITIAL_MEMBER = {
  full_name: '', dob: '', phone: '', email: '',
  address: '', fitness_goal: '', health_notes: '', status: 'active',
};

const INITIAL_PAYMENT = {
  plan_id: '', amount_paid: '', payment_method: 'cash',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '', notes: '',
};

export default function StaffAddMemberPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1); // 1=member info, 2=subscription/payment, 3=done
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER);
  const [payForm, setPayForm] = useState(INITIAL_PAYMENT);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [createdMember, setCreatedMember] = useState(null);

  // Load subscription plans
  useEffect(() => {
    if (!user?.gym_id) return;
    supabase.from('subscription_plans')
      .select('id, plan_name, price, duration')
      .eq('gym_id', user.gym_id)
      .order('price')
      .then(({ data }) => setPlans(data || []));
  }, [user?.gym_id]);

  // Auto-fill end_date when plan is selected
  useEffect(() => {
    const plan = plans.find(p => p.id === payForm.plan_id);
    if (plan && payForm.start_date) {
      const start = new Date(payForm.start_date);
      start.setDate(start.getDate() + (plan.duration || 30));
      setPayForm(f => ({ ...f, end_date: start.toISOString().split('T')[0] }));
    }
  }, [payForm.plan_id, payForm.start_date]);

  const updateMember = (key, val) => setMemberForm(f => ({ ...f, [key]: val }));
  const updatePay    = (key, val) => setPayForm(f => ({ ...f, [key]: val }));

  // Step 1: Save member to Supabase
  const handleSaveMember = async () => {
    if (!memberForm.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!memberForm.phone.trim())     { toast.error('Phone number is required'); return; }
    setSaving(true);
    try {
      // Generate member code client-side from count
      const { count } = await supabase.from('members').select('id', { count: 'exact' }).eq('gym_id', user.gym_id);
      const member_code = `GYM${String((count || 0) + 1).padStart(4, '0')}`;

      const { data, error } = await supabase.from('members').insert({
        gym_id:       user.gym_id,
        member_code,
        full_name:    memberForm.full_name.trim(),
        dob:          memberForm.dob || null,
        phone:        memberForm.phone.trim(),
        email:        memberForm.email.trim() || null,
        address:      memberForm.address.trim() || null,
        fitness_goal: memberForm.fitness_goal.trim() || null,
        health_notes: memberForm.health_notes.trim() || null,
        status:       'active',
      }).select().single();

      if (error) throw error;
      setCreatedMember(data);
      toast.success(`✅ Member ${data.full_name} added (${data.member_code})`);
      setStep(2);
    } catch (e) {
      toast.error(e.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save subscription + payment record
  const handleSavePayment = async () => {
    if (!payForm.plan_id)    { toast.error('Please select a subscription plan'); return; }
    if (!payForm.start_date) { toast.error('Start date is required'); return; }
    if (!payForm.end_date)   { toast.error('End date is required'); return; }
    setSaving(true);
    try {
      // Create subscription
      const { data: sub, error: subErr } = await supabase.from('member_subscriptions').insert({
        gym_id:     user.gym_id,
        member_id:  createdMember.id,
        plan_id:    payForm.plan_id,
        start_date: payForm.start_date,
        end_date:   payForm.end_date,
        status:     'active',
        paid_confirmed: payForm.amount_paid ? true : false,
      }).select().single();
      if (subErr) throw subErr;

      // Record payment if amount entered
      if (payForm.amount_paid && Number(payForm.amount_paid) > 0) {
        const { error: payErr } = await supabase.from('fee_payments').insert({
          gym_id:         user.gym_id,
          member_id:      createdMember.id,
          subscription_id: sub.id,
          amount_paid:    Number(payForm.amount_paid),
          payment_date:   payForm.start_date,
          payment_method: payForm.payment_method,
          notes:          payForm.notes.trim() || null,
        });
        if (payErr) throw payErr;
        toast.success('💳 Payment recorded successfully');
      }
      toast.success('📋 Subscription assigned!');
      setStep(3);
    } catch (e) {
      toast.error(e.message || 'Failed to save subscription/payment');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMemberForm(INITIAL_MEMBER);
    setPayForm(INITIAL_PAYMENT);
    setCreatedMember(null);
    setStep(1);
  };

  const selectedPlan = plans.find(p => p.id === payForm.plan_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            Add New Member
          </h1>
          <p className="page-subtitle">Register a member and record their payment</p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between relative">
          {/* connector line */}
          <div className="absolute left-0 right-0 top-[18px] h-0.5 bg-white/5 mx-16 z-0" />
          <div className="absolute left-0 top-[18px] h-0.5 bg-primary-600/60 z-0 transition-all"
            style={{ width: step >= 2 ? (step >= 3 ? '100%' : '50%') : '0%', marginLeft: '64px', marginRight: '64px', right: '64px' }} />
          <StepDot step={1} current={step} label="Member Info" />
          <StepDot step={2} current={step} label="Subscription" />
          <StepDot step={3} current={step} label="Done" />
        </div>
      </div>

      {/* ── STEP 1: Member Info ── */}
      {step === 1 && (
        <div className="card space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="text-white font-semibold">Member Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input
                value={memberForm.full_name}
                onChange={e => updateMember('full_name', e.target.value)}
                className="input-field"
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone *
              </label>
              <input
                value={memberForm.phone}
                onChange={e => updateMember('phone', e.target.value)}
                className="input-field"
                placeholder="+91 98765 43210"
                type="tel"
              />
            </div>

            {/* DOB */}
            <div>
              <label className="label flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Date of Birth
              </label>
              <input
                value={memberForm.dob}
                onChange={e => updateMember('dob', e.target.value)}
                className="input-field"
                type="date"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                value={memberForm.email}
                onChange={e => updateMember('email', e.target.value)}
                className="input-field"
                placeholder="john@email.com"
                type="email"
              />
            </div>

            {/* Fitness Goal */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Fitness Goal
              </label>
              <select
                value={memberForm.fitness_goal}
                onChange={e => updateMember('fitness_goal', e.target.value)}
                className="input-field"
              >
                <option value="">Select goal…</option>
                <option>Weight Loss</option>
                <option>Muscle Gain</option>
                <option>Endurance</option>
                <option>Flexibility</option>
                <option>General Fitness</option>
                <option>Strength Training</option>
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Address
              </label>
              <input
                value={memberForm.address}
                onChange={e => updateMember('address', e.target.value)}
                className="input-field"
                placeholder="123 Main Street, City"
              />
            </div>

            {/* Health Notes */}
            <div className="sm:col-span-2">
              <label className="label">Health Notes</label>
              <textarea
                value={memberForm.health_notes}
                onChange={e => updateMember('health_notes', e.target.value)}
                className="input-field"
                rows={2}
                placeholder="Any medical conditions, allergies, or special requirements…"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveMember}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Subscription + Payment ── */}
      {step === 2 && createdMember && (
        <div className="space-y-4">
          {/* Member summary */}
          <div className="card p-4 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 flex-shrink-0 text-lg">
              {createdMember.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold">{createdMember.full_name}</p>
              <p className="text-emerald-400 text-xs font-mono">{createdMember.member_code} · {createdMember.phone}</p>
            </div>
            <span className="badge-active">Added ✓</span>
          </div>

          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-white font-semibold">Subscription Plan</h2>
            </div>

            {/* Plan selector */}
            <div>
              <label className="label">Select Plan *</label>
              <div className="relative">
                <select
                  value={payForm.plan_id}
                  onChange={e => updatePay('plan_id', e.target.value)}
                  className="input-field pr-10 appearance-none"
                >
                  <option value="">Choose a subscription plan…</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name} — ₹{p.price} / {p.duration} days
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              {selectedPlan && (
                <div className="mt-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  📋 {selectedPlan.plan_name} — {selectedPlan.duration} days — ₹{selectedPlan.price}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  value={payForm.start_date}
                  onChange={e => updatePay('start_date', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input
                  type="date"
                  value={payForm.end_date}
                  onChange={e => updatePay('end_date', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Payment Record */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Record Payment</h2>
                <p className="text-gray-500 text-xs">Leave blank if no payment yet</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={payForm.amount_paid}
                  onChange={e => updatePay('amount_paid', e.target.value)}
                  className="input-field"
                  placeholder={selectedPlan ? String(selectedPlan.price) : '0'}
                  min="0"
                />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <div className="relative">
                  <select
                    value={payForm.payment_method}
                    onChange={e => updatePay('payment_method', e.target.value)}
                    className="input-field pr-10 appearance-none"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="upi">📱 UPI</option>
                    <option value="card">💳 Card</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <input
                value={payForm.notes}
                onChange={e => updatePay('notes', e.target.value)}
                className="input-field"
                placeholder="e.g. First month fee, partial payment…"
              />
            </div>

            {payForm.amount_paid && Number(payForm.amount_paid) > 0 && selectedPlan && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                Number(payForm.amount_paid) >= selectedPlan.price
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              }`}>
                <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                {Number(payForm.amount_paid) >= selectedPlan.price
                  ? `✅ Full payment — ₹${Number(payForm.amount_paid).toLocaleString('en-IN')}`
                  : `⚠️ Partial payment — Balance: ₹${(selectedPlan.price - Number(payForm.amount_paid)).toLocaleString('en-IN')}`
                }
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary"
              disabled={saving}
            >
              ← Back
            </button>
            <button
              onClick={handleSavePayment}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Complete Registration'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Success ── */}
      {step === 3 && createdMember && (
        <div className="card text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Registration Complete!</h2>
            <p className="text-gray-400 text-sm">Member has been added successfully.</p>
          </div>

          <div className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl bg-dark-700 border border-white/10">
            <p className="text-white font-bold text-lg">{createdMember.full_name}</p>
            <p className="text-primary-400 font-mono text-sm">{createdMember.member_code}</p>
            <p className="text-gray-500 text-xs">{createdMember.phone}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={handleReset} className="btn-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add Another Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
