# BNITRENDZ — Member Registration, QR Codes & Admin CRM

A web app for managing a member network:

- **Public registration** at `/member/register`. Anyone can sign up with a profile photo (taken with the camera or uploaded), their name, company, business category, contact details, special dates and social links. The member instantly gets a personal profile link and a QR code they can copy, share or download.
- **Public profiles** at `/member/[publicToken]`. Only the fields a member filled in are shown, with their photo, tap-to-call, email and social links. Special dates (birthday, anniversary) are never shown publicly; only admins see them.
- **Admin CRM** at `/admin`. Signed-in admins get dashboard stats and full member CRUD, with database-backed search, sorting, pagination and QR codes.

## Tech stack

| Area       | Choice                                                           |
| ---------- | ---------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Route Handlers), React 19, TypeScript    |
| Styling    | Tailwind CSS 4, Lucide icons, Sonner toasts                      |
| Database   | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)                     |
| Auth       | NextAuth (Auth.js) v4, credentials provider, JWT session cookies |
| Validation | Zod 4, one schema shared by the browser and the server           |
| QR codes   | `qrcode` (PNG)                                                   |
| Tests      | Vitest + Testing Library against a real test database            |

## Requirements

- **Node.js** 22.12 or newer (Next.js needs 20.9+; the test runner needs 22.12+)
- **npm** 10+
- **PostgreSQL** 14+ with the `pg_trgm` extension available. It ships with standard PostgreSQL, Neon, Supabase and RDS.

## Installation

```bash
npm install
```

`npm install` also runs `prisma generate` (the `postinstall` script), which writes the Prisma client to `lib/generated/prisma`.

## Environment

Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable              | Required    | Purpose                                                                                                           |
| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | yes         | PostgreSQL connection used by the app. In production this may be a pooled URL.                                   |
| `DIRECT_URL`          | no          | Direct (non-pooled) URL for migrations when `DATABASE_URL` is pooled, e.g. Neon's `DATABASE_URL_UNPOOLED`.         |
| `TEST_DATABASE_URL`   | for tests   | A **separate** database for `npm test`. It is wiped before every test.                                           |
| `NEXTAUTH_SECRET`     | yes         | Secret used to sign and encrypt sessions. Generate one with `openssl rand -base64 32`.                            |
| `NEXTAUTH_URL`        | dev only    | `http://localhost:3000` locally. Not needed on Vercel.                                                             |
| `NEXT_PUBLIC_APP_URL` | yes*        | Public base URL used in profile links and QR codes, e.g. `https://your-domain.com` (no trailing slash). *On Vercel it defaults to the project's production domain. |
| `APP_TIMEZONE`        | no          | IANA timezone for the dashboard's "today" and "this month" counts and CRM dates, e.g. `Asia/Karachi`. Defaults to `UTC`. |
| `WHATSAPP_ACCESS_TOKEN` | for WhatsApp | Permanent System User token for the WhatsApp Cloud API (`whatsapp_business_messaging` and `whatsapp_business_management` permissions). |
| `WHATSAPP_PHONE_NUMBER_ID` | for WhatsApp | Phone number ID that messages are sent from (WhatsApp Manager → API setup).                                 |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | for WhatsApp | WhatsApp Business Account ID, used to list your approved message templates.                             |
| `ADMIN_NAME`          | no          | Display name of the admin created by the seed.                                                                    |
| `ADMIN_EMAIL`         | for seeding | Email of the admin created by the seed.                                                                           |
| `ADMIN_PASSWORD`      | for seeding | Password of that admin (at least 8 characters). Only its scrypt hash is stored.                                   |

`.env` files are git-ignored; only `.env.example` is committed.

> `NEXT_PUBLIC_APP_URL` is baked into the browser bundle at build time. Rebuild after changing it, because every QR code is generated from it.

## Database

