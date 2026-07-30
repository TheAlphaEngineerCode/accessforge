---
id: 0006
title: Server-Sent Events before WebSockets
status: Accepted
date: 2026-07-27
---

# ADR-0006 — Server-Sent Events before WebSockets

## Context

The console needs live updates for scan progress, journey execution steps, new issues and
regression alerts. WebSockets give bidirectional + low latency, but cost a stateful
connection model, extra infra (sticky sessions, separate protocol) and a bigger surface
for tenant bugs. Everything the UI needs is server → client.

## Decision

Default to **Server-Sent Events (SSE)** for all real-time unidirectional updates from the
API to the web client. The protocol is HTTP/1.1 with `text/event-stream`, requires no
special broker, and slots behind existing rate-limit, auth and tenant-isolation
middleware.

SSE endpoints MUST implement:

- `Last-Event-ID` cursor resume (cursor stored in Redis, TTL ≥ 24h);
- heartbeat frames every 15s;
- explicit reconnection retry header (`retry: 3000`);
- per-org event fan-out via the event bus (ADR-0005).

WebSockets are deferred until a feature proves a need for client → server streaming that
isn't already covered by REST calls.

## Consequences

- ✅ One transport; fits behind Fastify hooks for auth and tenant guard.
- ✅ Works through corporate proxies that block WS upgrade.
- ⚠️ Bidirectional commands stay REST; tradeoff is acceptable.
- ⚠️ SSE has one connection per topic per client — fine for the console, watch it if a
  single dashboard ever multiplexes many scans.

## References

- ADR-0005 (event core)
