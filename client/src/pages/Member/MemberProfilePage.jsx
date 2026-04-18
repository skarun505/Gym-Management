import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Phone, Mail, MapPin, Target, LogOut, Edit2, Save, X, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MemberProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [member, setMember]     = useState(null);
  const [latestMeasure, setLatestMeasure] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(true);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('members').select('*').eq('profile_id', user.id).maybeSingle();
      setMember(m);
      if (m) {
        reset({
          phone:        m.phone || '',
          email:        m.email || '',
          address:      m.address || '',
          fitness_goal: m.fitness_goal || '',
          health_notes: m.health_notes || '',
        });
        const { data: meas } = await supabase
          .from('member_measurements').select('*')
          .eq('member_id', m.id)
          .order('logged_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        setLatestMeasure(meas);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from('members').update({
        phone:        data.phone,
        email:        data.email,
        address:      data.address,
        fitness_goal: data.fitness_goal,
        health_notes: data.health_notes,
      }).eq('id', member.id);
      if (error) throw error;
      setMember(prev => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Profile Hero */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-3xl font-black text-white flex-shrink-0 shadow-xl shadow-primary-600/30">
            {(member?.full_name || user?.name || 'M').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white truncate">
              {member?.full_name || user?.name}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5 font-mono">
              {member?.member_code || '—'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                member?.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {member?.status || 'active'}
              </span>
              {member?.joined_at && (
                <span className="text-xs text-gray-600">
                  Since {new Date(member.joined_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditing(p => !p)}
            className={`p-2.5 rounded-xl border transition-all ${
              editing
                ? 'bg-primary-600/20 border-primary-500/30 text-primary-400'
                : 'bg-dark-700 border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {editing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Latest Measurements */}
      {latestMeasure && (
        <div className="px-5 pb-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-emerald-400" />
              <p className="text-white font-bold text-sm">Latest Measurements</p>
              <span className="ml-auto text-xs text-gray-500">
                {latestMeasure.logged_date}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Weight', value: latestMeasure.weight_kg, unit: 'kg' },
                { label: 'Body Fat', value: latestMeasure.body_fat_pct, unit: '%' },
                { label: 'Waist', value: latestMeasure.waist_cm, unit: 'cm' },
              ].filter(m => m.value).map(({ label, value, unit }) => (
                <div key={label} className="bg-dark-700 rounded-xl p-2.5 text-center">
                  <p className="text-white font-black text-base">{value}<span className="text-gray-500 text-xs font-normal">{unit}</span></p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Details / Edit Form */}
      <div className="px-5 pb-4">
        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary-400" /> Edit Profile
            </h2>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="you@email.com" />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea {...register('address')} className="input-field" rows={2} placeholder="Your address" />
            </div>
            <div>
              <label className="label">Fitness Goal</label>
              <input {...register('fitness_goal')} className="input-field" placeholder="Weight loss, muscle gain…" />
            </div>
            <div>
              <label className="label">Health Notes</label>
              <textarea {...register('health_notes')} className="input-field" rows={2} placeholder="Medical conditions, allergies…" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="card space-y-3">
            <h2 className="text-white font-bold text-sm mb-4">Contact & Details</h2>
            {[
              { icon: Phone, label: 'Phone', value: member?.phone },
              { icon: Mail,  label: 'Email', value: member?.email },
              { icon: MapPin, label: 'Address', value: member?.address },
              { icon: Target, label: 'Fitness Goal', value: member?.fitness_goal },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-gray-300 text-sm mt-0.5">{value || '—'}</p>
                </div>
              </div>
            ))}
            {member?.health_notes && (
              <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Health Notes</p>
                <p className="text-amber-300/80 text-sm">{member.health_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="px-5 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors font-semibold text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
