# WorkTrack Project Context

Last updated: 2026-05-17

## Project State

WorkTrack is a Vite React TypeScript app for a social media team's internal task logging and productivity management. The current workspace is:

`c:\Users\js19187\Desktop\cursor\media team kpi app`

The app is implemented as a dark-mode responsive SPA with Supabase backend assets included. It currently runs locally in demo mode if Supabase environment variables are not configured.

Local dev server:

```bash
npm run dev -- --port 3000
```

Current URL:

```text
http://127.0.0.1:3000
```

## Demo Accounts

Use password `password` for all demo accounts:

- Super Admin: `JS-0001`
- Manager: `JS-1001`
- Team Lead: `JS-2001`
- Employee: `JS-3001`

Demo mode is driven by in-memory/local React state from `src/data/mockData.ts`. Supabase mode starts when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set.

## Implemented Frontend

Core files:

- `src/App.tsx`: route setup and protected routing.
- `src/contexts/AuthContext.tsx`: JSID login, demo auth, session idle logout, first-login password flow, Supabase auth integration.
- `src/contexts/WorkTrackDataContext.tsx`: demo data mutations for tasks, proposals, leave, users, broadcasts, audit events, registrations.
- `src/components/Layout.tsx`: desktop sidebar, mobile bottom navigation, Super Admin full-screen More menu.
- `src/pages/AuthPages.tsx`: login, forgot password, self-registration, set password.
- `src/pages/DashboardPages.tsx`: role dashboards and task logging modal.
- `src/pages/ManagementPages.tsx`: task library, reports, users, registrations, approvals, leave, notifications, broadcasts, audit log, profile, settings.

Implemented flows:

- JSID/password login.
- Forced password change when `first_login_done=false`.
- 8-hour inactivity logout logic.
- Employee task logging.
- Predefined task picker plus employee-private approved custom tasks.
- Proof link/file-note field in task logging modal.
- Employee proposals and leave requests.
- TL/Manager/Admin approval pages.
- Super Admin task library add/edit/soft-delete.
- Super Admin employee management, reset password, deactivate/reactivate guard, pending registration approval.
- Reports with search/filter, CSV export, lazy PDF export.
- Broadcast page with target selector, recipient count, and confirmation.
- Audit Log page.
- Mobile navigation for all roles.

Recent fix:

- Task Library delete now hides soft-deleted tasks immediately in the Super Admin UI while preserving historical logs.

## Supabase Assets

Main migration:

- `supabase/migrations/20260517000000_worktrack_schema.sql`

Includes:

- Required tables plus support tables for categories, platform tags, approved custom tasks, self-registrations, password reset requests, audit events.
- Enums for roles, statuses, leave types, notification types, audit action types.
- RLS for role tree visibility.
- Employee-only task logging.
- 24-hour task edit enforcement.
- Task time snapshot trigger.
- Effective-dated task time values.
- Score functions using `NULL` for no scored data.
- Approved leave exclusion from productivity.
- Private `task-proofs` Storage bucket policies.
- Session revocation helper for deactivation.

Edge Functions:

- `supabase/functions/admin-create-user`
- `supabase/functions/approve-registration`
- `supabase/functions/reset-password`
- `supabase/functions/review-proposal`
- `supabase/functions/review-leave`
- `supabase/functions/broadcast`
- `supabase/functions/deactivate-user`
- `supabase/functions/reactivate-user`
- `supabase/functions/reassign-hierarchy`
- `supabase/functions/override-decision`

Shared Edge Function helpers:

- `supabase/functions/_shared/admin.ts`
- `supabase/functions/_shared/cors.ts`

Seed script:

- `scripts/seed-super-admin.mjs`

Run after Supabase is configured:

```bash
npm run seed:super-admin
```

## Commands Verified

These passed after the latest changes:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Playwright checks previously passed:

- 29 role routes across Super Admin, Manager, Team Lead, and Employee.
- No console errors during route sweep.
- Employee task submit flow.
- Private custom task visible in employee task modal.
- Proof field visible and accepts input.
- Super Admin pending registration surface.
- Mobile Super Admin bottom nav and full-screen More menu.

## Known Notes

- PDF export uses `@react-pdf/renderer`, lazy-loaded through `src/lib/pdf.tsx`, and `file-saver` for saving.
- Vite build reports a chunk-size warning because React PDF is large. It is split into lazy chunks and does not load on initial page load.
- Demo data is not persistent across full reloads except demo auth persistence. Real persistence is through Supabase.
- Production is not ready until Supabase PITR or scheduled database and Storage backups are configured.

## Design Rules In Use

- Dark mode only.
- Base background `#0F0F0F`.
- Card background `#1A1D23`.
- Primary blue `#3B82F6`.
- Admin/elevated purple `#7C3AED`.
- Inter font via `@fontsource-variable/inter`.
- Desktop sidebar.
- Mobile bottom navigation plus Super Admin full-screen More menu.

## Role Rules Implemented

- Super Admin does not log tasks and has no productivity score.
- Manager does not log tasks; score averages direct Team Lead scores.
- Team Lead does not log tasks; score averages direct Employee scores.
- Employee is the only role that logs tasks.
- Employees must always have a Team Lead.
- Team Leads must have a Manager.
- Soft-deleted tasks disappear from task pickers but historical logs keep snapshots.
- Approved full-day leave is excluded from flags and team averages.
- Pending self-registrations cannot access the app.

## Recommended Next Agent Starting Point

1. Run `npm install` if dependencies are missing.
2. Start `npm run dev -- --port 3000`.
3. Use demo Super Admin `JS-0001` / `password`.
4. If editing backend contracts, start from `supabase/migrations/20260517000000_worktrack_schema.sql`.
5. If editing role UI, start from `src/pages/ManagementPages.tsx`, `src/pages/DashboardPages.tsx`, and `src/components/Layout.tsx`.
6. Always rerun `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
