# Data and service contracts

These are the implementation contracts for M1–M5. They specify semantics, not a generated SDK. Establish the concrete TypeScript types once in `src/domain/`; adapters may add internal types but must not create competing versions.

## Identity and versioning

- `KanjiId`: `u` + lowercase Unicode scalar in hexadecimal, minimum four digits, e.g. `u5341` for 十. Reject multi-character/variation-selector entries in v0.1; do not silently collapse them.
- `CardId`: `writing:<KanjiId>:v1`, e.g. `writing:u5341:v1`. A separate ID makes future multiple card types possible.
- IDs for session, attempt, and event: UUID strings generated at the application boundary. One attempt ID stays stable across save retries; no ID is derived from wall-clock milliseconds alone.
- Times: integer UTC epoch milliseconds. Monotonic relative stroke timestamps use milliseconds since stroke start, separately from wall-clock time.
- Version strings: dataset, matcher/config, scheduler/config. Storage has integer `schemaVersion`. Changing thresholds requires a matcher/config version; changing stable IDs requires a migration.

## Read-only content

```ts
type Point = Readonly<{ x: number; y: number }>;
type Reading = Readonly<{
  kana: string;
  kind: 'on' | 'kun';
  showInPrompt: boolean;
}>;
type ReferenceStroke = Readonly<{
  index: number;              // contiguous, zero-based
  pathD: string;              // SVG path in the original viewBox
  samples: readonly Point[];  // 64 arc-length samples in common [0,1] frame
  length: number;             // normalized polyline arc length
}>;
type KanjiDefinition = Readonly<{
  id: string;
  character: string;
  curriculumOrder: number;
  promptMeaning: string;
  readings: readonly Reading[];
  strokeCount: number;
  viewBox: readonly [number, number, number, number];
  strokes: readonly ReferenceStroke[];
  provenanceId: string;
}>;
```

Dataset wrapper: `schemaVersion`, `datasetVersion`, `generatedByVersion`, `sourceRevision`, `items`, and provenance records. Each provenance record contains upstream URL/revision, source filename, license identifier/link, copyright/attribution, transformations, and metadata verification source/date. `strokeCount === strokes.length`, all indexes contiguous, all values finite. At least one kana reading must be selected. Every prompt and provenance is nonempty. For a square reference viewBox `(x0,y0,w,h)`, normalize x by w and y by h; reject unsupported non-square sources instead of distorting them.

## Captured attempts and matcher results

```ts
type InkPoint = Point & {
  t: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
};
type CapturedStroke = {
  points: readonly InkPoint[];
  pointerType: 'pen' | 'touch' | 'mouse';
};
type Attempt = {
  id: string;
  cardId: string;
  sessionId: string;
  strokes: readonly CapturedStroke[];
  accuracy: number;
  datasetVersion: string;
  matcherVersion: string;
};
type DiagnosticCode =
  | 'stroke-count' | 'order' | 'direction' | 'start' | 'end'
  | 'trajectory' | 'length' | 'structure' | 'degenerate';
type MatchResult = {
  accepted: boolean;
  diagnostics: readonly {
    code: DiagnosticCode;
    strokeIndex?: number; // user stroke, zero-based; missing stroke has no ink
  }[];
  matcherVersion: string;
};
```

The matcher may return internal numeric metrics for developer diagnostics/calibration; they are not a user score. Invalid reference or nonfinite input is a typed processing error, **not** a failed pedagogical attempt. Wrong but well-formed nonempty handwriting is a `MatchResult` failure. Raw strokes remain in memory and optional developer fixture files; ordinary production progress/logs do not store them.

## Mutable records

| Record/store | Key and required fields |
| --- | --- |
| `progress` | `cardId`; `kanjiId`; `mode`; learning `reason/step` when applicable; `schedulerCard` or null; `createdAt`, `updatedAt`; schema version |
| `attemptEvents` | `attemptId`; session/card IDs; submitted mode/reason/step; accepted/diagnostics; strictness; submittedAt; dataset/matcher versions; scheduler action or null; optional exact FSRS before/after/log/config ID |
| `sessions` | `id`; `status=active/completed/ended`; selected quotas; start/end timestamps; frozen settings/version IDs; ordered queue; completion flags; current index; current attempt ID; committed result or null |
| `settings` | singleton `preferences`; accuracy integer 0–100; finger drawing boolean; schema version |
| `metadata` | singleton `app`; global mutation revision; activeSessionId or null; schema version; scheduler configuration records as separately keyed immutable entries |

