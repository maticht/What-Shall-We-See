# What Shall We See

A responsive Next.js app for tracking movies, series, books, manga, and manhwa with:

- Google authentication
- MongoDB-backed personal and shared categories
- card statuses: planned, in progress, done
- personal ratings and remote cover image URLs
- connection codes that unlock collaborative categories
- light and dark themes with a Notion-inspired interface

## Stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- MongoDB with Mongoose
- NextAuth with Google provider

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
MONGODB_URI=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

## Google OAuth Setup

Create OAuth credentials in Google Cloud and add this callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

For production, add your real domain callback too.

## Local Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Check

The project was verified with:

```bash
npm run lint
npm run build
```
