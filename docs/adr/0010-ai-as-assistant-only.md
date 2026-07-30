---
id: 0010
title: AI as assistant only — never the source of a compliance claim
status: Accepted
date: 2026-07-27
---

# ADR-0010 — AI as assistant only — never the source of a compliance claim

## Context

Accessibility results carry legal and ethical weight: teams use them to claim WCAG
conformance, and people with disabilities depend on those claims being true. LLMs are
useful for explaining issues and suggesting fixes, but they hallucinate — and a
hallucinated "no issues found" is worse than no tool at all. The market is full of
AI-first overlay products whose claims do not survive a manual audit; AccessForge's
credibility depends on not being one of them.

## Decision

AI participates only as an **assistant**, downstream of measured findings:

1. **Findings come from engines, never from models.** An `Issue` row can only be created
   by a deterministic rule engine (ADR-0004) over recorded evidence. There is no code
   path from a model response to an issue, a resolved status, or a compliance figure.
2. **Allowed AI surfaces**: explain an existing issue in plain language, suggest a fix,
   draft remediation text, summarize a report. Every AI-generated text is labeled as
   such in the UI and API.
3. **Fail closed on the unmeasured.** What an engine did not evaluate is reported as
   *not evaluated* — never inferred, by a model or otherwise.
4. **No autonomous writes.** The assistant never mutates project state; a human applies
   or discards its suggestions.
5. Provider-neutral integration, so self-hosters can point at their own model or disable
   AI entirely with zero feature loss in the measurement path.

## Consequences

- ✅ Compliance-relevant output is reproducible: same page, same rules, same findings.
- ✅ Disabling AI removes convenience, not correctness.
- ⚠️ Some flashy features (auto-fix PRs, AI audit summaries as verdicts) are deliberately
  out of scope; that is the point.
- ⚠️ The label "AI-generated" must survive every UI/export path — a test-worthy invariant.

## Alternatives considered

- **AI-first scanning** ("ask the model if the page is accessible"): rejected —
  unreproducible, unauditable, and wrong exactly when it matters.
- **AI-verified issue resolution**: rejected — resolution requires re-measurement.

## References

- ADR-0004 (engines are the only issue source)
