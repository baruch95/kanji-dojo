# Implementation work packages

This plan is for later agents. No implementation is included in the planning baseline. Work in small reviewable increments; every packet ends with evidence and a handoff. The active checkboxes live only in [TODO.md](../TODO.md).

## Dependency order

`M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8`

M1 is a risk checkpoint: do not build the full product before proving writing input. If physical hardware is temporarily unavailable, pure logic/adapter work can proceed with that gate explicitly unverified. Never interpret dependency order as permission to fabricate evidence.

After M2 freezes contracts, a future coordinator may explicitly assign independent packets (e.g. pure learning reducer, FSRS adapter, editorial content preparation). Shared contracts and orchestration need one integrator. Parallel work must use agreed interfaces, declared file ownership, and a single lockfile owner. Do not delegate or start extra agents unless the user/task instructions authorize it.

## M0 — Runnable development foundation

**Read:** architecture, deployment spec, AGENTS. **Prerequisite:** planning baseline.

- M0.1: Inspect status; select supported Node LTS and compatible stable React/TS/Vite/tooling releases. Add `.nvmrc`, package manifest/lock, strict compiler configuration. Use the nonempty repository carefully; scaffold in a temporary directory if the tool would overwrite docs.
- M0.2: Add Home/Session/Settings shell with hash routes and base-path configuration. No placeholder learning claims or fake progress.
- M0.3: Define scripts `dev`, `typecheck`, `lint`, `test` (single run), `test:watch`, `build`, `preview`. Add one meaningful smoke test and checks-only CI. No deployment triggers.

**Gate:** clean `npm ci`; typecheck/lint/test/build pass; preview loads root and subpath shells without missing assets. README describes actual commands. Do not add tests that merely prove constants equal themselves.

**Handoff:** pinned versions, commands/results, shell screenshot, remaining environment issues. Intended files: root tooling, `src/app`, base UI, checks workflow.

## M1 — One-kanji vertical slice

**Read:** handwriting spec, data contracts, licensing. **Prerequisite:** M0.

- M1.1: Import and attribute 十 from a pinned KanjiVG revision through a minimal internal adapter; no raw SVG injection. Record source/hash/license. Render the same geometry in reference and input coordinates.
- M1.2: Build pointer controller and ink renderer with cancellation, pointer capture, resize, touch setting, and device-pixel-ratio handling. Add Undo/Clear/Check. A developer-only page can show target and comparison diagnostics; production review rules still apply.
- M1.3: Compare two strokes by expected index, endpoints/direction, and sampled path; demonstrate correct versus reversed/swapped input. Add local fixture export and browser tests; define `test:e2e`.
- M1.4: Run the physical-device protocol in test plan. Capture natural attempts and input issues before broadening features.

**Gate:** a human writes 十 and gets sensible feedback; reversing a stroke or swapping its sequence fails; Undo/Clear work; canceled strokes do not grade; real iPad ink is usable. Record missing compatible-stylus evidence if not available, keeping its release gate open. No SRS/persistence necessary yet.

**Handoff:** evidence and fixtures, input device/OS, performance observations, exact failure cases. Intended files: `drawing`, basic `matching`, one content asset, fixture tools/tests.

## M2 — Data pipeline and calibrated matcher foundation

**Read:** handwriting and dataset specs, data contracts. **Prerequisite:** M1 software slice; explicit status of hardware gate.

- M2.1: Implement deterministic adapter and runtime schema validation for the initial 10-character calibration set. Add `data:generate`, `data:validate`, source notices, and conversion tests. Freeze shared v1 types.
- M2.2: Implement pure matcher pipeline, strictness table, hard constraints, typed diagnostics/errors. Test invariants and adversarial fixtures.
- M2.3: Collect independently labeled handwriting, split tuning/held-out sets, measure default acceptance/rejection, and version threshold changes. Write `docs/matcher-calibration.md` with counts, errors, decisions, and outstanding limitations.

**Gate:** no DOM/React dependency in matcher; monotonic strictness; structural distinctions survive normalization; documented calibration meets initial targets or a named blocker is raised. Synthetic paths alone do not pass the calibration gate.

**Handoff:** final contracts/config, calibration report, fixture provenance, unresolved order/shape cases. Intended files: `matching`, `data`, `scripts`, shared types, fixtures.

## M3 — Learning and review behavior

**Read:** product and learning specs. **Prerequisite:** M2 contracts and functional matcher.

- M3.1: Implement the pure transition table and tests for each row, including initial versus lapse origin. Use in-memory repositories only as test/dev adapters, clearly labeled until M4.
- M3.2: Build Trace/Copy/Recall/Review and result rendering with Check, replay, reduced motion, accessible feedback, End Session, and no target leaks before recall submission.
- M3.3: Wire grading orchestration to typed interfaces; keep scheduling/storage injected. Ensure stage change and result presentation are distinct.

**Gate:** deterministic three-step flow, every failure path, no auto-grading or override, same controls across stages, no answer in recall DOM/accessibility labels. UI errors do not produce fail verdicts.

