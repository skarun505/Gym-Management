import { useEffect, useState, useRef } from 'react';
import { Search, Plus, UserCheck, UserX, X, Edit2, Trash2, CreditCard, ChevronDown, KeyRound, Copy, CheckCheck, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CREATE_LOGIN_URL = 'https://fmikzzectrzpyuhkmmcg.supabase.co/functions/v1/create-member-login';

// ── Copy-to-clipboard helper hook ────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState({});
  const copy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [key]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
    });
  };
  return { copied, copy };
}

// ── Credentials Modal ─────────────────────────────────────────
function CredentialsModal({ creds, onClose }) {
  const { copied, copy } = useCopy();

  const Field = ({ label, value, copyKey }) => (
    <div className="bg-dark-700 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white font-mono font-semibold text-sm mt-0.5 truncate">{value}</p>
      </div>
      <button
        onClick={() => copy(copyKey, value)}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Copy"
      >
        {copied[copyKey]
          ? <CheckCheck className="w-4 h-4 text-emerald-400" />
          : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Login Created!</h2>
              <p className="text-gray-500 text-xs">{creds.memberName} · {creds.memberCode}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Success banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-emerald-400 text-sm font-semibold">✓ Account created successfully</p>
            <p className="text-emerald-400/60 text-xs mt-1">Share these credentials with the member</p>
          </div>

          {/* Credential fields */}
          <div className="space-y-2">
            <Field label="Email / Username" value={creds.email} copyKey="email" />
            <Field label="Password" value={creds.password} copyKey="password" />
          </div>

          {/* Copy all button */}
          <button
            onClick={() => copy('all', `Email: ${creds.email}\nPassword: ${creds.password}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
          >
            {copied.all
              ? <><CheckCheck className="w-4 h-4 text-emerald-400" /> Copied!</>
              : <><Copy className="w-4 h-4" /> Copy Both Credentials</>}
          </button>

          {/* Warning */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
            <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Important</p>
            <ul className="text-amber-300/70 text-xs space-y-1 list-disc list-inside">
              <li>Share credentials privately (WhatsApp / in-person)</li>
              <li>Ask member to change password after first login</li>
              <li>Member can now access the Member Portal</li>
            </ul>
          </div>

          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Set Password Modal ─────────────────────────────────────────
function CreateLoginModal({ member, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREATE_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId: member.id, password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onSuccess(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate preview password
  const preview = `Gym@${new Date().getFullYear()}XX`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-400" />
              Create Login
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">{member.full_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-dark-700 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Email (login)</p>
            <p className="text-white font-mono text-sm">{member.email}</p>
          </div>
          <div>
            <label className="label">Password <span className="text-gray-600 font-normal">(optional — auto-generated if blank)</span></label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="text"
              className="input-field"
              placeholder={`e.g. ${preview}`}
            />
            <p className="text-gray-600 text-[11px] mt-1">Leave blank to auto-generate a strong password</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <KeyRound className="w-4 h-4" />}
              Create Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function genMemberCode(gymCode) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${gymCode?.slice(-3) || 'MBR'}-${suffix}`;
}

function computeEndDate(startDate, duration) {
  const d = new Date(startDate);
  if (duration === 'monthly')   d.setMonth(d.getMonth() + 1);
  else if (duration === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (duration === 'yearly')    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// ── Add / Edit Member Modal ───────────────────────────────────
function MemberModal({ member, gymId, gymCode, plans, onClose, onSave }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: member
      ? { ...member }
      : {
          status:     'active',
          start_date: new Date().toISOString().split('T')[0],
        },
  });

  const [showPlanSection, setShowPlanSection] = useState(!member?.id);
  const planId    = watch('plan_id');
  const startDate = watch('start_date');

  useEffect(() => { reset(member ? { ...member } : { status: 'active', start_date: new Date().toISOString().split('T')[0] }); }, [member]);

  // Auto-compute end date when plan + start change
  useEffect(() => {
    if (planId && startDate) {
      const plan = plans.find(p => p.id === planId);
      if (plan) setValue('end_date', computeEndDate(startDate, plan.duration));
    }
  }, [planId, startDate]);

  const onSubmit = async (data) => {
    try {
      let memberId = member?.id;

      if (member?.id) {
        // Update existing
        const { error } = await supabase.from('members').update({
          full_name:    data.full_name,
          phone:        data.phone,
          email:        data.email,
          dob:          data.dob || null,
          address:      data.address,
          fitness_goal: data.fitness_goal,
          health_notes: data.health_notes,
          status:       data.status,
        }).eq('id', member.id);
        if (error) throw error;
        toast.success('Member updated!');
      } else {
        // Insert new member
        const { data: newMember, error } = await supabase.from('members').insert({
          gym_id:       gymId,
          member_code:  genMemberCode(gymCode),
          full_name:    data.full_name,
          phone:        data.phone,
          email:        data.email,
          dob:          data.dob || null,
          address:      data.address,
          fitness_goal: data.fitness_goal,
          health_notes: data.health_notes,
          status:       data.status || 'active',
        }).select().single();
        if (error) throw error;
        memberId = newMember.id;

        // Optionally assign subscription plan
        if (showPlanSection && data.plan_id && data.start_date && data.end_date) {
          const { error: subErr } = await supabase.from('member_subscriptions').insert({
            gym_id:    gymId,
            member_id: memberId,
            plan_id:   data.plan_id,
            start_date: data.start_date,
            end_date:   data.end_date,
            status:    'active',
            paid_confirmed: false,
          });
          if (subErr) {
            // Member was created; warn about plan failure but don't roll back
            toast('Member added! Plan assignment failed — assign from Subscriptions page.', { icon: '⚠️' });
            onSave();
            return;
          }
        }
        toast.success('Member added!');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {member?.id ? 'Edit Member' : 'Add Member'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* ── Member Info ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('full_name', { required: true })} className="input-field" placeholder="Full Name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="member@email.com" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input {...register('dob')} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea {...register('address')} className="input-field" rows={2} placeholder="Address" />
            </div>
            <div className="col-span-2">
              <label className="label">Fitness Goal</label>
              <input {...register('fitness_goal')} className="input-field" placeholder="Weight loss, muscle gain, general fitness..." />
            </div>
            <div className="col-span-2">
              <label className="label">Health Notes</label>
              <textarea {...register('health_notes')} className="input-field" rows={2} placeholder="Any medical conditions, allergies..." />
            </div>
          </div>

          {/* ── Subscription Plan (new members only) ─────── */}
          {!member?.id && (
            <div className="border border-white/8 rounded-2xl overflow-hidden">
              {/* Section header toggle */}
              <button
                type="button"
                onClick={() => setShowPlanSection(p => !p)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-700/50 hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-primary-400" />
                  <span className="text-white font-semibold text-sm">Assign Subscription Plan</span>
                  {!showPlanSection && (
                    <span className="text-[11px] text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">Optional</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPlanSection ? 'rotate-180' : ''}`} />
              </button>

              {showPlanSection && (
                <div className="p-5 space-y-4">
                  {plans.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-2">
                      No plans found — create plans first in the Subscriptions page.
                    </p>
                  ) : (
                    <>
                      {/* Plan cards (radio style) */}
                      <div>
                        <label className="label">Select Plan</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {plans.map(p => (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                planId === p.id
                                  ? 'border-primary-500 bg-primary-600/15'
                                  : 'border-white/8 hover:border-white/20 bg-dark-700/40'
                              }`}
                            >
                              <input
                                {...register('plan_id')}
                                type="radio"
                                value={p.id}
                                className="accent-primary-500 w-4 h-4 flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{p.plan_name}</p>
                                <p className="text-gray-400 text-xs">
                                  ₹{p.price} · <span className="capitalize">{p.duration}</span>
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Purchase / Start Date *</label>
                          <input {...register('start_date')} type="date" className="input-field" />
                        </div>
                        <div>
                          <label className="label">
                            End Date
                            <span className="text-primary-400 text-[10px] ml-1">(auto-filled)</span>
                          </label>
                          <input {...register('end_date')} type="date" className="input-field" />
                        </div>
                      </div>

                      {/* Reminder preview */}
                      {selectedPlan && watch('end_date') && (
                        <div className="bg-dark-700/60 rounded-xl p-4 space-y-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                            🔔 Auto-Reminders Scheduled
                          </p>
                          {[
                            { label: '7 days before', days: 7,  color: 'text-amber-400' },
                            { label: '3 days before', days: 3,  color: 'text-orange-400' },
                            { label: '24 hrs before', days: 1,  color: 'text-red-400' },
                          ].map(({ label, days, color }) => {
                            const d = new Date(watch('end_date'));
                            d.setDate(d.getDate() - days);
                            return (
                              <div key={label} className="flex items-center justify-between text-sm">
                                <span className={`${color} font-medium flex items-center gap-1.5`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {label}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            );
                          })}
                          <p className="text-[11px] text-gray-600 border-t border-white/5 pt-2 mt-1">
                            Reminders shown in Dashboard & Member Portal. No reminder after payment confirmed.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : member?.id ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MembersPage() {
  const [members,      setMembers]      = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalMember,  setModalMember]  = useState(undefined);
  // Login creation state
  const [loginTarget,  setLoginTarget]  = useState(null); // member object for CreateLoginModal
  const [credentials,  setCredentials]  = useState(null); // response from edge fn → CredentialsModal
  const { user } = useAuthStore();

  const fetchMembers = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const [membersRes, plansRes] = await Promise.all([
        (() => {
          let q = supabase
            .from('members')
            .select('*, member_subscriptions(id, plan_id, end_date, status, paid_confirmed, subscription_plans(plan_name))')
            .eq('gym_id', user.gym_id)
            .order('joined_at', { ascending: false });
          if (statusFilter) q = q.eq('status', statusFilter);
          if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,member_code.ilike.%${search}%,email.ilike.%${search}%`);
          return q;
        })(),
        supabase.from('subscription_plans').select('*').eq('gym_id', user.gym_id).order('price'),
      ]);
      setMembers(membersRes.data || []);
      setPlans(plansRes.data || []);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [search, statusFilter, user?.gym_id]);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this member?')) return;
    const { error } = await supabase.from('members').update({ status: 'inactive' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Member deactivated');
    fetchMembers();
  };

  // Derive subscription display info for a member
  const getSubInfo = (m) => {
    const active = (m.member_subscriptions || []).find(s => s.status === 'active');
    if (!active) return null;
    const daysLeft = Math.ceil((new Date(active.end_date) - new Date()) / 86400000);
    return { ...active, daysLeft, planName: active.subscription_plans?.plan_name };
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{members.length} member{members.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => setModalMember(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input pl-9 input-field"
            placeholder="Search by name, ID, phone..."
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {['', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Phone / Email</th>
                <th>Goal</th>
                <th>Subscription</th>
                <th>Login</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <UserCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No members found</p>
                    {!search && <p className="text-gray-600 text-sm mt-1">Click "Add Member" to get started</p>}
                  </td>
                </tr>
              ) : members.map(m => {
                const sub = getSubInfo(m);
                const urgency = sub
                  ? sub.paid_confirmed ? 'paid'
                    : sub.daysLeft <= 1 ? 'critical'
                    : sub.daysLeft <= 3 ? 'warning'
                    : sub.daysLeft <= 7 ? 'caution'
                    : 'ok'
                  : null;

                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {m.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-white">{m.full_name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-primary-400 text-xs">{m.member_code}</span></td>
                    <td>
                      <div className="text-sm">
                        <p className="text-gray-300">{m.phone || '—'}</p>
                        <p className="text-gray-500 text-xs">{m.email || ''}</p>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm max-w-[130px] truncate">{m.fitness_goal || '—'}</td>
                    <td>
                      {!sub ? (
                        <span className="text-gray-600 text-xs">No plan</span>
                      ) : (
                        <div>
                          <p className="text-gray-300 text-sm font-medium">{sub.planName}</p>
                          <span className={`text-[11px] font-semibold ${
                            urgency === 'paid'     ? 'text-emerald-400'
                            : urgency === 'critical' ? 'text-red-400'
                            : urgency === 'warning'  ? 'text-orange-400'
                            : urgency === 'caution'  ? 'text-amber-400'
                            : 'text-gray-500'
                          }`}>
                            {urgency === 'paid'
                              ? '✓ Paid'
                              : urgency === 'critical'
                              ? `⚠️ Expires in < 24h`
                              : urgency === 'warning'
                              ? `⚠️ ${sub.daysLeft}d left`
                              : urgency === 'caution'
                              ? `🔔 ${sub.daysLeft}d left`
                              : `${sub.daysLeft}d left`}
                          </span>
                        </div>
                      )}
                    </td>
                    {/* Login status column */}
                    <td>
                      {m.profile_id ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (!m.email) {
                              toast.error('Add an email to this member first!');
                              return;
                            }
                            setLoginTarget(m);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                          title="Create login credentials"
                        >
                          <KeyRound className="w-3 h-3" /> Create
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={m.status === 'active' ? 'badge-active' : 'badge-expired'}>
                        {m.status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {m.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-sm">{new Date(m.joined_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModalMember(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalMember !== undefined && (
        <MemberModal
          member={modalMember}
          gymId={user.gym_id}
          gymCode={user.gym?.gym_code}
          plans={plans}
          onClose={() => setModalMember(undefined)}
          onSave={() => { setModalMember(undefined); fetchMembers(); }}
        />
      )}

      {/* Create Login modal */}
      {loginTarget && (
        <CreateLoginModal
          member={loginTarget}
          onClose={() => setLoginTarget(null)}
          onSuccess={(creds) => {
            setLoginTarget(null);
            setCredentials(creds);
            fetchMembers(); // refresh to show ShieldCheck
          }}
        />
      )}

      {/* Credentials display modal */}
      {credentials && (
        <CredentialsModal
          creds={credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
