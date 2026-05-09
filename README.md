# What Shall We See

A responsive Next.js app for tracking movies, series, books, manga, and manhwa with:

- Google authentication
- MongoDB-backed personal and shared categories
- card statuses: planned, in progress, done
- personal ratings and remote cover image URLs
- connection codes that unlock collaborative categories
- a restrained dark interface with consistent controls

## Stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- MongoDB with Mongoose
- Google Identity Services + custom session cookie

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
MONGODB_URI=
AUTH_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

For Vercel production, set:

```bash
NEXTAUTH_URL=https://your-domain.com
```

If you use only `AUTH_SECRET`, that is fine. `NEXTAUTH_SECRET` is also supported for compatibility with NextAuth on Vercel.

## Google OAuth Setup

Create OAuth credentials in Google Cloud and add these browser origins:

```text
http://localhost
http://localhost:3000
https://what-shall-we-see.vercel.app
```

This app uses Google Identity Services on the client, so the important Google
setting is `Authorized JavaScript origins`.

## Local Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If you want local development to use the same Vercel secrets, link the project
and pull the envs:

```bash
vercel link
vercel env pull .env.local --environment=development --yes
```

If your secrets currently exist only in `Preview` and `Production`, either:

```bash
vercel env pull .env.local --environment=preview --yes
```

or add the same variables to the `Development` environment in Vercel so
`localhost` uses them directly.

## Production Check

The project was verified with:

```bash
npm run lint
npm run build
```
