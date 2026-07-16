import { useEffect, useState } from 'react';
import { Search, Plus, UserCheck, UserX, Edit2, Trash2, KeyRound, ShieldCheck, AlertTriangle, Bell, Check, Lock, Clock, Timer, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { usePlanGate } from '../../hooks/usePlanGate';
import { UpgradeModal } from '../../components/PlanGate';
import MemberModal from './components/MemberModal';
import CreateLoginModal from './components/CreateLoginModal';
import InviteSentModal from './components/InviteSentModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import SubStatusBadge from './components/SubStatusBadge';

const PAGE_SIZE = 50;

// ── Main Page ─────────────────────────────────────────────────
export default function MembersPage() {
  const [members,         setMembers]         = useState([]);
  const [plans,           setPlans]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter,    setStatusFilter]    = useState('active');
  const [subStatusFilter, setSubStatusFilter] = useState('');   // '' | 'active' | 'expired' | 'pending'
  const [page,            setPage]            = useState(0);    // pages loaded so far (0 = first PAGE_SIZE rows)
  const [totalCount,      setTotalCount]      = useState(0);    // total rows matching server-side filters
  const [rawCount,        setRawCount]        = useState(0);    // rows fetched before client-side sub-status filter
  const [modalMember,  setModalMember]  = useState(undefined);
  // Login creation state
  const [loginTarget,  setLoginTarget]  = useState(null); // member object for CreateLoginModal
  const [credentials,  setCredentials]  = useState(null); // response from edge fn → InviteSentModal
  const { user } = useAuthStore();
  const { isAtMemberLimit, plan } = usePlanGate();
  const [showUpgrade,  setShowUpgrade]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // member object for DeleteConfirmModal

  // Debounce search input — avoids a Supabase round-trip per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination whenever a filter changes
  useEffect(() => { setPage(0); }, [debouncedSearch, statusFilter, subStatusFilter]);

  const fetchMembers = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const [membersRes, plansRes] = await Promise.all([
        (() => {
          let q = supabase
            .from('members')
            .select('*, member_subscriptions(id, plan_id, end_date, status, paid_confirmed, subscription_plans(plan_name))', { count: 'exact' })
            .eq('gym_id', user.gym_id)
            .order('joined_at', { ascending: false })
            .range(0, (page + 1) * PAGE_SIZE - 1);
          if (statusFilter) q = q.eq('status', statusFilter);
          if (debouncedSearch) q = q.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,member_code.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
          return q;
        })(),
        supabase.from('subscription_plans').select('*').eq('gym_id', user.gym_id).order('price'),
      ]);

      let data = membersRes.data || [];
      setRawCount(data.length);
      setTotalCount(membersRes.count ?? data.length);

      // Client-side filter by subscription status (most recent sub per member)
      if (subStatusFilter) {
        data = data.filter(m => {
          const subs = m.member_subscriptions || [];
          if (!subs.length) return false;
          // Find the most recent subscription
          const sorted = [...subs].sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
          return sorted[0]?.status === subStatusFilter;
        });
      }

      setMembers(data);
      setPlans(plansRes.data || []);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [debouncedSearch, statusFilter, subStatusFilter, user?.gym_id, page]);

  const hasMore = rawCount < totalCount;

  // Inline subscription status change
  const handleSubStatusChange = async (subId, newStatus) => {
    try {
      const { error } = await supabase
        .from('member_subscriptions')
        .update({ status: newStatus })
        .eq('id', subId);
      if (error) throw error;
      toast.success(`Subscription marked as ${newStatus}`);
      fetchMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Soft delete — mark inactive
  const handleDeactivate = async (id) => {
    const { error } = await supabase.from('members').update({ status: 'inactive' }).eq('id', id);
    if (error) { toast.error('Failed to deactivate'); return; }
    toast.success('Member deactivated');
    fetchMembers();
  };

  // Hard delete — permanently remove from DB (cascades subscriptions, attendance etc.)
  const handlePermanentDelete = async (id) => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      toast.success('Member permanently deleted');
      fetchMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete member');
    }
  };

  // Derive subscription display info for a member (most recent sub, any status)
  const getSubInfo = (m) => {
    const subs = m.member_subscriptions || [];
    if (!subs.length) return null;
    // Prefer active, then most recent by end_date
    const active = subs.find(s => s.status === 'active');
    const sub = active || [...subs].sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
    const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
    return { ...sub, daysLeft, planName: sub.subscription_plans?.plan_name };
  };

  // Plan-limit checks use the total member count from the server, not just
  // the rows loaded so far — with pagination those can differ.
  const atLimit = isAtMemberLimit(totalCount);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">
            {subStatusFilter
              ? `${members.length} of ${totalCount} member${totalCount !== 1 ? 's' : ''} shown`
              : `${totalCount} member${totalCount !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={() => {
            if (atLimit) {
              setShowUpgrade(true);
            } else {
              setModalMember(null);
            }
          }}
          className="btn-primary flex items-center gap-2"
        >
          {atLimit
            ? <><Lock className="w-4 h-4" /> Limit Reached</>
            : <><Plus className="w-4 h-4" /> Add Member</>}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input pl-9 input-field"
            placeholder="Search by name, ID, phone..."
          />
        </div>

        {/* Member status pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 text-xs font-medium">Member:</span>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {['', 'active', 'inactive'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === s ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Subscription status pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 text-xs font-medium">Subscription:</span>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {[
              { value: '',         label: 'All',     activeClass: 'bg-primary-600 text-white' },
              { value: 'active',   label: 'Active',  activeClass: 'bg-emerald-600 text-white' },
              { value: 'expired',  label: 'Expired', activeClass: 'bg-red-600 text-white' },
              { value: 'pending',  label: 'Pending', activeClass: 'bg-amber-600 text-white' },
            ].map(({ value, label, activeClass }) => (
              <button
                key={value}
                onClick={() => setSubStatusFilter(value)}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                  subStatusFilter === value ? activeClass : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Phone / Email</th>
                <th>Goal</th>
                <th>Plan</th>
                <th>Sub Status</th>
                <th>Login</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <UserCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No members found</p>
                    {!search && <p className="text-gray-600 text-sm mt-1">Click "Add Member" to get started</p>}
                  </td>
                </tr>
              ) : members.map(m => {
                const sub = getSubInfo(m);
                const urgency = sub
                  ? sub.paid_confirmed ? 'paid'
                    : sub.daysLeft <= 1 ? 'critical'
                    : sub.daysLeft <= 3 ? 'warning'
                    : sub.daysLeft <= 7 ? 'caution'
                    : 'ok'
                  : null;

                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-1 ring-white/10">
                          {m.photo_url
                            ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                            : m.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-white">{m.full_name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-primary-400 text-xs">{m.member_code}</span></td>
                    <td>
                      <div className="text-sm">
                        <p className="text-gray-300">{m.phone || '—'}</p>
                        <p className="text-gray-500 text-xs">{m.email || ''}</p>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm max-w-[130px] truncate">{m.fitness_goal || '—'}</td>
                    {/* Plan name + days left */}
                    <td>
                      {!sub ? (
                        <span className="text-gray-600 text-xs">No plan</span>
                      ) : (
                        <div>
                          <p className="text-gray-300 text-sm font-medium">{sub.planName}</p>
                          {sub.status === 'active' && (
                            <span className={`text-[11px] font-semibold ${
                              urgency === 'paid'     ? 'text-emerald-400'
                              : urgency === 'critical' ? 'text-red-400'
                              : urgency === 'warning'  ? 'text-orange-400'
                              : urgency === 'caution'  ? 'text-amber-400'
                              : 'text-gray-500'
                            }`}>
                              {urgency === 'paid'
                                ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Paid</span>
                                : urgency === 'critical'
                                ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expires &lt; 24h</span>
                                : urgency === 'warning'
                                ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {sub.daysLeft}d left</span>
                                : urgency === 'caution'
                                ? <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> {sub.daysLeft}d left</span>
                                : `${sub.daysLeft}d left`}
                            </span>
                          )}
                          {sub.status === 'expired' && (
                            <span className="text-red-400 text-[11px] font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expired
                            </span>
                          )}
                          {sub.status === 'pending' && (
                            <span className="text-amber-400 text-[11px] font-semibold flex items-center gap-1">
                              <Timer className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Subscription status quick-change */}
                    <td>
                      <SubStatusBadge
                        sub={sub}
                        onChangeStatus={handleSubStatusChange}
                      />
                    </td>
                    {/* Login status column */}
                    <td>
                      {m.profile_id ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (!m.email) {
                              toast.error('Add an email to this member first!');
                              return;
                            }
                            setLoginTarget(m);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30 hover:bg-primary-600/30 transition-colors"
                          title="Create login credentials"
                        >
                          <KeyRound className="w-3 h-3" /> Create
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={m.status === 'active' ? 'badge-active' : 'badge-expired'}>
                        {m.status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {m.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-sm">{m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModalMember(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Load more — appears only when the server has more rows than loaded */}
        {!loading && hasMore && (
          <div className="border-t border-white/5 p-3 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors px-4 py-2"
            >
              <ChevronDown className="w-4 h-4" />
              Load {Math.min(PAGE_SIZE, totalCount - rawCount)} more ({rawCount} of {totalCount} loaded)
            </button>
          </div>
        )}
      </div>

      {modalMember !== undefined && (
        <MemberModal
          member={modalMember}
          gymId={user.gym_id}
          gymCode={user.gym?.gym_code}
          plans={plans}
          memberCount={totalCount}
          isAtMemberLimit={isAtMemberLimit}
          onLimitReached={() => { setModalMember(undefined); setShowUpgrade(true); }}
          onClose={() => setModalMember(undefined)}
          onSave={() => { setModalMember(undefined); fetchMembers(); }}
        />
      )}

      {/* Create Login modal */}
      {loginTarget && (
        <CreateLoginModal
          member={loginTarget}
          onClose={() => setLoginTarget(null)}
          onSuccess={(creds) => {
            setLoginTarget(null);
            setCredentials(creds);
            fetchMembers(); // refresh to show ShieldCheck
          }}
        />
      )}

      {/* Invite sent modal */}
      {credentials && (
        <InviteSentModal
          result={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeactivate={handleDeactivate}
          onPermanentDelete={handlePermanentDelete}
        />
      )}

      {/* Member limit upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          feature="members"
          currentPlan={plan}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
