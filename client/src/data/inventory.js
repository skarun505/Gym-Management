import { supabase } from '../lib/supabase';

// Column names verified against the live `inventory` table.
// IMPORTANT: the item name column is `item_name`, NOT `name`.
// Using `name` will silently return null — this was a confirmed bug in
// NotificationBell.jsx (now fixed) that went undetected because Supabase
// PostgREST returns null rather than an error for unknown column selects.
const INVENTORY_COLUMNS =
  'id, gym_id, item_name, quantity, condition, purchase_date, supplier, maintenance_due, low_stock_alert, created_at';

/**
 * List all inventory items for a gym.
 */
export function listInventory(gymId) {
  return supabase
    .from('inventory')
    .select(INVENTORY_COLUMNS)
    .eq('gym_id', gymId)
    .order('item_name', { ascending: true });
}

/**
 * Get low-stock items for a gym (items at or below their alert threshold).
 * Used in NotificationBell and Reports.
 */
export function getLowStockItems(gymId) {
  return supabase
    .from('inventory')
    .select('id, item_name, quantity, low_stock_alert')
    .eq('gym_id', gymId);
  // Note: PostgREST doesn't support col <= col filters directly.
  // Filter client-side: items.filter(i => i.quantity <= i.low_stock_alert)
}

/**
 * Count low-stock items (must filter client-side after fetch).
 * Returns the raw array so the caller can both count and display details.
 */
export async function getLowStockCount(gymId) {
  const { data, error } = await getLowStockItems(gymId);
  if (error) throw error;
  return (data || []).filter(i => i.quantity <= i.low_stock_alert).length;
}

/**
 * Get items due for maintenance.
 */
export function getMaintenanceDueItems(gymId) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('inventory')
    .select('id, item_name, maintenance_due, condition')
    .eq('gym_id', gymId)
    .not('maintenance_due', 'is', null)
    .lte('maintenance_due', today)
    .order('maintenance_due', { ascending: true });
}
