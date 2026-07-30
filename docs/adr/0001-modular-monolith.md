---
id: 0001
title: Modular monolith before microservices
status: Accepted
date: 2026-07-27
---

# ADR-0001 — Modular monolith before microservices

## Context

AccessForge spans several bounded contexts: identity, projects, scan orchestration, the
browser engine, rule engines, journeys, baselines/regressions, policies, reports and
integrations. Splitting these into separate deployables on day one is a known
anti-pattern: it pays the network and operational cost of microservices before their
boundaries are proven.

## Decision

Start as a **modular monolith with a worker process**, structured as one TypeScript
repository with explicit module boundaries. Each domain lives in its own package, but they
share the same runtime by default. Background work (scan execution, journey runs, baseline
comparisons, report generation) runs on the worker consuming an internal job/event bus,
never the API request line.

The worker is a separate process from the start — not for scale, but because browser
execution of third-party pages must never share a process with the API (ADR-0007).

Microservices are deferred **until a module has a verifiable reason** to deploy
independently: different scale (scan fan-out is the likely candidate), different release
cadence, or security isolation the monolith cannot provide.

## Consequences

- ✅ Lower operational cost (one deploy, one log, one trace).
- ✅ Boundary violations are still enforceable via ESLint import boundaries and tests.
- ✅ Schema migration happens in a single transactional unit.
- ⚠️ Module discipline becomes mandatory — no ad-hoc cross-imports. ADR-0009
  (multi-tenancy) depends on every query carrying an `organizationId`; a leaky monolith
  makes that hard.
- ⚠️ Extracting a service later requires its data to be already cleanly owned by the module.

## Alternatives considered

- **Microservices from day one**: rejected — premature boundary freeze, ops cost, harder
  cross-tenant joins for audit.
- **Pure monolith (no module isolation)**: rejected — would make future extraction too
  expensive and violate domain separation.

## References

- ADR-0005 (event core), ADR-0007 (sandboxed browser), ADR-0009 (multi-tenant)
