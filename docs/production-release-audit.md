# Production Release Audit

Audit date: 2026-10-24 (Africa/Nairobi)

## Recommendation: NO-GO for live ticket sales or M-Pesa

Production release remains blocked by M-Pesa callback/query contract confirmation, missing isolated database-backed race tests, and VPS/Vercel settings that cannot be verified from this checkout. The callback route now enforces the documented Safaricom source IP allowlist, while successful callback events require authenticated server-side STK Query before payment state changes. Frontend TypeScript errors from the previous audit have been corrected and typecheck passed in isolation. A non-payment preview is also not approved by this audit: payment initiation routes exist and no separately verified deployment switch isolates them from production.

## Repository and preservation state

- Repository root: `C:/Users/HP/github/The-Art-Galore-Website`.
- Branch: `codex/production-readiness-rc`; HEAD and baseline: `b2158f7962e1da9831015b80ed6e685d48d473af` (`sprint 05C`).
- Upstream: `origin/main`; local `main` and `origin/main` point to the same baseline. The release candidate has no commits of its own.
- One Git worktree is registered: this repository. No separate remediation/integration branch is present in local refs.
- At audit start, 82 release-candidate paths were staged, with no unstaged tracked changes or nonignored untracked files. `backend/.env` is ignored and was excluded from backups and output. The required pre-edit snapshot is at `C:/Users/HP/AppData/Local/Temp/artgalore-production-audit-20261023T234537Z`; it contains a 292,385-byte staged patch, status, ref/branch inventory, staged file list, and zero-byte unstaged/untracked lists because those categories were empty. Secret contents were not copied.
- A prior recovery snapshot exists at `C:/Users/HP/AppData/Local/Temp/artgalore-rc-recovery-20261023`. It captures a different staged/index state (236,622-byte staged patch plus 49,483-byte unstaged patch and eight previously untracked files). It is not byte-for-byte the same as the current staged snapshot; the eight recovered paths are now represented in the release candidate. Do not apply either recovery patch blindly.
- No release-candidate commits were made before the interruption. The existing work is staged against the baseline and should be preserved. Changes made during this audit are unstaged and are listed below.

Relevant local refs:

| Ref | SHA | Relationship to current `main` |
|---|---|---|
| `main`, `origin/main`, `codex/production-readiness-rc` | `b2158f7962e1da9831015b80ed6e685d48d473af` | Equal |
| `origin/feature/mpesa-ticket-sales` | `ce27fa10972c6ddc23601ad474b935d8e724cd11` | Divergent feature history |
| `origin/feature/admin-live-data` | `b8646c647c806005181ce8a327d67e5f9e5951fd` | Divergent feature history |
| `origin/feature/admin-operations-ux` | `c1d0ebce02170aeb992e97fa49a6d7bf375ff1aa` | Divergent feature history |
| `origin/feature/public-content-copy` | `ed292fe63c0254839664728d3eb8a8ddfbd332ae` | Divergent feature history |

No fetch was performed. The expected `feature/admin-subdomain-redirect` and `release/mpesa-hardening-integration` refs were not found in the existing local ref inventory. No conclusion is made about remote refs not already present locally.

## Severity findings

### Critical

