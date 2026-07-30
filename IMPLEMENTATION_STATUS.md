# Implementation status

> Living document. Updated at every milestone so that anyone who reads this and is then
> instructed `Continue development` knows exactly where to resume.

## Current phase

**Phase 0 + Phase 1** are complete. Work moves to **Phase 2 — Browser engine**.

The repo runs on the lowest engine node declared (`Node 22.13`); the local dev machine is
Node 24, which is the highest matrix cell exercised by CI.

## What works today (Phase 0–1)

### Monorepo foundation

- pnpm 9 workspaces + Turborepo 2.5 with strict task boundaries.
- TypeScript 5.9.3 strict across every package (`tsconfig.base.json`).
- ESLint typed (`eslint.config.js`), Prettier, Vitest configured per-package.
- Apps: `web`, `api`, `worker`, `cli`, `docs`. Shared packages: `domain`, `database`,
  `auth`, `permissions`, `events`, `config`, `logger`, `telemetry`, `validation`,
  `api-client`, `ui`, `policies`, `sdk`.

### Infrastructure

- `docker-compose.yml` boots Postgres 17, Redis 7, MinIO, OTel collector — only Postgres
  is read by code today; the rest are declared for Phase 2+.
- `.env.example` documents every env var, marking the ones nothing reads yet.
- `Makefile` exposes `setup / dev / test / lint / typecheck / build / docker-up /
  docker-down / db-migrate / db-seed / db-reset / security / clean`.

### Auth (Phase 1)

- `POST /auth/register` — creates user + org + OWNER membership + session.
- `POST /auth/login` — argon2id verify, session bound to first membership, cookie set.
- `POST /auth/logout` — revokes session row, clears cookie.
- `GET /auth/me` — current user + memberships + organizations + active tenant.
- `POST /organizations` / `GET /organizations` — create / list.
- `GET|POST /projects`, `GET /projects/:id`, `GET|POST /projects/:id/environments`.
- `GET /audit` — tenant-scoped audit listing (requires `audit.read`).
- Cookie: `httpOnly`, `secure` in production, `SameSite=lax`, name configurable.
- `/auth/register` and `/auth/login` carry a tighter per-route rate-limit bucket.

### RBAC + tenant isolation + audit

- Tenant middleware resolves the request tenant from the session; tenant-scoped endpoints
  read from the request context only — never from body/query.
- Per-route permission decorators (`requireAuth`, `requirePermission`, `requireAdmin`,
  `requireOwner`); unknown role fails closed.
- Permission matrix declared in `@accessforge/permissions`; tests assert no role grants a
  permission not declared.
- `auditPreHandler` + `auditOnSend` write an audit row for every mutating verb, including
  4xx/5xx. Reads are not audited (noise reduction).

### Web

- Next.js 15 App Router. Routes: `/`, `/login`, `/dashboard`.
- Login form posts to `/auth/login` or `/auth/register` and routes to `/dashboard`.
- Dashboard fetches `/auth/me` and renders organizations; redirects to login on 401.

### CLI

- `accessforge help` / `version` / `doctor` ship; remaining commands land with the
  engines they drive (Phase 2+).

### Worker

- Subscribes to every event type; logs at debug level. Waits for SIGTERM/SIGINT. Real
  scan execution lands in Phase 2.

### CI

- GitHub Actions: install (matrix Node 22 + 24), lint + format check, typecheck, unit
  tests (matrix), build, secret scan (gitleaks), CodeQL.

## Known issues / technical debt

- **Registration is not transactional.** `POST /auth/register` inserts user, org and
  membership as separate statements; a crash mid-flight can leave an orphan user. The
  typed pool has `transaction()`; the repository layer needs a unit-of-work wrapper.
  Phase 2 task.
- **No real Postgres integration tests.** The schema ran against a real `postgres:17`
  container during hand-testing, but the automated suite uses in-memory repositories
  only. `pg-mem` wiring is a Phase 2 task.
- `/ready` issues a dummy `audit.listForOrganization` call with an all-zero UUID; works,
  but should become a typed `pool.ping()` helper in `@accessforge/database`.
- Audit writes happen in the `onSend` hook with `console.error` as the failure fallback;
  production should route through the logger and the OTel pipeline (Phase 7).
- Redis + MinIO + OTel are in `docker-compose.yml` but no code reads them yet.
- Scan/page/rule/issue/journey repositories exist as **interfaces with in-memory test
  doubles only**; the Pg implementations land with the browser engine (Phase 2).
- `packages/policies`, `services/*`, `connectors/*` are placeholders.

## Tests

- 43 tests green across api (routes, RBAC, tenant isolation, audit), auth, permissions,
  events and config.
- No e2e Playwright yet (arrives with the browser engine work).

## Next steps (Phase 2 starter)

1. Scan orchestration: `POST /projects/:id/scans` + queue + status transitions, with the
   Pg repositories for scans/pages/snapshots wired and integration-tested via `pg-mem`.
2. Playwright worker: sandboxed page load, DOM snapshot, accessibility tree, screenshot
   into MinIO/S3.
3. axe-core pass mapped into the `Rule` registry and `Issue` fingerprints.
4. A `tests/invariants.test.ts` for workspace contracts: `packages/` must not import from
   `apps/`; `packages/domain` must import nothing but itself; every tenant-scoped table
   carries `organization_id NOT NULL`.
5. Seed the **Broken Commerce** demo pages so the first scan has something honest to find.

## How to resume

When instructed `Continue development` from a fresh session:

1. Read [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the architectural frame.
2. Read this file (`IMPLEMENTATION_STATUS.md`) for live status.
3. Read the ADRs named in the next phase's "starter" section.
4. `pnpm install && pnpm test` — confirm baseline.
5. Continue from the bullets above "Next steps" — never restart.
