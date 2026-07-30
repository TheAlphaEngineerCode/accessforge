# Security policy

AccessForge is a multi-tenant platform that will drive real browsers against arbitrary web
pages. The security model is built around two assumptions: **a tenant must never see or
mutate another tenant's data**, and **a scanned page is untrusted code** — rendering it
must never endanger the host or the platform (ADR-0007).

## Supported versions

Phase 0–1 is pre-alpha. Security fixes land in `main` immediately. There is no backport
policy yet — once a `1.0` line exists, this section will pin it.

## Threat surface today

| Asset | Today's protection |
| --- | --- |
| Password hashes | argon2id (m=19456 KiB, t=2, p=1) — see `@accessforge/auth` |
| Session tokens | 32-byte opaque random; stored as SHA-256 hash; cookie is httpOnly + SameSite=lax + secure in production |
| CSRF | SameSite=lax; strict-mode CSRF token to be added when the console introduces cross-origin actions |
| CORS | Allow-list via `CORS_ORIGINS` env |
| Rate limiting | `/auth/register` and `/auth/login` carry a tighter per-route bucket than the general limit |
| Tenant isolation | Every tenant-scoped row has `organization_id NOT NULL` + index; repository methods require the tenant argument; tenant middleware reads from session, never from request body |
| Authorization | RBAC at route boundary (`requirePermission`, `requireAdmin`, `requireOwner`); unknown role = fail closed |
| Audit | Every mutating request writes an append-only `audit_events` row, including for 4xx/5xx responses |
| Input validation | Zod at the request boundary; branded id types validate UUIDs before they reach a query |
| Headers | Helmet; 1 MiB body limit; `trustProxy` for correct client IPs behind a proxy |
| Secrets in env | `.env.example` only; `.env` is gitignored. Gitleaks runs in CI |

## What is NOT implemented yet — declared so nobody assumes it

- **No browser engine yet** — so the scan sandbox (ADR-0007) protects nothing today
  because the asset class doesn't exist yet. When it lands, isolation is a merge
  requirement, not a follow-up.
- **No TLS termination in-process.** Production deployments must front AccessForge with a
  TLS-capable reverse proxy.
- **No Postgres Row-Level Security (RLS).** Tenant isolation is enforced in application
  code today (ADR-0009). RLS is a Phase 13 hardening step.
- **No password reset / email verification flow.** Phase 1 ships login/register/logout.
- **No SSO / OIDC / MFA.** Architecture is ready; wiring is post-MVP.
- **No OpenTelemetry instrumentation.** Phase 7.

## Reporting a vulnerability

While pre-alpha, report directly via GitHub Security Advisories (`Security` → `Report a
vulnerability` on this repo). Please do **not** open a public issue for security
vulnerabilities. Include:

- A description and reproduction (script, request, env).
- Affected versions / commits.
- Severity (CVE-style if possible).

Acknowledgment within 72h, fix ETA within 14 days depending on severity. There is no
bounty program — credit in the changelog if you wish.

## Hardening checklist for self-hosters

- [ ] Set a 32-byte+ random `SESSION_SECRET`.
- [ ] Set `CORS_ORIGINS` to the exact web origin(s).
- [ ] Run behind TLS (reverse proxy / Caddy / nginx).
- [ ] Use a separate Postgres user with `REVOKE UPDATE, DELETE` on `audit_events`.
- [ ] Rotate or remove the seed demo user (`demo@accessforge.test`) after install.

## References

- [`THREAT_MODEL.md`](./THREAT_MODEL.md) — what we protect against.
- [`docs/adr/0007-sandboxed-browser-execution.md`](./docs/adr/0007-sandboxed-browser-execution.md) — scan isolation.
- [`docs/adr/0009-multi-tenant-architecture.md`](./docs/adr/0009-multi-tenant-architecture.md) — tenant isolation.
- [`docs/adr/0010-ai-as-assistant-only.md`](./docs/adr/0010-ai-as-assistant-only.md) — AI boundaries.
