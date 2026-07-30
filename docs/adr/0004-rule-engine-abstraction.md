---
id: 0004
title: Rule engines behind one interface
status: Accepted
date: 2026-07-27
---

# ADR-0004 — Rule engines behind one interface

## Context

AccessForge evaluates pages and journeys with several engines: axe-core (DOM rules), the
in-house keyboard engine (tab order, focus traps), contrast analysis, ARIA/semantics
analysis over the accessibility tree — with more to come (media, responsive). Letting any
engine's native types escape into the core would couple issue storage, fingerprinting and
reporting to one engine's output format and make adding engines a rewrite.

## Decision

Define a single TypeScript interface — `RuleEngine` — that the scan pipeline depends on.
Every engine implements it and returns only `@accessforge/domain` types.

```ts
interface RuleEngine {
  readonly id: string; // 'axe-core' | 'keyboard' | 'contrast' | 'aria' | ...
  readonly categories: readonly RuleCategory[];
  evaluate(ctx: PageContext): Promise<readonly RawFinding[]>;
}
```

Rules enforced by import boundaries:

- `packages/domain` MUST NOT import from any engine package or from `axe-core` /
  `playwright`.
- Engines MUST return only domain types — findings are normalized (rule code, severity,
  WCAG references, selector, evidence) before they become `Issue` rows.
- An engine may import its vendor library only inside its own package boundary.

Issue **fingerprints** are computed from normalized findings (rule code + selector +
context), never from engine-native identifiers, so an engine swap does not orphan
baselines.

## Consequences

- ✅ New engine = new package, no core changes; findings from different engines diff and
  deduplicate uniformly.
- ✅ The keyboard engine (the differentiator) is a peer of axe-core, not a bolt-on.
- ⚠️ Normalization loses engine-specific detail — the raw payload is preserved in the
  issue's `evidence` JSONB for debugging.
- ⚠️ Abstraction is leaky by default unless tested; contract tests per engine.

## Alternatives considered

- **axe-core as the core model**: rejected — its result shape can't express journey-step
  findings or keyboard traces.
- **One mega-engine**: rejected — categories evolve at different speeds.

## References

- ADR-0007 (sandboxed execution), ADR-0008 (demo targets)
