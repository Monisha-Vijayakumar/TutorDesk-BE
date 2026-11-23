# TutorDesk BE

REST API for **TutorDesk**, a tuition center dashboard. Built with Node.js, Express 5, TypeScript, MongoDB/Mongoose, Zod and `validator`.
Frontend: `tutordesk-fe` (React + TypeScript). The shared spec is [REQUIREMENTS.md](REQUIREMENTS.md): §6 covers the data model, §7 the API contract and §13 this backend.

## Quick start (local)

Requirements: Node.js 20+. You don't need a MongoDB install: `npm run db:local` starts one.

```bash
npm install
cp .env.example .env          # then set JWT_SECRET (and your own ADMIN_* values)
npm run db:local              # terminal 1: local MongoDB on 127.0.0.1:27017, data kept in .local-db/
npm run seed                  # creates the single admin from ADMIN_* (idempotent)
npm run seed:demo             # optional, dev only: 12 demo students, 6 months of payments, 3 batches
npm run dev                   # terminal 2: API on http://localhost:5000/api
```

To use MongoDB Atlas instead, put its URI in `MONGODB_URI` and skip `db:local`.

| Script | What it does |
|---|---|
| `npm run dev` | API with reload on save (tsx watch) |
| `npm run build` / `npm start` | Compile to `dist/` / run the compiled API |
| `npm run seed` | Creates the admin (only if none exists) and the Student ID counter |
| `npm run seed:demo` | Demo data. Refuses to run in production and when students already exist. Demo student password: `Student@123` |
| `npm run db:local` | Local MongoDB for development (downloads the binary on the first run) |
| `npm test` | Vitest + Supertest against an in-memory MongoDB replica set |
| `npm run typecheck` / `npm run lint` / `npm run format` | tsc / ESLint / Prettier |

## Testing with Postman

Import both files from [postman/](postman/):

- `TutorDesk-BE.postman_collection.json`: 40 requests covering every endpoint, error cases and a student session
- `TutorDesk-Local.postman_environment.json`: `baseUrl`, `adminEmail` and `adminPassword`. These match `.env.example`; change them if your `.env` uses other values

Select the **TutorDesk Local** environment and run **Auth → Login (admin)** first. The JWT comes back in the httpOnly cookie `tutordesk_token`, and Postman sends it with every later request. The collection saves ids for you (`studentId`, `feeId`, `batchId`) and sets `today` / `currentMonth` in IST. Run the folders top to bottom, or use the Collection Runner. Every request checks its expected status code.

Note: **Auth → Change password** switches the admin password between `Change@Me123` and `Tutor@2026` and updates the environment to match.

## API overview

Everything is under `/api`, with JSON in and JSON out. Every route except `POST /auth/login`, `POST /auth/logout` and `GET /health` needs the auth cookie. All admin routes need role `ADMIN`.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/change-password`, `PATCH /auth/profile` |
| Students | `GET/POST /students`, `GET/PATCH/DELETE /students/:id`, `POST /students/:id/reset-password`, `GET /students/:id/payment-history` |
| Fees | `GET /fees?month=YYYY-MM`, `PATCH /fees/:feeId`, `POST /fees/:feeId/reminders` |
| Batches | `GET/POST /batches`, `GET /batches/time-slots`, `GET/PATCH/DELETE /batches/:id` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/fee-collection?from=&to=` |

Every error has the body `{ "message": "...", "errors"?: { "<field>": "..." } }`. The status codes are: 400 business rule, 401 not logged in / wrong login, 403 wrong role, 404 not found (also for deleted students and invalid ids), 409 duplicate email / nothing outstanding, 413 body too large, 422 validation (with `errors`), 429 too many failed logins, 500 generic.

Conventions: money is in **integer paise** (₹2,500 = `250000`), dates are `"YYYY-MM-DD"`, months are `"YYYY-MM"`, and ids are UUIDs. "Today" is calculated in `APP_TIMEZONE` (Asia/Kolkata).

## Structure

```text
src/
  config/       env.ts (validated env vars), db.ts (connection, transactions when the DB supports them)
  constants/    roles, fee enums and limits, grades/subjects, validation + error messages, HTTP status
  interfaces/   stored-document and API response types, one file per feature
  models/       User, Student, Counter, FeeRecord, Payment, ReminderLog, Batch
  validators/   Zod schemas per route (same rules and wording as the FE)
  middleware/   requireAuth, requireRole, login rate limit, validate, requireUuidParam, notFound, errorHandler
  services/     business logic: auth, students, Student ID counter, fee records, fees, reminders, batches, dashboard
  controllers/  thin: read the request → call a service → send the response
  routes/       mounted under /api
  utils/        dates (APP_TIMEZONE), fee calculations, Mongo helpers, JWT/cookie, ApiError
  seeders/      seedAdmin, seedDemoData
scripts/        startLocalDb.ts
tests/          Vitest + Supertest suites
postman/        Postman collection + local environment
```

## Deployment notes

- Set `NODE_ENV=production`, `MONGODB_URI` (Atlas), a long random `JWT_SECRET`, and `CLIENT_URL` (the Vercel URL). In production the cookie is set with `Secure; SameSite=None`.
- Run `npm run build`, then `npm start`. Run `npm run seed` once with the `ADMIN_*` variables set.
- On an Atlas replica set, fee edits, payments, student create/edit and soft delete each run in a transaction.
