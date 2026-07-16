// ── client/src/data/index.js ─────────────────────────────────────────────────
// Barrel export for all shared query helpers.
// Import from here instead of individual files when using multiple modules.
//
// All helpers in this directory have their column names verified against the
// live production Supabase schema (fmikzzectrzpyuhkmmcg). This prevents the
// class of bug where hand-written column names silently return null.
//
// Example usage:
//   import { listMembers, countActiveMembers } from '../data';
//   import { listGymSubscriptions, getExpiringSoonSubscriptions } from '../data';
// ─────────────────────────────────────────────────────────────────────────────

export * from './members';
export * from './subscriptions';
export * from './feePayments';
export * from './inventory';
export * from './attendance';
export * from './announcements';
export * from './staff';
export * from './staffProfile';
export * from './trainerAssignments';
