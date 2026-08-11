# Brighttcare — Student Health Screening Records

Role-based web app for recording student health-camp screening data. One admin
account manages schools/classes/students and doctor accounts; one account per
clinical section (General Exam, ENT, Vision, Dental) enters and edits only
that section's data; the compiled PDF becomes available once every section is
resolved (filled in or explicitly marked absent).

## Stack

Next.js 15 (App Router) · PostgreSQL · Prisma · NextAuth (Credentials) · Tailwind · @react-pdf/renderer

## First-time setup


npm install
cp .env.example .env      # fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, etc.
npx prisma migrate dev --name init
npx prisma db seed        # creates the first admin account from SEED_ADMIN_* in .env
npm run dev

