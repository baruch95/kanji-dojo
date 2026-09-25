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
