---
id: 0002
title: TypeScript-first across the stack
status: Accepted
date: 2026-07-27
---

# ADR-0002 — TypeScript-first across the stack

## Context

AccessForge touches frontend (console, scan views, journey editors), backend (auth, RBAC,
scan orchestration, event bus), worker (Playwright drivers, rule engines), CLI and
infrastructure glue. Polyglot stacks pay a tax in serialization contracts, duplicated
domain types and slower iteration — and the accessibility tooling ecosystem the project
depends on (Playwright, axe-core) is TypeScript-native.

## Decision

**TypeScript everywhere**, including the API, web, worker, CLI and all packages. Strict
mode with `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` and
`noImplicitReturns`.

## Version pins

- **TypeScript 5.9.3**. At decision time, `typescript-eslint@8.x` declares
  `typescript <6.1.0` as its peer; a newer major would disable linting with type
  information, which is exactly what catches type leaks in the domain layer. Migration
  trigger: when `typescript-eslint` declares support and lint runs green on a branch.
- **Node.js ">=22.13.0"**. The lowest advertised version MUST actually be exercised by CI;
  an advertised floor CI never runs is a documentation lie.

## Consequences

- ✅ One language, one type system, one linter config.
- ✅ Types travel from DB row to API response to frontend without a serialization contract.
- ✅ Playwright and axe-core integrate natively — no bindings layer.
- ⚠️ Pin discipline: any new dep that requires a TS major bump triggers a check of the
  lint peer range.

## Alternatives considered

- **Go/Python for the engine + TS for web**: rejected — the engine drives a browser via
  Playwright, whose first-class API is TypeScript; a second language buys nothing here.
- **Bun runtime**: not yet — Node LTS has the long-tail ecosystem (node:crypto, pg drivers).

## References

- ADR-0007 (browser execution)
