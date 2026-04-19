import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Trash2, Shield, Dumbbell, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  admin: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  trainer: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  reception: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  staff: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
};

const ROLE_ICONS = {
  admin: Shield,
  trainer: Dumbbell,
  reception: Phone,
};

// ── Staff Modal ───────────────────────────────────────────────
function StaffModal({ staff, gymId, onClose, onSave }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: staff || { role: 'trainer', status: 'active' },
  });
  useEffect(() => { reset(staff || { role: 'trainer', status: 'active' }); }, [staff]);

  const onSubmit = async (data) => {
    try {
      if (staff?.id) {
        const { error } = await supabase.from('staff').update({
          full_name: data.full_name,
          role:      data.role,
          status:    data.status,
          phone:     data.phone,
          email:     data.email,
          shift_info: data.shift_info,
          dob:       data.dob || null,
          salary:    data.salary ? Number(data.salary) : null,
        }).eq('id', staff.id);
        if (error) throw error;
        toast.success('Staff updated!');
      } else {
        const { error } = await supabase.from('staff').insert({
          gym_id:    gymId,
          full_name: data.full_name,
          role:      data.role,
          status:    data.status || 'active',
          phone:     data.phone,
          email:     data.email,
          shift_info: data.shift_info,
          dob:       data.dob || null,
          salary:    data.salary ? Number(data.salary) : null,
        });
        if (error) throw error;
        toast.success('Staff added!');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{staff?.id ? 'Edit Staff' : 'Add Staff'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input {...register('full_name', { required: true })} className="input-field" placeholder="Full Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="staff@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <input {...register('dob')} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Salary (₹)</label>
              <input {...register('salary')} type="number" className="input-field" placeholder="e.g. 15000" />
            </div>
          </div>
          <div>
            <label className="label">Shift Info</label>
            <input {...register('shift_info')} className="input-field" placeholder="Morning 6AM – 2PM" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : staff?.id ? 'Update' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalStaff, setModalStaff] = useState(undefined);
  const { user } = useAuthStore();

  const fetchStaff = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
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
    const { error } = await supabase.from('staff').update({ status: 'inactive' }).eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Staff deactivated');
    fetchStaff();
  };

  const activeCount = staffList.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{activeCount} active · {staffList.length} total</p>
        </div>
        <button onClick={() => setModalStaff(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-40 animate-pulse bg-dark-700" />)
          : staffList.length === 0
          ? (
            <div className="col-span-3 card text-center py-14">
              <p className="text-gray-400 font-medium">No staff members yet</p>
              <p className="text-gray-600 text-sm mt-1">Click "Add Staff" to get started</p>
            </div>
          )
          : staffList.map(s => {
              const RoleIcon = ROLE_ICONS[s.role] || Shield;
              return (
                <div key={s.id} className="card hover:-translate-y-0.5 transition-transform group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{s.full_name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLES[s.role] || ROLE_STYLES.staff}`}>
                          <RoleIcon className="w-3 h-3" />
                          {s.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModalStaff(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-gray-400">
                    {s.phone && <p className="flex items-center gap-2">📱 {s.phone}</p>}
                    {s.email && <p className="flex items-center gap-2 truncate">✉️ {s.email}</p>}
                    {s.shift_info && <p className="flex items-center gap-2">🕐 {s.shift_info}</p>}
                    {s.dob && <p className="flex items-center gap-2">🎂 {new Date(s.dob).toLocaleDateString('en-IN')}</p>}
                    {s.salary && <p className="flex items-center gap-2">💰 ₹{s.salary.toLocaleString('en-IN')}/mo</p>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className={s.status === 'active' ? 'badge-active' : 'badge-expired'}>
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {modalStaff !== undefined && (
        <StaffModal
          staff={modalStaff}
          gymId={user.gym_id}
          onClose={() => setModalStaff(undefined)}
          onSave={() => { setModalStaff(undefined); fetchStaff(); }}
        />
      )}
    </div>
  );
}
