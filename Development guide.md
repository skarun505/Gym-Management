# GymPro — Developer Guide

> This file used to describe a different app: a single-gym Express + SQLite
> project with no multi-tenancy. That was the original plan; it's not what
> got built. This version describes what's actually in the repo and in the
> live Supabase project. For a user-facing feature overview, see
> [README.md](README.md).

---

## What this actually is

A multi-tenant gym management SaaS: one deployment serves many gyms, each
gym's data isolated from the others by Postgres Row Level Security.

| Layer | Reality |
|---|---|
| Frontend | React 18 + Vite, deployed as a static site on Vercel (`client/`) |
| Backend | Supabase — Postgres, Auth, Row Level Security, Edge Functions. There is no Express/Node API server. |
| Roles | `super_admin` (platform operator) → `gym_owner` → `staff` → `member`, enforced by RLS policies keyed on `profiles.role` and `gym_id` |
| Deployment | Vercel builds and serves `client/` only (see root `vercel.json`). Supabase project ref: `fmikzzectrzpyuhkmmcg`. |

`server/` in this repo held an Express + SQLite implementation of the
original single-gym spec. It was never deployed and diverged from day one
of real development — it has been removed. Backend logic lives in
`supabase/functions/` (Edge Functions) and `supabase/migrations/` (schema).

---

## Database schema

`supabase/migrations/` is the source of truth for schema changes **going
forward**. What's tracked right now:

- `20260711120000_add_gym_owner_auth_id.sql` — adds `gyms.owner_auth_id`,
  used to make gym provisioning idempotent (see Edge Functions below).
  Pushed and confirmed live.