1. **Callback authentication and payment verification are improved, but the provider contract remains incomplete.** Safaricom's current M-Pesa Express page describes the asynchronous callback, and Getting Started publishes API Gateway source IPs for allowlisting. In the official pages reviewed, I found no documented callback signature or custom authentication header; this is a scoped documentation finding, not proof that no other contract exists. The app now requires a configured exact-IP allowlist at `backend/src/modules/payments/payments.routes.ts:60-68`. A successful callback triggers OAuth-authenticated STK Push Query at `backend/src/modules/payments/payments.service.ts:464-488` and `:703-745`; callback fields alone cannot set an order paid. However, the public Safaricom pages available here do not expose the exact STK Query response schema/semantics. Confirm with Safaricom that `ResultCode === "0"` is conclusive, and how amount, receipt, phone, and checkout ID are verified, before go-live. Production startup requires a callback allowlist when a callback URL is configured, and live payments require reconciliation and credentials. [M-Pesa Express API and callback documentation](https://developer.safaricom.co.ke/apis/MpesaExpressSimulate) [Safaricom callback IP allowlisting guidance](https://developer.safaricom.co.ke/apis/GettingStarted)
2. **M-Pesa lifecycle is not fully verified.** `buildDueMpesaTransactionWhere` in `backend/src/modules/payments/payments.repository.ts` excludes fresh reservations without a CheckoutRequestID; the new focused query test passed. Callback ingestion and inbox processing rely on durable inbox retries. Existing DB workflow tests cover callback-before-response, retries, lease recovery, terminal-state protection, late payment, and idempotent fulfillment, but those database-backed tests have not been run against a confirmed disposable database.
3. **State transition and issuance concurrency remain a live-sales blocker.** Service/repository code uses conditional nonterminal payment updates, order transitions, and ticket issuance under an order lock, but the full callback race, duplicate issuance, and terminal-state behavior require integration tests against a disposable MySQL database. No such DB test was run against the configured local MySQL or production.

### High

1. **Database integration remains blocked.** The ignored local `backend/.env` exists, but its DB password remains a placeholder. Earlier backend integration tests could not authenticate to MySQL; no migration, seed, or production database command was run. `prisma validate` is schema-only evidence and does not establish database compatibility or transaction behavior.
2. **Provider verification requires operator confirmation.** Callback source IP allowlisting is documented by Safaricom and now enforced. Successful results are queried with authenticated Daraja credentials. Confirm the current published IP list and the STK Query response semantics with Safaricom; no cryptographic callback signature is claimed.
3. **Production settings are not live-verified.** Vercel project branch/build/environment configuration, actual admin-subdomain behavior, VPS database bind address/user privileges, Nginx proxy settings, persistent storage, process supervision, backups/restore, monitoring, and TLS renewal are outside repository evidence. DNS/HTTPS assertions are user-provided context, not rechecked here.
4. **Admin/media/order integration is unverified against a live schema.** Admin feature screens and endpoints were added/connected in the staged candidate; no database-backed end-to-end tests could establish that event management, order approval, check-in, QR scanning, gallery, settings, or uploads work against the deployed schema and authorization matrix.

### Medium

1. `backend/src/modules/media/media.routes.ts` serves private payment proofs via an authenticated admin route; `backend/src/app.ts:78-107` limits static public media to allowed targets and gates community media on approval. Existing focused tests cover media access policy and path traversal, but not deployed proxy/static behavior.
2. `backend/src/modules/uploads/uploads.schema.ts` requires explicit consent; the public upload form carries the user's choice. `consentGiven: true` in the admin people form is an internal default and is not evidence that community uploads bypass consent.
3. The staged candidate includes live dashboard statistics, public page error/retry states, real share/copy actions, Vercel rewrites, production env validation, deployment docs, and legal pages. Frontend typecheck and lint passed in the isolated copy; browser and deployed-host behavior remain unverified.
4. Legal pages still require owner/legal review for jurisdiction-specific privacy, terms, and ticket refund wording before accepting payments.

### Low

1. Prisma 6.19.2 emitted a deprecation warning for `package.json#prisma`; migration to `prisma.config.ts` is future maintenance, not the immediate release blocker.
2. The frontend production bundle emitted stale Browserslist data and large-chunk warnings in the observed build.

## Code changes made during this audit

These are unstaged on top of the 82 staged release-candidate paths:

