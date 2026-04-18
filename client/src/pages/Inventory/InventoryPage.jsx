import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Trash2, AlertTriangle, Wrench, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CONDITION_STYLES = {
  good: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  fair: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  poor: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

// ── Inventory Modal ───────────────────────────────────────────
function InventoryModal({ item, gymId, onClose, onSave }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: item || { condition: 'good', quantity: 1, low_stock_alert: 2 },
  });
  useEffect(() => { reset(item || { condition: 'good', quantity: 1, low_stock_alert: 2 }); }, [item]);

  const onSubmit = async (data) => {
    try {
      if (item?.id) {
        const { error } = await supabase.from('inventory').update({
          item_name: data.item_name,
          quantity: Number(data.quantity),
          condition: data.condition,
          purchase_date: data.purchase_date || null,
          maintenance_due: data.maintenance_due || null,
          supplier: data.supplier,
          low_stock_alert: Number(data.low_stock_alert),
        }).eq('id', item.id);
        if (error) throw error;
        toast.success('Item updated!');
      } else {
        const { error } = await supabase.from('inventory').insert({
          gym_id: gymId,
          item_name: data.item_name,
          quantity: Number(data.quantity),
          condition: data.condition,
          purchase_date: data.purchase_date || null,
          maintenance_due: data.maintenance_due || null,
          supplier: data.supplier,
          low_stock_alert: Number(data.low_stock_alert),
        });
        if (error) throw error;
        toast.success('Item added!');
      }
      onSave();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{item?.id ? 'Edit Item' : 'Add Equipment'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">Item Name *</label>
            <input {...register('item_name', { required: true })} className="input-field" placeholder="Treadmill, Dumbbell set..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input {...register('quantity')} type="number" min="0" className="input-field" />
            </div>
            <div>
              <label className="label">Condition</label>
              <select {...register('condition')} className="input-field">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input {...register('purchase_date')} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Maintenance Due</label>
              <input {...register('maintenance_due')} type="date" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier</label>
              <input {...register('supplier')} className="input-field" placeholder="Supplier name" />
            </div>
            <div>
              <label className="label">Low Stock Alert At</label>
              <input {...register('low_stock_alert')} type="number" min="0" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : item?.id ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(undefined);
  const { user } = useAuthStore();

  const fetchAll = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('gym_id', user.gym_id)
        .order('item_name');
      if (error) throw error;
      setItems(data || []);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [user?.gym_id]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this item?')) return;
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Item removed');
    fetchAll();
  };

  // Compute alerts from data
  const today = new Date().toISOString().split('T')[0];
  const lowStock = items.filter(i => i.quantity <= i.low_stock_alert);
  const maintenanceDue = items.filter(i => i.maintenance_due && i.maintenance_due <= today);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{items.length} equipment items</p>
        </div>
        <button onClick={() => setModalItem(null)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Alert Panels */}
      {(lowStock.length > 0 || maintenanceDue.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="card border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-amber-300 font-semibold text-sm">Low Stock ({lowStock.length})</h3>
              </div>
              {lowStock.map(i => (
                <p key={i.id} className="text-sm text-amber-400/80">{i.item_name} — {i.quantity} left (alert at {i.low_stock_alert})</p>
              ))}
            </div>
          )}
          {maintenanceDue.length > 0 && (
            <div className="card border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-red-400" />
                <h3 className="text-red-300 font-semibold text-sm">Maintenance Due ({maintenanceDue.length})</h3>
              </div>
              {maintenanceDue.map(i => (
                <p key={i.id} className="text-sm text-red-400/80">{i.item_name} — due {i.maintenance_due}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Condition</th>
                <th>Supplier</th>
                <th>Purchase Date</th>
                <th>Maintenance Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No inventory items yet</p>
                  </td>
                </tr>
              ) : items.map(i => (
                <tr key={i.id} className={i.condition === 'poor' ? 'bg-red-500/5' : ''}>
                  <td>
                    <p className="text-white font-medium">{i.item_name}</p>
                    {i.quantity <= i.low_stock_alert && <p className="text-amber-400 text-xs mt-0.5">⚠ Low stock</p>}
                  </td>
                  <td>
                    <span className={`font-bold text-lg ${i.quantity <= i.low_stock_alert ? 'text-amber-400' : 'text-gray-300'}`}>
                      {i.quantity}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONDITION_STYLES[i.condition] || ''}`}>
                      {i.condition}
                    </span>
                  </td>
                  <td className="text-gray-400 text-sm">{i.supplier || '—'}</td>
                  <td className="text-gray-400 text-sm">{i.purchase_date || '—'}</td>
                  <td className={`text-sm font-medium ${i.maintenance_due && i.maintenance_due <= today ? 'text-red-400' : 'text-gray-400'}`}>
                    {i.maintenance_due || '—'}
                    {i.maintenance_due && i.maintenance_due <= today && <span className="ml-1 text-xs">⚠</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => setModalItem(i)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(i.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalItem !== undefined && (
        <InventoryModal
          item={modalItem}
          gymId={user.gym_id}
          onClose={() => setModalItem(undefined)}
          onSave={() => { setModalItem(undefined); fetchAll(); }}
        />
      )}
    </div>
  );
}
