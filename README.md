# Kanji Dojo

A focused iPad writing trainer: see an English meaning and kana reading, then write the kanji from memory with Apple Pencil or a compatible stylus. The app teaches stroke order, direction, approximate shape, and proportions. It does not quiz readings or meanings.

## Current status

**M3–M7 software published; release gates remain open.** The app now offers 50 writing cards, guided Trace, faint-guide Copy, blank Recall and Review, FSRS scheduling, IndexedDB progress, intentional sessions, and an offline-capable Pages build. The kanji guide sits beneath the ink and fades by stage. The M3–M7 app is live at [GitHub Pages](https://baruch95.github.io/kanji-dojo/) from commit `7fbd78c`. The 50 meaning/kana cues await editorial review (Q-005), and real handwriting calibration was deferred by the owner until after M7 (Q-004). The owner tested the earlier 十 lab on iPad Air M1 with MetaPen; the new session/PWA flows still need device testing (Q-002).

The intended release is `0.1.0`. Current matcher thresholds are provisional, and a browser passing automated checks is not physical iPad evidence.

## Start here

1. Read [AGENTS.md](AGENTS.md) for implementation and Git rules.
2. Read [product specification](docs/product-spec.md) and [architecture](docs/architecture.md).
3. Take the first uncompleted milestone in [TODO.md](TODO.md), using [implementation plan](docs/implementation-plan.md) for its deliverables and acceptance gate.
4. Record questions and doubts in [questions for astra.md](questions%20for%20astra.md). Astra will review that file when asked to return to this project; no automatic monitoring is configured.

Suggested next validation assignment:

> Review all 50 meaning/kana cues and stroke animations with a competent Japanese reader using `docs/dataset-review.md`, then collect labeled natural handwriting for calibration. Record the exact iPadOS version and device test counts. Q-002, Q-004, and Q-005 remain open. Do not commit, push, or deploy without the required approval.

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
npm run test:pwa
```

`test` runs once and exits; `npm run test:watch` is separate. `test:e2e` runs Chromium and WebKit browser flows after their binaries are installed. The developer-only fixture export is inside the practice lab when running `npm run dev`; it never uploads handwriting. `data:generate` uses only the pinned local SVGs and curated metadata; `data:validate` compares its deterministic result with the checked-in JSON. The older 十 generator remains for M1 reproducibility. Ordinary drawing can be tested over LAN HTTP; PWA/device offline validation needs a trusted HTTPS origin.

## Architecture overview

React owns screens and accessible controls. A drawing adapter captures Pointer Events and renders ink. A pure TypeScript matcher compares ordered strokes with the known target. A separate learning state machine and FSRS adapter produce progress changes, saved atomically through an IndexedDB repository. Static content and mutable progress have separate schemas joined by stable IDs.

The primary session screen uses all 50 generated characters; the developer lab retains the earlier 十 fixture tools. No backend, accounts, paid APIs, arbitrary OCR, or sync are included.

## Dataset and licensing

KanjiVG is the selected source of ordered vector strokes, subject to the pinned import and attribution process in [sources and licensing](docs/sources-and-licensing.md). Its stroke assets are CC BY-SA 3.0; transformed assets retain attribution and license information. The 50-card set includes 50 pinned SVGs and [their notice](data/sources/kanjivg/NOTICE.md). Attribution is available under Settings → About data sources. Meaning and kana cues remain provisional until editorial review; KanjiVG is not a reading dictionary.

The project's own software license is not yet selected. Do not add a license on the owner's behalf or assume a dataset license determines the application code license.

## Browser and offline targets

Primary: real iPad Safari with Apple Pencil and a compatible stylus. Secondary: finger input and desktop development. Exact supported iPadOS versions must be recorded from device tests, not claimed from desktop emulation. iPhone and Android optimization are deferred.

After a successful online load and confirmed offline cache readiness, the installed/site app should reopen, load all 50 kanji, and save progress offline. IndexedDB holds progress; service-worker caches hold application assets. Browser data clearing or eviction can remove local progress. Device/browser storage is not cloud backup. See [offline specification](docs/deployment-and-offline.md).

## Build and GitHub Pages

M0 established a static build in `dist/`. `.github/workflows/deploy-pages.yml` is a manually dispatched Pages workflow with M3–M7 checks. The M3–M7 revision was published on 2026-09-25 after the workflow gates passed. The repository subpath build command is:

```sh
VITE_BASE_PATH=/kanji-dojo/ npm run build
```

`VITE_BASE_PATH` is validated by Vite configuration. Navigation uses hash routes. To test a subpath build locally, mount the contents of `dist/` at that path on a static server; Vite preview serves `dist/` at its root. [Deployment instructions](docs/deployment-and-offline.md) cover the PWA and remaining release verification. The Pages workflow has no automatic push trigger.

## Limitations and future integration

Matching thresholds begin as engineering hypotheses and require real handwriting calibration. Only the curriculum's canonical stroke sequences are initially supported. Pressure and tilt are optional. Grading uses explicit Check and has no manual pass override, as confirmed by the owner.

Future Anki integration can map external note/card identifiers to stable local writing-card IDs and convert review logs through a dedicated adapter. Synchronization, conflict resolution, and Anki scheduling parity are explicitly outside v0.1.