**The live project's migration history is bigger than this repo's.**
Supabase's own ledger (`supabase migration list`) shows 34 migrations
applied between 2026-04-18 and 2026-05-10 — real schema history that
exists on Supabase's side but was never committed here (they were run
from some other machine/session at the time). Those 34 entries have been
reconciled out of the ledger (`migration repair --status reverted`, a
bookkeeping-only operation — it didn't touch any table, column, or data)
so `db push`/`db pull` stop erroring, but **their actual SQL content was
never recovered into this repo** — `supabase db pull` and `supabase db
dump` both need a local Docker shadow-database to diff against, and that
step failed repeatedly in this environment (SSL probe timeouts against
`db.fmikzzectrzpyuhkmmcg.supabase.co:5432`, then an unexplained "no
changes found" once the shadow DB was empty). Confirmed real tables that
exist live but have no migration file describing them, found by grepping
`client/src` for `.from('table_name')` and reading the recovered edge
functions:

```
staff, staff_attendance, gym_shifts, fee_payments, gym_announcements,
gym_challenges, challenge_completions, nutrition_logs, progress_logs,
trainer_notes, diet_charts, push_subscriptions, notification_logs,
monthly_leaderboard (view)
```

**To close this gap:** retry `supabase db dump --linked --schema public -f
supabase/migrations/<timestamp>_baseline.sql` with Docker Desktop running
and a stable connection — if the SSL probe/shadow-DB issues were
environment-specific (they very well might have been; this environment
had its own Docker cold-start and network flakiness throughout this
session), it may just work cleanly elsewhere. Until then, treat this repo's
migration folder as **incomplete but not wrong** — `20260711120000` is
real and applied; it's just not the whole picture.

### Adding a schema change from here on

Don't edit the schema from the Supabase dashboard. Add a migration:

```bash
npx supabase migration new <description>
# edit the generated file in supabase/migrations/
npx supabase db push     # applies directly to the linked project
```

`db push` applies pending local migration files straight against the real
database and does **not** need Docker — only `db pull`/`db dump`/local
`db start` do (they use a throwaway Docker Postgres to compute diffs).

### Running the schema locally

```bash
npx supabase start   # needs Docker Desktop running; spins up local Postgres + Auth + Studio
npx supabase stop
```

---

## Row Level Security tests

`supabase/tests/database/*.test.sql` — pgTAP tests. Currently covers:

- `000_rls_helpers_security_definer.test.sql` — regression lock on the
  `SECURITY DEFINER` fix for a real RLS-recursion login outage this
  project had (helper functions in RLS policies must stay
  `SECURITY DEFINER` or the same infinite-recursion bug comes back)
- `010_tenant_isolation_members.test.sql` — a gym_owner can only read/write
  their own gym's `members` rows

Only covers the tables this repo actually has schema for — the
undocumented tables (see above) have no RLS test coverage yet.

```bash
npx supabase start
npx supabase test db supabase/tests/database --local
```

(Not run in this environment — see the Docker/shadow-DB notes above.
Verify locally before relying on these.)

---

## Edge Functions

`supabase/functions/` — Deno functions, deployed independently of the
Vercel client build. All 8 functions the live project actually runs are
now present in this repo (4 were recovered from the live project this
session — they existed only in Supabase's dashboard/CLI history before,
with **no local source anywhere**, meaning zero code review or version
control on account-provisioning logic until now).

| Function | Purpose | Status |
|---|---|---|
| `create-gym` | super_admin-only. Creates a gym and **invites** the owner by email. Idempotent — resumes from `gyms.owner_auth_id` instead of orphaning Auth users on partial failure. | Rewritten for invites, deployed |
| `create-member-login` | gym_owner/staff-only. Invites an existing member by email. Doubles as resend for an unaccepted invite. | Rewritten for invites, deployed |
| `create-staff-login` | gym_owner-only. Invites an existing staff member by email. Same resend/resume pattern. Recovered this session — previously admin-set a password directly. | Rewritten for invites, deployed |
| `resend-gym-invite` | super_admin-only. Re-sends a gym owner's invite if unaccepted; errors if already accepted. | New, deployed |
| `reset-owner-password` | super_admin-only. Directly sets a gym owner's password. Recovered this session, **not** converted to invites — kept as a break-glass recovery tool for when an owner's email is unreachable. | Recovered, unmodified, live (was already deployed) |
| `process-checkin` | member-only. Records attendance, updates streaks, unlocks achievements. | Unmodified |
| `send-reminders` | Sends subscription-expiry, birthday, and welcome emails via **Resend** (third-party email API), with dedup via `notification_logs`. Recovered this session. | **Inert** — `RESEND_API_KEY` isn't set in this project's function secrets, so every send silently no-ops (the function itself logs "skipping email"). |
| `web-push-notify` | Browser push notifications via Web Push (VAPID), reading `push_subscriptions`. Recovered this session. | **Inert** — `VAPID_PRIVATE_KEY`/`VAPID_PUBLIC_KEY` aren't set, so signing fails. |

```bash
npx supabase functions deploy create-gym create-member-login create-staff-login resend-gym-invite --project-ref fmikzzectrzpyuhkmmcg
```

To turn on the two inert functions: `npx supabase secrets set RESEND_API_KEY=... VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT=mailto:you@yourdomain.com --project-ref fmikzzectrzpyuhkmmcg`, then redeploy them.

---

## Authentication & account provisioning

No admin ever sets or sees another user's password (except the explicit
break-glass `reset-owner-password` tool above). Gym owners, members, and
staff all get an **email invite** with a link to set their own password;
anyone can use **forgot password** the same way.

- `client/src/pages/Auth/SetPasswordPage.jsx` (route `/set-password`) —
  landing page for both invite-accept and password-reset links. Supabase's
  client (`detectSessionInUrl: true`) parses the token in the URL and
  establishes a session automatically; this page waits for that, then
  lets the user pick a password via `supabase.auth.updateUser({ password })`.
- `client/src/pages/Login/LoginPage.jsx` — "Forgot password?" calls
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: '.../set-password' })`.
- `create-gym` / `create-member-login` / `create-staff-login` call
  `supabase.auth.admin.inviteUserByEmail(...)` instead of setting a
  password. Every "create login" UI (`GymsPage`, `MembersPage`,
  `GymSettingsPage`'s Access Control tab) now sends an invite and, on
  retry for an unaccepted account, resends it — consistently across all
  three roles.

**Required dashboard config (not doable from this repo — not attempted
this session; editing live Auth config wasn't something explicitly
authorized, unlike the migration ledger repair):**

1. **Authentication → URL Configuration → Redirect URLs** — add
   `https://<your-vercel-domain>/set-password` and
   `http://localhost:5173/set-password`. Supabase silently falls back to
   the Site URL for any `redirectTo` not on this list, so invite/reset
   links will land in the wrong place until this is added. **Do this
   before testing the invite flow for real** — without it, invite emails
   will send, but the link inside them won't route to the password-setup
   page.
