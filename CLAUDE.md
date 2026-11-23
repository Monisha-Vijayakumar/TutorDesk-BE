# CLAUDE.md — TutorDesk BE

Guidance for Claude Code in `tutordesk-be` (Node.js + Express + MongoDB API for TutorDesk). **Keep this file up to date.**

## MANDATORY — read first, every session

- **Read [memory.md](memory.md) at the start of every session and review it before every task.** It holds every rule and decision carried over from the FE discussions.
- **Review [REQUIREMENTS.md](REQUIREMENTS.md)** (§6 data model, §7 API contract, §13 Backend Implementation Spec) before every task. It is **identical to `c:\PersonalProject\TutorDesk-FE\REQUIREMENTS.md`** — any change goes into both copies in the same session, with the "Last updated" date bumped.
- **Never `git commit` or `git push`** (nor amend/rebase/merge/tag/reset/PRs). File changes only; the user commits.

## Project
- This repo: `tutordesk-be` — REST API under `/api`, deployed to Render/Railway, MongoDB Atlas. Setup, scripts and API overview: [README.md](README.md).
- Sibling: `tutordesk-fe` (`c:\PersonalProject\TutorDesk-FE`) — React + TypeScript, built against a dev mock; it connects with `VITE_API_BASE_URL=http://localhost:5000/api` and `VITE_USE_MOCK_API=false`.
- Status (2026-11-23): **all §7 endpoints built** (auth, students, fees/payments/reminders, batches, dashboard) with tests (49 passing). **Now: the user tests every endpoint in Postman** ([postman/](postman/)). **FE integration does not start until Postman testing is done** (user decision, REQUIREMENTS §13.9).
- Layering: routes → controllers (thin) → services (business logic) → models; Zod validators via the `validate` middleware (parsed body → `req.body`, parsed query → `res.locals.query`); `ApiError` + `errorHandler` for the one error shape.
- Shared student/fee aggregation: `services/feeRecordService.ts` (`ensureFeeRecords`, `buildStudentFeeRowStages`) is the single place where paid / outstanding / status are calculated — used by Students, Fees and Dashboard. Don't duplicate it.

## Decisions Log
Newest first, with date.

- 2026-11-23 — **Postman first, then FE integration** (user): all endpoints are tested in Postman before the FE switch; recorded in REQUIREMENTS §13.9 (both repos, Last updated 2026-11-23).
- 2026-11-23 — BE built. Choices within the spec:
  - **TypeScript** (ES modules, `NodeNext`), **Express 5**, **Mongoose 8**, **Zod 4**, `bcryptjs` (cost 12), `tsx` for dev.
  - **Vitest** instead of Jest (§13.1 allows either; simpler with ESM + TS). One in-memory **replica set** for the whole run (`tests/globalSetup.ts`), one database per test file.
  - **Transactions only when the DB is a replica set** (`runInTransaction` in `config/db.ts`, detected at connect): Atlas → transactions; the local standalone DB → sequential writes.
  - **Local dev DB without installing MongoDB:** `npm run db:local` (mongodb-memory-server, persistent `.local-db/`, port 27017).
  - **Login rate limit counts failed attempts only** (10 per 15 min per IP, `skipSuccessfulRequests`); skipped in tests.
  - Cookie `maxAge` comes from `JWT_EXPIRES_IN` (restricted to `<number><s|m|h|d>`, e.g. `7d`).
  - Logins for an unknown identifier still run a bcrypt compare, so they take the same time as a wrong password.
  - `POST /students/:id/reset-password` was implemented now (it's in §7): a temporary password that passes the policy, returned once, `mustChangePassword` set again.
  - The unique index against duplicate **automated** reminders (FR-40) is deferred to the automated-reminders milestone. MongoDB partial indexes can't express `type != MANUAL`, so this needs a design (e.g. an `isAutomated` flag).
  - The Zod object-level checks (date ranges, batch time order) only run once the individual fields are valid, so a response may show the field errors first and the range error on the next submit.
  - Extra status **413** for bodies over 100 kb (same error shape).
  - Demo data (`npm run seed:demo`): this month cycles through Paid / Pending / Overdue / Partially Paid.
- 2026-11-20 — Repo prepared: REQUIREMENTS.md copied from the FE (identical), memory.md created with all standing rules and domain decisions from the FE work, this CLAUDE.md added.

## Open Questions
See the list at the end of [memory.md](memory.md); move items here as they're discussed and resolved. Still open: correcting a wrong payment (adjustment vs void), whether fee records follow monthly-fee / join-date changes (current behaviour: no), success-message shape, Bearer-token auth for mobile, when to delete the FE mocks (after FE integration).
