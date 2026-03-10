# Backend API Contracts (Contract-First)

Status: Draft v1 (pre-implementation)

Base URL: `/api`

This document defines the intended REST API contracts for the Node.js + MySQL + Prisma backend foundation.

## 1. Global Conventions

### Auth model
- Public endpoints: no auth required.
- Admin endpoints: require authenticated `AuthUser` with role `ADMIN`, `STAFF`, or `MODERATOR`.
- Role restrictions:
  - `ADMIN`: full admin access.
  - `STAFF`: operational CRUD except destructive auth/security operations.
  - `MODERATOR`: upload moderation, check-in, read access to most admin resources.

### Common response envelope
Success:
```json
{
  "data": {},
  "meta": {}
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

### Pagination
List endpoints support:
- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `sortBy`
- `sortOrder` (`asc` | `desc`)

### Idempotency
Mutating endpoints with side effects should accept `Idempotency-Key` header.
- Required for payment initiation.
- Recommended for order creation.

## 1.1 Media Upload

### `POST /media/upload`
- Purpose: upload a file and receive managed media metadata (`storageKey`, `url`, mime/size/dimensions).
- Content type: `multipart/form-data`.
- Form fields:
  - `target`: `gallery | partner-logo | person-profile | person-cover | event-hero | community`
  - `file`: binary file payload
- Auth:
  - `community`: public allowed
  - all other targets: `ADMIN` or `STAFF`
- Response:
```json
{
  "data": {
    "target": "gallery",
    "storageKey": "gallery/2026/03/....jpg",
    "url": "/api/media/files/gallery/2026/03/....jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 182001,
    "width": 1600,
    "height": 1200,
    "originalName": "my-photo.jpg",
    "uploadedAt": "2026-03-10T10:00:00.000Z"
  }
}
```

## 2. Public APIs

## 2.1 Events

### `GET /events`
- Purpose: list public events.
- Auth: public.
- Query params:
  - `status` (optional, default `PUBLISHED`)
  - `from`/`to` ISO datetime (optional)
  - `eventType` (optional)
  - `search` (optional)
- Response:
```json
{
  "data": [
    {
      "id": "evt_...",
      "slug": "sip-paint-sunset-edition",
      "title": "Sip & Paint: Sunset Edition",
      "eventType": "Sip & Paint",
      "summary": "...",
      "startAt": "2026-03-15T15:00:00.000Z",
      "endAt": "2026-03-15T18:00:00.000Z",
      "timezone": "Africa/Nairobi",
      "venueName": "The Yard, Kisii Town",
      "capacity": 40,
      "status": "PUBLISHED",
      "heroImageUrl": "https://...",
      "displayOrder": 1
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```
- Errors: `400`, `500`.

### `GET /events/:slug`
- Purpose: get event detail by slug.
- Auth: public.
- Path params: `slug`.
- Response includes normalized relations:
  - `highlights[]`
  - `lineup[]`
  - `partners[]` (from `PartnerPlacement` with context `EVENT`)
- Errors: `404`, `500`.

### `GET /events/:slug/ticket-tiers`
- Purpose: get sellable tiers for one event.
- Auth: public.
- Response fields:
  - `id`, `slug`, `name`, `price`, `currency`, `availableQuantity`, `maxPerOrder`, `saleStartAt`, `saleEndAt`, `perks[]`.
- Errors: `404`, `500`.

## 2.2 People / Artists

### `GET /people`
- Purpose: list public people profiles.
- Auth: public.
- Query params:
  - `role` (`LEADERSHIP` | `MEMBER` | `ARTIST`) optional
  - `search` optional
- Response includes `roles[]` and `featuredWorks[]`.
- Errors: `400`, `500`.

### `GET /people/:slug`
- Purpose: person/artist profile detail.
- Auth: public.
- Response includes:
  - base profile
  - `roles[]`
  - `featuredWorks[]`
  - `eventsParticipated[]` (from `EventParticipation`).
- Errors: `404`, `500`.

## 2.3 Partners

### `GET /partners`
- Purpose: list active partners for public pages.
- Auth: public.
- Query params:
  - `context` (`HOMEPAGE` | `DIRECTORY` | `EVENT`) optional
  - `eventSlug` optional (when `context=EVENT`)
- Response includes placement context metadata.
- Errors: `400`, `500`.

## 2.4 Gallery

### `GET /gallery-images`
- Purpose: list active gallery images.
- Auth: public.
- Query params:
  - `eventSlug` optional
  - `featured` optional boolean
- Response includes image metadata and event summary fields.
- Errors: `400`, `500`.

## 2.5 Settings (Public)

### `GET /site-settings/public`
- Purpose: fetch public site settings snapshot.
- Auth: public.
- Response maps from `SiteSettings` singleton.
- Errors: `500`.

## 2.6 Newsletter

### `POST /newsletter/subscriptions`
- Purpose: create or reactivate newsletter subscription.
- Auth: public.
- Request body:
```json
{
  "email": "user@example.com",
  "source": "homepage"
}
```
- Response:
```json
{
  "data": {
    "id": "nsl_...",
    "email": "user@example.com",
    "status": "ACTIVE",
    "subscribedAt": "2026-03-10T00:00:00.000Z"
  }
}
```
- Status codes: `201`, `200` (already active), `422`.

## 2.7 Community Uploads

### `POST /community-uploads`
- Purpose: submit an upload for moderation.
- Auth: public.
- Request body (after upload URL/key acquisition flow):
```json
{
  "eventId": "evt_...",
  "alias": "Moraa K.",
  "submitterEmail": "optional@example.com",
  "submitterPhone": "+2547...",
  "consentGiven": true,
  "imageUrl": "https://cdn/...",
  "storageKey": "community/2026/..",
  "mimeType": "image/jpeg",
  "sizeBytes": 245000,
  "width": 1080,
  "height": 1350
}
```
- Response: created upload with `status = PENDING`.
- Status codes: `201`, `422`.

### `GET /community-uploads`
- Purpose: list approved uploads for public gallery/community pages.
- Auth: public.
- Query params:
  - `eventSlug` optional
  - `status` optional, public default/allowed `APPROVED`
- Errors: `400`, `500`.

## 2.8 Orders / Tickets / Payments (Public Commerce)

### `POST /orders`
- Purpose: create an order shell and order items.
- Auth: public.
- Idempotency: recommended (`Idempotency-Key` header).
- Request body:
```json
{
  "eventId": "evt_...",
  "buyer": {
    "fullName": "Jane Doe",
    "phone": "+2547...",
    "email": "jane@example.com"
  },
  "items": [
    {
      "ticketTierId": "tier_...",
      "quantity": 2
    }
  ]
}
```
- Response:
```json
{
  "data": {
    "orderId": "ord_...",
    "orderNumber": "ORD-20260310-0001",
    "status": "PENDING",
    "currency": "KES",
    "subtotalAmount": "3000.00",
    "totalAmount": "3000.00",
    "reservationExpiresAt": "2026-03-10T10:15:00.000Z",
    "ticketDeliveryStatus": "PENDING",
    "items": []
  }
}
```
- Status codes: `201`, `409` (idempotency conflict), `422`.

### `GET /tickets/:ticketId`
- Purpose: ticket confirmation retrieval.
- Auth: public (signed link/token strategy to be enforced in implementation).
- Path params: `ticketId` (ticket id or ticketNumber depending on implementation decision).
- Response includes event summary, tier, buyer-safe fields, check-in status.
- Errors: `404`, `410` (revoked/cancelled access policy dependent).

### `POST /payments/mpesa/initiate`
- Purpose: trigger Daraja STK push for an order.
- Auth: public.
- Idempotency: required (`Idempotency-Key` header).
- Request body:
```json
{
  "orderId": "ord_...",
  "phone": "+2547..."
}
```
- Side effects:
  - creates `PaymentTransaction` with `status=INITIATED`/`PENDING`
  - stores provider request metadata
- Response:
```json
{
  "data": {
    "transactionId": "pay_...",
    "orderId": "ord_...",
    "status": "PENDING",
    "provider": "MPESA"
  }
}
```
- Status codes: `202`, `409`, `422`.

### `POST /payments/mpesa/callback`
- Purpose: Daraja callback receiver.
- Auth: provider signature/IP validation (implementation phase).
- Request body: raw provider payload.
- Side effects:
  - updates `PaymentTransaction`
  - updates `Order.status`
  - issues `Ticket` rows on success
- Response: `200` ACK.
- Notes: endpoint must be idempotent by provider reference/result payload.

### `GET /payments/:transactionId`
- Purpose: fetch payment transaction status for client polling.
- Auth: public by signed context or admin; final policy TBD.
- Errors: `404`.

## 3. Admin APIs

All admin routes require authentication + role checks.

## 3.1 Auth / Session

### `POST /auth/login` (also mounted at `POST /admin/auth/login`)
- Purpose: authenticate admin user.
- Body: `{ "email": "...", "password": "..." }`
- Side effect: sets HTTP-only session cookie.
- Response: user profile + session expiry metadata.
- Errors: `401`, `422`.

### `POST /auth/logout` (also mounted at `POST /admin/auth/logout`)
- Purpose: invalidate session and clear session cookie.
- Status: `204`.

### `GET /auth/me` (also mounted at `GET /admin/auth/me`)
- Purpose: get current admin user context.
- Response: `{ id, email, fullName, role, status }`.

## 3.2 Events CRUD

### `GET /admin/events`
- Query: `status`, `search`, `from`, `to`, pagination.

### `POST /admin/events`
- Body fields:
  - `slug` optional (server may generate)
  - `title`, `eventType`, `summary`, `description`, `startAt`, `endAt`, `timezone`, `venueName`, `capacity`, `status`
  - `heroImage` metadata fields
  - `highlights[]`
  - `lineup[]` (`personId?`, `displayName`, `roleLabel`, `sortOrder`)
  - `partnerPlacements[]` for `EVENT` context
- Status: `201`.

### `GET /admin/events/:id`
### `PATCH /admin/events/:id`
### `DELETE /admin/events/:id`
- Delete policy: soft-delete or archive recommended (`status=ARCHIVED`) to preserve order history.

## 3.3 Ticket Tiers CRUD

### `GET /admin/events/:eventId/ticket-tiers`
### `POST /admin/events/:eventId/ticket-tiers`
- Body: `slug?`, `name`, `description?`, `price`, `currency`, `availableQuantity`, `maxPerOrder?`, `saleStartAt?`, `saleEndAt?`, `status`, `perks[]`.

### `PATCH /admin/ticket-tiers/:id`
### `DELETE /admin/ticket-tiers/:id`

## 3.4 Orders / Tickets / Check-In

### `GET /admin/orders`
- Query: `status`, `eventId`, `buyerSearch`, date range, pagination.

### `GET /admin/orders/:id`
- Includes:
  - order
  - items
  - payment transactions
  - issued tickets

### `PATCH /admin/orders/:id/status` (planned)
- Body: `{ "status": "EXPIRED" | "REFUNDED" | "FAILED" | "PAID" }`
- Side effects: policy-controlled; may require payment/ticket reconciliation.

### `GET /admin/tickets`
- Query: `eventId`, `status`, `search` (ticketNumber, qrCodeValue, buyer phone).

### `POST /admin/tickets/check-in`
- Purpose: record a check-in audit row.
- Body:
```json
{
  "ticketId": "tkt_...",
  "method": "QR",
  "checkpointLabel": "Main Gate",
  "notes": "optional"
}
```
- Side effects:
  - creates `TicketCheckIn`
  - sets `Ticket.status = CHECKED_IN`
- Errors: `409` if already checked-in and duplicate policy disallows.

### `POST /admin/tickets/:id/revoke`
- Purpose: revoke ticket.
- Side effects: set `Ticket.status = REVOKED`.

## 3.5 People CRUD

### `GET /admin/people`
### `POST /admin/people`
- Body: profile fields + `roles[]` + `featuredWorks[]`.

### `GET /admin/people/:id`
### `PATCH /admin/people/:id`
### `DELETE /admin/people/:id`
- Deletion policy: soft-hide/archive preferred.

## 3.6 Partners CRUD + Placement

### `GET /admin/partners`
### `GET /admin/partners/:id`
### `POST /admin/partners`
### `PATCH /admin/partners/:id`
### `DELETE /admin/partners/:id`
- Role policy (implemented):
  - `ADMIN`, `STAFF`: read + write
  - `MODERATOR`: read-only

### `PUT /admin/partners/:id/placements` (planned)
- Purpose: upsert partner placements across contexts.
- Note: not implemented in current pass.

- Body example:
```json
{
  "placements": [
    { "context": "HOMEPAGE", "contextKey": "homepage-main", "displayOrder": 1, "isActive": true },
    { "context": "EVENT", "contextKey": "evt_123", "eventId": "evt_123", "displayOrder": 2, "isActive": true }
  ]
}
```

## 3.7 Gallery Management

### `GET /admin/gallery-images`
### `GET /admin/gallery-images/:id`
### `POST /admin/gallery-images`
- Body: `eventId`, image metadata, `caption`, `featured`, `sortOrder`, `status`.

### `PATCH /admin/gallery-images/:id`
### `DELETE /admin/gallery-images/:id`
- Role policy (implemented):
  - `ADMIN`, `STAFF`: read + write
  - `MODERATOR`: read-only

## 3.8 Community Upload Moderation

### `GET /admin/community-uploads`
- Query: `status`, `eventId`, `search`, pagination.
- Role policy (implemented):
  - `ADMIN`, `STAFF`, `MODERATOR`: read queue and details
  - `ADMIN`, `STAFF`, `MODERATOR`: status moderation (`PATCH /status`)
  - `ADMIN`, `STAFF`: delete records

### `GET /admin/community-uploads/:id`

### `PATCH /admin/community-uploads/:id/status`
- Body:
```json
{
  "decision": "APPROVED" | "REJECTED",
  "notes": "optional moderation note"
}
```
- Side effects:
  - create `CommunityUploadReview`
  - update `CommunityUpload.status` and `lastReviewedAt`

### `DELETE /admin/community-uploads/:id`
- Policy: hard delete or quarantine strategy to be finalized.

## 3.9 Site Settings

### `GET /admin/site-settings`
- Returns singleton settings row (`settingsKey = "default"`).

### `PATCH /admin/site-settings`
- Partial update of singleton config.
- Body supports:
  - brand copy, contact/social links, hero copy, SEO defaults, legal links, `featuredEventId`.
- Role policy (implemented):
  - `ADMIN`, `STAFF`: read + write
  - `MODERATOR`: read-only

## 3.10 Admin Users (optional phase 1.5)

### `GET /admin/users`
### `POST /admin/users`
### `PATCH /admin/users/:id`
- For managing `AuthUser` and role assignments.

## 4. Contract-to-Schema Mapping Notes

- Event date/time display should be derived from `Event.startAt` and `Event.endAt`.
- `Order` + `OrderItem` are separated; no single-tier order assumption.
- `Ticket` is one row per attendee unit and carries unique `ticketNumber` + `qrCodeValue`.
- Check-ins are audit rows in `TicketCheckIn`, not a single mutable flag.
- Payment provider callbacks and metadata live in `PaymentTransaction`.
- Partner exposure is normalized through `PartnerPlacement`.
- Event highlights, lineup, featured works, and event participations are normalized child/relational records.

## 5. Open Decisions (Implementation Phase)

- Whether public ticket retrieval uses raw `ticketId` or signed token lookup.
- Whether order creation should reserve inventory immediately or on successful payment.
- Whether admin deletes are hard-delete or status-based archival for each domain.
- Daraja callback signature verification strategy and retry policy.
- If buyer records should merge by phone/email or always create per-order snapshots.
