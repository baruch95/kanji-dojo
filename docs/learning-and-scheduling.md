# Learning, FSRS, and session rules

This document is normative for R-04, R-05, R-09, and R-10. App learning stages and FSRS's internal state are different concepts. Never infer which screen to show from `fsrs.state` alone.

## Pedagogical state

An untouched item has no progress record. When it is first presented, create `LEARNING(reason=initial, step=trace)` with no scheduled card. Learning steps are `trace`, `copy`, `recall`. Relearning has `reason=lapse` and retains the scheduled card produced by the failed review.

| Current state | Event | Next durable state | Scheduler action | Session effect |
| --- | --- | --- | --- | --- |
| Unseen | First presentation | LEARNING initial/trace | None | Start item |
| LEARNING any/trace | Check pass | Same reason/copy | None | Same item |
| LEARNING any/trace | Check fail | Same reason/trace | None | Retry same item |
| LEARNING any/copy | Check pass | Same reason/recall | None | Same item |
| LEARNING any/copy | Check fail | Same reason/trace | None | Restart assistance |
| LEARNING any/recall | Check fail | Same reason/trace | None | Restart assistance |
| LEARNING initial/recall | Check pass | REVIEW | Create empty card, apply Good once | Complete item |
| REVIEW | Check pass | REVIEW | Apply Good once | Complete item |
| REVIEW | Check fail | LEARNING lapse/trace | Apply Again once | Same item; start learning |
| LEARNING lapse/recall | Check pass | REVIEW, preserve scheduled card | None | Complete item |
| Any editable attempt | Undo / Clear | Unchanged | None | Modify unsubmitted ink only |
| Any state | End / reload / input canceled | Last committed state | None | Discard only unsubmitted ink |
| Any state | Save fails | Unchanged | No saved rating | Retain pending result, retry same ID |

After a committed Check, display its result until Continue. The state above already reflects the transition; the stored result remembers the submitted stage so reload cannot reinterpret it as a new attempt in the next stage. Continue creates a fresh attempt ID, clears ink, and shows that committed next stage/card. A completed session item is counted exactly once, regardless of learning retries.

No Check on an empty canvas. Nonempty attempts with missing/extra strokes fail when explicitly submitted. There is no “accept anyway,” skipped stroke, or undo of a saved rating. Animation replay only in Trace; it never schedules or grades. A reducer may return a transition plan containing a scheduler intent; only the orchestration service can finish a REVIEW record that requires the new scheduled card. Never persist an intermediate REVIEW with a null card while awaiting the scheduler.

## Scheduler policy

Use the maintained [ts-fsrs package](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md) through `Scheduler`. Its documented API supports creating a card and applying a known rating. Pin the exact selected release; verify its behavior in M4 instead of copying current online types uncritically.

Project configuration: desired retention 0.90, `enable_fuzz=false` for deterministic scheduling, `enable_short_term=false`, and package-default weights/maximum interval materialized in a versioned config record. Do not optimize weights in v0.1. FSRS documents that disabling short-term scheduling bypasses its learning/relearning steps ([parameter reference](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/FSRSParameters.html)); the app's three teaching stages supply immediate practice.

Mapping: accepted scheduled recall → Good; rejected scheduled recall → Again. Hard and Easy are not exposed, and strictness does not select a rating. Initial graduation gets one Good even though assistance preceded it; log its origin so later integrations can distinguish it from ordinary retrieval. Training failures before that graduation generate no FSRS events.

After a lapse, retain the exact card returned for Again, including its due time. Immediate retraining is pedagogical practice and adds no Good. This prevents a just-shown answer from inflating stability. If retraining completes after the stored due time, the card is eligible in the **next** session; never re-add it to the current frozen queue. Do not clamp/overwrite due dates to custom intervals.

M4 gate: demonstrate that the selected package/config schedules first Good and review Again without an unexpected short-term queue. If not, record an Astra question and resolve the adapter/configuration; do not invent interval math.

Use a captured UTC `now` for each submitted attempt. Pass time explicitly; do not call the clock separately inside each helper. Save complete scheduler card and returned log, library version, and configuration ID. Validate finite dates/fields on restoration. Reject backward-clock scheduling when `now < lastReviewAt`, with a fix-clock message; do not produce a fail rating. Forward device clock changes use the observed clock, with this local-clock limitation documented.

## Queue construction

Freeze `sessionStartedAt`, settings, dataset/matcher version, and the list of unique card IDs when Start is committed. Perform selection against a consistent progress snapshot:

1. If included, all previously started LEARNING items, ordered by `updatedAt` ascending then card ID. These are “unfinished,” even if the retained FSRS due is in the future.
2. REVIEW items whose `due <= sessionStartedAt`, sorted by due then card ID, limited to selected review quota (or all). LEARNING items never appear here.
3. Unseen items in curated curriculum order, limited to selected new quota.

Never duplicate IDs. Untouched new items in the queue remain unseen until actually presented. No randomization in v0.1. Due cards becoming eligible mid-session wait for a later session. “All due” covers due reviews only; it does not introduce all unseen cards.

The total denotes unique selected cards. `completedCount` advances only on successful review or learning graduation. In results show “Card 3 of 10”; a retry remains Card 3. A failed review occupies the same slot through relearning. A brief end summary may show completed cards, submitted scheduled reviews split pass/fail, and newly learned cards; no cosmetic streaks.

## Resume and ending

Persist the active session queue, current item, committed result, completion flags, and next attempt ID after each transition. Persist first presentation before accepting input. At most one active session exists per local database. Home can resume it or explicitly end it; a second tab can display current data but stale writes are rejected by revision checks.

On reload/foreground refresh, read repository state before allowing input. Restore the committed result if present; otherwise restore the current stage with blank ink. On End, mark the session ended. Keep all progress already written; leave unresolved learning available for future selection; discard untouched queue entries. Ending does not mark them complete or create failures.

Settings remain fixed for an active session. Dataset/matcher version mismatch after an application update ends the resumable queue safely with an explanation and preserves card progress; the user starts a fresh session. Unknown storage versions require a safe stop, not a reset.
