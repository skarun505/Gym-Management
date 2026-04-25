import { useEffect, useState } from 'react';
import { Plus, X, Clock, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function ShiftForm({ shift, gymId, onClose, onSave }) {
  const [name, setName] = useState(shift?.name || '');
  const [start, setStart] = useState(shift?.start_time || '06:00');
  const [end, setEnd] = useState(shift?.end_time || '14:00');
  const [days, setDays] = useState(shift?.days || ['Mon','Tue','Wed','Thu','Fri','Sat']);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const save = async () => {
    if (!name.trim()) return toast.error('Shift name required');
    setSaving(true);
    try {
      const payload = { gym_id: gymId, name: name.trim(), start_time: start, end_time: end, days };
      const { error } = shift?.id
        ? await supabase.from('gym_shifts').update({ name: payload.name, start_time: start, end_time: end, days }).eq('id', shift.id)
        : await supabase.from('gym_shifts').insert(payload);
      if (error) throw error;
      toast.success(shift?.id ? 'Shift updated!' : 'Shift created!');
      onSave();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-white font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" />{shift?.id ? 'Edit Shift' : 'New Shift'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Shift Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Morning, Evening..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Working Days</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${days.includes(d) ? 'bg-primary-600 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Shift'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShiftsManager({ gymId, onSelect, selectedId }) {
  const [shifts, setShifts] = useState([]);
  const [modal, setModal] = useState(undefined); // undefined=closed, null=new, obj=edit

  const load = async () => {
    const { data } = await supabase.from('gym_shifts').select('*').eq('gym_id', gymId).order('name');
    setShifts(data || []);
  };

  useEffect(() => { if (gymId) load(); }, [gymId]);

  const del = async (id) => {
    if (!confirm('Delete this shift?')) return;
    await supabase.from('gym_shifts').delete().eq('id', id);
    toast.success('Shift deleted');
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Assign Shift</h3>
        <button onClick={() => setModal(null)} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
          <Plus className="w-3.5 h-3.5" /> New Shift
        </button>
      </div>

      {shifts.length === 0 ? (
        <p className="text-gray-500 text-sm">No shifts created yet.</p>
      ) : (
        <div className="grid gap-2">
          {shifts.map(s => (
            <label key={s.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedId === s.id ? 'border-primary-500 bg-primary-600/15' : 'border-white/8 hover:border-white/20 bg-dark-700/40'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="shift" checked={selectedId === s.id} onChange={() => onSelect(s.id)} className="accent-primary-500" />
                <div>
                  <p className="text-white text-sm font-semibold">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)} · {(s.days||[]).join(', ')}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={e => { e.preventDefault(); setModal(s); }} className="p-1 text-gray-500 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={e => { e.preventDefault(); del(s.id); }} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </label>
          ))}
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${!selectedId ? 'border-primary-500 bg-primary-600/15' : 'border-white/8 hover:border-white/20 bg-dark-700/40'}`}>
            <input type="radio" name="shift" checked={!selectedId} onChange={() => onSelect(null)} className="accent-primary-500" />
            <p className="text-gray-400 text-sm">No shift assigned</p>
          </label>
        </div>
      )}

      {modal !== undefined && (
        <ShiftForm shift={modal} gymId={gymId} onClose={() => setModal(undefined)}
          onSave={() => { setModal(undefined); load(); }} />
      )}
    </div>
  );
}
