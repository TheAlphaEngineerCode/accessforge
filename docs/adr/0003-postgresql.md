---
id: 0003
title: PostgreSQL as the system of record
status: Accepted
date: 2026-07-27
---

# ADR-0003 — PostgreSQL as the system of record

## Context

AccessForge stores organizations/users/roles, projects and environments, scans, pages and
snapshots, issues with fingerprints, journeys and steps, baselines, regressions, policies,
audit events and the event log. All of it is relational (rows joined on `organizationId`,
`projectId`, `scanId`), plus JSONB payloads for evidence and step definitions.

## Decision

**PostgreSQL 17** is the system of record for all transactional state.

- **Issues and regressions** are rows, not documents: fingerprint diffing between a
  baseline scan and a new scan is a join, and Postgres does joins.
- **Audit log** lives in the same cluster, append-only by convention now and by
  `REVOKE UPDATE, DELETE` on the application role as a hardening step; retention via
  monthly partitioning rather than row deletion.
- **Migrations** are plain SQL, applied by a tiny runner in `apps/api/src/db`. No ORM.
  SQL is reviewable and survives framework churn.
- **Object storage** (MinIO in dev, S3 in prod) stores the truly binary blobs: DOM
  snapshots, accessibility trees, screenshots. Postgres holds their URLs, never the bytes.
- **Redis** is for ephemeral work — job queue, rate-limit counters, SSE cursors. Nothing
  in Redis is the source of truth.

## Consequences

- ✅ Single ACID boundary for cross-module writes (audit + state mutation in one tx).
- ✅ Tenant isolation is enforceable at row level (RLS optional upgrade, see ADR-0009).
- ⚠️ Hand-written SQL = discipline required; mitigated by the thin typed query layer in
  `@accessforge/database` (row decoders that throw on shape mismatch).
- ⚠️ Very large scan histories may need partitioning on `scans`/`issues` — revisit when a
  tenant reaches it, not now.

## Alternatives considered

- **MongoDB**: weak transactions across the tenant-scoped tree; rejected.
- **Prisma**: rejected; opaque migrations and SQL you can't read is the wrong default.

## References

- ADR-0009 (multi-tenant)
