# Kanji Dojo

A focused iPad writing trainer: see an English meaning and kana reading, then write the kanji from memory with Apple Pencil or a compatible stylus. The app teaches stroke order, direction, approximate shape, and proportions. It does not quiz readings or meanings.

## Current status

**M2 software foundation; calibration gate pending.** The app has a one-kanji 十 practice lab with visible reference, pointer drawing, Undo/Clear/Check, and a provisional full matcher. Ten characters now have generated reference data, but only 十 is shown in the practice UI. It does not save attempts or schedule reviews. The owner reports sensible correct/incorrect feedback on an iPad Air M1 with MetaPen; exact iPadOS version, counts, and recorded handwriting fixtures are pending. Learning, full content, progress storage, and offline support remain future milestones.

The intended release is `0.1.0`: 50 beginner kanji, three-stage learning, FSRS reviews, local progress, and offline practice on a static GitHub Pages site. Screenshots and measured browser support will be added when there is a working application.

## Start here

1. Read [AGENTS.md](AGENTS.md) for implementation and Git rules.
2. Read [product specification](docs/product-spec.md) and [architecture](docs/architecture.md).
3. Take the first uncompleted milestone in [TODO.md](TODO.md), using [implementation plan](docs/implementation-plan.md) for its deliverables and acceptance gate.
4. Record questions and doubts in [questions for astra.md](questions%20for%20astra.md). Astra will review that file when asked to return to this project; no automatic monitoring is configured.

Suggested next validation assignment:

> Collect labeled natural handwriting for the M2 calibration set following `docs/handwriting-spec.md`; record the exact iPadOS version and test counts. Q-002 and Q-004 remain open. Do not commit, push, or deploy without the required approval.

## Documentation map

| Document | Purpose |
| --- | --- |
| [Product specification](docs/product-spec.md) | Scope, user flows, screens, defaults, requirement IDs |
| [Architecture](docs/architecture.md) | Module ownership, dependency rules, technical choices |
| [Data contracts](docs/data-contracts.md) | IDs, records, interfaces, transactions, migrations |
| [Learning and scheduling](docs/learning-and-scheduling.md) | Exact transitions, rating policy, session selection |
| [Handwriting specification](docs/handwriting-spec.md) | Pointer handling, geometry, strictness, calibration |
| [Dataset specification](docs/dataset-spec.md) | Candidate curriculum, import process, editorial QA |
| [Implementation plan](docs/implementation-plan.md) | Small tasks, dependencies, integration and handoff gates |
| [Test and acceptance plan](docs/test-plan.md) | Automated checks, device checks, release evidence |
| [Deployment and offline](docs/deployment-and-offline.md) | Base paths, PWA lifecycle, Pages deployment |
| [Decision log](docs/decisions.md) | Accepted defaults, provisional choices, unresolved risks |
| [Sources and licensing](docs/sources-and-licensing.md) | Primary references and required attribution |
| [Original brief](docs/original-brief.md) | Preserved user requirements |

## Installation and development

Use Node **24.21.0 LTS** (`.nvmrc`), npm, and the repository lockfile.

Package versions are exact in `package.json` and `package-lock.json`. The development machine may have another Node version; use the pinned runtime for reproducible checks.

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run typecheck
npm run lint
npm run test
npm run data:generate
npm run data:validate
npm run build
npm run preview -- --host 0.0.0.0
npx playwright install chromium webkit
npm run test:e2e
```

`test` runs once and exits; `npm run test:watch` is separate. `test:e2e` runs Chromium and WebKit browser flows after their binaries are installed. The developer-only fixture export is inside the practice lab when running `npm run dev`; it never uploads handwriting. `data:generate` uses only the pinned local SVGs and curated metadata; `data:validate` compares its deterministic result with the checked-in JSON. The older 十 generator remains for M1 reproducibility. Ordinary drawing can be tested over LAN HTTP; PWA/device offline validation needs a trusted HTTPS origin.

## Architecture overview

React owns screens and accessible controls. A drawing adapter captures Pointer Events and renders ink. A pure TypeScript matcher compares ordered strokes with the known target. A separate learning state machine and FSRS adapter produce progress changes, saved atomically through an IndexedDB repository. Static content and mutable progress have separate schemas joined by stable IDs.

The practice screen uses **十**; the data and matcher foundation covers the ten M2 calibration characters. No backend, accounts, paid APIs, arbitrary OCR, or sync are included.

## Dataset and licensing

KanjiVG is the selected source of ordered vector strokes, subject to the pinned import and attribution process in [sources and licensing](docs/sources-and-licensing.md). Its stroke assets are CC BY-SA 3.0; transformed assets retain attribution and license information. The M2 subset includes ten pinned SVGs and [their notice](data/sources/kanjivg/NOTICE.md). Attribution is available under Settings → About data sources. Meaning and kana cues remain provisional until editorial review; KanjiVG is not a reading dictionary.

The project's own software license is not yet selected. Do not add a license on the owner's behalf or assume a dataset license determines the application code license.

## Browser and offline targets

Primary: real iPad Safari with Apple Pencil and a compatible stylus. Secondary: finger input and desktop development. Exact supported iPadOS versions must be recorded from device tests, not claimed from desktop emulation. iPhone and Android optimization are deferred.

After a successful online load and confirmed offline cache readiness, the installed/site app should reopen, load all 50 kanji, and save progress offline. IndexedDB holds progress; service-worker caches hold application assets. Browser data clearing or eviction can remove local progress. Device/browser storage is not cloud backup. See [offline specification](docs/deployment-and-offline.md).

## Build and GitHub Pages

M0 established a static build in `dist/`. The owner requested early publication of the M1 prototype, so `.github/workflows/deploy-pages.yml` is a manually dispatched Pages workflow. The repository subpath build command is:

```sh
VITE_BASE_PATH=/kanji-dojo/ npm run build
```

`VITE_BASE_PATH` is validated by Vite configuration. Navigation uses hash routes. To test a subpath build locally, mount the contents of `dist/` at that path on a static server; Vite preview serves `dist/` at its root. [Deployment instructions](docs/deployment-and-offline.md) distinguish this early prototype from the future PWA and full release verification. The Pages workflow has no automatic push trigger.

## Limitations and future integration

Matching thresholds begin as engineering hypotheses and require real handwriting calibration. Only the curriculum's canonical stroke sequences are initially supported. Pressure and tilt are optional. Grading uses explicit Check and has no manual pass override, as confirmed by the owner.

Future Anki integration can map external note/card identifiers to stable local writing-card IDs and convert review logs through a dedicated adapter. Synchronization, conflict resolution, and Anki scheduling parity are explicitly outside v0.1.
