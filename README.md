# WorkTrack

WorkTrack is a dark-mode internal task logging and productivity management system for a social media team.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions
- Vercel static frontend deployment

## Local UI

```bash
npm install
npm run dev
```

Without Supabase env vars, the app runs in demo mode:

- Super Admin: `JS-0001` / `password`
- Manager: `JS-1001` / `password`
- Team Lead: `JS-2001` / `password`
- Employee: `JS-3001` / `password`

## Supabase Setup

1. Create a new hosted Supabase project.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Link and push the schema:

```bash
npm run supabase:link
npm run supabase:push
```

4. Deploy functions:

```bash
npm run supabase:functions:deploy
```

5. Seed the first Super Admin:

```bash
npm run seed:super-admin
```

The seed script prints `JS-0001` and a one-time default password. First login forces password change.

## Production Notes

- Configure Supabase PITR or scheduled database and Storage exports before production use.
- Set Vercel env vars for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to Vercel browser builds.

