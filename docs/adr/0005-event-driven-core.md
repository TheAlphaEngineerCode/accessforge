---
id: 0005
title: Event-driven core with an internal bus
status: Accepted
date: 2026-07-27
---

# ADR-0005 — Event-driven core with an internal bus

## Context

The platform's value depends on reacting to state changes: a scan finished, an issue was
detected, a journey step failed, a regression appeared, a quality gate blocked a release.
Hardcoding these flows as method calls couples producers to consumers and makes "audit
everything" harder.

## Decision

All domain mutations emit an **`EventEnvelope`** on an internal in-process bus, backed by
Postgres persistence (and Redis streams later for cross-process delivery to the worker).

- Every write path: mutate state in tx → insert event row in same tx → emit after commit.
- Workers subscribe by event type (`scan.completed`, `issue.detected`,
  `journey.step.failed`, `regression.detected`, …) and never coordinate via cron polls
  where avoidable.
- The envelope has `id`, `type`, `version`, `organizationId`, `source`, `entityId`,
  `correlationId`, `causationId`, `occurredAt`, `payload`.
- Events are **append-only**; the audit trail (`AuditEvent`) is actor-attributed and
  separate, but shares the correlation id so "what caused what" is reconstructable.

## Consequences

- ✅ Cross-cutting features (notifications, reports, CI status, SSE progress) subscribe to
  the same bus.
- ✅ `correlationId` makes a scan's whole lifecycle traceable end-to-end.
- ⚠️ Strictly at-least-once: subscribers must be idempotent, keyed on `event.id`.
- ⚠️ Tests must exercise the bus end-to-end to prove subscribers do not silently drop.

## Alternatives considered

- **Kafka/NATS**: ops overhead for self-hosters; deferred until throughput demands it.
- **Direct method calls**: rejected — couples modules and breaks "audit everything".

## References

- ADR-0003 (persistence), ADR-0006 (SSE fan-out)
