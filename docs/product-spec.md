# Product specification — v0.1

Status: implementation baseline, 2026-09-25. “Must” is a release requirement; “default” is the specified initial behavior. Thresholds explicitly marked provisional require calibration, not guesswork. Traceability to tests is in [test plan](test-plan.md).

## Outcome and boundaries

Help one person retrieve the written form of a known kanji from meaning and kana cues. The central interaction is writing a kanji naturally on an iPad. Introduce assistance only in learning. Target exactly 50 curated beginner characters for a manageable, testable interpretation of “approximately 50.”

No reading/meaning quizzes, vocabulary/sentence study, arbitrary OCR, accounts, backend, cloud/device sync, Anki integration, AI features, gamification, or advanced statistics. Do not add these under the label of preparation for later work.

## Requirements

| ID | Requirement and observable result |
| --- | --- |
| R-01 | A static client application can run on GitHub Pages at `/` or a repository subpath, with no runtime API dependency. |
| R-02 | Each of 50 content items has a stable ID, character, verified meaning/kana cues, ordered stroke paths, count, and provenance; progress is a separate joined record. |
| R-03 | Normal review displays meaning and kana, blank canvas, controls, and session progress. It reveals no target, stroke count, hint, or correctness before Check. |
| R-04 | New and failed-review items use guided tracing → visible reference → recall, with deterministic failure transitions. |
| R-05 | Explicit Check submits one attempt. Correct scheduled review produces one FSRS Good; incorrect produces one Again and learning. No manual pass override. |
| R-06 | Pointer Events capture separate strokes on iPad; Pencil, compatible stylus, finger option, and desktop mouse are supported without pressure/tilt requirements. |
| R-07 | Validation checks stroke count/order/direction, approximate shape and length, and whole-character structure. Accuracy 0–100 controls geometric tolerance only. |
| R-08 | Undo removes exactly one completed stroke. Clear removes all current strokes. Neither affects saved ratings. |
| R-09 | The user chooses a bounded review quota and separate new quota; unfinished learning can be included. Retries never expand the unique-card total. |
| R-10 | Grades and learning progress survive reload, with atomic updates and duplicate-submission protection. Failed writes do not pretend to save. |
| R-11 | After offline readiness, cached content and local scheduling work without internet, including reopening the app. |
| R-12 | Minimal iPad layout, usable portrait/landscape, large touch targets, visible focus, labeled controls, and reduced-motion support. |
| R-13 | Settings include accuracy, finger drawing, and confirmed local-progress reset. No speculative settings. |
| R-14 | Dataset attribution is available in the app and repository; essential logic has meaningful tests; docs and Git approval rules remain current. |

## Home and session selection

Home displays due reviews, unfinished learning, and new available counts, plus Start Session and Settings. No target glyphs appear in the counts/list preview.

- Reviews: `0 / 5 / 10 / 20 / all due`, default 10; clamp to actual available count.
- New: `0 / 5 / 10`, default 0; clamp to remaining unseen items. First-run empty state invites selecting new cards.
- Include unfinished learning: default on, with its count stated explicitly. It is separate from new/review quotas.
- Show the actual total unique cards before starting, e.g. “8 reviews + 3 unfinished + 5 new = 16 cards.” Disable Start for zero.
- Offer Resume or End saved session if one exists; do not silently create a second session. Queue order and due snapshot rules are in [learning and scheduling](learning-and-scheduling.md).

Counts use current local clock time, refresh on Home entry and foreground return, and exclude incomplete learning from “due reviews.” No daily limits, streaks, or imposed session length.

## Writing screen

Landscape: compact cue/reference column and a large square writing area with adjacent/below controls. Portrait: cues above the square, controls below. Use available height so the canvas and primary controls fit the tested iPad without page scrolling. A faint center cross/grid is optional; it conveys no target geometry.

Show a concise meaning and selected kana readings, labeled as cues. Keep cue selection deterministic for each card. Do not require answers other than writing. Use system Japanese fonts and no external font dependency.

Learning presentation:

1. **Trace:** faint complete SVG underlay inside canvas; animate strokes in order once on entry, then allow tracing with underlay remaining. Replay available only here. Stop animation before input; with reduced motion show static numbered order and explicit optional playback. Do not make animation a barrier to leaving the session.
2. **Copy:** complete static reference in a separate panel, empty normal canvas; no underlay or automatic animation.
3. **Recall:** same concealed presentation as review. Label “Learning · recall”; do not carry hidden SVG nodes, target text, or alt text into its accessible tree.

Undo, Clear, and Check remain stable in position. Minimum target size is 44 × 44 CSS pixels. While a stroke is active or a save is pending, disable destructive attempt controls and Check. Check is disabled for an empty canvas. A small tap counts as a completed input stroke; the matcher decides if it is a valid short stroke. Do not grade on reaching an expected number of strokes.

The review canvas gives no pre-submission correctness signals, including error colors or “N strokes remaining.” Assisted Trace/Copy may tint an obviously poor completed stroke as advisory feedback; do not erase/reject it automatically. All submitted attempts receive a full final check. Recall has no live geometry feedback.

## Results and interruption

After Check, freeze ink and controls. Show pass/fail in text, with relevant user strokes marked where possible. Color alone is insufficient. Avoid displaying a numeric handwriting skill score. Use cautious diagnostics such as “Check the direction of stroke 2”; do not label an uncertain diagnosis as certain.

Persist the grade before presenting it as saved. Continue advances to the committed next learning step or card. A failed review has already entered learning in persistent state; its result button is “Start learning.” Relearning graduation completes that session item but leaves the earlier Again schedule intact.

End Session is always available when no transaction is pending. If unsubmitted ink exists, explain that it will be discarded and allow canceling. Completed grades and learning steps remain saved. No rating is assigned for ending, cancellation, backgrounding, or reload. Reload restores the last committed session state/result with a blank unsubmitted canvas; raw ink is intentionally ephemeral.

For repeated learning failure, show “Try guided practice again” and retain End Session. Do not force successful completion to escape. An unresolved item remains unfinished learning for a later session.

## Settings and defaults

| Setting | Default | Semantics |
| --- | --- | --- |
| Writing accuracy | 50% | Label helper: “Higher values require closer shapes. This is a strictness setting, not a skill score.” Integer slider 0–100, step 1. |
| Draw with finger | Off | Pen/mouse draw; touch still operates all controls. Enable when a compatible stylus is exposed as touch. |
| Reset local progress | Explicit action | Confirm that reviews, learning progress, and sessions will be deleted. Reset in one repository operation; preserve settings and cached curriculum. |

Settings changes apply when the next session starts. The active session keeps a snapshot of accuracy and input settings, so a grade cannot change mid-attempt. Returning to Home to edit settings does not abandon a saved session.

## Nonfunctional acceptance targets

- Real device input must not visibly trail or drop ordinary strokes. M1 records a screen recording and dev timing; initial target is p95 ink update under 32 ms, final Check computation under 100 ms for this curriculum on the recorded device. These are targets, not current measurements.
- Matcher results are deterministic for a given fixture/configuration, finite, and monotonic with strictness.
- No network is required for grading, scheduling, or saving. No analytics or handwriting uploads.
- Storage unavailable/corrupt: explain the problem, preserve existing data where possible, and block durable practice until recovered. Do not silently fall back to memory-only progress or delete the database.
- No application claim of release readiness until [test plan](test-plan.md) gates are evidenced.
