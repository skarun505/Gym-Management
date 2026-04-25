import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import {
  UserCog, Building2, Phone, Mail, Calendar, Shield,
  Dumbbell, Clock, Loader2,
} from 'lucide-react';

export default function StaffProfilePage() {
  const { user } = useAuthStore();
  const [staffRow, setStaffRow] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.gym_id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('staff')
        .select('id, full_name, role, email, phone, shift, joined_at, status, photo_url, profile_id')
        .eq('profile_id', user.id)
        .eq('gym_id', user.gym_id)
        .maybeSingle();
      setStaffRow(data);
      setLoading(false);
    };
    load();
  }, [user?.id, user?.gym_id]);

  const themeColor = user?.gym?.theme_color || '#10b981';

  const ROLE_LABEL = {
    trainer:      { label: 'Personal Trainer', icon: Dumbbell, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    receptionist: { label: 'Receptionist',      icon: Clock,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    staff:        { label: 'Staff Member',       icon: UserCog,  color: 'text-gray-400 bg-white/5 border-white/10' },
  };

  const roleInfo = ROLE_LABEL[staffRow?.role || 'staff'] || ROLE_LABEL.staff;
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
      <div className="card text-center py-12">
        <UserCog className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Profile not found</p>
        <p className="text-gray-600 text-sm mt-1">Please contact your admin to set up your profile.</p>
      </div>
    );
  }

  const info = [
    { label: 'Email',      value: staffRow.email  || user?.email || '—', icon: Mail },
    { label: 'Phone',      value: staffRow.phone  || '—',                icon: Phone },
    { label: 'Shift',      value: staffRow.shift  || '—',                icon: Clock },
    { label: 'Joined',     value: staffRow.joined_at ? new Date(staffRow.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
    { label: 'Gym',        value: user?.gym?.name || '—',                icon: Building2 },
    { label: 'Status',     value: staffRow.status || 'active',           icon: Shield },
  ];

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <UserCog className="w-6 h-6 text-primary-400" /> My Profile
        </h1>
      </div>

      {/* Avatar card */}
      <div className="card flex items-center gap-5 p-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}
        >
          {staffRow.photo_url
            ? <img src={staffRow.photo_url} alt={staffRow.full_name} className="w-full h-full object-cover" />
            : staffRow.full_name.charAt(0)
          }
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold">{staffRow.full_name}</h2>
          <span className={`mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-semibold ${roleInfo.color}`}>
            <RoleIcon className="w-3.5 h-3.5" /> {roleInfo.label}
          </span>
          <p className="text-gray-600 text-xs mt-2">{user?.gym?.name}</p>
        </div>
      </div>

      {/* Info grid */}
      <div className="card p-5 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Account Details</p>
        <div className="divide-y divide-white/5">
          {info.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5 text-gray-500">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{label}</span>
              </div>
              <span className={`text-sm font-medium ${
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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Login Email</span>
            <span className="text-white font-mono text-xs">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Role</span>
            <span className="text-primary-400 capitalize">{user?.role}</span>
          </div>
        </div>
        <p className="text-gray-600 text-xs mt-4">
          To update your password or email, contact your gym admin.
        </p>
      </div>
    </div>
  );
}
