# Architecture

This document is the living architecture reference for AccessForge. For decision records
and rationale, see [`docs/adr/`](./docs/adr). For live progress, see
[`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).

## Design at a glance

```text
                    ┌────────────────────────┐
                    │  AccessForge Console   │
                    │  Next.js / React       │
                    └────────────┬───────────┘
                                 │ HTTPS + SSE
                    ┌────────────▼───────────┐
                    │  AccessForge API       │
                    │  TypeScript / Fastify  │
                    │  auth · tenant · audit │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │  PostgreSQL 17         │
                    │  tenant-scoped rows    │
                    └────────────┬───────────┘
                                 │ event / job bus (in-process → Redis)
                    ┌────────────▼───────────┐
                    │  Worker                │
                    │  scan orchestration    │
                    └────────────┬───────────┘
                                 │ sandboxed container (ADR-0007)
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
┌──────▼──────┐         ┌────────▼───────┐         ┌───────▼────────┐
│  Playwright │         │  Rule engines  │         │  Evidence      │
│  Chromium   │         │  axe-core,     │         │  DOM, a11y     │
│  (FF/WebKit │         │  keyboard,     │         │  tree, shots   │
│   later)    │         │  contrast,ARIA │         │  → MinIO/S3    │
└─────────────┘         └────────────────┘         └────────────────┘
```

| Layer | Role | Lives in |
| --- | --- | --- |
| Web | Console (authed SPA) | `apps/web` |
| API | HTTP/SSE entry, auth, tenant guard, validation, audit | `apps/api` |
| Domain | Pure types, ids, events — no I/O | `packages/domain` |
| Database | Pool, migrations, typed queries | `apps/api/src/db` + `packages/database` |
| Worker | Scan/journey execution — event subscriber | `apps/worker` |
| Engines | `RuleEngine` implementations (Phase 2+) | dedicated packages |
| Examples | Demo target apps with catalogued defects (ADR-0008) | `examples/*` |
| Packages | Cross-cutting libs (auth, perms, events, logger, telemetry) | `packages/*` |

## Architectural principles

1. **Modular monolith + worker** (ADR-0001) — explicit module boundaries, one deployable;
   the worker is split for isolation, not scale.
2. **Domain is pure** — `packages/domain` imports no Fastify, no Pg, no Playwright.
3. **Engine abstraction** (ADR-0004) — engine libraries never leak past their package;
   issues are normalized domain objects with stable fingerprints.
4. **Event-driven core** (ADR-0005) — mutations record events; subscribers are idempotent
   on `event.id`.
5. **Multi-tenant by row scoping** (ADR-0009) — every tenant-scoped row carries
   `organization_id`; repository signatures make the tenant argument unavoidable.
6. **Sandboxed browser execution** (ADR-0007) — untrusted pages render in an isolated
   container or not at all.
7. **AI as assistant only** (ADR-0010) — findings come from engines; models explain,
   never measure.

## Pipeline shape (Phase 2+)

```text
HTTP → middleware (auth, tenant, rate-limit, audit) → command → db (tx)
                                                            ├─ record event
                                                            └─ commit
                                                                     │
                              worker picks up scan.queued ───────────┘
                              │
                              ├─ sandboxed browser: load page / run journey step
                              ├─ engines evaluate → normalized findings
                              ├─ evidence → object storage
                              └─ issues upserted by fingerprint → events → SSE/CI
```

## Datastores

| Store | Purpose | Read by code today? |
| --- | --- | --- |
| PostgreSQL 17 | Source of truth: identity, projects, scans, issues, journeys, audit, events | **Yes** |
| Redis 7 | Job queue, rate-limit counters, SSE cursors | No — Phase 2+ |
| MinIO / S3 | DOM snapshots, accessibility trees, screenshots | No — Phase 2+ |
| OTel collector | Traces/metrics/logs of the platform itself | No — Phase 7 |
