import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Settings, Building2, Palette, CreditCard, AlertTriangle,
  Save, CheckCircle, Upload, RefreshCw, Trash2, Plus, X, Camera, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ── Preset theme colours ──────────────────────────────────────
const THEME_PRESETS = [
  { label: 'Purple (Default)', value: '#a21cce' },
  { label: 'Indigo',           value: '#4f46e5' },
  { label: 'Blue',             value: '#2563eb' },
  { label: 'Cyan',             value: '#0891b2' },
  { label: 'Emerald',         value: '#059669' },
  { label: 'Rose',             value: '#e11d48' },
  { label: 'Orange',           value: '#ea580c' },
  { label: 'Amber',            value: '#d97706' },
];

// ── Tab button ────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ── ① Gym Profile Tab ─────────────────────────────────────────
function GymProfileTab({ gym, onUpdated }) {
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
    defaultValues: gym,
  });
  useEffect(() => { reset(gym); }, [gym]);

  // Logo upload
  const [logoPreview, setLogoPreview]       = useState(gym?.logo_url || null);
  const [logoUploading, setLogoUploading]   = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${gym.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('gym-logos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('gym-logos').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('gyms').update({ logo_url: publicUrl }).eq('id', gym.id);
      if (dbErr) throw dbErr;
      setLogoPreview(publicUrl);
      onUpdated({ ...gym, logo_url: publicUrl });
      toast.success('Logo updated!');
    } catch (err) {
      toast.error('Logo upload failed: ' + err.message);
      setLogoPreview(gym?.logo_url || null);
    } finally {
      setLogoUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          name:             data.name,
          owner_name:       data.owner_name,
          phone:            data.phone,
          address:          data.address,
          website:          data.website || null,
          instagram:        data.instagram || null,
          established_year: data.established_year ? Number(data.established_year) : null,
        })
        .eq('id', gym.id);
      if (error) throw error;
      toast.success('Gym profile updated!');
      onUpdated({ ...gym, ...data });
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      {/* Logo upload */}
      <div>
        <label className="label">Gym Logo</label>
        <div className="flex items-center gap-5 mt-1">
          <div
            onClick={() => logoInputRef.current?.click()}
            className="w-20 h-20 rounded-2xl overflow-hidden bg-dark-700 border-2 border-dashed border-white/20 hover:border-primary-500/60 flex items-center justify-center cursor-pointer group transition-all relative"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Camera className="w-7 h-7 text-gray-600 group-hover:text-primary-400 transition-colors" />
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <button type="button" onClick={() => logoInputRef.current?.click()}
              className="btn-secondary text-sm flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" /> Upload Logo
            </button>
            <p className="text-gray-600 text-xs mt-1.5">PNG, JPG, WebP · Max 2 MB</p>
            <p className="text-gray-600 text-xs">Shown in sidebar, reports & member portal</p>
          </div>
          <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      <div>
        <label className="label">Gym Name *</label>
        <input {...register('name', { required: true })} className="input-field" placeholder="Power Fitness Club" />
      </div>
      <div>
        <label className="label">Owner Name *</label>
        <input {...register('owner_name', { required: true })} className="input-field" placeholder="Rajesh Kumar" />
      </div>
      <div>
        <label className="label">Contact Phone</label>
        <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
      </div>
      <div>
        <label className="label">Address</label>
        <textarea {...register('address')} className="input-field" rows={3} placeholder="123 Main Street, Mumbai" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Website</label>
          <input {...register('website')} className="input-field" placeholder="https://" />
        </div>
        <div>
          <label className="label">Instagram</label>
          <input {...register('instagram')} className="input-field" placeholder="@gymname" />
        </div>
      </div>
      <div>
        <label className="label">Established Year</label>
        <input {...register('established_year')} type="number" className="input-field" placeholder="2018" />
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ── ② Theme Tab ───────────────────────────────────────────────
function ThemeTab({ gym, onUpdated }) {
  const [selected, setSelected] = useState(gym.theme_color || '#a21cce');
  const [custom, setCustom] = useState(gym.theme_color || '#a21cce');
  const [saving, setSaving] = useState(false);

  const applyColor = (color) => {
    setSelected(color);
    setCustom(color);
    document.documentElement.style.setProperty('--color-brand', color);
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({ theme_color: selected })
        .eq('id', gym.id);
      if (error) throw error;
      toast.success('Theme saved!');
      onUpdated({ ...gym, theme_color: selected });
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="label mb-3">Preset Colours</p>
        <div className="grid grid-cols-4 gap-3">
          {THEME_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => applyColor(value)}
              title={label}
              className={`h-12 rounded-xl border-2 transition-all ${
                selected === value ? 'border-white scale-105 shadow-lg' : 'border-transparent hover:border-white/40'
              }`}
              style={{ backgroundColor: value }}
            >
              {selected === value && <CheckCircle className="w-5 h-5 text-white mx-auto drop-shadow" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Custom Colour</label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="color"
            value={custom}
            onChange={e => applyColor(e.target.value)}
            className="w-14 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={custom}
            onChange={e => { setCustom(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) applyColor(e.target.value); }}
            className="input-field font-mono w-36"
            placeholder="#a21cce"
          />
          <span
            className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
            style={{ backgroundColor: selected }}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="card border border-white/10 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Preview</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: selected }}
          >
            Primary Button
          </button>
          <span
            className="px-3 py-1 rounded-full text-white text-xs font-medium self-center"
            style={{ backgroundColor: selected + '33', border: `1px solid ${selected}66`, color: selected }}
          >
            Badge
          </span>
        </div>
        <div className="h-1.5 rounded-full w-full bg-dark-600">
          <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: selected }} />
        </div>
      </div>

      <button
        onClick={saveTheme}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
        {saving ? 'Saving...' : 'Apply & Save Theme'}
      </button>
    </div>
  );
}