2. **Authentication → Emails** — review the "Invite user" and "Reset
   password" templates, and check the link expiry setting.
3. Supabase's **built-in Auth email sender is rate-limited** (a handful of
   emails/hour on the free tier). This is separate from `send-reminders`'
   Resend integration above — Auth emails (invites, resets) always go
   through Supabase's own sender regardless of the Resend key.

---

## Resetting all data

`supabase/scripts/reset_all_data.sql` — truncates every gym/member/staff
table (keeps `achievements`, which is seed data). **Already run once this
session** (by request) against the live project. Auth users were deleted
separately via the dashboard, as documented in the script.

---

## Environment variables

**`client/.env`** (see `client/.env.example`):
```
VITE_SUPABASE_URL=https://fmikzzectrzpyuhkmmcg.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

All edge function calls resolve their URL from `VITE_SUPABASE_URL` via
`edgeFunctionUrl()` in `client/src/lib/supabase.js`.

**Edge function secrets** (`npx supabase secrets list --project-ref fmikzzectrzpyuhkmmcg`):
only the Supabase-injected defaults (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, etc.) are set. `RESEND_API_KEY` and the
`VAPID_*` keys are not — see the Edge Functions table above.

---

## Where things live

```
client/src/
  pages/            One folder per portal section (Members, Staff, Member/, SuperAdmin/, Auth/, ...)
  pages/Auth/        SetPasswordPage.jsx — shared invite-accept / password-reset landing page
  data/             Small shared query helpers — currently just the two tables
                     (staff, trainer_assignments) that have already shipped
                     column-name bugs from being hand-written per page. Most
                     pages still query Supabase directly; this folder is a
                     start, not a completed migration.
  lib/supabase.js    Supabase client + edgeFunctionUrl() helper
  store/authStore.js Zustand — the only shared client state; everything
                     else is fetched per-page

supabase/
  migrations/       Schema history (incomplete — see gap noted above)
  functions/        All 8 live edge functions (complete as of this session)
  scripts/          Operational SQL (reset_all_data.sql)
  tests/database/   pgTAP RLS tests