- `backend/src/modules/payments/payments.repository.ts` and `payments.repository.test.ts`: due reconciliation excludes rows without `externalRequestId`; focused regression test passed.
- `backend/src/modules/payments/mpesaCallbackAuth.ts` and `.test.ts`, `payments.routes.ts`, `backend/src/config/env.ts`, and backend env templates: exact IP allowlist enforcement, IP config validation, production fail-closed checks, and focused callback-source tests. Shared callback secret support was removed because the reviewed Safaricom contract did not document such a header or query parameter.
- `backend/src/modules/payments/payments.workflow.test.ts`: callback route integration test now verifies a disallowed source is rejected; selected test passed without exercising the database.
- `backend/README.md` and `docs/production-deployment-setup.md`: document source-IP filtering, server-side STK Query, reverse-proxy requirements, and the unresolved provider-contract confirmation.
- `backend/src/modules/media/mediaResponse.ts`: media misses consistently return 404 instead of reading a nonexistent `statusCode` property from a generic `Error`.
- `backend/src/modules/uploads/uploads.service.ts`: absent optional consent now maps to `false`, preserving explicit-consent semantics and satisfying the required persistence type.
- `frontend/src/components/examples/ArtistProfileCard.tsx` and `HeroMinimal.tsx`: keep Motion easing values as literals for the declared `Variants` type.
- `frontend/src/components/common/StatusBadge.tsx` and `frontend/src/features/admin/orders/AdminOrdersPage.tsx`: add the refunded display tone and map an unsubmitted verification state safely.
- `frontend/src/pages/AdminLogin.tsx`, `Index.tsx`, and `OrderTracking.tsx`: submit validated login fields, remove a duplicate import, and render only data exposed by the public tracking contract.
- `frontend/src/test/homepageState.test.ts`: fill the required slug and perks fields in the ticket-tier fixture.
- `docs/production-release-audit.md`: this audit report.

The recovery work itself remains staged and should be retained. No commit, push, merge, deployment, migration, seed, live payment, or email was performed.

## Implementation status by area

