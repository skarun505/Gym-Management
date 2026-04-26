import { useEffect, useState, useCallback } from 'react';
import {
  Plus, X, Building2, Search, Eye, EyeOff,
  Copy, CheckCircle, AlertCircle, RefreshCw,
  ShieldOff, ShieldCheck, ChevronDown, Edit2, Save, KeyRound, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ── Plan-based member limits ───────────────────────────────────
const PLAN_LIMITS = { trial: 50, starter: 50, pro: 300, elite: Infinity };
const memberLimit = (plan) => PLAN_LIMITS[plan] ?? 50;
const memberLimitLabel = (plan) => memberLimit(plan) === Infinity ? '∞' : memberLimit(plan);

// ── Utility: generate a random password ─────────────────────
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Utility: generate gym code ───────────────────────────────
function generateGymCode(name) {
  const prefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GYM_${prefix}${suffix}`;
}

// ── Credentials Modal (shown once after gym creation) ────────
function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `GymPro Login Credentials\n\nGym: ${credentials.gymName}\nCode: ${credentials.gymCode}\n\nEmail: ${credentials.email}\nPassword: ${credentials.password}\n\nLogin: https://your-app.vercel.app/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Gym Created Successfully!</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Credentials */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-sm text-amber-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Save these credentials now — the password won't be shown again.
          </div>

          <div className="bg-dark-700 rounded-xl p-5 space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gym Name</span>
              <span className="text-white font-semibold">{credentials.gymName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gym Code</span>
              <span className="text-violet-400">{credentials.gymCode}</span>
            </div>
            <div className="border-t border-white/5 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Email</span>
              <span className="text-white">{credentials.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Password</span>
              <span className="text-emerald-400 font-bold">{credentials.password}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCopy} className="btn-primary flex-1 justify-center gap-2">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Credentials'}
            </button>
            <button onClick={onClose} className="btn-secondary">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Owner Password Modal ────────────────────────────────
function ResetOwnerPasswordModal({ gym, onClose }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);

  const generate = () => {
    setPassword(generatePassword(14));
    setVisible(true);
  };

  const handleReset = async () => {
    if (!password || password.length < 8) { toast.error('Min 8 characters'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');
      const res = await fetch(
        'https://fmikzzectrzpyuhkmmcg.supabase.co/functions/v1/reset-owner-password',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ gymId: gym.id, newPassword: password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`Password reset for ${gym.owner_name}!`);
      setDone(true);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const copyCredentials = () => {
    const text = `GymPro Login Credentials\n\nGym: ${gym.name}\nEmail: (existing owner email)\nNew Password: ${password}\n\nLogin: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Reset Owner Password</p>
              <p className="text-gray-500 text-xs">{gym.name} · {gym.owner_name}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!done ? (
            <>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                ⚠️ This will immediately change the login password for <strong>{gym.owner_name}</strong> ({gym.name}). The owner must use this new password to log in.
              </div>
              <div>
                <label className="label">New Password *</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={visible ? 'text' : 'password'} placeholder="Min 8 characters"
                    className="input-field pr-12 font-mono" />
                  <button type="button" onClick={() => setVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={generate} type="button"
                  className="mt-1.5 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Auto-generate strong password
                </button>
              </div>
              {password && visible && (
                <div className="p-3 bg-dark-700 border border-white/10 rounded-xl space-y-1">
                  <p className="text-xs text-gray-500 font-semibold">📋 Save before resetting:</p>
                  <p className="text-white text-sm font-mono">{password}</p>
                  <button onClick={copyCredentials}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-1">
                    <Copy className="w-3 h-3" /> Copy credentials
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleReset} disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <KeyRound className="w-4 h-4" />}
                  {saving ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white font-semibold">Password Reset!</p>
              <p className="text-gray-400 text-sm">{gym.owner_name} can now log in with the new password.</p>
              <div className="p-3 bg-dark-700 rounded-xl font-mono text-sm text-emerald-400 border border-emerald-500/20">
                {password}
              </div>
              <div className="flex gap-3">
                <button onClick={copyCredentials} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={onClose} className="btn-primary flex-1">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Gym Modal ────────────────────────────────────────────
function EditGymModal({ gym, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         gym.name || '',
    owner_name:   gym.owner_name || '',
    phone:        gym.phone || '',
    address:      gym.address || '',
    plan:         gym.plan || 'trial',
    plan_expires_at: gym.plan_expires_at ? gym.plan_expires_at.split('T')[0] : '',
    theme_color:  gym.theme_color || '#a21cce',
  });
  const [saving, setSaving] = useState(false);
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name || !form.owner_name) {
      toast.error('Gym name and owner name are required');
      return;
    }
    setSaving(true);
    try {
      const PLAN_PRICE = { trial: 0, starter: 499, pro: 999, elite: 1999 };
      const { error } = await supabase.from('gyms').update({
        name:            form.name,
        owner_name:      form.owner_name,
        phone:           form.phone,
        address:         form.address,
        plan:            form.plan,
        plan_expires_at: form.plan_expires_at || null,
        monthly_price:   PLAN_PRICE[form.plan] || 0,
        theme_color:     form.theme_color,
      }).eq('id', gym.id);
      if (error) throw error;
      toast.success(`${form.name} updated!`);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to update gym');
    } finally {
      setSaving(false);
    }
  };

  const colors = ['#a21cce', '#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Gym</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{gym.gym_code}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Gym Info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Gym Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Gym Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Planet Fitness Chennai" />
              </div>
              <div>
                <label className="label">Owner Name *</label>
                <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} className="input-field" placeholder="Rajesh Kumar" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="+91 98765 43210" />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} className="input-field" placeholder="123 Anna Salai, Chennai" />
              </div>
            </div>
          </div>

          {/* Plan & Theme */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Plan & Branding</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Subscription Plan</label>
                <div className="relative">
                  <select value={form.plan} onChange={e => set('plan', e.target.value)} className="input-field appearance-none pr-8">
                    <option value="trial">🆓 Trial (14 days free)</option>
                    <option value="starter">🥉 Starter — ₹499/mo</option>
                    <option value="pro">⭐ Pro — ₹999/mo (Popular)</option>
                    <option value="elite">👑 Elite — ₹1,999/mo</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label">Plan Expiry Date</label>
                <input
                  type="date"
                  value={form.plan_expires_at}
                  onChange={e => set('plan_expires_at', e.target.value)}
                  className="input-field"
                  placeholder="Leave empty for trial"
                />
              </div>
              <div>
                <label className="label">Brand Color (theme)</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('theme_color', c)}
                      className={`w-8 h-8 rounded-full transition-transform ${form.theme_color === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.theme_color}
                    onChange={e => set('theme_color', e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 justify-center gap-2"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Gym Modal ──────────────────────────────────────────
function CreateGymModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name:        '',
    owner_name:  '',
    email:       '',
    phone:       '',
    address:     '',
    plan:        'trial',
    plan_expires_at: '',
    theme_color: '#a21cce',
  });
  const [password, setPassword] = useState(generatePassword());
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCreate = async () => {
    if (!form.name || !form.owner_name || !form.email) {
      toast.error('Gym name, owner name, and email are required');
      return;
    }
    setSaving(true);
    try {
      // Call Edge Function — runs server-side with admin privileges
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated. Please login again.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-gym`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            gymName:       form.name,
            ownerName:     form.owner_name,
            email:         form.email,
            password,
            phone:         form.phone,
            address:       form.address,
            plan:          form.plan,
            planExpiresAt: form.plan_expires_at || null,
            themeColor:    form.theme_color,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok || data?.error) throw new Error(data?.error || 'Failed to create gym');

      toast.success(`${form.name} has been onboarded!`);
      onCreated(data.credentials);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create gym');
    } finally {
      setSaving(false);
    }
  };

  const colors = ['#a21cce', '#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Onboard New Gym</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Gym Info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Gym Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Gym Name *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="input-field"
                  placeholder="Planet Fitness Chennai"
                />
              </div>
              <div>
                <label className="label">Owner Name *</label>
                <input
                  value={form.owner_name}
                  onChange={e => set('owner_name', e.target.value)}
                  className="input-field"
                  placeholder="Rajesh Kumar"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="input-field"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="input-field"
                  placeholder="123 Anna Salai, Chennai"
                />
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Login Credentials</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Owner Email (login) *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="input-field"
                  placeholder="owner@planetfitness.com"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Generated Password</label>
                <div className="relative flex gap-2">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10 flex-1 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="btn-secondary px-3 flex-shrink-0"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Plan & Theme */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Plan & Branding</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Subscription Plan</label>
                <div className="relative">
                  <select
                    value={form.plan}
                    onChange={e => set('plan', e.target.value)}
                    className="input-field appearance-none pr-8"
                  >
                    <option value="trial">🆓 Trial (14 days free)</option>
                    <option value="starter">🥉 Starter — ₹499/mo</option>
                    <option value="pro">⭐ Pro — ₹999/mo (Popular)</option>
                    <option value="elite">👑 Elite — ₹1,999/mo</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label">Plan Expiry Date</label>
                <input
                  type="date"
                  value={form.plan_expires_at}
                  onChange={e => set('plan_expires_at', e.target.value)}
                  className="input-field"
                  placeholder="Leave empty for trial"
                />
              </div>
              <div>
                <label className="label">Brand Color (theme)</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => set('theme_color', c)}
                      className={`w-8 h-8 rounded-full transition-transform ${form.theme_color === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.theme_color}
                    onChange={e => set('theme_color', e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary flex-1 justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Creating...' : 'Create Gym & Generate Credentials'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Gyms Page ────────────────────────────────────────────
export default function GymsPage() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [editGym, setEditGym] = useState(null);
  const [resetGym, setResetGym] = useState(null); // for password reset

  const fetchGyms = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('gyms')
        .select('*, members(count)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,owner_name.ilike.%${search}%,gym_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setGyms(data || []);
    } catch (err) {
      toast.error('Failed to load gyms');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchGyms(); }, [fetchGyms]);

  const toggleStatus = async (gym) => {
    const newStatus = gym.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('gyms')
      .update({ status: newStatus })
      .eq('id', gym.id);

    if (error) { toast.error('Update failed'); return; }
    toast.success(`${gym.name} ${newStatus === 'active' ? 'reactivated' : 'suspended'}`);
    fetchGyms();
  };

  const planColors = {
    trial:   'badge-pending',
    starter: 'badge-active',
    pro:     'badge-admin',
    elite:   'badge-trainer',
  };

  const statusColors = {
    active: 'badge-active',
    suspended: 'badge-expired',
    trial: 'badge-pending',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gyms
          </h1>
          <p className="page-subtitle">{gyms.length} gym{gyms.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
        >
          <Plus className="w-4 h-4" /> Onboard New Gym
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search gym name, owner, code..."
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Gym</th>
                <th>Code</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>Members</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : gyms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">
                      {search ? 'No gyms match your search' : 'No gyms yet'}
                    </p>
                    {!search && (
                      <p className="text-gray-600 text-sm mt-1">
                        Click "Onboard New Gym" to get started
                      </p>
                    )}
                  </td>
                </tr>
              ) : gyms.map(gym => (
                <tr key={gym.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${gym.theme_color || '#a21cce'}, ${gym.theme_color || '#a21cce'}99)` }}
                      >
                        {gym.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-xs text-gray-500">{gym.address || 'No address'}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="font-mono text-violet-400 text-xs">{gym.gym_code}</span></td>
                  <td className="text-gray-300">{gym.owner_name}</td>
                  <td className="text-gray-400 text-sm">{gym.phone || '—'}</td>
                  <td>
                    <span className="text-white font-semibold">
                      {gym.members?.[0]?.count ?? 0}
                    </span>
                    <span className="text-gray-500 text-xs"> / {memberLimitLabel(gym.plan)}</span>
                  </td>
                  <td>
                    <span className={planColors[gym.plan] || 'badge'}>
                      {gym.plan}
                    </span>
                  </td>
                  <td>
                    <span className={statusColors[gym.status] || 'badge'}>
                      {gym.status}
                    </span>
                  </td>
                  <td className="text-gray-400 text-sm">
                    {new Date(gym.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                  <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditGym(gym)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit gym details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResetGym(gym)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Reset owner password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(gym)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          gym.status === 'active'
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={gym.status === 'active' ? 'Suspend' : 'Reactivate'}
                      >
                        {gym.status === 'active'
                          ? <ShieldOff className="w-4 h-4" />
                          : <ShieldCheck className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateGymModal
          onClose={() => setShowCreate(false)}
          onCreated={(creds) => {
            setShowCreate(false);
            setCredentials(creds);
            fetchGyms();
          }}
        />
      )}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}
      {editGym && (
        <EditGymModal
          gym={editGym}
          onClose={() => setEditGym(null)}
          onSaved={() => { setEditGym(null); fetchGyms(); }}
        />
      )}
      {resetGym && (
        <ResetOwnerPasswordModal
          gym={resetGym}
          onClose={() => setResetGym(null)}
        />
      )}
    </div>
  );
}
