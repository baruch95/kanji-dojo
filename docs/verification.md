# Verification record

## M0 — 2026-09-25

- Runtime: Node 24.21.0 LTS via `npm exec --package=node@24.21.0`; npm 11.19.0 on the development machine.
- `npm ci`: passed from the committed lockfile; npm reported no vulnerabilities.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 2 tests in 1 file. Tests cover unavailable-session/unknown-route behavior and base-path rejection cases.
- `npm run build`: passed for `/` under Node 24.21.0.
- Root preview: HTML and bundled JavaScript returned HTTP 200 from Vite preview; HTML referenced root assets.
- `VITE_BASE_PATH=/kanji-dojo/ npm run build`: passed. Mounted `dist/` at `/kanji-dojo/` on a local static server; HTML, JavaScript, and CSS returned HTTP 200 with correct content types. In-app browser visually showed the Home shell at this path with navigation and a clear unavailable-session message.
- Physical iPad/Pencil testing: not run; required for M1 and release (Q-002).
- Browser flow automation, data validation, offline/PWA, and release checks: unavailable or outside M0.

Vite preview serves `dist/` at `/` even when the production build targets a repository subpath. Subpath verification therefore used a static server with the artifact mounted at the intended path.

## M1 software slice — 2026-09-25

- Source: KanjiVG `05341.svg` pinned to commit `422b5538595676da918c288a4230cb5e22a1ee7e`; source and license SHA-256 values are in `data/sources/kanjivg/NOTICE.md`. Generator verifies the SVG hash before producing 64 samples per stroke.
- Runtime: clean `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` passed under Node 24.21.0. Unit suite: 8 tests in 3 files.
- Browser: `npm run test:e2e` passed 10 cases across Playwright Chromium (Chrome for Testing 153.0.8010.12) and WebKit 26.6 on macOS. Cases covered accepted approximate strokes, Undo/Clear, reversed direction, swapped order, off-canvas cancellation, SVG/generated length agreement, and primary-control placement at 1024 × 768 and 768 × 1024 viewports.
- Visual inspection: desktop in-app browser at 1280 × 720 showed the reference, square canvas, and primary controls. This is layout inspection, not iPad evidence.
- Reproducibility and hosting: re-running `node scripts/generate-ten.mjs` yielded the same generated-file SHA-256, `d993bc6ad3dedc38a02a18384d81f2bb34f6398741246f52ffd7e60c879f9272`. `VITE_BASE_PATH=/kanji-dojo/ npm run build` passed and emitted subpath JS/CSS and source-license URLs.
- Fixture capture: developer-only local JSON export implemented; no real handwriting fixtures captured or committed.
- Physical iPad/Apple Pencil/compatible-stylus validation: **not run**. Exact hardware, pointer behavior, ink latency, Check timing, and natural-attempt quality remain unknown (Q-002). The M1 hardware gate stays open.
- Matcher: `m1-basic-1` is a proof of concept for 十. M2 calibration, complete hard/soft checks, and held-out accuracy gates are not yet met.

## M2 software foundation — 2026-09-25

- Owner device report: iPad Air M1, MetaPen, latest iPadOS (exact version not supplied). The owner reports that correct and incorrect attempts received accurate feedback. Number of attempts, exact test cases, latency, palm behavior, and exported recordings were not supplied. This is direct owner feedback, not a completed physical protocol or measured calibration set; Q-002 remains open.
- Dataset: ten canonical KanjiVG SVGs at revision `422b5538595676da918c288a4230cb5e22a1ee7e` with pinned SHA-256 hashes. `npm run data:generate` and `npm run data:validate` passed, including a checked-in JSON comparison. Metadata is provisional pending M6 editorial review.
- Matcher: `m2-provisional-1` implements hard count/order/direction/length gates, per-stroke geometric limits, structure, and monotonic 0–100 strictness. Tests use generated geometry and synthetic perturbations; no natural ten-character handwriting set is available. See `matcher-calibration.md` and Q-004.
- Checks: `npm run typecheck`, `npm run lint`, `npm run test` (15 tests in 5 files), `npm run build`, and `npm run data:validate` passed. `npm run test:e2e` passed 12 Chromium/WebKit cases, including developer selection/gallery behavior, after local-server sandbox escalation. Initial sandbox run failed to bind port 4175 (`EPERM`), then the approved local run passed.
- Physical ten-character calibration, independent writer split, held-out acceptance/rejection rates, and per-character inspection: not run. M2 gate remains open.

## M3–M7 local implementation — 2026-09-25

- M3 (R-03–R-05, R-08, R-12): Trace guide is under the ink at 0.38 opacity; Copy guide is under the ink at 0.13; Recall and pre-submission Review have no guide or target glyph. Result feedback appears only after Check. Learning and review reducer tests cover failed Trace/Copy/Recall, review Again, and no extra Good on lapse graduation. Browser tests cover underlay opacity, recall DOM absence, failure return to Trace, and reload of a committed result.
- M4 (R-05, R-10): Pinned `ts-fsrs@5.4.2` with short-term scheduling and fuzz disabled. IndexedDB v1 stores metadata, settings, progress, sessions, attempt events, and operation receipts in atomic transactions. Tests cover one Good on new graduation, one Again on failed review, unchanged Again schedule after relearning, duplicate receipt, stale two-connection grade conflict, transaction abort, and reset. A blocked upgrade now asks the user to close other tabs. A browser test confirms IndexedDB reload recovery; no migration from a prior deployed schema was needed because this is schema v1.
- M5 (R-09, R-13): Deterministic unfinished/due/new queue, due boundary equality, distinct quotas, active-session resume/end, settings snapshot, and confirmed reset are implemented. Untouched new queue entries do not create progress until presentation.
- M6 (R-02, R-14): Exactly 50 unique pinned KanjiVG sources and SHA-256 hashes generate 216 ordered strokes in `curriculum-v1.json`; the 10-card calibration dataset remains reproducible. Generator validation and canonical matcher tests pass for all 50. Cue metadata, animation-by-animation inspection, variants, and natural writing attempts lack editorial evidence; Q-005 remains open. See `dataset-review.md`. The M6 editorial gate is **not** complete.
- M7 (R-01, R-11): Local icons, scoped manifest/worker, offline readiness, and deferred update activation are implemented. `npm run test:pwa` passed: root and `/kanji-dojo/` cold reopening, offline grade persistence across reloads, and a two-build update held during active ink/session then activated with progress intact. This is local Chromium evidence, not live Pages or iPad evidence.
- Final local checks ran under the pinned Node 24.21.0 runtime (from the local npm cache): `npm run typecheck`, `npm run lint`, `npm run test` (25 tests in 8 files), `npm run data:generate`, `npm run data:validate`, `npm run test:e2e` (16 Chromium/WebKit cases), `npm run test:pwa`, `npm run build`, and `git diff --check` passed. The production build precached 11 entries (~742 KiB). A minified JS chunk is ~720 KiB and triggers Vite's 500 KiB advisory; it is within the intentional 4 MiB precache limit. A clean `npm ci` was not rerun for this work because npm registry access was unavailable in the sandbox; the existing lockfile installation was used.
- Desktop visual inspection at 1024 × 768 and 768 × 1024 showed the guide below ink and the writing area plus Check button within the viewport. No new physical iPad/Pencil/MetaPen test was run for M3–M7. Q-002 remains open. Real handwriting calibration is deferred by the owner until after M7 (D-18, Q-004). The M2 calibration and M8 release gates remain open.
- Current GitHub Pages site remains at the earlier M2 revision. These M3–M7 changes are local and uncommitted; no publication or release claim is implied.