| Area | Status | Evidence and remaining concern |
|---|---|---|
| Media privacy | IMPLEMENTED BUT UNVERIFIED | Filtered static routes in `backend/src/app.ts:78-107`; private proof route in `backend/src/modules/media/media.routes.ts`; policy/path tests exist. Verify in deployed proxy and with role-based integration tests. |
| M-Pesa initiation/reservation | PARTIALLY IMPLEMENTED | Reservation happens before STK network request and duplicate order attempts are serialized. Audit guard added at `backend/src/modules/payments/payments.repository.ts:364`; no post-edit regression test. |
| M-Pesa ambiguous outcomes | PARTIALLY IMPLEMENTED | Timeout/malformed success paths retain ambiguous status and avoid blind retries. Test delayed callback and reservation overlap before release. |
| M-Pesa callbacks/idempotency | PARTIALLY IMPLEMENTED | Durable inbox/event hash and nonterminal conditional updates exist. Route checks the official IP allowlist; successful callbacks invoke authenticated STK Query. No signed callback contract is documented on the public product page. |
| M-Pesa reconciliation | PARTIALLY IMPLEMENTED | Lease, retry/backoff, manual-review state and status query exist. Must establish Daraja query semantics and concurrency/terminal state safety. Safaricom documents Transaction Status as asynchronous and reliant on receipt/originator conversation ID, which does not directly establish the STK Query contract used here. [Transaction Status docs](https://developer.safaricom.co.ke/apis/TransactionStatus) |
| Manual proof overlap | PARTIALLY IMPLEMENTED | Manual submissions are stored/reviewed separately; verify atomic exclusion between an active STK attempt and manual approval under concurrent requests. |
| Dashboard stats | IMPLEMENTED BUT UNVERIFIED | New backend stats route and frontend query replaced mock dashboard stats; no DB integration run. |
| Admin operations | IMPLEMENTED BUT UNVERIFIED | Candidate connects event/order/check-in/gallery/settings/uploads flows; route authorization and actual persisted behavior need DB-backed acceptance tests. |
| Public errors | IMPLEMENTED BUT UNVERIFIED | Events, artists, gallery and event/home views add loading/error states; frontend typecheck fails, so behavior is not accepted. |
| Consent | IMPLEMENTED BUT UNVERIFIED | Upload schema includes consent and server persistence stores it; admin form default is separate from the public community flow. |
| Share/referral | IMPLEMENTED BUT UNVERIFIED | Event share/copy uses browser APIs and handles failure; ticket sharing uses share/copy. Browser cancellation and unsupported clipboard need UI verification. |
| Production routing | PARTIALLY IMPLEMENTED | `frontend/vercel.json`, API base URL example, and backend env validation are present. Vercel host-specific redirect behavior and deployed env are unverified. |
| Legal placeholders | PARTIALLY IMPLEMENTED | Privacy, terms, refund pages were edited; legal owner review required. |
| Deployment docs/templates | IMPLEMENTED BUT UNVERIFIED | `docs/production-deployment-setup.md`, backend README, and sanitized `backend/.env.production.example` exist; procedure has not been executed on a production-like VPS. |

## Verification results

Commands were run in isolated temporary copies where dependency installation/build outputs could not affect the checkout. The working tree was not used for dependency installation. No database-dependent commands were run against the installed MySQL service.

| Check | Result |
|---|---|
| Backend Prisma client generation (`npm run prisma:generate`) | PASS in isolated copy; Prisma Client 6.19.2 generated from candidate schema. |
| Backend production build (`npm run build`) | PASS in isolated copy after copying current backend source and generating Prisma Client. |
| Backend focused tests (`node .\\node_modules\\tsx\\dist\\cli.mjs --test src/modules/payments/mpesaCallbackAuth.test.ts src/modules/payments/payments.repository.test.ts src/modules/payments/payments.service.test.ts src/modules/payments/mpesaReconciliationWorker.test.ts`) | PASS: 13 database-independent tests passed, zero failed/skipped. Executed in the isolated backend dependency copy with a process-local Node `os.userInfo` preload. |
| Backend callback route regression (`node .\\node_modules\\tsx\\dist\\cli.mjs --test --test-name-pattern='callback route rejects sources' src/modules/payments/payments.workflow.test.ts`) | PASS: 1 test passed; verified a request from an unlisted source is rejected. This selected test did not require a database. |
| Backend full test suite / DB integration | BLOCKED by missing valid local DB credentials; prior observed suite had 18 pass and 17 skipped after root authentication failure. No test is claimed to have verified live DB invariants. |
| Backend Prisma schema validation (`npm run prisma:validate` in isolated backend copy) | PASS: schema valid; Prisma 6.19.2 emitted the known `package.json#prisma` deprecation warning. This does not connect to or validate a production database. |
| Frontend lint (`npm run lint` from `.audit-verification-20261024`) | PASS: exit code 0. |
| Frontend TypeScript project check (`node .\\node_modules\\typescript\\bin\\tsc -b --pretty false` from `.audit-verification-20261024`) | PASS: exit code 0. |
| Frontend tests (`npm test` from `.audit-verification-20261024`) | BLOCKED: esbuild failed before loading config with `Cannot read directory "../../..": Access is denied`; zero tests ran in the final attempt. A prior isolated run passed 2 files/3 tests. |
| Frontend production build (`npm run build` from `.audit-verification-20261024`) | BLOCKED: same esbuild parent-directory access failure before config load. A prior isolated run passed, with stale Browserslist and large-chunk warnings. |
| Dependency install/lock consistency | `npm ci` succeeded in isolated frontend/backend copies; npm warned that lifecycle scripts for Prisma/esbuild/SWC packages were not approved by npm 11. Prisma generation was separately observed to succeed. |
| `git diff --check` and `git diff --cached --check` | PASS at final review; only a line-ending notice appeared for the edited media response file. |

The original backend test-runner failure reproduced as a Node 24.22.1 `os.userInfo()` system-call failure (`uv_os_get_passwd returned ENOMEM`) while the Node process used about 34 MB RSS; this does not establish memory exhaustion. A test-only preload replacing `os.userInfo()` allowed 13 database-independent backend tests to run. A separate route test selected by name also passed. The final frontend test retry was run from a copy inside the workspace with the isolated dependency junction and Node added to PATH. esbuild still failed while trying to enumerate `../../..` with `Access is denied`, before loading the Vitest config. The evidence establishes a filesystem access restriction in this runner, but does not distinguish Windows ACLs from sandbox policy or another file-access control; antivirus, dependency damage, and application code are not established causes. Do not remove dependencies, caches, or lockfiles as a speculative fix. No database-dependent check should be retried until a clearly isolated test database is configured.

## Environment variable status (names only)

The ignored local `backend/.env` exists, but contains an unfilled database password placeholder; no values are reproduced here. Production-ready status cannot be inferred from file existence. Check these names in the deployment secret manager and report presence only:

- Backend: `DATABASE_URL`, `NODE_ENV`, `PORT`, `HOST`, `API_PREFIX`, `CORS_ORIGIN`, `TRUST_PROXY_HOPS`, `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAME_SITE`, `SESSION_TTL_HOURS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MPESA_DARAJA_ENV`, `MPESA_LIVE_PAYMENTS_ENABLED`, `MPESA_RECONCILIATION_ENABLED`, `MPESA_CALLBACK_ALLOWED_IPS`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `MEDIA_STORAGE_DIR`.
- Backend payment callback controls: `MPESA_CALLBACK_ALLOWED_IPS`, plus `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, and `MPESA_RECONCILIATION_ENABLED` for live flows. `MPESA_CALLBACK_SECRET` is no longer used; a URL token was not adopted as authentication because the documented API does not specify a callback header and secrets in URLs can leak into logs.
- Frontend: `VITE_API_BASE_URL` (or the variable named by the committed frontend env example); no server credentials belong in Vite-exposed variables.

Compare this list against `backend/src/config/env.ts` and the production template before provisioning; optional variables and exact validation rules may differ by deployment mode. Never paste secret values into an audit log.

## Ordered deployment checklist and rollback

1. Preserve this staged candidate and unstaged audit edits; review the complete diff. Frontend typecheck and lint pass; restore Vite/esbuild access to its config in the test runner and rerun frontend tests/build. Run deterministic M-Pesa race/idempotency workflow tests only against a disposable database.
2. Provision a separate test database with least-privilege credentials; run schema/migration compatibility and integration tests there only. Exercise concurrent initiation, early callback, duplicate callback, late success, rejection, manual approval overlap, and terminal-state monotonicity.
3. Verify the exact Daraja STK callback and STK Query response contracts with Safaricom; sync the currently documented callback IP allowlist into `MPESA_CALLBACK_ALLOWED_IPS`. Keep live payments disabled until test evidence is accepted.
4. Have legal owner approve policy and refund language. Verify SMTP sandbox behavior and media persistence/permissions without sending production emails.
5. Verify Vercel production branch, build command/output directory, `VITE_API_BASE_URL`, public/admin host redirects, and preview/production separation in Vercel.
6. On VPS, verify MySQL listens only on loopback/private interface, app DB grants are least privilege, uploads are on persistent storage with correct owner, Nginx forwards HTTPS and trusted proxy headers, service manager restarts safely, logs rotate, backups retain off-host copies, and restore/TLS renewal checks have been exercised.
7. Stage/approve a separate deployment window only after all blocking checks pass. Deploy backend with payments disabled first, apply reviewed migrations using the documented safe procedure, verify health/readiness and admin workflows, then deploy frontend. Enable real M-Pesa only after callback verification and a controlled acceptance window.
8. Rollback: disable payment initiation, restore the prior frontend/backend release artifacts and configuration, retain logs and callback inbox records, and do not reverse database migrations automatically. Use a reviewed forward-fix or tested database restore plan; reconcile any in-flight payments with the provider before reopening sales.

## Release blockers for live sales

- Exact STK Query response semantics and the current callback IP list require confirmation with Safaricom/operations.
- Database-backed concurrency, callback processing, and duplicate-ticket tests remain unavailable without an isolated DB credential.
- Database-backed transaction, migration, authorization, and end-to-end tests are unavailable without an isolated DB credential.
- VPS/Vercel deployment settings, persistent media, backups/restoration, TLS renewal, and process restart behavior remain unverified.
- Legal policy and ticket refund terms require owner review.

**Next action:** provision a disposable MySQL test database with test-only credentials, then run the existing M-Pesa workflow/race/idempotency suite against it. In parallel with that release gate, obtain Safaricom confirmation of STK Query response semantics and refresh the callback IP list from the official source. Keep `MPESA_LIVE_PAYMENTS_ENABLED` disabled until all blockers above have evidence-based closure.
