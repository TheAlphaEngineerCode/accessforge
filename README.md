<div align="center">

# AccessForge

**Accessibility Journey Testing — not another DOM scanner.**

Scanners find isolated violations. AccessForge exists to answer the question they can't:
**can a person with a disability actually complete the task** — create the account, recover
the password, finish the checkout — using a keyboard, a screen reader, or focus navigation?

[![CI](https://github.com/TheAlphaEngineerCode/accessforge/actions/workflows/ci.yml/badge.svg)](https://github.com/TheAlphaEngineerCode/accessforge/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Status: Phases 0–1](https://img.shields.io/badge/status-phases_0--1-yellow.svg)](./ROADMAP.md)

</div>

---

## Current state — read this before cloning

**Phases 0 and 1 of 13 are complete.** What runs today is the platform foundation: a strict
TypeScript monorepo, a Fastify API with argon2id authentication, cookie sessions,
organizations with role-based access control, tenant isolation enforced at the repository
layer, an append-only audit trail on every mutation, and an early Next.js console.

What does **not** exist yet, said plainly: no browser engine, no scans, no journey runs, no
issues, no reports. The accessibility engine itself — Playwright, axe-core, the keyboard
engine, the accessibility tree analysis — starts in Phase 2. The domain model, permission
matrix and database schema for all of it are already in place and tested.
[`ROADMAP.md`](./ROADMAP.md) tracks the rest.

---

## The problem

Automated accessibility tools — axe, Lighthouse, WAVE — inspect a rendered DOM and report
isolated violations: a missing label here, a low-contrast pair there. Those findings are
real, but they answer the wrong question. A page can pass every DOM check and still be
unusable: the modal that traps keyboard focus, the "next step" button a screen reader never
announces, the error message that appears visually but silently. Whether a user with a
disability can **complete a task end-to-end** is not a property of any single DOM state —

> **Can a real person, using assistive technology, actually finish this flow?**

## The solution

AccessForge treats accessibility as **journeys, not snapshots**. A journey is a real flow —
Login, Recover Password, Checkout, Escape the Modal — declared as steps. The platform will
drive each journey in a real browser under different interaction modes (keyboard-only,
focus-order, screen-reader semantics), evaluate every step against WCAG-backed rules
(semantics, ARIA, focus, forms, contrast, dynamic content), and record evidence: DOM
snapshots, accessibility trees, screenshots. Issues get a stable fingerprint, so baselines
and regression detection can say "this release broke keyboard access to checkout" instead
of dumping a new pile of violations.

## What is enforced, not just claimed

Three properties of the foundation do the work already, and each is tested rather than
asserted.

**Tenant isolation is code, not convention.** Every tenant-scoped table carries
`organization_id NOT NULL`; every repository method takes the organization id as an
argument; handlers read the tenant from the validated session context — never from a
header, query or body. The test suite includes cross-tenant isolation tests that fail if a
query ever leaks a row across organizations.

**Every mutation leaves a trail.** Each `POST/PATCH/PUT/DELETE` writes an append-only audit
row — including failed ones, because failed mutations are worth auditing. Audit rows carry
actor, action, resource, before/after state, IP and a correlation id.

**RBAC fails closed.** The permission matrix is declared in one place
(`@accessforge/permissions`) as an enum, not free strings; an unknown role grants nothing,
and a test fails if a role silently gains a permission that isn't declared in its row.

## Why it's different

| DOM scanners | AccessForge |
| --- | --- |
| Isolated violations on one rendered state | **Complete journeys** across real flows |
| "0 violations" reads as accessible | Task completion under keyboard/screen-reader is the measure |
| One-off report, findings drift | **Fingerprinted issues**, baselines, regression detection |
| Accessibility checked at the end | **CI-first**: scans as a quality gate (planned, Phase 8) |
| AI-generated claims | AI only as assistant — never the source of a compliance claim |

## Architecture (at a glance)

```text
Web console (Next.js) ──→ API (Fastify) ──→ PostgreSQL 17 (tenant-scoped rows)
                              │
                              ├─→ event bus (in-process → Redis later)
                              └─→ worker ──→ browser engine (Phase 2: Playwright,
                                             sandboxed; axe-core + keyboard engine)
```

Full design in [ARCHITECTURE.md](./ARCHITECTURE.md); decision records in
[docs/adr/](./docs/adr).

## Quick start

Requires **Node ≥ 22.13**, **pnpm 9** and **Docker** (for Postgres).

```bash
git clone https://github.com/TheAlphaEngineerCode/accessforge.git
cd accessforge
cp .env.example .env
make setup         # pnpm install
make docker-up     # Postgres 17 (+ Redis/MinIO/OTel, unused until Phase 2+)
make db-migrate    # apply schema migrations
make db-seed       # seed demo org + demo projects
make dev           # web on :3000, api on :8080
```

Demo credentials after `make db-seed`:

```text
email:    demo@accessforge.test
password: AccessForge-Demo-12345!
```

Open `http://localhost:3000`, sign in, and you land on the console with the seeded
organization (`AccessForge Labs`) and its three demo projects.

Without Docker? `apps/api` works against an external `DATABASE_URL` — point `.env` at your
existing Postgres and skip `docker-up`. Redis, MinIO and the OTel collector are declared in
`docker-compose.yml` for the phases that need them; **no code reads them yet**, and
`.env.example` says so line by line.

## Security posture

- Argon2id password hashing (RFC 9106 parameters, tuned ~25 ms).
- Opaque 256-bit session tokens stored only as SHA-256 hashes — the raw token never persists.
- Per-tenant row scoping on every tenant-scoped query, enforced by tests.
- Append-only audit row for every mutating request, including failures.
- RBAC at the route boundary; unknown role = fail closed.
- CORS allow-list; tighter per-route rate limit on `/auth/register` and `/auth/login`.
- Helmet, strict input validation via Zod, 1 MiB body limit.
- Threat model in [`THREAT_MODEL.md`](./THREAT_MODEL.md) — including the list of controls
  that do **not** exist yet, so nobody assumes a control that isn't there.

## Roadmap

The engine is built on top of a foundation that already enforces identity, tenancy and
audit — not the other way around. Full plan in [ROADMAP.md](./ROADMAP.md).

- **Phase 0** — Foundation (monorepo, infra, CI, docs) ✅
- **Phase 1** — Identity: auth, organizations, RBAC, tenant isolation, audit ✅
- **Phase 2** — Browser engine: Playwright, sandboxed workers, scan orchestration
- **Phase 3** — Rule engine v1: axe-core integration + rule registry
- **Phase 4** — Keyboard engine: tab order, focus traps, skip links, shortcuts
- **Phase 5** — Journey engine: declarative steps, multi-mode execution, evidence
- **Phase 6** — Baselines & regression detection (fingerprint diffing)
- **Phase 7** — Observability: structured logs, metrics, traces
- **Phase 8** — CI integration: quality gates, PR checks, badges
- **Phase 9** — Reports: WCAG mapping, exports, evidence bundles
- **Phase 10** — Integrations: GitHub, Slack, issue trackers
- **Phase 11** — AI assistant (explain issues, suggest fixes — never auto-claim compliance)
- **Phase 12** — Multi-browser (Firefox, WebKit) + screen-reader semantics depth
- **Phase 13** — Production hardening: RLS upgrade path, backup/restore, security audit

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and
[SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## License

Licensed under the **Apache License 2.0** — see [LICENSE](./LICENSE). This permits
commercial use, modification and distribution, provided you preserve the required notices
and conditions.
