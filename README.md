# Matrix GPT UI

Premium-style Next.js app with:
- credentials auth via NextAuth
- Postgres user storage
- AI chat proxy to OpenAI
- animated landing and chat UI

## Stack

- `Next.js 16` (App Router)
- `React 19`
- `TypeScript`
- `next-auth` (credentials provider)
- `pg` + Neon/Postgres
- vanilla JS for chat/landing interactions

## Quick Start

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Environment Variables

Create `.env.local` (or `.env`) with:

```env
# Auth
NEXTAUTH_SECRET=your-long-random-secret
# Alternative names supported:
# AUTH_SECRET=...
# NEXT_AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Database (at least DATABASE_URL is recommended)
DATABASE_URL=postgresql://...
# Optional fallbacks (auto-detected in runtime):
DATABASE_URL_UNPOOLED=postgresql://...
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...
# Optional alias supported:
# OPENAI_KEY=sk-...
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
SYSTEM_PROMPT=You are a helpful assistant.

# Optional local-only user fallback controls
MATRIX_ALLOW_LOCAL_USER_FALLBACK=false
# MATRIX_USER_STORE_FILE=.data/users.local.json
```

## Database Schema

Required table:

```sql
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);
```

## Scripts

```bash
npm run dev       # development
npm run dev:turbo # alternative dev mode
npm run lint      # eslint
npm run build     # production build
npm run start     # production server
```

## App Routes

- `/` landing page
- `/register` sign up
- `/login` sign in
- `/chat` chat UI
- `/account` protected account page

## API Routes

- `POST /api/register` create user
- `POST /api/login` validate credentials
- `POST /api/chat` OpenAI proxy chat endpoint
- `/api/auth/[...nextauth]` NextAuth handlers

## Deploy to Vercel

1. Push repository.
2. Import project in Vercel.
3. Add environment variables for `Production`:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET` (or `AUTH_SECRET`)
   - `NEXTAUTH_URL=https://your-domain`
   - `OPENAI_API_KEY`
   - optional `OPENAI_MODEL`, `SYSTEM_PROMPT`
4. Redeploy after env changes.

## Troubleshooting

### `Incorrect API key provided: sk-...`
- Check `OPENAI_API_KEY` in Vercel env.
- Make sure it is full key (not masked, no quotes, no spaces).
- Redeploy after update.

### `relation "users" does not exist`
- Ensure table exists in the exact database used by deployment.
- Confirm `DATABASE_URL` points to that DB/branch.
- Verify:

```sql
select current_database(), current_schema(), to_regclass('public.users');
```

### Register works but login returns `401`
- Usually means env/db mismatch between deployments.
- Ensure one correct `DATABASE_URL` in Production env and redeploy.

## Security Notes

- Never commit `.env`.
- Rotate keys immediately if exposed.
- Keep secrets only in local env/Vercel environment variables.