```

---

## Status

**2026-07-11, foundation-hardening pass:** dead Express/SQLite backend
removed, hardcoded edge-function URLs centralized, migration tooling set
up, tenant-isolation tests added, gym/member provisioning made idempotent.

**2026-07-11, auth-hardening pass (same day, continued):** invite-based
onboarding for gym owners, members, *and* staff (no admin-set passwords
except the explicit `reset-owner-password` break-glass tool);
forgot-password flow; invite resend everywhere; live data wipe; all 4
previously-undocumented edge functions recovered, reviewed, and (for the
3 that provision logins) converted to invites; migration ledger
reconciled; `gyms.owner_auth_id` pushed and confirmed live;
`create-gym`/`create-member-login`/`create-staff-login`/`resend-gym-invite`
deployed live.

**Still open:**
- VAPID keys (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) not set — `web-push-notify` remains inert until
  these are generated and set. Use `npx web-push generate-vapid-keys` and then `npx supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT=mailto:you@yourdomain.com --project-ref fmikzzectrzpyuhkmmcg`.
- Extending `client/src/data/` to cover member-portal tables (`nutrition_logs`, `progress_logs`, `diet_charts`, `workout_plans`).
- CI, broader test coverage, observability (Sentry etc.).
- **RLS policies are not recoverable from this repo.** The 34 original migrations that created `is_super_admin()`/`get_my_role()`/tenant-isolation policies were reconciled out of the ledger before their SQL was captured — pull the live policy set via Dashboard → Database → Policies (or `supabase db pull` once Docker works here) and commit it as a new migration. Until then, RLS is unverified-from-code.
- No super_admin bootstrap path exists in the app — every super_admin account is created by hand via SQL (see Security audit below). Fine for a single-operator platform; revisit if more than one person needs this role.

**Completed 2026-07-14 (second hardening pass):**
- `RESEND_API_KEY` was already set (2026-07-13) — `send-reminders` will fire when called.
- Supabase Auth `site_url` updated to `https://gym-management-sigma-two.vercel.app`.
- `/set-password` added to `uri_allow_list` — invite and password-reset email links now route correctly.
- **Bug fix**: `NotificationBell.jsx` was selecting `name` from `inventory` (column doesn't exist — is `item_name`). Fixed.
- Schema baseline migration committed: `supabase/migrations/20260714000000_schema_baseline_documentation.sql` — all 29 live tables documented with correct column names.
- `client/src/data/` expanded: `members.js`, `subscriptions.js`, `feePayments.js`, `inventory.js`, `attendance.js`, `announcements.js`, `staff.js`, `index.js` all added with production-verified column names.

**Completed 2026-07-16 (fourth pass — correctness + structure):**
- `process-checkin` timezone bugs fixed: all day-boundary and hour-of-day
  logic now uses IST (UTC+5:30) via helpers, replacing a broken
  `getUTCHours() + 5` (wrong offset, could exceed 23, and put pre-5:30am
  check-ins on the previous UTC day — corrupting streaks).
- Attendance double-tap race closed: partial unique index
  `attendance_member_open_daily_unique (member_id, created_at) WHERE
  check_out IS NULL` (migration `20260716000000`); edge fn maps 23505 →
  409 "already checked in". Partial so the owner-side
  re-check-in-after-checkout flow keeps working.
- Service worker offline fallback actually works now (`offline.html`
  created + precached; promise chain fixed; cache bumped to v3).
- `send-reminders` sender configurable via `RESEND_FROM_EMAIL` secret —
  **note: the resend.dev fallback only delivers to the Resend account
  owner; verify a domain in Resend for production email.**
- CORS allow-list accepts Vercel preview-deploy origins.
- NotificationBell shows recently-expired subs (7-day lookback);
  phone-login errors no longer confirm account existence; background
  profile refresh force-logs-out when the profile row is gone.
- MembersPage split into `pages/Members/components/`; members list
  paginated (50/page + Load More) with debounced search; plan-limit gate
  uses the server-side total count.
- DashboardPage + InventoryPage reads migrated onto `src/data/` helpers.
- Dead `server/` folder deleted; GitHub Actions CI added (client build).
- **Not deployed yet from this pass**: migration `20260716000000` needs
  `db push`; `process-checkin`, `send-reminders`, and all functions
  importing `_shared/cors.ts` need `functions deploy`.
- **Still blocked**: RLS policy recovery — supabase CLI session expired;
  run `npx supabase login`, then `supabase db dump --linked` (or copy from
  Dashboard → Database → Policies) and commit as a migration.

**Completed 2026-07-14 (security audit / third hardening pass):**
- **Fixed**: `send-reminders` and `web-push-notify` had zero authorization checks — any holder of the public anon key (visible in the deployed JS bundle) could call them directly to mass-trigger member emails or, once VAPID is configured, push arbitrary notification content to any gym. Both now require a valid caller JWT + `gym_owner`/`staff`/`super_admin` role, and `send-reminders`' `welcome` path now checks the target member belongs to the caller's own gym (was an unscoped cross-tenant lookup).
- CORS tightened on all 7 HTTP-facing edge functions: `Access-Control-Allow-Origin: '*'` replaced with an allow-list (`supabase/functions/_shared/cors.ts`) restricted to the production Vercel domain and local dev.
- Added `audit_logs` table (`supabase/migrations/20260714010000_add_audit_logs.sql`, RLS-gated to `super_admin` read-only) and wired writes into `create-gym`, `reset-owner-password`, `resend-gym-invite` — these three mutate other people's accounts/gyms and previously left no trail.
- Confirmed (not fixed — no issue found): no client code path can write `profiles.role`; the anon key is the only client-side secret and is meant to be public; `.env` files are correctly gitignored and were never committed.

