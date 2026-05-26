# Backend Local Bootstrap

The backend is bootstrapped for local Prisma + MySQL development and now includes admin auth/session foundation.

## Current status
Implemented:
- Prisma schema source of truth at `../prisma/schema.prisma`
- Local schema sync into `backend/prisma/schema.prisma`
- Prisma validate/generate/migrate/seed scripts
- Prisma client singleton for app-wide usage
- Seed entry + idempotent upsert scaffolding
- Cookie-based admin session auth (`/auth/login`, `/auth/logout`, `/auth/me`)
- RBAC middleware (`authenticate`, `authorize`)
- App startup with Prisma connection and health endpoints
- Orders foundation:
  - `POST /api/orders`
  - `GET /api/orders/:orderNumber`
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/:id`
  - pending-payment lifecycle persistence with reservation expiry + initial payment transaction row

Not implemented yet:
- Full public/admin business CRUD modules
- Daraja provider initiation/callback logic
- Ticket issuance and check-in transactional flow

## Prerequisites
- Node.js 20+
- npm 10+
- MySQL server running locally

## Canonical files
- Schema (tracked source): `../frontend/prisma/schema.prisma`
- Schema (runtime copy): `./prisma/schema.prisma`
- API contracts: `../docs/backend-contracts.md`

## 1) Install dependencies
```bash
cd backend
npm install
```

## 2) Configure environment
```bash
cp .env.example .env
```

Required values for local bootstrap:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

MySQL URL format:
```text
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Example:
```text
mysql://root:9634@localhost:3306/the_art_galore_international
```

## 3) Create local databases manually
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS the_art_galore_international CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS the_art_galore_international_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If you do not use a shadow database, remove `SHADOW_DATABASE_URL` from `.env`.

## 4) Prisma workflow
All commands below auto-sync the root schema into `backend/prisma/schema.prisma` first.

Validate schema:
```bash
npm run prisma:validate
```

Generate Prisma Client:
```bash
npm run prisma:generate
```

Create/apply first migration:
```bash
npm run prisma:migrate:init
```

Create/apply later migrations:
```bash
npm run prisma:migrate
```

Apply migrations in deploy mode:
```bash
npm run prisma:migrate:deploy
```

Seed baseline data (+ optional admin user):
```bash
npm run prisma:seed
```

Open Prisma Studio:
```bash
npm run prisma:studio
```

## 5) Start backend
```bash
npm run dev
```

Health checks:
- `GET /health`
- `GET /health/db`

## Admin auth/session foundation

### Session model
- DB-backed `AuthSession` rows linked to `AuthUser`
- Cookie stores opaque session token
- Server stores only SHA-256 token hash
- Logout revokes DB session and clears cookie

### Endpoints
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Alias paths also supported for admin namespace:
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`

### Cookie/session env vars
- `SESSION_COOKIE_NAME` (default `agi_admin_session`)
- `SESSION_TTL_HOURS` (default `168`)
- `SESSION_SAME_SITE` (`lax` | `strict` | `none`)
- `SESSION_COOKIE_SECURE` (`false` for local HTTP)
- `SESSION_COOKIE_DOMAIN` (optional)
- `CORS_ORIGIN` (comma-separated origins allowed with credentials)

### RBAC middleware exported
- `authenticate`
- `authorize(roles)`
- `ADMIN_ACCESS_ROLES`
- `ADMIN_ONLY_ROLES`
- `MODERATOR_CAPABLE_ROLES`

### Partners/Gallery admin policy
- `ADMIN`, `STAFF`: full CRUD on `/api/admin/partners` and `/api/admin/gallery-images`
- `MODERATOR`: read-only access on those domains

### Community uploads moderation policy
- Public submission/listing:
  - `POST /api/community-uploads`
  - `GET /api/community-uploads` (approved records only)
- Admin moderation:
  - `GET /api/admin/community-uploads`
  - `GET /api/admin/community-uploads/:id`
  - `PATCH /api/admin/community-uploads/:id/status`
  - `DELETE /api/admin/community-uploads/:id`
- Roles:
  - `ADMIN`, `STAFF`, `MODERATOR`: read + moderate status
  - `ADMIN`, `STAFF`: delete

### Site settings admin policy
- Public read:
  - `GET /api/site-settings/public`
- Admin:
  - `GET /api/admin/site-settings`
  - `PATCH /api/admin/site-settings`
- Roles:
  - `ADMIN`, `STAFF`: read + write
  - `MODERATOR`: read-only

## Media Upload Pipeline (local)

Implemented local media storage with a pluggable provider abstraction.

- Upload endpoint: `POST /api/media/upload`
- Local file serving: `/api/media/files/:storageKey`
- Legacy static alias kept for old URLs: `/uploads/:storageKey`

Supported upload targets:
- `gallery`
- `partner-logo`
- `person-profile`
- `person-cover`
- `event-hero`
- `community`

Role policy:
- `community` target upload: public allowed
- other targets: `ADMIN`/`STAFF` only

Storage env:
- `STORAGE_PROVIDER` (`local` by default)
- `MEDIA_LOCAL_ROOT` (default `./storage/media`)
- `MEDIA_PUBLIC_BASE_PATH` (default `/media/files`)
- `ORDER_RESERVATION_TTL_MINUTES` (default `15`)

Lifecycle behavior:
- replacing media in events/people/partners/gallery attempts old-file cleanup
- deleting a community upload deletes its stored media file

## Ticket email delivery

Ticket issuing can email buyers their ticket links and optional PDF attachments after payment verification.

Delivery is opt-in. Configure these env vars:
- `EMAIL_DELIVERY_ENABLED=true`
- `SMTP_HOST`
- `SMTP_PORT` (usually `587` for STARTTLS or `465` with `SMTP_SECURE=true`)
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` (optional)
- `PUBLIC_APP_URL` (frontend origin for `/tickets/:publicTicketToken` links)
- `PUBLIC_API_URL` (optional API base URL ending in `/api`; local fallback derives from `PORT` + `API_PREFIX`)
- `EMAIL_ATTACH_TICKET_PDFS=true` to attach generated PDFs
- `EMAIL_DELIVERY_RETRY_ENABLED=true`
- `EMAIL_DELIVERY_RETRY_MAX_ATTEMPTS=5`
- `EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS=60`
- `EMAIL_DELIVERY_RETRY_BATCH_SIZE=20`

