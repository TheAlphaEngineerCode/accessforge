# Threat model

AccessForge renders untrusted web pages and stores multi-tenant accessibility data. The
model identifies the actors who interact with it, the assets worth protecting, the
adversaries we expect, and the controls that exist (or are scheduled) for each threat.
Items marked **`(planned)`** are not implemented in Phase 0–1.

## Actors

| Actor | Trust | Surface |
| --- | --- | --- |
| **Authenticated user** | low-trust | Reads and writes via API + web. RBAC bounds what they can do. |
| **Org admin (OWNER/ADMIN)** | medium-trust | Same surface, plus organization administration. |
| **Self-hoster operator** | full on host, low on tenant data | Deploys AccessForge, holds secrets. |
| **Scanned web page** | zero-trust | Arbitrary third-party HTML/JS rendered by the engine (Phase 2+). |
| **Anonymous internet** | zero-trust | Public network to the API. |

## Assets

| Asset | Why it matters |
| --- | --- |
| Session tokens | Their theft = impersonation of the user. |
| Tenant data (projects, scans, issues, journeys) | An org's accessibility findings describe its weaknesses — recon material. |
| Scan evidence (DOM snapshots, screenshots) | May contain PII rendered on the scanned pages. |
| Journey step inputs | May contain test credentials for the target application. |
| Audit log | Lose it and you lose forensic value of every action. |
| Worker process | Renders untrusted pages; compromise = arbitrary code near tenant data. |

## Adversaries

1. **Credential thief** — wants session tokens or the target-app test credentials stored
   in journey steps.
2. **Privilege escalator** — a `VIEWER` who tries `issue.manage` or `rule.manage`.
3. **Tenant escaper** — adversarial tenant who wants other tenants' data through id swaps
   (`organizationId` in body, query string, path).
4. **Malicious scanned page** — HTML/JS crafted to escape the browser sandbox, scan the
   internal network, or exhaust worker resources.
5. **SSRF via scan target** — a "scan this URL" request pointed at the platform's own
   metadata endpoints or internal services.
6. **Supply-chain attacker** — a malicious dependency or a poisoned registry install.
7. **Insider operator** — owns host access. The platform cannot fully protect against
   this case but must leave a clean audit trail.

## Threat / control matrix

| Threat | Likelihood | Impact | Control today | Control next |
| --- | --- | --- | --- | --- |
| Privilege escalation | high | critical | RBAC fail-closed; unknown role = no perms; per-route `requirePermission` | Policy engine (Phase 8) codifies gates |
| Tenant escape | high | critical | `organization_id NOT NULL` on every tenant row; repository signatures require the tenant; tenant from session, never from body; isolation tests in CI | Phase 13: Postgres RLS as belt-and-suspenders |
| Malicious scanned page | high | critical | No scan path exists yet | Phase 2: container with read-only root, dropped caps, resource limits, egress restricted to target origin (ADR-0007) |
| SSRF via scan target | high | high | No scan path exists yet | Phase 2: URL validation + deny-list of private ranges/metadata IPs, resolved at fetch time (DNS rebinding aware) |
| Session fixation/theft | medium | high | Token freshly minted per login; httpOnly + SameSite=lax cookie; SHA-256 at rest | Rotate token on privilege change |
| Credential stuffing | medium | high | Tighter per-route rate limit on auth; argon2id verify cost | Lockout/backoff telemetry (Phase 7) |
| Journey credentials leakage | medium | high | Not stored yet | Phase 5: encrypted at rest, never returned raw after write, redacted in logs/evidence |
| PII in scan evidence | medium | medium | Not stored yet | Phase 2: evidence retention config; Phase 9: redaction on export |
| Audit log tampering | medium | high | Append-only writes in the request lifecycle; tests prove inserts | `REVOKE UPDATE, DELETE` from app role (hardening checklist) |
| Enumeration via timing | low | medium | Same code path for unknown user vs wrong password; argon2 verify dominates | Deliberate equalization if measurements show a gap |
| Supply-chain compromise | medium | critical | Dependabot, gitleaks in CI, `--frozen-lockfile`, CodeQL | SBOM generation (Phase 13) |
| Cross-tenant leakage via logs | medium | high | Logger redacts `password`, `token`, `passwordHash`, `cookie`, `authorization` | Phase 7: scrubbing pipeline in the collector |

## What this file deliberately does NOT claim

- A strength rating. Controls are either in code or `(planned)` — nothing in between.
- That AI review adds a security control. It doesn't; see ADR-0010.
- Anti-DNS / anti-BGP coverage. Those are infrastructure concerns of the self-hoster.

## Updates

This file is updated every phase in the same commit that lands the controls it describes.
Controls removed are kept in `git` history. New threats are appended in chronological
order.
