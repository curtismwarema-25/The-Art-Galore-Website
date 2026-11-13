# Local M-Pesa Sandbox Checkout

This guide exercises the complete local flow with Daraja sandbox only:

`STK Push -> callback -> evidence validation -> ticket issuance -> optional email`

It does not recover or alter existing orders. Automated tests mock Daraja and never initiate an STK Push.

## Safety rules

- Keep `MPESA_DARAJA_ENV=sandbox` and `MPESA_LIVE_PAYMENTS_ENABLED=false`.
- Keep Daraja credentials in `backend/.env`; never use `VITE_` variables for them.
- Use a sandbox app and test phone/account supplied by the Daraja portal. A simulator confirmation is not proof of a live-money transaction.
- A GET callback probe only proves that an HTTP endpoint responded. The callback is POST-only; it does not prove that Daraja can deliver a valid callback.
- Do not use a real customer order for setup or automated tests.

Safaricom documents sandbox apps and simulator testing in the Daraja portal. Its Transaction Status documentation also describes status queries as a secondary mechanism when callbacks are not received and requires provider transaction evidence for that API. See [Daraja Transaction Status](https://developer.safaricom.co.ke/apis/TransactionStatus).

## Prerequisites

Run these read-only checks from PowerShell:

```powershell
node --version
npm --version
ngrok version
Get-Service MySQL* -ErrorAction SilentlyContinue
```

Install dependencies only if the repository does not already contain them:

```powershell
Push-Location backend
npm ci
Pop-Location
Push-Location frontend
npm ci
Pop-Location
```

## Configure the sandbox

Create the local file and edit it privately:

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

Set these values without printing secrets:

```dotenv
NODE_ENV=development
PORT=4000
SERVE_FRONTEND=false
PUBLIC_APP_URL=http://localhost:8080
PUBLIC_API_URL=
CORS_ORIGIN=http://localhost:8080
MPESA_DARAJA_ENV=sandbox
MPESA_LIVE_PAYMENTS_ENABLED=false
MPESA_SHORTCODE=174379
MPESA_CONSUMER_KEY=<sandbox consumer key>
MPESA_CONSUMER_SECRET=<sandbox consumer secret>
MPESA_PASSKEY=<sandbox passkey>
MPESA_CALLBACK_URL=https://<reserved-ngrok-domain>/api/payments/mpesa/stk/callback/<local-token>
MPESA_CALLBACK_PATH_TOKEN=<same local-token>
MPESA_CALLBACK_SECRET=<separate local callback secret>
MPESA_LEGACY_CALLBACK_QUERY_ENABLED=false
MPESA_RECONCILIATION_ENABLED=true
MPESA_RECONCILIATION_INTERVAL_SECONDS=30
EMAIL_DELIVERY_ENABLED=false
EMAIL_DELIVERY_RETRY_ENABLED=false
```

The tokenized callback is preferred for local testing. If a legacy callback is required for a specific sandbox fixture, use the exact root callback path, configure `MPESA_CALLBACK_SECRET`, and set `MPESA_LEGACY_CALLBACK_QUERY_ENABLED=true`. Never use a development bypass in production.

Generate a local token without displaying it in shared output:

```powershell
$localCallbackToken = [Convert]::ToBase64String([byte[]](1..32 | ForEach-Object { Get-Random -Maximum 256 })) -replace '\+', '-' -replace '/', '_' -replace '=', ''
$localCallbackToken.Length
```

Copy the value privately into both `MPESA_CALLBACK_PATH_TOKEN` and the final callback URL segment.

## Start the HTTPS tunnel

The repository environment has `ngrok.exe` available. A stable callback requires an ngrok reserved domain:

```powershell
ngrok http --domain=<reserved-ngrok-domain> 4000
```

If no reserved domain is available, `ngrok http 4000` supplies a rotating URL. Update `MPESA_CALLBACK_URL` after every tunnel restart and restart the backend. Do not copy the callback URL, token, or secret into tickets, screenshots, or shared chat.

Inspect tunnel requests through the local ngrok console at `http://127.0.0.1:4040`, or through the ngrok request API. Treat callback bodies and query strings as sensitive; inspect status, method, and timestamp only.

## Validate and start locally

The diagnostic is read-only. It checks sandbox selection, callback route shape, database connectivity, worker settings, email safety, and performs a credential-free GET probe:

```powershell
Push-Location backend
npm run mpesa:diagnose
Pop-Location
```

Expected callback probe results are commonly HTTP 404 or 405 because the endpoint accepts POST only. That response still does not prove a valid provider callback.

Start the backend:

```powershell
Push-Location backend
npm run dev
```

In another PowerShell window, start the frontend:

```powershell
Push-Location frontend
npm run dev
```

Vite serves on `http://localhost:8080` and proxies `/api` to `http://localhost:4000`. The proxy target can be overridden with `VITE_BACKEND_PROXY_TARGET`; do not point it at production for sandbox testing.

Read-only health checks:

```powershell
Invoke-WebRequest http://localhost:4000/health
Invoke-WebRequest http://localhost:4000/health/db
Invoke-WebRequest https://<reserved-ngrok-domain>/health
```

## Email delivery

Email is deliberately disabled by default. Ticket issuance does not depend on email delivery.

To opt in with a dedicated local SMTP account, set privately:

```dotenv
EMAIL_DELIVERY_ENABLED=true
EMAIL_DELIVERY_RETRY_ENABLED=true
SMTP_HOST=<local SMTP host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<local SMTP user>
SMTP_PASSWORD=<local SMTP password>
EMAIL_FROM=<verified local sender>
EMAIL_REPLY_TO=<optional reply address>
```

The backend refuses startup when enabled email lacks an SMTP host or sender. Verify SMTP using a disposable local test order only. Do not send to a real customer during setup. Ticket email delivery starts only after ticket issuance; an email failure does not reverse a verified payment or issued ticket.

## Safe callback and payment testing

Automated verification uses mocked Daraja responses:

```powershell
Push-Location backend
npm test -- --test-name-pattern="STK query|callback|reconciliation"
Pop-Location
```

For a manual sandbox test, use a new disposable sandbox order, not an existing customer order. Confirm the backend logs show only sanitized runtime state, the callback inbox receives a callback, the callback contains matching checkout identity/receipt/amount/phone, and ticket issuance follows payment verification.

`ResponseCode=0` or `ResultCode=0` without receipt, amount, phone, and matching checkout evidence must remain ambiguous. It must not issue tickets.

## Troubleshooting

- **Callback URL mismatch:** compare the callback path with `/api/payments/mpesa/stk/callback/<token>` and rerun `npm run mpesa:diagnose`.
- **No callback inbox event:** inspect the ngrok request list, tunnel uptime, backend port, and callback route. Do not assume a browser GET validates a POST callback.
- **Sandbox query has no receipt:** retain the transaction as ambiguous; use a callback fixture or provider-side sandbox evidence. Do not weaken production validation.
- **HTTP 429/500 from Daraja:** allow the worker's bounded backoff to handle it; do not start parallel manual queries.
- **Email pending:** verify tickets first, then inspect SMTP configuration and retry-worker startup logs.

## Stop safely

Stop the frontend and backend with `Ctrl+C`. Stop the tunnel in its own window with `Ctrl+C`. Do not delete the local database or alter an existing order as part of cleanup.
