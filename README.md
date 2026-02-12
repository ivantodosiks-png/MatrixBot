This is a Next.js app with NextAuth credentials login and Neon Postgres user registration.

## Getting Started

1. Create `.env.local` from `.env.example` and set:

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

2. Install dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000)

- `/register` creates a user in your Neon `users` table
- `/login` signs in via NextAuth credentials provider
- `/account` is protected and available only with a valid session

For Vercel deployment, set the same three environment variables in Project Settings.
