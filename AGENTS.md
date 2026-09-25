# Instructions for implementation agents

## Purpose and source of truth

Build a small, polished **writing-only** kanji trainer for iPad Safari. English meanings and kana are cues; only handwriting is tested. v0.1 is fully client-side, supports 50 beginner kanji, and deploys to GitHub Pages under a repository path.

This is initially a documentation-only repository. Do not mistake planned commands, directories, thresholds, or acceptance criteria for implemented or verified features.

Read in order: `README.md`, `TODO.md`, `docs/product-spec.md`, `docs/architecture.md`, then your milestone's specifications in `docs/implementation-plan.md`. Preserve the user brief in `docs/original-brief.md`. Later explicit user decisions outrank this baseline. For apparent conflicts, record them before silently changing behavior. Specialized specifications own their details; the decision log explains why.

## Questions for Astra — required workflow

If you have questions, doubts, contradictions, unreliable assumptions, or a material design change, write an entry in the root file **`questions for astra.md`**. Include an ID, your name/task, affected files or requirement IDs, evidence, options, recommendation, whether it blocks your task, and what independent work remains possible.

Astra will check that file during a later requested review. Do not assume it is monitored automatically. Do not erase another agent's questions or mark them answered yourself. For reversible local details, record the assumption and continue. For a blocker affecting correctness, data loss, scope, or module contracts, stop the affected work and continue independent tasks. Tell the user about the blocker in your handoff.

## Architecture and directories

Planned layout (create as required by your milestone):

- `src/app/`: composition root, hash navigation, initialization.
- `src/ui/`: screens, controls, presentation; no geometry or scheduler math.
- `src/drawing/`: Pointer Events, ink rendering, SVG reference display.
- `src/domain/`: contracts, learning reducer, session planner, grading orchestration.
- `src/matching/`: pure geometry and target-kanji matching.
- `src/scheduling/`: the only application module importing `ts-fsrs`.
- `src/persistence/`: repository, IndexedDB adapter, serialization, migrations.
- `src/data/`: generated content and typed content loader.
- `data/`: curated metadata and pinned upstream source/provenance.
- `scripts/`: reproducible dataset conversion and validation.
- `tests/`: integration/browser tests and recorded handwriting fixtures.
- `docs/`: maintained specifications, decisions, and verification evidence.

Dependencies point inward: UI/adapters → application/domain → pure contracts. Matcher imports neither React nor browser DOM APIs. Scheduler imports no UI. Domain code does not open IndexedDB. Do not introduce a backend, generic plugin framework, state-management library, or worker until a measured need exists.

## Product invariants

- REVIEW and learning recall show only meaning, kana, and an empty writing surface. No target glyph, stroke count, diagram, hint, target-bearing accessible label, or diagnostic geometry before submission.
- Learning is guided tracing → visible reference → recall. A failed visible/recall step returns to guided tracing. Failed tracing repeats tracing.
- A failed REVIEW records FSRS Again once and immediately transitions to learning; the failure result offers “Start learning.” Training retries do not repeatedly penalize FSRS.
- New-card learning graduation records one Good. Relearning graduation records **no extra FSRS rating** and preserves the schedule produced by Again. See `docs/learning-and-scheduling.md`.
- Matching checks order, direction, shape, length, and structure against the expected kanji. Do not implement OCR. Do not normalize every stroke independently or remove whole-character proportions.
- Accuracy is a strictness setting, not a measured skill percentage. Hard count/order/direction rules survive all settings.
- Pointer pressure/tilt are never prerequisites. Controls remain touch-operable. Undo removes one completed stroke; Clear resets only the unsubmitted attempt.
- Explicit Check grades; all stroke feedback is post-submission except advisory feedback during assisted learning. No manual override in baseline; check the decision log for later owner changes.
- Persist accepted transitions before advancing. Storage failures and canceled input are not incorrect answers.

## Engineering conventions

Use TypeScript strict mode and explicit unions for states/results. Avoid `any`, unchecked persisted-data casts, and hidden mutable singletons. Parse unknown input at boundaries. Inject time and ID generation into application services. Use UTC epoch milliseconds for persisted time. Use stable IDs, never array indexes, for content/progress joins.

Keep exported interfaces documented. Prefer small pure functions, an explicit reducer, and a thin repository. Do not create speculative abstractions for sync. Version matcher configuration, dataset, storage schema, and scheduler configuration independently.

Implement only your assigned milestone. Inspect existing code and contracts before editing. Avoid shared-file changes across concurrent tasks without coordination. Update documents whenever behavior or interfaces change.

## Checks and handoff

After M0 the baseline commands are `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. M1 adds `npm run test:e2e`; M2 adds `npm run data:generate` and `npm run data:validate`. Until these exist, report them as unavailable, not passed. Tests must cover meaningful behavior and failure paths, not just snapshots or copied implementation formulas.

Run checks relevant to your change, plus the milestone gate. iPad/Pencil behavior requires physical-device evidence; Playwright WebKit is not proof of it. Never fabricate hardware testing or real handwriting fixtures.

Maintain `TODO.md` as active work; move completed milestone history into `CHANGELOG.md`. Give a handoff listing changed files, requirement IDs, checks actually run, remaining failures/risks, question IDs, and the next safe task. For release checks use `docs/test-plan.md`.

## Git and publication rules — explicit owner requirements

Before substantial changes inspect the repository and `git status`. Preserve other work. No force resets, destructive Git operations, or history rewriting.

**Do not commit without explicit user approval.** When a coherent unit is ready, describe the change and checks, propose a concise commit message, and ask whether to commit. Permission applies to the approved unit only.

**Do not push without separate explicit approval.** Before asking, show the branch, commits, and destination remote. Approval to commit is not approval to push. Never automatically merge, enable publishing, or deploy. A prepared deployment workflow is not deployment authorization.
