# CLAUDE.md — TutorDesk BE

Guidance for Claude Code in `tutordesk-be` (Node.js + Express + MongoDB API for TutorDesk). **Keep this file up to date.**

## MANDATORY — read first, every session

- **Read [memory.md](memory.md) at the start of every session and review it before every task.** It holds every rule and decision carried over from the FE discussions.
- **Review [REQUIREMENTS.md](REQUIREMENTS.md)** (§6 data model, §7 API contract, §13 Backend Implementation Spec) before every task. It is **identical to `c:\PersonalProject\TutorDesk-FE\REQUIREMENTS.md`** — any change goes into both copies in the same session, with the "Last updated" date bumped.
- **Never `git commit` or `git push`** (nor amend/rebase/merge/tag/reset/PRs). File changes only; the user commits.

## Project
- This repo: `tutordesk-be` — REST API under `/api`, deployed to Render/Railway, MongoDB Atlas.
- Sibling: `tutordesk-fe` (`c:\PersonalProject\TutorDesk-FE`) — React + TypeScript, already built for Login, Students and Fees against a dev mock; it connects with `VITE_API_BASE_URL=http://localhost:5000/api` and `VITE_USE_MOCK_API=false`.
- Status (2026-11-20): repo empty; BE development starts 2026-11-21 following REQUIREMENTS §13.9.

## Decisions Log
Newest first, with date.

- 2026-11-20 — Repo prepared: REQUIREMENTS.md copied from the FE (identical, Last updated 2026-11-20), memory.md created with all standing rules and domain decisions from the FE work, this CLAUDE.md added. Stack per §13.1 (Express, Mongoose, Zod, `validator`, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit; Jest/Supertest + mongodb-memory-server). TypeScript recommended — confirm at setup.

## Open Questions
See the list at the end of [memory.md](memory.md); move items here as they're discussed and resolved.
