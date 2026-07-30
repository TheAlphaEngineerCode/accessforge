---
id: 0009
title: Multi-tenant by row scoping, with Postgres RLS as upgrade
status: Accepted
date: 2026-07-27
---

# ADR-0009 — Multi-tenant by row scoping, with Postgres RLS as upgrade

## Context

AccessForge is multi-tenant: every organization must only see its own projects, scans,
issues and audit rows. Trusting every call site in every module to remember the tenant
predicate by hand is brittle.

## Decision

**Two layers of defence:**

1. **Mandatory `organizationId` on every tenant-scoped row.** Every table that holds
   tenant data has `organization_id UUID NOT NULL`, an index on it, and a foreign key to
   `organizations`. Every repository method that touches tenant data takes the
   organization id as an explicit argument — there is no way to call it without one.

2. **Application-layer tenant middleware** in Fastify that resolves the current tenant
   from the authenticated session and stores it in the request context. Endpoints that
   touch tenant data MUST read the tenant from that context, never from query/body/header.

**Postgres Row-Level Security (RLS)** is OFF at launch — it requires a config discipline
and a connection-per-tenant model that fight the monolith's pool — but the schema is
shaped so RLS can be enabled per-table later by adding a
`current_setting('accessforge.tenant')` predicate. Documented as a hardening step.

Tenant isolation tests live in the API suite and run on every PR: a session in
organization A must never read or mutate rows of organization B, on any route.

## Consequences

- ✅ Tenant scoping is enforced by code path and signature, not by developer memory.
- ✅ RLS upgrade path exists without a schema rewrite.
- ⚠️ Cross-tenant admin queries (future platform admin) need an explicit, documented
  bypass path.
- ⚠️ `organization_id` FKs are `ON DELETE RESTRICT`; deleting an org is its own guarded
  flow (future phase).

## Alternatives considered

- **Database-per-tenant**: ops overhead for self-hosters; rejected.
- **RLS only, day one**: rejected — coupling connection pools to a tenant setting costs
  too much simplicity for the current scale.

## References

- ADR-0003 (persistence)
