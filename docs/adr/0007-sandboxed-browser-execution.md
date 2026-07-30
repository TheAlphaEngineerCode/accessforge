---
id: 0007
title: Browser execution is sandboxed, never on the host
status: Accepted
date: 2026-07-27
---

# ADR-0007 — Browser execution is sandboxed, never on the host

## Context

The scan engine loads **arbitrary third-party web pages** — including pages a tenant does
not control end-to-end (CDNs, embedded widgets, ads). A browser rendering untrusted
content is a remote-code-execution surface by definition; running it inside the API
process, or bare on the API host, would hand that surface to every tenant.

## Decision

All browser execution (Playwright + Chromium; Firefox/WebKit in Phase 12) runs in the
**worker process, inside an isolated container**:

- No browser code in `apps/api` — the API only enqueues scans and reads results.
- The scan container runs as a non-root user with a read-only root filesystem, dropped
  capabilities, and CPU/memory/PID limits.
- Network egress from the container is restricted to the scan target's origin (plus its
  direct subresources); the platform's own database and internal services are not
  reachable from it.
- Artifacts leave the container as data (DOM snapshot, accessibility tree, screenshot)
  written to object storage — the container gets write-only, scoped credentials.
- If no container runtime is available, the scan **fails as unexecutable** — it does not
  fall back to running the browser on the host.

## Consequences

- ✅ A malicious or compromised page cannot reach the host filesystem, the database or
  other tenants' data.
- ✅ Resource limits contain runaway pages (infinite loops, memory bombs).
- ⚠️ Self-hosters need a container runtime to run scans at all. Acceptable — AccessForge
  stops rather than silently degrading isolation.
- ⚠️ Some sites behave differently under headless/containered browsers; mitigations
  (headed mode in-container, UA configuration) are engine work, not isolation exceptions.

## Alternatives considered

- **Browser in the API process**: rejected outright — one bad page takes the API down.
- **Bare browser on the worker host with seccomp only**: too brittle to promise isolation.

## References

- ADR-0001 (worker split), ADR-0004 (engines)
