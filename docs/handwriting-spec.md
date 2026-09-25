# Handwriting input and validation

The task is matching a known target, not recognizing arbitrary kanji. Reference lettering is not a pixel-perfect definition of acceptable handwriting. The baseline algorithm below is implementable but **not calibrated**; real examples determine whether it meets the release gate.

M1 implements a smaller `m1-basic-1` proof of concept for 十: exact count, degenerate marks, indexed order and direction checks, endpoints, length, and mean sampled trajectory. It does not implement the complete provisional threshold table or structural checks below; those belong to M2. M1 browser tests prove input flow and clear reversals/swaps, not natural handwriting accuracy.

## Pointer lifecycle

1. Apply `touch-action: none` and selection suppression to the writing surface before pointerdown. Keep normal touch/zoom behavior elsewhere; do not disable viewport zoom globally. Pointer Events defines gesture handling through [touch-action](https://www.w3.org/TR/pointerevents/).
2. Accept one active pointer. Default accepts pen or primary-button mouse; touch draws only with finger drawing enabled. Other pointers never append to the active stroke. Touch buttons always work.
3. On accepted pointerdown, capture its ID with `setPointerCapture`, snapshot square content bounds, begin a stroke, and append the first sample.
4. On matching pointermove, append chronological samples, using `getCoalescedEvents()` only when available, otherwise the event itself. De-duplicate identical sample/time events. Do not require pressure, tilt, hover, predicted events, or raw-update events.
5. On matching pointerup, append the final position and complete **one** stroke. A normal subsequent `lostpointercapture` must not delete that completed stroke.
6. On pointercancel, unexpected capture loss, hidden page, or resize/orientation change during a stroke, discard the active incomplete stroke, retain completed strokes, and show a neutral retry message. No recognition failure or FSRS action occurs.
7. If a captured pointer leaves the drawable bounds, cancel the active stroke; do not clamp outside samples into misleading edge lines. Pointer capture ensures cleanup still arrives.

If finger mode is enabled and a pen pointer starts while a touch stroke is active, cancel the incomplete touch stroke and let pen take over. Already completed accidental strokes require Undo/Clear. Some compatible styluses may be reported as touch; the app cannot distinguish them perfectly from palms. Test actual hardware and document limits instead of promising universal palm rejection. Multi-touch never draws two strokes simultaneously.

Coordinates: x=(clientX-left)/contentWidth; y=(clientY-top)/contentHeight, using the drawing content square, not the canvas backing pixels or border. Map rendering separately using devicePixelRatio. Use CSS-pixel bounds for input; redraw from stored normalized points after resize. Never rotate/scale the scoring data with device pixel ratio. The SVG underlay occupies precisely the same square.

Draw active ink on animation frames with rounded ends/joins; use a gentle display-only polyline/quadratic interpolation that does not change stroke endpoints. Undo removes the last completed stroke including its advisory feedback. Clear resets all completed strokes and pending advisory feedback. Neither creates scheduler events.

## Reference preparation

At build time, extract canonical ordered paths and approximate curves to normalized polylines with a maximum deviation target of 0.001 canvas units. Arc-length resample each stroke to 64 points including endpoints. Store samples, normalized length, original viewBox/path, and source/config version. Use the same resampler for captured polylines. Test the approximation against a few SVG measurements in a browser; production matcher must not use DOM path APIs.

Keep every stroke in the shared whole-character frame. Do **not** center/resize each stroke, independently normalize x/y bounds, rotate, reverse, reorder, or reflect the attempt to make it match. These operations can hide wrong structure, direction, and order. v0.1 permits natural position/scale variation through tolerances instead of unconstrained alignment.

## Proposed matching pipeline

1. Validate input/reference/config are finite and well-formed. Reference failures produce a processing error. Empty attempt is unsubmitted, not wrong.
2. Require exact completed stroke count on Check. Missing/extra strokes fail; do not silently merge or split strokes. Diagnostics can still highlight available mismatches, but never infer a pass through count mismatch.
3. Remove consecutive duplicate points for computation, preserving endpoints and original stroke count. A stroke with total length below 0.003 canvas units is a degenerate mark and fails; keep it visible for Undo. This constant must be reviewed against dot-like reference strokes during calibration.
4. Resample each user stroke to the same 64 arc-length positions. Compare stroke i only with reference i for acceptance.
5. Calculate start/end Euclidean distances, mean and p90 corresponding-sample distances (ordered trajectory), absolute log length ratio, and whole-character bounding-box edge error. All distances use the common normalized square.
6. Apply fixed hard gates below. Then require **each** stroke's soft metrics and whole-character structure to pass the strictness thresholds. A good average cannot hide one very wrong stroke.
7. Return a verdict plus diagnostics; preserve ink. Recognized order/direction errors have priority over a generic trajectory message. No percentage “quality score” is shown.

Bounding-box structure error is the maximum absolute difference of `(minX, minY, maxX, maxY)` over all ink versus all reference points. This constrains position, extent, and aspect without division by zero for one-stroke/thin kanji. Ordered stroke positions additionally constrain internal proportions. Long detours inflate arc length and p90 distance. Turns/hooks are evaluated by the trajectory; separate per-hook rules are optional only when fixtures demonstrate a need.

## Hard gates independent of accuracy

The following are initial engineering constants, not established pedagogical truth. Tune only with evidence and keep them independent of the accuracy slider.

- Exact stroke count and nondegenerate marks as above.
- Gross placement: any stroke start or end more than 0.35 from its expected point fails.
- Gross length: user/reference arc-length ratio outside `[0.15, 4]` fails.
- Direction: if both endpoint displacement magnitudes exceed 0.04 and their normalized dot product is below -0.25, fail. For bent/returning strokes, also compare forward ordered distance with the reference samples in reverse: fail when reversing improves mean distance by at least 0.04 and reverse distance is at most 0.65 × forward distance.
- Gross order: compute other reference-stroke distances for diagnosis only. If the correct-index mean distance is at least 0.06 and a different index fits at most 0.65 × that distance with an improvement of at least 0.04, fail with suspected wrong order. Never reorder strokes to make an attempt pass.

Similar adjacent strokes can be hard to distinguish geometrically. Do not claim perfect order recognition from these heuristics. Add swapped-stroke fixtures, especially for 二/三/川, and escalate any systematic gross-order escapes. Use the canonical reference sequence only; additional valid sequences need explicit dataset entries and tests in a future change.

## Soft thresholds: provisional owner-adjusted table

Set `s = accuracy/100`. Interpolate linearly between 0, 50, and 100. Lower threshold always means stricter. Do not round metrics before comparison; boundary equality passes. Clamp user setting to integer 0–100 at its input boundary; invalid persisted settings trigger validation/recovery rather than hidden coercion.

| Maximum permitted metric | 0% | 50% default | 100% |
| --- | --- | --- | --- |
| Start distance and end distance, each | 0.22 | 0.204 | 0.07 |
| Mean ordered sample distance | 0.16 | 0.148 | 0.05 |
| p90 ordered sample distance | 0.24 | 0.224 | 0.09 |
| Absolute log(user length / reference length) | 0.90 | 0.85 | 0.40 |
| Whole-character bounding-box edge error | 0.18 | 0.168 | 0.07 |

The 50% column in `m2-provisional-2` matches the former 10% interpolated limits after the owner reported that 50% rejected too much natural writing while 10% was usable. This is an owner-driven provisional adjustment, not measured calibration. For p90, sort 64 distances ascending and use zero-based index `ceil(0.9*64)-1`. This metric and all sampling choices belong to the versioned matcher config. Increasing strictness must never turn a failure into a pass for the same attempt. Even 100% tolerates some geometric variation; 0% never disables hard gates.

## Calibration and evidence

M1 supplies a developer-only fixture recorder that exports local JSON on explicit action; production has no handwriting upload/logging feature. Each fixture includes target ID, captured strokes, device/input information, dataset version, independent human pass/fail label, rationale, and author permission to include it in the repository. Avoid identifying metadata.

M2 initially targets 十、一、二、三、人、大、日、月、水、木 to cover lines, parallel strokes, bends, hooks, proportions, and intersections. Collect at least 100 natural accepted attempts across those 10 characters and at least two writers, ideally including the owner. Include 50 deliberately incorrect attempts covering reversed strokes, swapped order, missing/extra strokes, severe distortion, and displaced strokes. Synthetic perturbations supplement these; never label them real handwriting.

Split by writer/session into tuning and held-out evaluation sets before adjusting thresholds (target 60/40). Do not evaluate on the same attempts used to tune. Initial release targets at default accuracy: at least 90% acceptance of independently labeled natural correct held-out attempts and at most 5% acceptance of deliberately incorrect held-out attempts. Also require zero passes in the designated unambiguous hard-order/reversal/count regression suite at all accuracy settings. Report counts and rates by character and error category, not only totals. Small sample rates are engineering gates, not scientific accuracy claims.

M6 adds per-character synthetic correctness/perturbation tests and visual inspection for all 50; M8 adds at least one real accepted full attempt per character and repeats held-out evaluation after any matcher change. These are release evidence requirements. If hardware/participants are unavailable, record the missing evidence in the Astra file; do not manufacture fixtures or relax the gate silently.

If the simple matcher misses the gates, inspect false accepts/rejects, then propose a bounded change (e.g. constrained dynamic time warping or curated important-turn rules) with independent fixtures. Do not jump to machine learning/OCR or tune a special case without documenting its consequence for the other 49 kanji.
