# AccessForge — Master Development Prompt (canonical summary)

This file is the canonical summary of the *AccessForge Master Development Prompt* that
seeded the project. The full original lives in the project history; this summary captures
every architectural decision and serves as the source a fresh agent can re-read after a
`Continue development` instruction.

> For the per-decision rationale, read `docs/adr/`. For the live roadmap with per-phase
> completion status, read `IMPLEMENTATION_STATUS.md` and `ROADMAP.md`.

## Vision

AccessForge is an open source platform for **analyzing, testing, monitoring and preventing
digital accessibility problems in web applications**. Its differentiator is **Accessibility
Journey Testing**: validating that real people can complete real flows — create an account,
recover a password, finish a checkout — using different interaction modes (keyboard, screen
reader semantics, focus navigation). Its central question:

> *Can a user with a disability actually complete this task, and can we prove — with
> evidence — when a release breaks that ability?*

## Non-goals (declared, not just absent)

- Not just another DOM scanner. Journeys are the unit of value, not violations.
- Not AI-first. AI only as an assistant (explain, suggest); never the source of a
  compliance claim.
- Not a WCAG-compliance rubber stamp. No compliance is asserted without recorded evidence.
- Not a replacement for human audit — a force multiplier for it.
- Not browser execution on the host. Scans run in sandboxed, isolated workers.
- Not premature microservices. Modular monolith until evidence forces otherwise.

## Principles

Open source · API first · Journeys over snapshots · Evidence over claims · Security by
default · Multi-tenant · Event driven · Audit everything · Self-hostable · Observable by
default · Least privilege · Idempotency · Reproducibility · Progressive complexity.

## Architecture summary

- **Modular monolith + worker** (ADR-0001). One deploy, one log, one trace; background
  scan/journey execution in workers consuming Postgres / Redis streams.
- **TypeScript first** (ADR-0002) — strict mode across web, api, worker, cli.
- **PostgreSQL 17** as system of record (ADR-0003): projects, scans, pages, issues,
  journeys, baselines, regressions, audit log (append-only), events.
- **Engine abstraction** (ADR-0004) — rule engines (axe-core, keyboard engine, contrast,
  ARIA analysis) behind one interface; engine SDKs never leak into `packages/domain`.
- **In-process event bus** (ADR-0005) with append-only persistence; subscribers idempotent
  on `event.id`.
- **SSE before WebSockets** (ADR-0006) — scan progress streaming with `Last-Event-ID`
  cursor, heartbeat, per-org fan-out.
- **Sandboxed browser execution** (ADR-0007) — Playwright in isolated workers; no host
  exec, no default network egress beyond the target.
- **Demo targets as first-class fixtures** (ADR-0008) — every feature is demoable against
  the bundled example apps without external credentials.
- **Multi-tenant by row scoping** (ADR-0009); Postgres RLS deferred until it's a real
  upgrade, not a placebo.
- **AI as assistant only** (ADR-0010) — suggestions and explanations, never autonomous
  compliance claims; fail-closed on anything the engine did not measure.

## Domain model

- Identity: `Organization`, `User`, `Membership`, `Session` — see `packages/domain`.
- Tree: `Organization → Project → Environment → Scan → Page/PageSnapshot → Issue`.
- Journeys: `Journey → JourneyStep` (NAVIGATE, CLICK, TYPE, PRESS_KEY, SELECT, CHECK,
  UPLOAD, WAIT, ASSERT), executed per interaction mode.
- Rules: `Rule` with category (SEMANTICS, KEYBOARD, FOCUS, FORMS, ARIA, COLOR, NAVIGATION,
  IMAGES, HEADINGS, LANDMARKS, TABLES, DYNAMIC_CONTENT, MEDIA, RESPONSIVE), severity and
  WCAG references.
- Regression: `Baseline → Regression` over stable issue `fingerprint`s
  (NEW / UNCHANGED / RESOLVED / REGRESSED).
- Governance: `Policy` (quality gates), `AuditEvent`, `EventEnvelope`.

## Identity (Phase 1)

- RBAC roles: `OWNER`, `ADMIN`, `ACCESSIBILITY_ENGINEER`, `DEVELOPER`, `QA`, `VIEWER`
  (matrix in `packages/permissions`).
- Permission strings are an enum, not free strings — adding one requires a code change.
- Audit row for every mutation, including 4xx/5xx.

## Demo projects (seeded)

- **Accessible Store** — intentional best practices; regression-detection baseline.
- **Broken Commerce** — intentional violations: unlabeled forms, broken focus order,
  inaccessible modals; journey and rule testing target.
- **SaaS Dashboard** — tables, dynamic content, live regions.

## Phases

See [`ROADMAP.md`](./ROADMAP.md) for the canonical phase list and
[`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) for live status.

## Continuity rule

When instructed "Continue development":

1. Read this file (`PROJECT_SPEC.md`).
2. Read `IMPLEMENTATION_STATUS.md`.
3. Read the ADRs referenced by the current section.
4. Run tests and identify where work stopped.
5. Continue from that point — never restart the project.

## License

Apache 2.0.
