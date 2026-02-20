# Matrix UI

Matrix/Neo themed AI web app on `Next.js (App Router)` with:

- credentials auth (`NextAuth`)
- AI chat via server-side OpenAI proxy
- subscriptions UI (Free/Pro/Ultra)
- local demo checkout + email receipt over SMTP
- metrics (`/api/metrics`) and public stats (`/api/stats`)
- responsive landing/chat UI, smooth scroll, custom cursor

## Tech Stack

- `Next.js 16` + `React 19` + `TypeScript`
- `Tailwind CSS v4`
- `next-auth` (Credentials provider)
- `pg` (PostgreSQL direct driver)
- `framer-motion`, `headlessui`, `lenis`

## Current Billing Status

The project currently uses **internal demo checkout** on `/checkout`:

- no real card charging
- user enters form data
- backend activates plan in DB (`PRO`/`ULTRA`)
- receipt is sent by SMTP

Legacy Stripe/Lemon routes exist but are intentionally disabled and return `410 Gone`:

- `/api/stripe/*`
- `/api/lemon/*`

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Configure env

Create `.env.local` (or `.env`) and set variables from section below.

### 3) Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

### Required

```env
# Auth
NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000

# Database (at least one working URL)
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# SMTP (used by /api/sendMail and payment receipts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
SMTP_FROM=MatrixCore <your@gmail.com>
```

### Optional / Fallback

```env
# Auth fallbacks
AUTH_SECRET=...
NEXT_AUTH_SECRET=...

# DB fallbacks (if DATABASE_URL is not set)
DATABASE_URL_UNPOOLED=postgresql://...
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...

# OpenAI tuning
OPENAI_KEY=sk-...
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
SYSTEM_PROMPT=You are a helpful programming assistant.
MAX_TOKENS=450
```

## Scripts

```bash
npm run dev        # next dev --webpack
npm run dev:turbo  # next dev
npm run lint
npm run build
npm run start
```

## Project Structure

```text
app/
  api/
    auth/[...nextauth]/route.ts
    chat/route.ts
    login/route.ts
    register/route.ts
    metrics/route.ts
    stats/route.ts
    subscription/select-free/route.ts
    payment/checkout/route.ts
    sendMail/route.ts
    stripe/* (disabled legacy)
    lemon/* (disabled legacy)
  chat/page.tsx
  checkout/page.tsx
  pricing/page.tsx
  login/page.tsx
  register/page.tsx
  page.tsx
components/
  chat/chat-workspace.tsx
  chat/account-menu.tsx
  checkout-form.tsx
  contact-form.tsx
  SmoothScrollProvider.tsx
  CursorRing.tsx
lib/
  auth.ts
  db.ts
  user-store.ts
  stats.ts
  smtp-transport.ts
  smtp-mailer.ts
prisma/
  schema.prisma
```

## Core Flows

### Auth

- Registration: `POST /api/register`
- Login check endpoint: `POST /api/login`
- Main auth/session: `NextAuth` in `/api/auth/[...nextauth]`
- Session strategy: JWT

### Chat

- Frontend sends messages to `POST /api/chat`
- Backend injects system prompt and proxies request to OpenAI
- Usage increments only after successful assistant response
- Metrics recorded with `POST /api/metrics`

### Subscriptions (Demo)

- Pricing page: `/pricing`
- Free plan selection: `POST /api/subscription/select-free`
- Paid checkout form: `/checkout?plan=pro|ultra`
- Payment submit: `POST /api/payment/checkout`
- Backend updates user plan and sends email receipt

### Stats

- `GET /api/stats` returns:
  - `usersCount`
  - `successfulChatsCount`
  - `responsesPerSecond`

## Database Notes

- Runtime DB layer is in `lib/user-store.ts` + `lib/db.ts` using `pg`.
- On first queries, app performs schema bootstrap/migrations for:
  - `public.users`
  - `public.chat_metrics`
- `prisma/schema.prisma` is present as schema reference.

## API Reference (Short)

- `POST /api/register` -> create user
- `POST /api/login` -> validate credentials
- `POST /api/chat` -> chat completion proxy (auth required)
- `POST /api/metrics` -> save chat metric
- `GET /api/stats` -> public analytics snapshot
- `POST /api/subscription/select-free` -> apply FREE plan (auth)
- `POST /api/payment/checkout` -> demo paid plan activation + email receipt (auth)
- `POST /api/sendMail` -> contact email with honeypot + rate limit

## Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add required env vars in:
   - `Project -> Settings -> Environment Variables`
4. Redeploy after any env change.
5. Verify runtime by opening:
   - `/api/stats`
   - login/register flow
   - `/chat`
   - `/pricing` -> `/checkout`

## Troubleshooting

### SMTP `wrong version number`

- For Gmail use `SMTP_PORT=587` (STARTTLS) or `465` (implicit TLS).
- The SMTP transport auto-retries with opposite TLS mode on mismatch.
- Ensure `SMTP_HOST` is exactly `smtp.gmail.com`.

### SMTP `555 5.5.2 Syntax error`

- Check `SMTP_HOST` has no duplicated prefix (example of wrong value: `SMTP_HOST=SMTP_HOST=smtp.gmail.com`).
- `SMTP_PASS` should be Gmail App Password (16 chars), no extra quotes.

### `OPENAI_API_KEY` errors

- Must be full key starting with `sk-`.
- No masked value, no extra spaces.

### DB unavailable / relation errors

- Verify active `DATABASE_URL` points to the expected database.
- Ensure DB user has permissions for `CREATE TABLE` and `ALTER TABLE`.

## Security Notes

- Do not commit `.env*` files.
- Rotate secrets immediately if leaked.
- Demo checkout accepts card-like input and does not perform real charging. Do not store real card data.
