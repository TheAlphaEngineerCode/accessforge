---
id: 0008
title: Demo targets as first-class fixtures
status: Accepted
date: 2026-07-27
---

# ADR-0008 — Demo targets as first-class fixtures

## Context

The platform must demonstrate its full value — scans, keyboard traversal, journeys,
baselines, regressions — without asking a recruiter or self-hoster to point it at a
production site. And accessibility testing has a special need: the engine's findings can
only be trusted if it is regularly exercised against pages whose defects are **known in
advance**.

## Decision

Ship demo target applications inside the repository (`examples/`), seeded as demo
projects:

- **Accessible Store** — intentional best practices; the "should find nothing" control
  and the regression-detection baseline.
- **Broken Commerce** — intentional, catalogued violations: unlabeled forms, broken focus
  order, keyboard-trap modals, missing announcements. Each defect is documented next to
  the code that contains it.
- **SaaS Dashboard** — tables, dynamic content, live regions; the hard cases.

The demo targets **are real scan targets** — the same pipeline that scans an external URL
scans them. No mock-only branches in the domain layer. The engine's integration tests
assert the catalogued defects are found and the control produces no false positives.

## Consequences

- ✅ Every feature is demoable end-to-end on a fresh `git clone`.
- ✅ The defect catalogue doubles as the engine's acceptance suite: a rule change that
  stops finding a known defect fails CI.
- ⚠️ Real-world pages are messier than fixtures; the demo targets bound false negatives,
  not real-world coverage. External-site edge cases remain engine work.
- ⚠️ A demo that diverges from real behavior is worse than no demo — the fixtures are
  production code, with the same lint/tests.

## References

- ADR-0004 (engines), ROADMAP Phases 2–6