Delivery behavior:
- successful SMTP send marks the order `ticketDeliveryStatus` as `SENT`
- missing buyer email marks it `FAILED` with no automatic retry
- SMTP/config failure marks it `FAILED`, records the error summary, and schedules retry backoff
- disabled email delivery leaves the current status unchanged
- retry backoff is 5 minutes, 15 minutes, 1 hour, then 6 hours until the max attempt cap

The backend starts an in-process retry worker with the API server. It only runs when both `EMAIL_DELIVERY_ENABLED` and `EMAIL_DELIVERY_RETRY_ENABLED` are true.

Admin delivery endpoints:
- `GET /api/admin/tickets/delivery/order/:orderId`
- `POST /api/admin/tickets/delivery/order/:orderId/resend`

Admins can manually resend only while delivery is `PENDING` or `FAILED`. Successfully sent ticket emails are not resent automatically.

Troubleshooting:
- if attempts fail with SMTP config errors, confirm `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, credentials, and `EMAIL_FROM`
- if retries do not run, confirm the backend process is running and `EMAIL_DELIVERY_ENABLED=true`
- if a buyer has no email, update the order data manually before attempting resend

## Daily backups

The Windows backup script writes a timestamped folder with:
- `database.sql`
- `media.zip`
- `manifest.json`

Configure the output destination in `.env`. Point it at a synced cloud folder or an external drive:
```env
BACKUP_OUTPUT_DIR="C:\Users\Curtis\OneDrive\Kisii Art Backups"
BACKUP_RETENTION_DAYS=30
```

The script reads `DATABASE_URL`, uses `mysqldump` for `the_art_galore_international`, archives `MEDIA_LOCAL_ROOT`, and deletes matching backup folders older than the retention window. It passes the database password through `MYSQL_PWD` for the `mysqldump` process and does not print it.

Check prerequisites without creating a backup:
```bash
npm run backup:check
```

Run a manual backup:
```bash
npm run backup
```

The check verifies `.env`, `DATABASE_URL`, `mysqldump`, the media folder, and that `BACKUP_OUTPUT_DIR` is writable.

### Windows Task Scheduler

Create a daily scheduled task from PowerShell:
```powershell
schtasks /Create /TN "Kisii Art Collective Daily Backup" /SC DAILY /ST 20:00 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File F:\Github\kisii-art-collective\backend\scripts\backup.ps1" /F
```

Run it once on demand:
```powershell
schtasks /Run /TN "Kisii Art Collective Daily Backup"
```

GUI setup:
- Open Task Scheduler
- Choose "Create Basic Task..."
- Name it `Kisii Art Collective Daily Backup`
- Trigger: Daily
- Action: Start a program
- Program/script: `powershell.exe`
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File F:\Github\kisii-art-collective\backend\scripts\backup.ps1`
- Start in: `F:\Github\kisii-art-collective\backend`

### Restore

Stop the backend before restoring. From a backup folder, restore the database:
```powershell
cmd /c "mysql -u root -p the_art_galore_international < database.sql"
```

Restore uploaded media:
```powershell
Expand-Archive .\media.zip -DestinationPath F:\Github\kisii-art-collective\backend\storage\media -Force
```

The restore commands are documented for manual use only; the backup script never restores data automatically.

## Seeded admin user (local)
By default, `npm run prisma:seed` upserts one admin user for local login.

Default local values (override in `.env`):
- `SEED_ADMIN_ENABLED=true`
- `SEED_ADMIN_EMAIL=admin@local.test`
- `SEED_ADMIN_PASSWORD=ChangeMe123!`
- `SEED_ADMIN_FULL_NAME=Local Admin`
- `SEED_ADMIN_ROLE=ADMIN`

Login request example:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@local.test",
  "password": "ChangeMe123!"
}
```

## Available scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run backup`
- `npm run backup:check`
- `npm run prisma:sync-schema`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run prisma:migrate:init`
- `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`
- `npm run prisma:studio`
- `npm run prisma:seed`

## Troubleshooting
- `P1000`: invalid MySQL credentials in `DATABASE_URL`
- `EADDRINUSE`: port already in use; stop prior process or change `PORT`
- Windows `EPERM` during `prisma generate`: stop running backend process, then rerun Prisma command
- Prisma warning about `package.json#prisma` deprecation: non-blocking for now, can be moved later to `prisma.config.ts`
