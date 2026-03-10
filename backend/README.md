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
- Schema (source): `../prisma/schema.prisma`
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
