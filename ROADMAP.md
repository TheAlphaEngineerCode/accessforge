# Roadmap

Phases the project ships in. **Each phase is a deployable milestone** — passing tests, no
`TODO` markers on essential paths, README + ADRs aligned.

> Live progress lives in [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).

## Phase 0 — Foundation ✅

- Monorepo (pnpm + Turborepo). ✓
- Next.js app shell, Fastify API shell, worker, cli scaffolds. ✓
- PostgreSQL + Redis + MinIO via `docker compose up`. ✓
- TypeScript strict, ESLint typed, Vitest, Prettier, tsconfig. ✓
- GitHub Actions CI: install / lint / typecheck / test / build / secret scan. ✓
- Documentation skeleton: README, SECURITY, THREAT_MODEL, CONTRIBUTING, ADRs. ✓

## Phase 1 — Identity ✅

- Authentication (register / login / logout / me). ✓
- Argon2id password hashing, opaque session tokens stored as SHA-256. ✓
- Organizations, memberships, RBAC matrix. ✓
- Tenant isolation at the repository layer + tenant middleware. ✓
- Audit row written on every mutation, including 4xx/5xx. ✓
- Projects + environments CRUD (the tree scans hang off of). ✓
- Tests: auth, RBAC enforcement, tenant isolation, audit recording. ✓

## Phase 2 — Browser engine

- Playwright + Chromium in sandboxed workers (no host exec).
- Scan orchestration: queue, status transitions, retries, timeouts.
- Page capture: DOM snapshot, accessibility tree, screenshot → object storage.
- Pg repositories for scans/pages/snapshots wired (they exist as interfaces today).

## Phase 3 — Rule engine v1

- axe-core integration mapped into the `Rule` registry.
- Issue creation with stable fingerprints, severity, WCAG references, evidence.
- Rule enable/disable per organization.

## Phase 4 — Keyboard engine

- Tab-order walk, focus-trap detection, skip links, visible focus indicator checks.
- Keyboard-only completion of arbitrary page interactions.
- Issues in categories KEYBOARD / FOCUS with recorded key sequences as evidence.

## Phase 5 — Journey engine

- Declarative journey steps executed in a real browser per interaction mode.
- Journey outcomes: completed / blocked, with the blocking issue attached.
- The four canonical demos: Login, Recover Password, Checkout, Modal escape.

## Phase 6 — Baselines & regression

- Baseline creation from a scan; fingerprint diffing (NEW/UNCHANGED/RESOLVED/REGRESSED).
- "This release broke keyboard access to checkout" as a first-class result.

## Phase 7 — Observability

- Structured logs, metrics at `/metrics`, traces via OTel; scan progress over SSE.

## Phase 8 — CI integration

- Quality gates from `Policy` config; PR checks; failing gate = failing check.
- CLI: `accessforge scan --ci` with meaningful exit codes.

## Phase 9 — Reports

- WCAG-mapped reports with evidence bundles; export (HTML/PDF/JSON).

## Phase 10 — Integrations

- GitHub App, Slack notifications, issue-tracker export.

## Phase 11 — AI assistant

- Explain issues, suggest fixes, draft remediation PR descriptions.
- Never asserts compliance; never files changes autonomously (ADR-0010).

## Phase 12 — Multi-browser & AT depth

- Firefox + WebKit engines; deeper screen-reader semantics (name/role/value computation).

## Phase 13 — Production hardening

- Postgres RLS upgrade path, backup/restore, Helm chart for self-hosters.
- Final security audit: threat-model walkthrough, dep audit, SBOM published.

Each milestone commits a README patch + `IMPLEMENTATION_STATUS.md` update + ADR if a
decision was made.
