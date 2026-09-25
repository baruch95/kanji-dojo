# Test and release acceptance plan

No checks below have been run against an application yet. They define future acceptance. Record actual command output, build identity, browser/device versions, fixture/config versions, and any unrun checks in `docs/verification.md` as implementation proceeds. Do not create a green checklist from an expectation.

## Commands and test layers

| Available from | Command | Required meaning |
| --- | --- | --- |
| M0 | `npm ci` | Reproducible dependency installation from lockfile |
| M0 | `npm run typecheck` | Strict TypeScript check without emitting build output |
| M0 | `npm run lint` | Agreed static lint rules |
| M0 | `npm run test` | Deterministic unit/integration suite, run once and exit |
| M0 | `npm run build` | Production static bundle |
| M1 | `npm run test:e2e` | Playwright behavior flows, Chromium and WebKit; document required browser installation |
| M2 | `npm run data:generate` | Deterministic generation from pinned local source |
| M2 | `npm run data:validate` | Dataset/schema/provenance/geometry validation |
| M7 | `VITE_BASE_PATH=/kanji-dojo/ npm run build` | Separate production artifact to test repository-subpath behavior |

Pure tests run in Node and import no React/DOM globals. UI tests assert user-observable behavior; snapshots alone are insufficient. Fast IndexedDB fakes are acceptable for unit tests, but atomic persistence/reload/PWA tests must also run against actual browser APIs. Integration tests use fixed injected clocks and explicit deterministic fixtures.

CI starts as checks-only. For production browser checks, start preview with known host/port and wait for readiness. Use a clean browser storage profile per independent scenario and persistent storage only where the scenario tests recovery. Keep an actual root and subpath build; do not test both URLs against only the root artifact.

## Traceability and automated cases

| Test group | Requirements | Minimum evidence |
| --- | --- | --- |
| T-01 Content | R-02, R-14 | Unique IDs/order, required prompts and provenance, valid kana/no leaked character in cue, counts match paths, deterministic generation, unsupported SVG fails explicitly |
| T-02 Input | R-06, R-08 | Down/moves/up forms one stroke; coalesced fallback; pointer ID isolation; cancel/capture-loss/resize/background; mouse button guard; finger toggle; DPR-independent coordinates; Undo exactly one/Clear all |
| T-03 Geometry | R-07 | Arc-length endpoints/sample count; duplicate points/zero length/nonfinite input; exact reference pass; reversed/swapped/count errors; translation/scale tolerances; aspect distortion fails; invariance to screen size and event sampling density |
| T-04 Strictness | R-07, R-13 | 0/50/100 thresholds and equality boundaries; monotonic acceptance over all 101 values on fixtures; gross order/direction/count failures at every setting; no pressure/tilt dependence |
| T-05 Learning | R-04, R-05 | Every transition-table row for initial and lapse origin; failed copy/recall returns to trace; training retries do not schedule; cancel/reload never grades |
| T-06 Concealment/UI | R-03, R-05, R-12 | No target SVG/text/alt/accessible label/count/hint in review or recall before Check; no live verdict/auto-submit; Copy reference outside canvas; Trace replay only; post-result controls frozen |
| T-07 FSRS | R-05 | Compare adapter results to pinned library for fixed cards/times; correct Good/Again mapping; config/version preserved; first Good and lapse interval behavior verified; date codec roundtrip; no extra rating on retraining graduation |
| T-08 Persistence | R-10, R-13 | Commit/log/session all succeed or all roll back; identical attempt retry deduplicates; differing payload same ID rejected; stale global revision rejected; reset atomic; failed decode/newer schema does not wipe data |
| T-09 Recovery | R-10 | Crash/reload before and after grade commit, before and after Continue; recover saved result without regrading; interrupted learning stage preserved; unsubmitted ink discarded without rating; write failure retains retry payload |
| T-10 Sessions | R-09 | Exact due equality included; future excluded; unfinished not counted as review/new; ordering/ties; clamp quotas; zero/new-only/review-only/mixed; unique queue; no mid-session additions; untouched new stays unseen after End |
| T-11 Offline/hosting | R-01, R-11 | Root/subpath asset/worker/manifest/hash paths; first-load failure not ready; full offline reopen and grade/save/reload; deferred update survives active ink/session; caches scoped to app |
| T-12 Accessibility | R-12 | Labels, keyboard/focus order, visible focus, result announcements, 44 px targets, sufficient text/control contrast, reduced motion; no target leaks in accessible names |

