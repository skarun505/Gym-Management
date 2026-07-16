import { useEffect, useState, useRef } from 'react';
import { X, CreditCard, ChevronDown, Camera, Loader2, Bell, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase, edgeFunctionUrl } from '../../../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────
function genMemberCode(gymCode) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${gymCode?.slice(-3) || 'MBR'}-${suffix}`;
}

function computeEndDate(startDate, duration) {
  const d = new Date(startDate);
  if (duration === 'monthly')   d.setMonth(d.getMonth() + 1);
  else if (duration === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (duration === 'yearly')    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// ── Add / Edit Member Modal ───────────────────────────────────
export default function MemberModal({ member, gymId, gymCode, plans, onClose, onSave, memberCount, isAtMemberLimit, onLimitReached }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: member
      ? {
          ...member,
          // Convert joined_at (timestamptz) → plain date string for the input
          joined_at: member.joined_at ? member.joined_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }
      : {
          status:     'active',
          start_date: new Date().toISOString().split('T')[0],
          joined_at:  new Date().toISOString().split('T')[0],
        },
  });

  const [activeTab, setActiveTab]   = useState('info');
  const [showPlanSection, setShowPlanSection] = useState(!member?.id);
  const [activeSub, setActiveSub]   = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm]       = useState(null);
  const [subSaving, setSubSaving]   = useState(false);

  // Photo upload state
  const [photoPreview, setPhotoPreview] = useState(member?.photo_url || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    // Upload to Supabase Storage
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${gymId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('member-photos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(path);
      setValue('photo_url', publicUrl);
      setPhotoPreview(publicUrl);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Photo upload failed: ' + err.message);
      setPhotoPreview(member?.photo_url || null);
    } finally {
      setPhotoUploading(false);
    }
  };

  const planId    = watch('plan_id');
  const startDate = watch('start_date');

  useEffect(() => {
    reset(member
      ? {
          ...member,
          joined_at: member.joined_at ? member.joined_at.split('T')[0] : new Date().toISOString().split('T')[0],
        }
      : {
          status:    'active',
          start_date: new Date().toISOString().split('T')[0],
          joined_at:  new Date().toISOString().split('T')[0],
        });
  }, [member]);

  // Load active subscription when editing
  useEffect(() => {
    if (!member?.id) return;
    setSubLoading(true);
    supabase
      .from('member_subscriptions')
      .select('*, subscription_plans(plan_name, duration, price)')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const active = (data || []).find(s => s.status === 'active') || data?.[0] || null;
        setActiveSub(active);
        if (active) {
          setSubForm({
            plan_id:    active.plan_id,
            start_date: active.start_date,
            end_date:   active.end_date,
            status:     active.status,
            notes:      active.notes || '',
          });
        }
        setSubLoading(false);
      });
  }, [member?.id]);

  // Auto-compute end date when plan + start change
  useEffect(() => {
    if (planId && startDate) {
      const plan = plans.find(p => p.id === planId);
      if (plan) setValue('end_date', computeEndDate(startDate, plan.duration));
    }
  }, [planId, startDate]);

  // Auto-compute end date for subscription form
  const handleSubPlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    setSubForm(f => ({
      ...f,
      plan_id: planId,
      ...(plan && f.start_date ? { end_date: computeEndDate(f.start_date, plan.duration) } : {}),
    }));
  };

  const handleSubStartChange = (date) => {
    const plan = plans.find(p => p.id === subForm?.plan_id);
    setSubForm(f => ({
      ...f,
      start_date: date,
      ...(plan && date ? { end_date: computeEndDate(date, plan.duration) } : {}),
    }));
  };

  const saveSubscription = async () => {
    if (!activeSub?.id || !subForm) return;
    setSubSaving(true);
    try {
      const { error } = await supabase.from('member_subscriptions').update({
        plan_id:    subForm.plan_id,
        start_date: subForm.start_date,
        end_date:   subForm.end_date,
        status:     subForm.status,
        notes:      subForm.notes,
      }).eq('id', activeSub.id);
      if (error) throw error;
      toast.success('Subscription updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update subscription');
    } finally {
      setSubSaving(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      let memberId = member?.id;

      if (!member?.id) {
        // — Plan gate: enforce member limit at submit time (not just on the button)
        if (isAtMemberLimit && isAtMemberLimit(memberCount ?? 0)) {
          onLimitReached?.();
          return;
        }

        // Insert new member
        const { data: newMember, error } = await supabase.from('members').insert({
          gym_id:        gymId,
          member_code:   genMemberCode(gymCode),
          full_name:     data.full_name,
          phone:         data.phone,
          email:         data.email,
          dob:           data.dob || null,
          address:       data.address,
          photo_url:     data.photo_url || null,
          fitness_goal:  data.fitness_goal,
          health_notes:  data.health_notes,
          status:        data.status || 'active',
          admission_fee: data.admission_fee ? Number(data.admission_fee) : null,
        }).select().single();
        if (error) throw error;
        memberId = newMember.id;

        // 💰 Admission fee is now auto-synced to fee_payments via DB trigger
        // (trg_sync_admission_fee) — no manual insert needed here.

        // Optionally assign subscription plan
        if (showPlanSection && data.plan_id && data.start_date && data.end_date) {
          const { error: subErr } = await supabase.from('member_subscriptions').insert({
            gym_id:    gymId,
            member_id: memberId,
            plan_id:   data.plan_id,
            start_date: data.start_date,
            end_date:   data.end_date,
            status:    'active',
            paid_confirmed: false,
          });
          if (subErr) {
            // Member was created; warn about plan failure but don't roll back
            toast('Member added! Plan assignment failed — assign from Subscriptions page.', { icon: '⚠️' });
            onSave();
            return;
          }
        }
        toast.success('Member added!');

        // Fire welcome email (non-blocking, silent fail)
        // Must include Authorization header — anon key alone is not sufficient.
        if (data.email) {
          supabase.auth.getSession().then(({ data: sessionData }) => {
            const token = sessionData?.session?.access_token;
            if (!token) return;
            fetch(edgeFunctionUrl('send-reminders'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ welcome: true, member_id: memberId }),
            }).catch(() => {}); // silent fail — email is a bonus
          }).catch(() => {});
        }

      } else {
        // Update existing member
        const { error } = await supabase.from('members').update({
          full_name:     data.full_name,
          phone:         data.phone,
          email:         data.email,
          dob:           data.dob || null,
          address:       data.address,
          photo_url:     data.photo_url || null,
          fitness_goal:  data.fitness_goal,
          health_notes:  data.health_notes,
          status:        data.status,
          joined_at:     data.joined_at || null,
          admission_fee: data.admission_fee ? Number(data.admission_fee) : null,
        }).eq('id', member.id);
        if (error) throw error;
        toast.success('Member updated!');
      }

      onSave();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Photo avatar with upload trigger */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center cursor-pointer ring-2 ring-white/10 hover:ring-primary-500/60 transition-all group"
                title="Click to upload photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="member" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {watch('full_name')?.charAt(0) || '?'}
                  </span>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  {photoUploading
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />}
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {/* Hidden form field for photo_url */}
              <input type="hidden" {...register('photo_url')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {member?.id ? 'Edit Member' : 'Add Member'}
              </h2>
              {member?.member_code && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Admission ID</span>
                  <span className="font-mono text-primary-400 text-xs font-bold bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                    {member.member_code}
                  </span>
                </div>
              )}
              {!member?.id && (
                <p className="text-gray-500 text-xs mt-0.5">Click avatar to add photo</p>
              )}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Tabs — only shown when editing */}
        {member?.id && (
          <div className="flex border-b border-white/5">
            {[{ id: 'info', label: 'Personal Info' }, { id: 'subscription', label: 'Subscription' }].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === t.id
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Info Tab ───────────────────────── */}
        {(activeTab === 'info' || !member?.id) && (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* ── Member Info ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name *</label>
                <input {...register('full_name', { required: true })} className="input-field" placeholder="Full Name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input-field" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input-field" placeholder="member@email.com" />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input {...register('dob')} type="date" className="input-field" />
              </div>
              <div>
                <label className="label">Joining Date</label>
                <input {...register('joined_at')} type="date" className="input-field" />
              </div>
              <div>
                <label className="label">Status</label>
                <select {...register('status')} className="input-field">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">
                  Admission Fee (₹)
                  <span className="text-gray-500 font-normal ml-1 text-xs">— one-time</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    {...register('admission_fee')}
                    type="number"
                    min="0"
                    step="1"
                    className="input-field pl-7"
                    placeholder="e.g. 500"
                  />
                </div>
                <p className="text-gray-600 text-[11px] mt-1">Leave blank if no admission fee is charged.</p>
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <textarea {...register('address')} className="input-field" rows={2} placeholder="Address" />
              </div>
              <div className="col-span-2">
                <label className="label">Fitness Goal</label>
                <input {...register('fitness_goal')} className="input-field" placeholder="Weight loss, muscle gain, general fitness..." />
              </div>
              <div className="col-span-2">
                <label className="label">Health Notes</label>
                <textarea {...register('health_notes')} className="input-field" rows={2} placeholder="Any medical conditions, allergies..." />
              </div>
            </div>

            {/* ── Subscription Plan (new members only) ─────── */}
            {!member?.id && (
              <div className="border border-white/8 rounded-2xl overflow-hidden">
                {/* Section header toggle */}
                <button
                  type="button"
                  onClick={() => setShowPlanSection(p => !p)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-700/50 hover:bg-dark-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-primary-400" />
                    <span className="text-white font-semibold text-sm">Assign Subscription Plan</span>
                    {!showPlanSection && (
                      <span className="text-[11px] text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPlanSection ? 'rotate-180' : ''}`} />
                </button>

                {showPlanSection && (
                  <div className="p-5 space-y-4">
                    {plans.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-2">
                        No plans found — create plans first in the Subscriptions page.
                      </p>
                    ) : (
                      <>
                        {/* Plan cards (radio style) */}
                        <div>
                          <label className="label">Select Plan</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            {plans.map(p => (
                              <label
                                key={p.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                  planId === p.id
                                    ? 'border-primary-500 bg-primary-600/15'
                                    : 'border-white/8 hover:border-white/20 bg-dark-700/40'
                                }`}
                              >
                                <input
                                  {...register('plan_id')}
                                  type="radio"
                                  value={p.id}
                                  className="accent-primary-500 w-4 h-4 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-semibold truncate">{p.plan_name}</p>
                                  <p className="text-gray-400 text-xs">
                                    ₹{p.price} · <span className="capitalize">{p.duration}</span>
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Purchase / Start Date *</label>
                            <input {...register('start_date')} type="date" className="input-field" />
                          </div>
                          <div>
                            <label className="label">
                              End Date
                              <span className="text-primary-400 text-[10px] ml-1">(auto-filled)</span>
                            </label>
                            <input {...register('end_date')} type="date" className="input-field" />
                          </div>
                        </div>

                        {/* Reminder preview */}
                        {selectedPlan && watch('end_date') && (
                          <div className="bg-dark-700/60 rounded-xl p-4 space-y-2">
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5 text-amber-400" /> Auto-Reminders Scheduled
                            </p>
                            {[
                              { label: '7 days before', days: 7,  color: 'text-amber-400' },
                              { label: '3 days before', days: 3,  color: 'text-orange-400' },
                              { label: '24 hrs before', days: 1,  color: 'text-red-400' },
                            ].map(({ label, days, color }) => {
                              const d = new Date(watch('end_date'));
                              d.setDate(d.getDate() - days);
                              return (
                                <div key={label} className="flex items-center justify-between text-sm">
                                  <span className={`${color} font-medium flex items-center gap-1.5`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {label}
                                  </span>
                                  <span className="text-gray-500 text-xs">
                                    {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                              );
                            })}
                            <p className="text-[11px] text-gray-600 border-t border-white/5 pt-2 mt-1">
                              Reminders shown in Dashboard & Member Portal. No reminder after payment confirmed.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? 'Saving...' : member?.id ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* ── Subscription Tab (edit only) ──────────────── */}
        {member?.id && activeTab === 'subscription' && (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {subLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : !activeSub ? (
              <div className="text-center py-10">
                <CreditCard className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No subscription found</p>
                <p className="text-gray-600 text-sm mt-1">Assign a plan from the Subscriptions page</p>
              </div>
            ) : (
              <>
                {/* Current plan info */}
                <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Current Subscription</p>
                  <p className="text-white font-semibold">{activeSub.subscription_plans?.plan_name}</p>
                  <p className="text-gray-400 text-sm capitalize">
                    {activeSub.subscription_plans?.duration} · ₹{activeSub.subscription_plans?.price}
                  </p>
                </div>

                {/* Change Plan */}
                {plans.length > 0 && (
                  <div>
                    <label className="label">Change Plan</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {plans.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            subForm?.plan_id === p.id
                              ? 'border-primary-500 bg-primary-600/15'
                              : 'border-white/8 hover:border-white/20 bg-dark-700/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sub_plan"
                            value={p.id}
                            checked={subForm?.plan_id === p.id}
                            onChange={() => handleSubPlanChange(p.id)}
                            className="accent-primary-500 w-4 h-4 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{p.plan_name}</p>
                            <p className="text-gray-400 text-xs">₹{p.price} · <span className="capitalize">{p.duration}</span></p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start Date</label>
                    <input
                      type="date"
                      value={subForm?.start_date || ''}
                      onChange={e => handleSubStartChange(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">
                      End Date
                      <span className="text-primary-400 text-[10px] ml-1">(auto-filled)</span>
                    </label>
                    <input
                      type="date"
                      value={subForm?.end_date || ''}
                      onChange={e => setSubForm(f => ({ ...f, end_date: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="label">Subscription Status</label>
                  <select
                    value={subForm?.status || 'active'}
                    onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={subForm?.notes || ''}
                    onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))}
                    className="input-field"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={saveSubscription}
                    disabled={subSaving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {subSaving
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Save className="w-4 h-4" />}
                    {subSaving ? 'Saving...' : 'Update Subscription'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
