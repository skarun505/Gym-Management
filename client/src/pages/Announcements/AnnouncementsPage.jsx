import { useEffect, useState } from 'react';
import { Megaphone, Plus, X, Trash2, AlertTriangle, Info, Zap, Bell, Edit2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20', icon: Info },
  normal: { label: 'Normal', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20', icon: Bell },
  high:   { label: 'High',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20', icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',  icon: Zap },
};

const EMOJIS = ['📢','🏆','💡','⚠️','🎉','🔔','💪','🗓️','🚀','🎯'];

function AnnouncementModal({ ann, gymId, onClose, onSave }) {
  const isEdit = !!ann;
  const [form, setForm] = useState({
    title:      ann?.title      || '',
    body:       ann?.body       || '',
    emoji:      ann?.emoji      || '📢',
    priority:   ann?.priority   || 'normal',
    expires_at: ann?.expires_at || '',
    is_active:  ann?.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        gym_id:     gymId,
        title:      form.title.trim(),
        body:       form.body.trim(),
        emoji:      form.emoji,
        priority:   form.priority,
        is_active:  form.is_active,
        expires_at: form.expires_at || null,
        posted_by:  user?.id,
      };

      if (isEdit) {
        const { error } = await supabase.from('gym_announcements').update(payload).eq('id', ann.id);
        if (error) throw error;
        toast.success('Announcement updated!');
      } else {
        const { error } = await supabase.from('gym_announcements').insert(payload);
        if (error) throw error;
        toast.success('Announcement posted!');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="text-white font-bold">{isEdit ? 'Edit Announcement' : 'New Announcement'}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji picker */}
          <div>
            <label className="label">Icon</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  className={`w-10 h-10 rounded-xl text-lg transition-all ${
                    form.emoji === e ? 'bg-primary-600/30 ring-2 ring-primary-500' : 'bg-dark-700 hover:bg-dark-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input-field"
              placeholder="Gym maintenance this Sunday..."
              maxLength={80}
            />
          </div>

          <div>
            <label className="label">Message *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className="input-field"
              rows={4}
              placeholder="The gym will be closed on Sunday 9 AM–2 PM for maintenance..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, priority: key }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.priority === key
                      ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                      : 'border-white/8 bg-dark-700/40 text-gray-500 hover:border-white/20'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expires On <span className="text-gray-600 font-normal">(optional)</span></label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-primary-500 w-4 h-4"
                />
                <span className="text-gray-300 text-sm font-medium">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchAll = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('gym_announcements')
      .select('*')
      .eq('gym_id', user.gym_id)
      .order('created_at', { ascending: false });
    if (!error) setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user?.gym_id]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await supabase.from('gym_announcements').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchAll();
  };

  const handleToggle = async (id, current) => {
    await supabase.from('gym_announcements').update({ is_active: !current }).eq('id', id);
    fetchAll();
  };

  const active   = announcements.filter(a => a.is_active);
  const inactive = announcements.filter(a => !a.is_active);

  const AnnCard = ({ ann }) => {
    const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
    const PIcon = cfg.icon;
    const isExpired = ann.expires_at && ann.expires_at < new Date().toISOString().split('T')[0];
    return (
      <div className={`card border ${cfg.border} ${isExpired ? 'opacity-50' : ''} hover:-translate-y-0.5 transition-transform`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0 mt-0.5">{ann.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-white font-semibold text-sm">{ann.title}</h3>
                <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <PIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
                {!ann.is_active && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500">Draft</span>
                )}
                {isExpired && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Expired</span>
                )}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{ann.body}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-600 text-xs">
                  Posted {new Date(ann.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                </span>
                {ann.expires_at && (
                  <span className="text-gray-600 text-xs">Expires {ann.expires_at}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleToggle(ann.id, ann.is_active)}
              className={`p-1.5 rounded-lg transition-colors text-xs font-semibold ${
                ann.is_active
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
              title={ann.is_active ? 'Deactivate' : 'Activate'}
            >
              {ann.is_active ? '●' : '○'}
            </button>
            <button
              onClick={() => setEditTarget(ann)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(ann.id)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-primary-400" />
            Announcements
          </h1>
          <p className="page-subtitle">Post notices and updates to your members</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: announcements.length, color: 'text-white' },
          { label: 'Active', value: active.length, color: 'text-emerald-400' },
          { label: 'Draft/Inactive', value: inactive.length, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Active Announcements */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Active ({active.length})
          </h2>
          {active.map(ann => <AnnCard key={ann.id} ann={ann} />)}
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-gray-500 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
            Inactive / Draft ({inactive.length})
          </h2>
          {inactive.map(ann => <AnnCard key={ann.id} ann={ann} />)}
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div className="card text-center py-16">
          <Megaphone className="w-14 h-14 text-gray-700 mx-auto mb-4" />
          <p className="text-white font-semibold">No announcements yet</p>
          <p className="text-gray-500 text-sm mt-1 mb-5">Post updates, notices, or motivation for your members</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Announcement
          </button>
        </div>
      )}

      {showModal && (
        <AnnouncementModal
          gymId={user.gym_id}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchAll(); }}
        />
      )}
      {editTarget && (
        <AnnouncementModal
          ann={editTarget}
          gymId={user.gym_id}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
