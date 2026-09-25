# Active roadmap

M0 and the M1–M7 software slices are implemented. The owner tested the earlier 十 prototype on iPad Air M1 with MetaPen; the current flows need physical validation. Real handwriting calibration is deferred until after M7, and 50-card editorial review remains open. The M3–M7 software was committed, pushed, and published on 2026-09-25. Detailed work packets and gates: [implementation plan](docs/implementation-plan.md). Take milestones in dependency order. Mark individual items as they finish; once a milestone is complete, summarize it in `CHANGELOG.md` and remove its completed checklist from this active file.

## v0.1 required

### M1 — One-kanji vertical slice and device risk

- [x] Pin and attribute one KanjiVG source for 十; expose internal reference geometry.
- [x] Capture/render individual strokes; implement Undo/Clear/Check and basic ordered comparison.
- [x] Add browser tests and a developer-only local stroke-fixture capture tool.
- [ ] Verify real iPad input with Apple Pencil; record device/OS/results and compatible-stylus evidence where available.

### M2 — Dataset adapter and matcher

- [x] Build deterministic import/validation pipeline and freeze v1 content/matcher contracts.
- [x] Implement resampling, feature checks, hard gates, and monotonic accuracy thresholds.
- [ ] Calibrate on independently labeled real handwriting; owner deferred this until after M7. Keep matcher provisional (Q-004).

### M6 — Full beginner curriculum

- [x] Import exactly 50 pinned candidate KanjiVG sources with generated geometry and attribution.
- [ ] Obtain competent-reader/owner approval of every cue and reading (Q-005).
- [ ] Review every prompt, stroke animation, and variant with editorial evidence; expand natural handwriting coverage.

### M8 — iPad polish and release evidence

- [ ] Complete physical iPad/Pencil/compatible-stylus matrix, portrait/landscape, accessibility, and performance checks.
- [ ] Meet matcher acceptance gate on held-out handwriting and inspect all 50 entries.
- [ ] Finish release checklist, screenshots, sources/notices, README commands, and changelog.
- [ ] Resolve release-blocking Astra questions and request commit/push/deployment approvals separately when needed.

## Bugs

The M1 practice prototype has no confirmed runtime bugs. Add reproducible bugs here with requirement/test references.

## Improvements (not v0.1 blockers)

- [ ] Local progress export/import, with validation and restore preview.
- [ ] More annotated handwriting fixtures and curated alternative stroke sequences.
- [ ] Better explanations for uncommon matcher failures; only after measuring rejection patterns.

## Future versions (do not implement now)

- [ ] Anki mapping/import/synchronization with explicit schedule ownership and conflict policy.
- [ ] Larger/custom lists, multiple decks, iPhone layout, troublesome-kanji views.
- [ ] Optional cloud/device sync and richer statistics.