Create the databases (skip the test one if you won't run the tests):

```bash
createdb bnitrendz
createdb bnitrendz_test
```

Apply the migrations. The first migration also enables `pg_trgm` for fast search:

```bash
npx prisma migrate dev
```

Seed one admin and three sample members:

```bash
npx prisma db seed
```

The seed is safe to re-run:

- The admin is **upserted** by `ADMIN_EMAIL`. Re-running with a new `ADMIN_PASSWORD` resets that admin's password.
- Sample members are only inserted when the members table is empty, and never when `NODE_ENV=production`.

### Reset and reseed

Warning: this deletes all data in `DATABASE_URL`.

```bash
npx prisma migrate reset --force
npx prisma db seed
```

## Run

```bash
npm run dev
```

Open <http://localhost:3000>. `/` redirects to the registration form. The admin CRM is at <http://localhost:3000/admin>.

## Admin login

There is no public sign-up for admins. The initial admin comes from the seed:

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (and optionally `ADMIN_NAME`) in `.env`.
2. Run `npx prisma db seed`.
3. Sign in at `/admin/login`.

To change the password, update `ADMIN_PASSWORD` and run the seed again. Passwords are hashed with **scrypt** (OWASP parameters, random salt) and never stored in plain text.

## WhatsApp messaging

On `/admin/members`, tick members one by one, or use the header checkbox to select the whole page. After that, **Select all N** covers every member matching the current search, across pages. Then click **Send WhatsApp**:

- **Approved template.** Lists your approved templates live from WhatsApp. Fill the template variables, where `{name}` becomes each member's name. Templates are the only way to start a conversation with members who haven't messaged you recently.
- **Custom message.** Free text, also supporting `{name}`. WhatsApp only delivers it to members who messaged your business number in the last 24 hours.

Numbers without a country code are treated as Indian (+91). Members without a valid phone number are skipped. The results screen shows how many messages were sent, failed and skipped, with WhatsApp's reason for each failure. Templates with media headers, dynamic buttons or OTP codes aren't offered. Create new templates in WhatsApp Manager and they appear automatically.

## Quality checks

```bash
npm run lint        # ESLint (next/core-web-vitals + TypeScript rules)
npm run typecheck   # next typegen + tsc --noEmit
npm test            # Vitest: migrates TEST_DATABASE_URL, then runs every suite
```

The tests cover:

- **Public registration**: valid submissions, invalid email/URL/dates, missing name, double submission, database writes, token generation, photos (stored, served, non-JPEG and oversized rejected) and rate limiting.
- **Public profiles**: valid, invalid and deleted tokens, and special dates kept off the public page and API.
- **Admin**: login and lockout, unauthorised access through the proxy, create/read/update/delete (including keeping, replacing and removing photos), search, pagination and dashboard stats.
- **Security**: unauthenticated and unauthorised API calls, CSRF origin checks, dangerous URLs and XSS payloads.

## Build

```bash
npm run build
npm start
```

## Production (Vercel)

1. Create a PostgreSQL database, for example Neon from the Vercel Marketplace.
2. Set these environment variables for the project:
   - `DATABASE_URL`: pooled connection string.
   - `DIRECT_URL`: direct connection string, used for migrations (Neon: `DATABASE_URL_UNPOOLED`).
   - `NEXTAUTH_SECRET`: a new random secret.
   - `APP_TIMEZONE`: e.g. `Asia/Karachi`.
   - `NEXT_PUBLIC_APP_URL`: only when QR codes should use a domain other than the project's Vercel production domain, e.g. a custom domain. Redeploy after changing it.
3. Deploy. `vercel.json` sets the build command to `prisma migrate deploy && next build`, so each deploy applies pending migrations before building.
4. Create the production admin once, from a machine that can reach the database:

   ```bash
   DATABASE_URL="<production direct url>" ADMIN_EMAIL="you@company.com" ADMIN_PASSWORD="<strong password>" NODE_ENV=production npx prisma db seed
   ```

   With `NODE_ENV=production` the seed creates only the admin, with no sample members. In PowerShell, set each variable first with `$env:NAME="value"`, then run `npx prisma db seed`.

## Routes

| Route                                   | Access       | Purpose                                                   |
| --------------------------------------- | ------------ | --------------------------------------------------------- |
| `/member/register`                      | public       | Registration form, then the QR success screen             |
| `/member/[publicToken]`                 | public       | Member profile, or "Member Not Found"                     |
| `/admin/login`                          | public       | Admin sign-in                                             |
| `/admin`                                | admin        | Dashboard: totals, today, this month, recent members      |
| `/admin/members`                        | admin        | Search, sort and paginate (`?search=&sort=&page=&limit=`) |
| `/admin/members/new`                    | admin        | Add a member                                              |
| `/admin/members/[id]`                   | admin        | Member details, public link and QR code                   |
| `/admin/members/[id]/edit`              | admin        | Edit a member (the public link and QR never change)       |
| `POST /api/members`                     | public       | Register (rate limited); admins skip the limit            |
| `GET /api/members`                      | admin        | List with `page`, `limit` (default 20, max 100), `search`, `sort` (`newest`, `oldest`, `name_asc`, `name_desc`) |
| `GET/PATCH/DELETE /api/members/:id`     | admin        | Read, update and delete one member                        |
| `GET /api/members/public/:publicToken`  | public       | Public profile fields only (no special dates)             |
| `GET /api/members/public/:publicToken/photo` | public  | The member's photo (JPEG), or 404                         |
| `GET /api/whatsapp/templates`           | admin        | Approved WhatsApp templates that can be sent              |
| `POST /api/whatsapp/send`               | admin        | Send a template or text to `memberIds`, or to `all` members matching `search` |

## Security notes

- **Authentication**: `proxy.ts` gates every `/admin` request on a valid session. Admin pages and APIs also re-check the admin in the database, so a deleted admin loses access immediately. Sessions are HttpOnly, `SameSite=Lax` JWT cookies that expire after 8 hours.
- **CSRF**: sign-in and sign-out use NextAuth's CSRF tokens. Authenticated mutations reject requests whose `Origin` doesn't match the host, the same check Next.js applies to Server Actions.
- **Brute force and spam**: logins are limited to 10 per IP per 15 minutes; public registrations to 30 per IP per 10 minutes. The counters live in Postgres, so they hold across serverless instances, and IPs are stored only as SHA-256 hashes.
- **Validation**: the same Zod schema runs in the browser and on the server. Text is trimmed and length-capped, and dates must be real and not in the future. Links must be `http(s)`, so `javascript:`, `data:` and `vbscript:` are rejected.
- **XSS**: user content is only rendered as React text, never as raw HTML. External links use `target="_blank" rel="noopener noreferrer"`.
- **Privacy**: profiles are addressed by a random 128-bit token, never the database id. Profile pages are marked `noindex`. QR codes contain only the profile URL. Birthday and anniversary stay out of the public page and API.
- **Photos**: the browser crops every camera shot or upload to a square JPEG of at most 512 px, which also strips metadata such as GPS location. The server accepts only JPEG data up to 512 KB and stores it in Postgres. It serves photos as `image/jpeg` with `nosniff`, cached only by the browser, so a removed photo is gone for everyone else. On phones, **Take Photo** opens the camera app. On computers it uses the webcam, which needs HTTPS or localhost.
- **Headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and a strict `Referrer-Policy`.
- **Errors**: users only see friendly messages. Stack traces and database errors stay in the server logs.

## Project structure

```text
app/                 routes: public member pages, admin CRM, API route handlers
components/          UI: member form, QR card, dialogs, admin navigation
lib/                 validation (shared), auth, security, members queries, formatting
prisma/              schema, migrations, seed
tests/               Vitest suites
proxy.ts             admin route protection (Next.js 16 "proxy", formerly middleware)
```
