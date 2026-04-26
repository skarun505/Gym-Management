import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import {
  UserCog, Building2, Phone, Mail, Calendar, Shield,
  Dumbbell, Clock, Loader2, Hash, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffProfilePage() {
  const { user } = useAuthStore();
  const [staffRow, setStaffRow] = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    if (!user?.id || !user?.gym_id) return;
    setLoading(true);
    // FIX: use correct column names — shift_info (not shift), created_at (not joined_at)
    const { data, error } = await supabase
      .from('staff')
      .select('id, full_name, role, email, phone, shift_info, created_at, status, photo_url, profile_id, staff_code, dob, salary')
      .eq('profile_id', user.id)
      .eq('gym_id', user.gym_id)
      .maybeSingle();

    if (error) {
      console.error('[StaffProfile] Error:', error);
      toast.error('Could not load profile');
    }
    setStaffRow(data || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, user?.gym_id]);

  const themeColor = user?.gym?.theme_color || '#a21cce';

  const ROLE_LABEL = {
    trainer:      { label: 'Personal Trainer', icon: Dumbbell, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    receptionist: { label: 'Receptionist',     icon: Clock,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    staff:        { label: 'Staff Member',      icon: UserCog,  color: 'text-gray-400 bg-white/5 border-white/10' },
    manager:      { label: 'Manager',           icon: Shield,   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };

  const roleKey  = staffRow?.role?.toLowerCase() || 'staff';
  const roleInfo = ROLE_LABEL[roleKey] || ROLE_LABEL.staff;
  const RoleIcon = roleInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!staffRow) {
    return (
      <div className="card text-center py-12 space-y-3">
        <UserCog className="w-10 h-10 text-gray-700 mx-auto" />
        <p className="text-gray-400 font-medium">Profile not found</p>
        <p className="text-gray-600 text-sm">
          Your staff profile hasn't been linked yet. Contact your admin.
        </p>
        <button onClick={load} className="btn-secondary flex items-center gap-2 mx-auto text-sm">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const info = [
    { label: 'Email',      value: staffRow.email      || user?.email || '—',   icon: Mail },
    { label: 'Phone',      value: staffRow.phone       || '—',                  icon: Phone },
    { label: 'Shift',      value: staffRow.shift_info  || '—',                  icon: Clock },
    { label: 'Staff Code', value: staffRow.staff_code  || '—',                  icon: Hash },
    { label: 'Joined',     value: staffRow.created_at
        ? new Date(staffRow.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—',                                                                   icon: Calendar },
    { label: 'Gym',        value: user?.gym?.name      || '—',                  icon: Building2 },
    { label: 'Status',     value: staffRow.status      || 'active',             icon: Shield },
  ];

  const initials = (staffRow.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <UserCog className="w-6 h-6 text-primary-400" /> My Profile
        </h1>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Avatar card */}
      <div className="card flex items-center gap-5 p-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0 overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
        >
          {staffRow.photo_url
            ? <img src={staffRow.photo_url} alt={staffRow.full_name} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xl font-bold truncate">{staffRow.full_name}</h2>
          <span className={`mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${roleInfo.color}`}>
            <RoleIcon className="w-3.5 h-3.5" /> {roleInfo.label}
          </span>
          <p className="text-gray-600 text-xs mt-2 truncate">{user?.gym?.name}</p>
        </div>
      </div>

      {/* Info grid */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Account Details</p>
        <div className="divide-y divide-white/5">
          {info.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5 text-gray-500">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{label}</span>
              </div>
              <span className={`text-sm font-medium max-w-[55%] text-right truncate ${
                label === 'Status'
                  ? value === 'active' ? 'text-emerald-400' : 'text-red-400'
                  : 'text-white'
              } capitalize`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Login info */}
      <div className="card p-5 border border-primary-500/20 bg-primary-500/5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Login Info</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Login Email</span>
            <span className="text-white font-mono text-xs bg-dark-700 px-2 py-1 rounded-lg">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Role</span>
            <span className="text-primary-400 capitalize text-sm font-semibold">{user?.role}</span>
          </div>
          {user?.sub_role && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Sub-role</span>
              <span className="text-primary-300 capitalize text-sm font-semibold">{user.sub_role}</span>
            </div>
          )}
        </div>
        <p className="text-gray-600 text-xs mt-4">
          To update your password or email, contact your gym admin.
        </p>
      </div>
    </div>
  );
}