For T-03 use independent geometric expectations: known polylines, manually labeled recordings, deliberately reversed/reordered paths, and distorted structures. A suite that creates “correct” samples only by copying reference paths does not demonstrate natural handwriting tolerance.

For T-07 use black-box scheduler integration checks in addition to mocks. Assert the policy and consistency with the pinned library, not hardcoded undocumented intervals remembered from another FSRS release.

## Critical end-to-end scenarios

1. Fresh database → choose 5 new → Trace pass → Copy pass → Recall pass → result/Continue → one scheduled card; reload preserves it. No rating before graduation.
2. Fixed-clock due card → correct Check → one Good → Continue → completed item; double click/retry creates no second event.
3. Due card → fail → one Again → Trace/Copy/Recall → graduate → same post-Again scheduler card; reload at every boundary preserves the exact behavior.
4. Failed Copy and failed learning Recall repeat Trace without FSRS updates. User can end immediately and later resume unfinished learning.
5. End a mixed session before reaching queued new cards → untouched cards remain new and future selected reviews are unchanged.
6. Force transaction abort at grade commit → no partial progress/log/session changes; retry saves once. Reload after a committed grade restores frozen result.
7. Two tabs share active session; tab A commits; stale tab B submits different attempt/command → conflict, refresh, no schedule overwrite or duplicate event.
8. Change settings between sessions; old active session keeps its original snapshot. Reset with cancel preserves everything; confirmed reset clears progress/events/sessions but keeps preferences/content.
9. Missing/corrupt content, invalid stored scheduler data, or backward clock → recoverable error, no incorrect-review penalty, no silent reset.
10. Cache production subpath build → close page → disable network → reopen via correct path/hash → practise and persist → close/reopen → saved schedule remains. Repeat on actual iPad.
11. App version B becomes available while version A has ink/active session → no forced reload; end session, accept update, reload → new assets with preserved compatible progress. Incompatible session versions end safely; unknown newer storage stops safely.

## Physical iPad protocol

Record exact model, OS/Safari, Pencil/stylus model, orientation, display scaling/zoom, and deployment/build. Do not claim an untested iPadOS minimum. The first release must list exact tested versions; broader support is a target until established.

Run in both Safari tab and installed Home Screen app where applicable:

1. Draw slow, fast, short, bent, and hooked strokes. Confirm exactly one stroke per contact and stable endpoints. Check visible latency and the M1 performance target.
2. Rest the palm while writing, drag off-canvas, touch a second contact, lift/reapply Pencil, switch apps, rotate mid-stroke, and return. No stray saved ratings; incomplete input cancels cleanly.
3. Touch Undo/Clear/Check/End with finger while finger drawing is off. Then enable finger mode and verify both finger and a touch-reported stylus path.
4. Draw in portrait/landscape; inspect canvas/control visibility, page scroll behavior inside/outside canvas, and zoom outside the writing area.
5. Complete learning, fail a scheduled review, retrain, reload, and check due state. Test ordinary handwriting rather than tracing in recall.
6. Cache online, reopen offline, write/save, force-close/reopen, then reconnect and accept an update outside a session.
7. Test a real compatible active stylus such as the owner's MetaPen model; record its observed pointer type. Desktop tests and Apple Pencil tests do not replace this evidence.

If hardware access is missing, record it in Q-002 and hand off the exact protocol. Keep the physical portion of the gate pending.

## Release checklist

- [ ] R-01 through R-14 are linked to passing tests/manual evidence; no known critical data-loss or scheduling bug.
- [ ] All 50 items have completed editorial/vector/license review and at least one accepted real full attempt.
- [ ] Held-out matcher gate: ≥90% correct-attempt acceptance, ≤5% incorrect-attempt acceptance at default, with sample counts/categories disclosed; hard regression suite has zero incorrect passes at every strictness.
- [ ] Physical Apple Pencil and compatible-stylus tests, portrait/landscape, persistence, and offline reopening are documented honestly.
- [ ] Build/type/lint/unit/browser/data checks pass against the final artifact; root and subpath both verified.
- [ ] Errors, stale tabs, migration/version mismatch, reset, and safe updates tested.
- [ ] README commands and support claims reflect reality; screenshots added; TODO/CHANGELOG/AGENTS accurate; attribution bundled and visible.
- [ ] Astra questions affecting correctness, release evidence, or third-party redistribution are resolved or explicitly block release.
- [ ] Source-code license status is stated accurately. Commit/push/deployment are each authorized before the action.
