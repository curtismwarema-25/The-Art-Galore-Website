# Production deployment setup

This runbook describes the reviewed release-candidate path for the current split deployment: the frontend is hosted on Vercel and the API runs on a single Linux VPS behind Nginx. It does not authorize a production deployment. Replace every angle-bracket value and obtain the owner approvals below before opening ticket sales.

## Prerequisites and owner decisions

- A supported Node.js LTS release, npm, Git, and a managed MySQL database compatible with the checked-in Prisma schema.
- DNS records for the public site, admin site (if separate), and API. Point the API name to the VPS; point the web names to Vercel.
- TLS certificates at Vercel and Nginx. Keep Nginx as the single trusted proxy (`TRUST_PROXY_HOPS=1`). Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, and websocket headers where applicable.
- Persistent VPS paths for media and backups. Backups must be copied off the VPS and encrypted using the operator's approved process.
- Owner-approved Privacy Policy, Terms of Use, refund/cancellation policy, support contact, payment instructions, and consent wording. Current legal pages explicitly say approval is pending.
- Confirm Daraja environment, shortcode, account, passkey, and callback URL with Safaricom. Refresh `MPESA_CALLBACK_ALLOWED_IPS` from Safaricom's current official [callback IP allowlist](https://developer.safaricom.co.ke/apis/GettingStarted). Daraja's documented STK callback contract does not specify a cryptographic signature or custom authentication header; this service checks the documented source IP allowlist and independently queries STK status before accepting a successful callback. Live payments remain disabled until a controlled payment rehearsal is approved.

## Release preparation

1. Review this release candidate and resolve all owner decisions. Keep secrets out of Git and use a restricted environment file or secret manager on the VPS.
2. Install backend and frontend dependencies from their lockfiles, run the backend/frontend checks documented in their package scripts, and build both artifacts in CI.
3. Configure Vercel with the frontend production variables from `frontend/.env.example`. Keep `VITE_API_BASE_URL=/api` while using the checked-in same-origin rewrite, and point that rewrite in `frontend/vercel.json` at the selected HTTPS API host. Review the rewrite and admin-host redirect against the actual Vercel project domains.
4. Configure the VPS using `backend/.env.production.example` as a key list, not as a deployable file. Set strong distinct JWT secrets, database credentials, URLs, exact HTTPS CORS origins, SMTP settings if enabled, and absolute persistent storage/backup paths. Keep `SEED_ADMIN_ENABLED=false` and M-Pesa live payments disabled.
5. Create the database and a separate restricted database account. Back up any existing database and test restoring it before applying schema changes.

## Deploy order and migration safety

1. Put the API into maintenance mode or stop writes for the first schema rollout. Take and verify a fresh database backup.
2. In a controlled migration job with the backend Prisma CLI installed, run `npm run prisma:sync-schema` from `backend/`, then `./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma` with the production database environment injected securely. The CLI is currently a development dependency, so do not omit dev dependencies from this migration job. The sync copies the source schema from `frontend/prisma/schema.prisma`; the second command applies committed migrations. Do not use `migrate dev`, `db push`, or the seed command on production.
3. Start the API under a dedicated unprivileged service account (for example `artgalore`) with automatic restart and logs outside the release directory. Keep secrets and persistent data under restricted shared paths.
4. Verify `/health`, `/health/db`, sign-in, admin reads, event reads, public media, upload moderation, and order/payment read flows before directing traffic to the new release.
5. Deploy the frontend to Vercel after API health checks pass. Verify public and admin host routing, CORS, cookies, API proxying, and browser console/network errors.
6. Re-enable writes and monitor API logs, database connections, email queue, backup jobs, and payment callback/reconciliation health.

The checked-in migration adds M-Pesa reconciliation metadata/indexes and is intended to be additive. Confirm the generated SQL against a production-like restored backup and inspect lock duration before applying it to a large live database. Never delete a migration that has been applied.

## Backups and recovery

- Schedule database backups and media backups independently; retain encrypted off-host copies and record restore credentials separately.
- Run `npm run backup:check` after configuring the backend backup job and periodically perform a restore rehearsal into an isolated database and media directory.
- Keep at least the current and previous API/frontend artifacts. For an application rollback, switch to the previous artifact only after confirming it is compatible with the migrated schema.
- For a schema/data issue, stop writes, preserve logs and the failed database snapshot, and restore the verified database/media backup as a coordinated recovery. Do not assume reverting application files reverses a migration.
- Record the recovery point, operator, and verification results in the deployment log.

## Go-live gates

- Privacy, terms, refund and consent copy approved by the organization; applicable operational contact details published.
- Successful restore rehearsal, health checks, admin access review, media privacy review, and event/ticket purchase rehearsal.
- Daraja sandbox callbacks, repeated callbacks, timeouts, and reconciliation verified without real payments. Enable production Daraja only after finance/operator approval and a reviewed secret configuration.
- DNS/TLS, Vercel routing, Nginx proxy headers, cookie security, exact CORS origins, monitoring, and incident contacts confirmed.
