# Brighttcare — Student Health Screening Records

Role-based web app for recording student health-camp screening data. One admin
account manages schools/classes/students and doctor accounts; one account per
clinical section (General Exam, ENT, Vision, Dental) enters and edits only
that section's data; the compiled PDF becomes available once every section is
resolved (filled in or explicitly marked absent).

## Stack

Next.js 15 (App Router) · PostgreSQL · Prisma · NextAuth (Credentials) · Tailwind · @react-pdf/renderer

## First-time setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, etc.
npx prisma migrate dev --name init
npx prisma db seed        # creates the first admin account from SEED_ADMIN_* in .env
npm run dev
```

Log in with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`, then change the
password (there's no in-app "change my own password" screen yet — for now,
re-run the seed with a new `SEED_ADMIN_PASSWORD` after deleting the old admin
row, or add one directly via Prisma Studio: `npx prisma studio`).

**A note on this sandbox:** this project was built inside a network-restricted
environment that couldn't reach Prisma's binary CDN, so `prisma generate` /
`prisma validate` / `next build` couldn't be run end-to-end here. The schema,
API routes, and components were cross-checked by hand (field names, enum
values, and Prisma accessor names all verified to match), but you should run
a normal `npm install && npx prisma generate && npm run build` yourself as a
first step — that will work normally with regular internet access, and will
catch anything this sandbox couldn't.

## Deploying

Two reasonable paths, pick one:

**Self-hosted, one Ubuntu 22.04 server (app + database together)** — see
[`deploy/UBUNTU_SETUP.md`](deploy/UBUNTU_SETUP.md) for the full walkthrough:
PostgreSQL and Node installed locally, the app run persistently via the
included systemd unit, Nginx + Let's Encrypt for HTTPS, a firewall pass, and
a daily backup script. `DATABASE_URL` and `DIRECT_URL` end up identical here
— there's no pooler in the picture when the app and database are on the same
box talking over `localhost`.

**Vercel + managed Postgres** — the path of least friction if you'd rather
not run a server yourself:

1. Push this repo to GitHub, import it in Vercel.
2. Provision Postgres (Neon or Supabase both give you a pooled `DATABASE_URL`
   and a direct `DIRECT_URL` — Prisma migrations need the direct one).
3. Set the env vars from `.env.example` in the Vercel project settings.
   Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`. Set
   `NEXTAUTH_URL` to your deployed URL.
4. Deploy, then run `npx prisma migrate deploy && npx prisma db seed` once
   (locally with the production `DATABASE_URL`/`DIRECT_URL`, or via a one-off
   Vercel CLI command) to create the schema and the first admin account.

## How the permission model works

- Every request goes through `middleware.ts` (redirects unauthenticated users
  to `/login`, keeps `/admin/*` and `/doctor/*` strictly separated by role).
- Every API route additionally re-checks permissions server-side
  (`src/lib/permissions.ts`) — the middleware is a UX convenience, not the
  security boundary.
- A doctor's assigned section(s) live on their session/JWT. The section data
  API route (`/api/students/[studentId]/sections/[section]`) rejects any
  request for a section the caller isn't assigned to (admin is exempt — admin
  can view and edit every section, per what was asked for).
- The section API also allow-lists which JSON keys it'll accept per section
  (`src/lib/sections.ts` → `allFieldKeys`), so a doctor can't smuggle in
  fields belonging to a different section even if they tried to craft the
  request by hand.

## Adding / changing fields

Every section's fields live in **one file**: `src/lib/sections.ts`. It drives
the data-entry form, the completeness check (what counts as required before a
section can flip to `COMPLETE`), and the PDF layout all at once. To change a
field's label, options, or add a new one:

1. Add/rename the column on the matching model in `prisma/schema.prisma`.
2. Add/rename the matching entry in `src/lib/sections.ts`.
3. Run `npx prisma migrate dev` to apply the schema change.

Nothing else needs to change — the form, save logic, and PDF all read from
that config.

## Known assumptions to double-check against the real form

- **Dental findings (c)–(n):** only "Plaque" (c) and "Missing Teeth" (n) were
  confirmed explicitly. The ten in between (gum disease, gum bleeding,
  stains, malocclusion, mouth breathing, poor oral hygiene, halitosis, cleft
  lip/palate, tongue tie, ulcers/lesions) are a best-guess standard list —
  see the comments in `prisma/schema.prisma` above `DentalRecord`. Cheap to
  correct via the two-file process above.
- **Tympanic membrane** is modeled as a single Yes/No field rather than
  split left/right ear — matches what was said literally, flag it if you
  actually want it per-ear.
- **Logo:** the PDF currently renders a text "BRIGHTTCARE" wordmark in a
  bordered box as a placeholder (`src/lib/pdf/StudentRecordPdf.tsx`). Drop in
  the real logo file and swap the `logoBox`/`logoText` block for an
  `<Image src=... />` from `@react-pdf/renderer` once you have the asset.

## What's not built yet

- Bulk student import (CSV) — students are added one at a time, per what was
  asked for ("added manually").
- Bulk PDF download (zip of all students in a class) — one-at-a-time
  generation only for now.
- Admin's own "change my password" screen (see the note above).