`mode` is a discriminated union: REVIEW requires a nonnull scheduled card and no learning fields; LEARNING initial requires null scheduled card; LEARNING lapse requires nonnull scheduled card. Validate this on every restored record. No progress record means unseen; do not seed 50 empty FSRS cards merely to count new items.

Session queue entries contain card ID, selection category (`unfinished/review/new`), and completed flag. A stored committed result includes attempt ID, submitted stage, match summary, and next action (`learning-step/next-card/session-complete`). Persist this alongside the already transitioned progress so refresh cannot regrade it. When Continue advances, atomically clear the result, select/init the next item if necessary, and create the next attempt ID. Persist result dismissal even when staying on the same card.

The scheduler wrapper owns a serializable envelope `{engine:'ts-fsrs', libraryVersion, configId, card}`. Preserve every required field of the pinned library's card, convert date fields to epoch milliseconds, and validate on decode. The [current Card reference](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/Card.html) includes due, stability, difficulty, state, repetitions/lapses, scheduled days, learning-step counter, optional last review, and a deprecated elapsed-days field. M4 derives the exact codec from the installed version and tests it; do not omit unfamiliar fields or persist naked `Date` JSON strings inconsistently. Store the complete returned library log with its date fields converted in the same manner.

## Service interfaces

Use named input/output types for the following logical operations; expected errors are discriminated results, unexpected exceptions are handled at the app boundary.

| Service | Operation | Contract |
| --- | --- | --- |
| `Matcher` | `evaluate(reference, attempt, config)` | Pure deterministic result; no I/O, DOM, clock, or mutation |
| `LearningReducer` | `transition(progress, verdict)` | Pure next pedagogical state and optional `Good/Again` intent; never calculates intervals |
| `Scheduler` | `initialize(now, config)` / `apply(card, rating, now, config)` | Creates serializable initial card / returns next card and exact library log; only adapter imports library |
| `SessionPlanner` | `plan(content, progress, selection, now)` | Pure unique queue and counts from one snapshot |
| `Repository` | `loadSnapshot()` | Consistent records plus global revision; validates schema |
| `Repository` | `commit(command, expectedRevision)` | Atomic mutation; returns committed snapshot, existing receipt, conflict, or storage failure |
| `Clock` | `now()` | Injected UTC epoch milliseconds |

Commands: start session, present/continue attempt, commit grade, end session, update settings, reset progress. Each includes an operation ID; grades use attempt ID for deduplication. `commitGrade` includes computed event, next progress, and next session/result as one unit. Don't expose loose `saveCard()` plus `saveLog()` calls to orchestration: they permit partial grades.

## Atomicity, concurrency, and recovery

Every mutation includes the metadata store in its IndexedDB read/write transaction. Read global revision and compare with the caller's expected revision inside that transaction. If stale, abort and return conflict; UI reloads and discards stale unsubmitted ink with an explanation. Increment revision on success. This serializes writers without a complex locking service.

For a repeated grade command, check existing `attemptId` **before** the revision check. Identical payload returns the stored receipt without scheduling again. Same ID with different payload is a conflict. The receipt never overrides a newer active-session state; reload current snapshot before rendering. Disable buttons in-flight, but do not rely on UI alone for idempotency.

Compute geometry and scheduling before opening a transaction; during commit validate the revision and record invariants again. Do not await unrelated network/timers inside IndexedDB transactions. Resolve success only on transaction completion, not individual put success. IndexedDB's transaction lifecycle is described in the [API guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

If saving fails, keep pending result and ink in memory, show “Progress could not be saved” with Retry, and block Continue. Retry the identical command/time/ID. A crash before commit leaves the previous durable state; after commit it restores the result without an extra grade. Do not rely on `beforeunload` to save.

Namespace the database with a stable app ID plus normalized base-path identifier so multiple Pages projects on one origin do not share progress accidentally. A hosting path change does not migrate data automatically. Schema upgrades use explicit IndexedDB migrations with fixtures; unknown newer schema opens a recovery message. Never reset on decode/migration failure. Close old connections on `versionchange` and show a refresh message for blocked upgrades.

Confirmed reset clears progress, events, and sessions, unsets active session, increments revision, and preserves preferences/configuration and static content. Other tabs become stale. Reset must have a destructive-action confirmation and be tested independently of ordinary schema migration.
