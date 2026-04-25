import { useEffect, useState, useRef } from 'react';
import {
  Plus, X, Edit2, Trash2, Shield, Dumbbell, Phone,
  Camera, Loader2, Users, ClipboardCheck, UserCheck2,
  Mail, Clock, IndianRupee, Cake, KeyRound, CheckCircle2, Lock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import ShiftsManager from './ShiftsManager';
import StaffAttendance from './StaffAttendance';
import TrainerAssignments from './TrainerAssignments';
import TrainerHub from './TrainerHub';

// ── Create / Update Login Modal ────────────────────────────────
function CreateLoginModal({ staff, onClose, onSuccess }) {
  // If staff already has a profile_id, we're in "update" (reset) mode
  const isUpdate = !!staff.profile_id;
  const [form,    setForm]    = useState({ email: staff.email || '', password: '' });
  const [saving,  setSaving]  = useState(false);
  const [visible, setVisible] = useState(false);

  const generate = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!';
    const pwd   = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, password: pwd }));
    setVisible(true);
  };

  const save = async () => {
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.password.trim()) { toast.error('Password is required (min 8 characters)'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired — please log in again.');
      const res = await fetch('https://fmikzzectrzpyuhkmmcg.supabase.co/functions/v1/create-staff-login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ staff_id: staff.id, email: form.email.trim(), password: form.password, full_name: staff.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save login');
      if (data.updated) {
        toast.success('Login updated! Share new credentials with staff.');
      } else {
        toast.success('Login created! Share credentials with staff.');
      }
      onSuccess();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="text-white font-bold">
              {isUpdate ? 'Update Staff Login' : 'Create Staff Login'}
            </h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className={`p-3 border rounded-xl text-xs ${isUpdate ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-primary-500/10 border-primary-500/20 text-primary-300'}`}>
            <p className="font-semibold mb-1">{isUpdate ? '🔄 Updating credentials:' : '🔐 What happens:'}</p>
            <p>
              {isUpdate
                ? <>This will <strong>reset the password</strong> for <strong>{staff.full_name}</strong>. The existing login account will be updated with the new email &amp; password you set.</>  
                : <>A secure login account will be created for <strong>{staff.full_name}</strong>. Share the email &amp; password with them — they'll log in at the same URL with a staff-specific dashboard.</>}
            </p>
          </div>
          <div>
            <label className="label">Login Email *</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field" type="email" placeholder="staff@email.com" />
          </div>
          <div>
            <label className="label">{isUpdate ? 'New Password *' : 'Password *'}</label>
            <div className="relative">
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field pr-24" type={visible ? 'text' : 'password'}
                placeholder="Min 8 characters" />
              <button type="button" onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs hover:text-white">
                {visible ? 'Hide' : 'Show'}
              </button>
            </div>
            <button onClick={generate} type="button"
              className="mt-1.5 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Auto-generate strong password
            </button>
          </div>
          {form.password && visible && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-400 font-semibold">📋 Save these credentials:</p>
              <p className="text-white text-sm font-mono mt-1">{form.email}</p>
              <p className="text-white text-sm font-mono">{form.password}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <KeyRound className="w-4 h-4" />}
              {saving ? (isUpdate ? 'Updating…' : 'Creating…') : (isUpdate ? 'Update Login' : 'Create Login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ROLE_STYLES = {
  admin:     'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  trainer:   'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  reception: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  staff:     'bg-gray-500/20 text-gray-300 border border-gray-500/30',
};
const ROLE_ICONS = { admin: Shield, trainer: Dumbbell, reception: Phone, staff: Shield };

// ── Staff Add/Edit Modal ───────────────────────────────────────
function StaffModal({ staff, gymId, onClose, onSave }) {
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: staff || { role: 'trainer', status: 'active' },
  });

  const [photoPreview, setPhotoPreview] = useState(staff?.photo_url || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [shiftId, setShiftId] = useState(staff?.shift_id || null);
  const [photoUrl, setPhotoUrl] = useState(staff?.photo_url || null);
  const photoRef = useRef(null);

  useEffect(() => { reset(staff || { role: 'trainer', status: 'active' }); }, [staff]);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${gymId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('staff-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('staff-photos').getPublicUrl(path);
      setPhotoUrl(publicUrl);
      setPhotoPreview(publicUrl);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Photo upload failed: ' + err.message);
      setPhotoPreview(staff?.photo_url || null);
    } finally { setPhotoUploading(false); }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        full_name:  data.full_name,
        role:       data.role,
        status:     data.status,
        phone:      data.phone,
        email:      data.email,
        dob:        data.dob || null,
        salary:     data.salary ? Number(data.salary) : null,
        photo_url:  photoUrl || null,
        shift_id:   shiftId || null,
      };
      if (staff?.id) {
        const { error } = await supabase.from('staff').update(payload).eq('id', staff.id);
        if (error) throw error;
        toast.success('Staff updated!');
      } else {
        const { error } = await supabase.from('staff').insert({ ...payload, gym_id: gymId });
        if (error) throw error;
        toast.success('Staff added!');
      }
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const initials = watch('full_name')?.charAt(0) || '?';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Photo avatar */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => photoRef.current?.click()}
                className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center cursor-pointer ring-2 ring-white/10 hover:ring-primary-500/60 transition-all group"
                title="Click to upload photo"
              >
                {photoPreview
                  ? <img src={photoPreview} alt="staff" className="w-full h-full object-cover" />
                  : <span className="text-white text-xl font-bold">{initials}</span>}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  {photoUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{staff?.id ? 'Edit Staff' : 'Add Staff'}</h2>
              <p className="text-gray-500 text-xs mt-0.5">Click avatar to add photo</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Personal info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('full_name', { required: true })} className="input-field" placeholder="Full Name" />
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register('role')} className="input-field">
                <option value="trainer">Trainer</option>
                <option value="reception">Reception</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="staff@email.com" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input {...register('dob')} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Salary (₹/mo)</label>
              <input {...register('salary')} type="number" className="input-field" placeholder="e.g. 15000" />
            </div>
          </div>

          {/* Shift assignment */}
          <div className="border border-white/8 rounded-2xl p-4">
            <ShiftsManager gymId={gymId} selectedId={shiftId} onSelect={setShiftId} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : staff?.id ? 'Update Staff' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Staff Detail Drawer (view tabs: info / PT assignments) ─────
function StaffDetailDrawer({ staff, onClose, onEdit, onRefresh }) {
  const [tab, setTab] = useState('info');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const tabs = [
    { id: 'info', label: 'Details' },
    ...(staff.role === 'trainer' ? [
      { id: 'pt',  label: 'PT Members' },
      { id: 'hub', label: 'Workout Hub' },
    ] : []),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {staff.photo_url ? <img src={staff.photo_url} alt={staff.full_name} className="w-full h-full object-cover" /> : staff.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-white font-bold">{staff.full_name}</h2>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[staff.role] || ROLE_STYLES.staff}`}>
                {staff.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><Edit2 className="w-4 h-4" /></button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex border-b border-white/5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {tab === 'info' && (
            <div className="space-y-3 text-sm text-gray-400">
              {staff.phone    && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> {staff.phone}</p>}
              {staff.email    && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> {staff.email}</p>}
              {staff.dob      && <p className="flex items-center gap-2"><Cake className="w-3.5 h-3.5 flex-shrink-0" /> {new Date(staff.dob).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>}
              {staff.salary   && <p className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 flex-shrink-0" /> ₹{Number(staff.salary).toLocaleString('en-IN')}/mo</p>}
              {staff.gym_shifts && (
                <div className="mt-3 p-3 bg-dark-700 rounded-xl">
                  <p className="text-white font-semibold text-sm flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {staff.gym_shifts.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{staff.gym_shifts.start_time?.slice(0,5)} – {staff.gym_shifts.end_time?.slice(0,5)}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{(staff.gym_shifts.days || []).join(', ')}</p>
                </div>
              )}
              <div className="mt-3">
                <span className={staff.status === 'active' ? 'badge-active' : 'badge-expired'}>{staff.status}</span>
              </div>

              {/* Login Status + Create / Update Login */}
              <div className="mt-4 p-3 rounded-xl border border-white/5 bg-dark-700/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Portal Access</p>
                {staff.profile_id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-400 text-sm font-medium">Login Active</span>
                    </div>
                    <button onClick={() => setShowLoginModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 mt-1">
                      <KeyRound className="w-3.5 h-3.5" /> Reset / Update Password
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500 text-xs">No login created yet.</p>
                    <button onClick={() => setShowLoginModal(true)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Create Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'pt'  && <TrainerAssignments trainer={staff} />}
          {tab === 'hub' && <TrainerHub trainer={staff} />}
        </div>
      </div>

      {showLoginModal && (
        <CreateLoginModal
          staff={staff}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => { setShowLoginModal(false); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('staff'); // 'staff' | 'attendance'
  const [modalStaff, setModalStaff] = useState(undefined);
  const [detailStaff, setDetailStaff] = useState(null);
  const { user } = useAuthStore();

  const fetchStaff = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*, gym_shifts(id, name, start_time, end_time, days)')
        .eq('gym_id', user.gym_id)
        .order('full_name');
      if (error) throw error;
      setStaffList(data || []);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, [user?.gym_id]);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this staff member?')) return;
    await supabase.from('staff').update({ status: 'inactive' }).eq('id', id);
    toast.success('Staff deactivated');
    fetchStaff();
  };

  const activeCount = staffList.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{activeCount} active · {staffList.length} total</p>
        </div>
        {tab === 'staff' && (
          <button onClick={() => setModalStaff(null)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-white/10 w-fit">
        {[
          { id: 'staff',      label: 'Staff List',  icon: Users },
          { id: 'attendance', label: 'Attendance',  icon: ClipboardCheck },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Staff List Tab ── */}
      {tab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-44 animate-pulse bg-dark-700" />)
            : staffList.length === 0
            ? (
              <div className="col-span-3 card text-center py-14">
                <UserCheck2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No staff members yet</p>
                <p className="text-gray-600 text-sm mt-1">Click "Add Staff" to get started</p>
              </div>
            )
            : staffList.map(s => {
                const RoleIcon = ROLE_ICONS[s.role] || Shield;
                return (
                  <div
                    key={s.id}
                    className="card hover:-translate-y-0.5 transition-transform cursor-pointer group"
                    onClick={() => setDetailStaff(s)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ring-1 ring-white/10">
                          {s.photo_url
                            ? <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                            : s.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{s.full_name}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[s.role] || ROLE_STYLES.staff}`}>
                            <RoleIcon className="w-3 h-3" /> {s.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setModalStaff(s); }} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-gray-400">
                      {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> {s.phone}</p>}
                      {s.email && <p className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> {s.email}</p>}
                      {s.gym_shifts && <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> {s.gym_shifts.name} · {s.gym_shifts.start_time?.slice(0,5)}–{s.gym_shifts.end_time?.slice(0,5)}</p>}
                      {s.salary && <p className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 flex-shrink-0" /> ₹{Number(s.salary).toLocaleString('en-IN')}/mo</p>}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className={s.status === 'active' ? 'badge-active' : 'badge-expired'}>{s.status}</span>
                      <div className="flex items-center gap-1.5">
                        {s.profile_id && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <KeyRound className="w-2.5 h-2.5" /> Login
                          </span>
                        )}
                        {s.role === 'trainer' && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><Dumbbell className="w-3 h-3" /> PT</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {tab === 'attendance' && (
        <div className="card">
          <StaffAttendance staffList={staffList} />
        </div>
      )}

      {/* Add/Edit modal */}
      {modalStaff !== undefined && (
        <StaffModal
          staff={modalStaff}
          gymId={user.gym_id}
          onClose={() => setModalStaff(undefined)}
          onSave={() => { setModalStaff(undefined); fetchStaff(); }}
        />
      )}

      {/* Detail drawer */}
      {detailStaff && (
        <StaffDetailDrawer
          staff={detailStaff}
          onClose={() => setDetailStaff(null)}
          onEdit={() => { setModalStaff(detailStaff); setDetailStaff(null); }}
          onRefresh={fetchStaff}
        />
      )}
    </div>
  );
}
