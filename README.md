# IglooTrack

IglooTrack is a field-first asset custody system for Igloo Ice Cream's deep-freeze fleet. The repository contains an Expo mobile app and a PostgreSQL/Express API in one npm workspace.

## Project structure

```text
apps/
  api/
    prisma/schema.prisma      PostgreSQL model, constraints and indexes
    prisma/seed.ts            Demo admin and field users
    src/routes/               Auth, fridges, owners and reports APIs
    src/middleware.ts         JWT, role checks and validation
  mobile/
    App.tsx                   Navigation and the ten field screens
    src/api.ts                API client and durable offline queue
    src/theme.ts              Igloo-inspired visual tokens
    src/ui.tsx                Shared field-friendly components
docker-compose.yml            Local PostgreSQL
```

## Architecture decisions

- **PostgreSQL + Prisma:** custody data is relational and report-heavy. Foreign keys, unique serial/QR values, transactions and indexes are preferable to a document database for an auditable 40,000+ asset fleet.
- **Append-only transfers:** the API never updates or deletes `TransferHistory`. A transfer transaction adds a new history row and changes only the fridge's current-owner pointer.
- **Conflict-safe offline work:** every fridge has a monotonically increasing `version`. Offline transfers submit the version the officer saw; stale submissions receive HTTP `409` instead of silently overwriting a newer transfer.
- **Area permissions:** field staff may scan or transfer a fridge only while its current custodian is in their assigned area. Admins have national scope; viewers remain read-only.
- **Pagination and indexes:** list responses are paginated and searchable columns, current ownership, status, timestamps and scan history have database indexes.
- **Expo:** camera, GPS, maps and AsyncStorage are supported on iOS and Android without maintaining two native projects.
- **Images:** `photoUrl` fields are storage-provider neutral. Production should upload through short-lived signed S3/R2 URLs rather than sending image bytes through this API.

## Run locally

Requirements: Node 22+, Docker, and Expo Go or an iOS/Android simulator.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate -w @iglootrack/api
npm run db:migrate -w @iglootrack/api -- --name init
npm run db:seed -w @iglootrack/api
npm run dev:api
```

In another terminal:

```bash
EXPO_PUBLIC_API_URL=http://YOUR-LAN-IP:4000/api npm run dev:mobile
```

For an Android emulator use `http://10.0.2.2:4000/api`; for an iOS simulator, `http://localhost:4000/api` normally works.

Seeded credentials:

- `admin@iglootrack.bd` / `IglooDemo123!`
- `field@iglootrack.bd` / `IglooDemo123!`

## API surface

- `POST /api/auth/login`
- `POST /api/auth/register` (admin)
- `GET/POST /api/fridges`
- `GET /api/fridges/:id`
- `GET /api/fridges/:id/history`
- `POST /api/fridges/:id/scan`
- `POST /api/fridges/:id/transfer`
- `GET/POST /api/shop-owners`
- `GET /api/shop-owners/:id`
- `GET /api/reports/summary`

## Production deployment

1. Deploy PostgreSQL on RDS, Supabase, Neon or another managed service with daily backups and point-in-time recovery.
2. Run the API as a stateless container behind TLS. Store `DATABASE_URL` and a high-entropy `JWT_SECRET` in the platform secret manager.
3. Run `prisma migrate deploy` during release, before shifting traffic.
4. Add an S3/R2 bucket with private objects, signed upload/download URLs, file-size limits and image malware scanning.
5. Build signed Android/iOS binaries with EAS Build. Use separate staging and production API URLs.
6. Add centralized logs, error monitoring, database metrics and alerts for transfer conflicts and sync failures.
7. Generate printable QR sheets from the API's `qrCodeDataUrl`; labels encode only the opaque fridge UUID.

## Assumptions and decisions needing business confirmation

- Statuses are `ACTIVE`, `INACTIVE`, `REPAIR`, and `DECOMMISSIONED`.
- Assigned-area enforcement is based on the fridge's current owner area. Igloo may instead want route, depot or district assignments.
- A newly created owner requires connectivity; transfers to an existing owner can be queued offline safely.
- The current deliverable provides management reporting in the mobile dashboard. A separate desktop admin web application can reuse this API as a subsequent workspace.
- The palette is based on the live Igloo identity (cyan, royal blue, white and pink). Official licensed logo artwork and formal brand hex values should replace the text mark before store release.