// ── ③ Plans Tab ───────────────────────────────────────────────
function PlansTab({ gymId }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('gym_id', gymId)
      .order('price');
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [gymId]);

  const onCreate = async (data) => {
    try {
      const { error } = await supabase.from('subscription_plans').insert({
        gym_id: gymId,
        plan_name: data.plan_name,
        duration: data.duration,
        price: Number(data.price),
      });
      if (error) throw error;
      toast.success('Plan created!');
      reset();
      setShowModal(false);
      fetchPlans();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan? Any active subscriptions using it will be affected.')) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) { toast.error('Cannot delete — plan may have active subscriptions'); return; }
    toast.success('Plan deleted');
    fetchPlans();
  };

  const DURATION_LABEL = { monthly: '/ month', quarterly: '/ 3 months', half_yearly: '/ 6 months', yearly: '/ year' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{plans.length} plans configured for this gym</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-dark-700" />)
          : plans.map(p => (
            <div key={p.id} className="card group hover:-translate-y-0.5 transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{p.plan_name}</p>
                  <p className="text-3xl font-bold text-gradient mt-1">₹{p.price}</p>
                  <p className="text-gray-500 text-xs mt-1 capitalize">{DURATION_LABEL[p.duration] || p.duration}</p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Create Plan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Plan</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="p-6 space-y-4">
              <div>
                <label className="label">Plan Name *</label>
                <input {...register('plan_name', { required: true })} className="input-field" placeholder="Gold Monthly" />
              </div>
              <div>
                <label className="label">Duration *</label>
                <select {...register('duration', { required: true })} className="input-field">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (3 months)</option>
                  <option value="half_yearly">Half Yearly (6 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="label">Price (₹) *</label>
                <input {...register('price', { required: true, min: 0 })} type="number" className="input-field" placeholder="999" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ④ Danger Zone Tab ─────────────────────────────────────────
function DangerZoneTab({ gym }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="card border border-red-500/30 bg-red-500/5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-red-300 font-semibold">Danger Zone</h3>
        </div>

        <div className="border-t border-red-500/20 pt-4 space-y-3">
          <div>
            <p className="text-white font-medium text-sm">Export All Data</p>
            <p className="text-gray-500 text-xs mt-0.5">Download a full CSV export of all members, attendance, and subscriptions.</p>
          </div>
          <button
            onClick={() => toast('Use the Reports page → Export CSV to download data.')}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
          >
            Export Data (go to Reports)
          </button>
        </div>

        <div className="border-t border-red-500/20 pt-4 space-y-3">
          <div>
            <p className="text-white font-medium text-sm">Gym Information</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Gym ID: <span className="font-mono text-gray-400">{gym?.id}</span>
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              Gym Code: <span className="font-mono text-primary-400">{gym?.gym_code}</span>
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              Plan: <span className="capitalize text-gray-300">{gym?.plan}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-red-500/20 pt-4">
          <p className="text-gray-500 text-xs">
            ⚠️ To suspend or delete this gym account, contact your platform super admin.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────
export default function GymSettingsPage() {
  const { user } = useAuthStore();
  const [gym, setGym] = useState(user?.gym || null);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(!user?.gym);

  useEffect(() => {
    if (!user?.gym_id) return;
    if (user.gym) { setGym(user.gym); return; }
    const fetchGym = async () => {
      setLoading(true);
      const { data } = await supabase.from('gyms').select('*').eq('id', user.gym_id).single();
      setGym(data);
      setLoading(false);
    };
    fetchGym();
  }, [user?.gym_id]);

  const tabs = [
    { key: 'profile', label: 'Gym Profile',   icon: Building2 },
    { key: 'theme',   label: 'Theme & Branding', icon: Palette },
    { key: 'plans',   label: 'Subscription Plans', icon: CreditCard },
    { key: 'danger',  label: 'Info & Danger',  icon: AlertTriangle },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-400" /> Gym Settings
          </h1>
          <p className="page-subtitle">Manage your gym profile, branding, and subscription plans</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <Tab
            key={t.key}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            icon={t.icon}
            label={t.label}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        {tab === 'profile' && gym && (
          <GymProfileTab gym={gym} onUpdated={setGym} />
        )}
        {tab === 'theme' && gym && (
          <ThemeTab gym={gym} onUpdated={setGym} />
        )}
        {tab === 'plans' && (
          <PlansTab gymId={user.gym_id} />
        )}
        {tab === 'danger' && (
          <DangerZoneTab gym={gym} />
        )}
      </div>
    </div>
  );
}