**Handoff:** state-transition tests and screen captures, application-service interfaces. Intended files: `domain/learning`, `ui`, grading orchestration.

## M4 — FSRS and transactional local progress

**Read:** data contracts and scheduler policy. **Prerequisite:** M3.

- M4.1: Pin `ts-fsrs`, implement config/codec/adapter, and test against the installed library with fixed time. Verify first Good and review Again semantics with short-term disabled.
- M4.2: Implement IndexedDB stores, validation, atomic command commits, idempotency receipts, global revision conflicts, reset, and migration framework.
- M4.3: Wire real grades; retain pending results on write failure; recover committed result on reload; handle corrupt/newer data, blocked upgrade, and backward clock safely.

**Gate:** one grade = at most one schedule/log update; no extra Good after lapse retraining; no partial save on abort; stale-tab writes rejected; reload resumes without duplicate scheduling; all dates survive serialization. Test real IndexedDB in a browser as well as fast unit tests.

**Handoff:** storage schema/version, pinned scheduler config, recovery and conflict evidence. Intended files: `scheduling`, `persistence`, application wiring/integration tests.

## M5 — Sessions and settings

**Read:** product and queue rules. **Prerequisite:** M4.

- M5.1: Implement consistent Home counts and quota selection with explicit preview, empty states, and unfinished-learning choice.
- M5.2: Implement frozen deterministic queue, first presentation, Continue, resume/end, unique-card progress and summary. Untouched queued new cards remain unseen.
- M5.3: Persist settings, apply snapshots to sessions, implement reset confirmation and local-storage messages.

**Gate:** zero/new-only/review-only/mixed sessions, due boundary equality, no double counting, no due-card insertion mid-session, correct ending and re-entry after failure. Completed schedule survives reload and interrupted learning is offered later.

**Handoff:** representative end-to-end flow evidence and any session edge cases. Intended files: `domain/session`, Home/Settings/session UI, repository command handlers.

## M6 — All 50 kanji

**Read:** dataset/editorial and licensing specs. **Prerequisite:** M5; editorial preparation can occur earlier by assignment.

- M6.1: Complete metadata and source files for exactly the 50 candidates, with explicit recorded replacements if necessary.
- M6.2: Validate all records and generate the review gallery; inspect every cue, path order, and animation. Add real per-character attempts and synthetic regressions.
- M6.3: Freeze dataset version/provenance and publish `docs/dataset-review.md`. Complete in-app attribution and distribution notices.

**Gate:** exactly 50 unique valid writing cards, no unreviewed candidate metadata shipped, reproducible generator, complete offline-local references, broader matcher regression stays green.

**Handoff:** editorial review, provenance, expanded fixture coverage. Intended files: `data`, generated assets, dataset QA, notices.

## M7 — PWA and Pages readiness

**Read:** deployment/offline spec. **Prerequisite:** M6.

- M7.1: Add manifest/local icons and scoped service worker precaching all curriculum/app assets. Signal readiness only after install/activation/cache availability.
- M7.2: Add deferred update prompt, session-safe activation, own-cache cleanup, offline reopen and failed-first-install handling.
- M7.3: Add manual Pages workflow with documented permissions and root/subpath tests; do not enable or run publishing without approval.

**Gate:** production app starts online then cold-opens offline; reviews save/reload offline; nested Pages path/hash routes/manifest/icons/worker all work; old cached app does not lose progress or reload mid-stroke. Provide local verification; public deployment waits for permission.

**Handoff:** two-build test evidence, offline/update tests, precise deployment steps. Intended files: PWA/Vite configuration, workflow, assets, browser tests.

## M8 — Polish and release candidate

**Read:** all acceptance criteria. **Prerequisite:** M7 and resolution of earlier blocking gates.

- M8.1: Refine iPad layout/typography/controls from physical testing; check portrait/landscape, palm scenarios, zoom, accessibility, reduced motion, and performance.
- M8.2: Re-run held-out matcher evaluation, all critical automated checks, and the release matrix. Record exact environments/results and known limitations in `docs/verification.md`.
- M8.3: Update useful README setup/screenshots/support claims, TODO, changelog, notices, and Astra questions. Keep version at 0.1.0 until the owner approves a release.

**Gate:** every v0.1 requirement in test plan evidenced; no unanswered correctness/data-loss/license blocker; no unsupported hardware claims. Prepare changes for owner review. Commit, push, merge, and deploy require their stated separate permissions.

## Required handoff format

```text
Milestone / packets completed:
Files and public contracts changed:
Requirement IDs satisfied:
Commands actually run and results:
Manual/device evidence (or explicitly not run):
Open defects / Astra question IDs:
Remaining checklist items:
Next safe packet and prerequisites:
Proposed commit message (do not commit without approval):
```

If an agent changes a contract or product behavior, update the controlling spec, decision log, and tests in the same unit. Do not silently leave parallel tasks targeting obsolete types. Prefer one packet per reviewable change; completion of a packet is not permission to commit it.
