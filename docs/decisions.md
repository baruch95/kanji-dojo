# Decision log and risk register

Baseline dated 2026-09-25. “Accepted baseline” means a concrete implementation default within the brief; “owner confirmed” records an explicit preference; “provisional” requires measured validation. Record later changes here and in the owning specification, retaining enough history to explain migrations.

| ID | Status | Decision and reason | Owner specification |
| --- | --- | --- | --- |
| D-01 | Accepted baseline | React/TypeScript/Vite, static client, npm, IndexedDB, Canvas ink + SVG references. Fits Pages and keeps logic testable. | architecture.md |
| D-02 | Owner confirmed | Explicit Check grades every attempt; rejected attempts retry through learning; no manual pass override. Owner confirmed both preferences during planning. | product-spec.md |
| D-03 | Accepted baseline | Pure matcher compares indexed strokes in shared coordinates. No per-stroke scale/rotation normalization or OCR. | handwriting-spec.md |
| D-04 | Provisional calibration | Accuracy default 50; interpolated geometric tolerances; hard order/count/direction checks at all settings. Initial constants require real fixtures. | handwriting-spec.md |
| D-05 | Accepted baseline | Copy/Recall failure → Trace; Trace failure repeats Trace. Learning origin distinguishes new introduction and review lapse. | learning-and-scheduling.md |
| D-06 | Accepted baseline; adapter gate | FSRS Good/Again only; retention .90, fuzz off, short-term off. App handles immediate pedagogy; FSRS handles future schedule. | learning-and-scheduling.md |
| D-07 | Accepted baseline | A lapse records Again once. Immediate retraining graduation records no Good and preserves that schedule. New graduation gets one Good. | learning-and-scheduling.md |
| D-08 | Accepted baseline | Separate immutable content and mutable progress, joined with Unicode-based IDs. One writing card per kanji. | data-contracts.md |
| D-09 | Accepted baseline | Atomic progress/event/session commits, persistent result receipts, revision checks. No raw stroke persistence for ordinary use. | data-contracts.md |
| D-10 | Accepted baseline | Frozen session queue; unfinished first, due reviews second, new third. Separate quotas and no automatic mid-session additions. | learning-and-scheduling.md |
| D-11 | Accepted baseline | Hash navigation, explicit base path, scoped PWA precache, prompt updates deferred while a session is active. | deployment-and-offline.md |
| D-12 | Accepted baseline | Finger drawing off initially; enable for finger/touch-reported stylus. Touch controls remain functional. Pressure/tilt never required. | handwriting-spec.md |
| D-13 | Accepted baseline | Exactly 50 candidate beginner characters, all reviewed before release. Canonical KanjiVG sequence only initially. | dataset-spec.md |
| D-14 | Deferred | No backup/import UI in v0.1; warn accurately about browser-local storage. Stable IDs and validated codecs support a later backup feature. | data-contracts.md |
| D-15 | Unresolved owner choice | No original-code license has been selected. Preserve third-party licenses and avoid an unsupported open-source claim. | sources-and-licensing.md; Q-003 |

## Highest risks and response

| Risk | Earliest test | Response / exit criterion |
| --- | --- | --- |
| Matcher rejects natural handwriting or accepts incorrect order | M1 natural input, M2 independent fixture evaluation | Diagnose error categories and calibrate; escalate if quantitative gates fail. Do not quietly remove requirements. |
| Compatible stylus appears as touch; palm interference | M1 physical device | Provide finger mode and one-pointer logic; document actual limitations; prove supported model before release. |
| Guided retraining incorrectly changes memory schedule | M4 exact event integration tests | Separate learning origin and optional rating intent; one Again and no extra Good after lapse. |
| Saved grade duplicates or is partly lost | M4 abort/reload/duplicate/stale-tab tests | Atomic transaction, stable attempt ID, global revision, persisted result. |
| Offline cold start misses data or paths break under Pages | M7 production subpath/browser tests | Precache all content, test scope/manifest/hash routes, show readiness only when verified. |
| Word prompts or vectors are wrong/licensing incomplete | M6 per-entry editorial and attribution audit | Pin source and preserve notices; do not publish unverified metadata or assets. |
| Device evidence is unavailable | M1/Q-002 | Continue independent software tasks; keep hardware gate unverified and release blocked. |
| Scope grows into a general learning/sync platform | Every handoff | Apply out-of-scope list; propose later work in TODO rather than adding it to v0.1. |

## Changing a decision

Record the trigger/evidence, affected requirement IDs, chosen alternative, migration impact, and validation. Material behavior or scope changes go to `questions for astra.md` for owner/Astra resolution. Reversible implementation details within a contract can be chosen by the assigned agent and documented in its handoff.
