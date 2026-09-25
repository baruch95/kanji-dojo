# Kanji Dojo

A focused iPad writing trainer: see an English meaning and kana reading, then write the kanji from memory with Apple Pencil or a compatible stylus. The app teaches stroke order, direction, approximate shape, and proportions. It does not quiz readings or meanings.

## Current status

**Planning baseline — application not implemented.** This repository contains the specification and execution plan for v0.1. No dependencies, application code, dataset assets, automated tests, or deployment workflow have been installed or created. Local Git is initialized; no commit or remote is required to begin implementation.

The intended release is `0.1.0`: 50 beginner kanji, three-stage learning, FSRS reviews, local progress, and offline practice on a static GitHub Pages site. Screenshots and measured browser support will be added when there is a working application.

## Start here

1. Read [AGENTS.md](AGENTS.md) for implementation and Git rules.
2. Read [product specification](docs/product-spec.md) and [architecture](docs/architecture.md).
3. Take the first uncompleted milestone in [TODO.md](TODO.md), using [implementation plan](docs/implementation-plan.md) for its deliverables and acceptance gate.
4. Record questions and doubts in [questions for astra.md](questions%20for%20astra.md). Astra will review that file when asked to return to this project; no automatic monitoring is configured.

Suggested first implementation assignment:

> Read AGENTS.md and the planning documents. Implement M0 only, preserving the documentation. Run its acceptance checks, update TODO.md and CHANGELOG.md, and provide the required handoff. Record uncertainties in questions for astra.md. Do not commit, push, or deploy without the required approval.

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

**The commands below are the required interface for milestone M0, not commands that work yet.** M0 must create `package.json`, a lockfile, and the scripts before declaring setup complete.

Use TypeScript, React, Vite, and npm. M0 selects a currently supported Node LTS compatible with the selected dependencies, pins it in `.nvmrc` and `package.json`, and records exact package versions in `package-lock.json`. Do not depend on the planning machine's installed Node version.

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview -- --host 0.0.0.0
```

`test` must run once and exit; expose watch mode separately. Browser test setup and `npm run test:e2e` arrive in M1. Data generation/validation commands arrive in M2. See [test plan](docs/test-plan.md) for command availability by milestone. Ordinary drawing can be tested over LAN HTTP; PWA/device offline validation needs a trusted HTTPS origin.

## Architecture overview

React owns screens and accessible controls. A drawing adapter captures Pointer Events and renders ink. A pure TypeScript matcher compares ordered strokes with the known target. A separate learning state machine and FSRS adapter produce progress changes, saved atomically through an IndexedDB repository. Static content and mutable progress have separate schemas joined by stable IDs.

The first slice uses one kanji, **十**, to prove drawing and order checking before expanding the application. No backend, accounts, paid APIs, arbitrary OCR, or sync are included.

## Dataset and licensing

KanjiVG is the selected source of ordered vector strokes, subject to the pinned import and attribution process in [sources and licensing](docs/sources-and-licensing.md). Its stroke assets are CC BY-SA 3.0; transformed assets retain attribution and license information. No KanjiVG files are bundled yet. Meanings and kana prompts require separate editorial verification; KanjiVG is not a reading dictionary.

The project's own software license is not yet selected. Do not add a license on the owner's behalf or assume a dataset license determines the application code license.

## Browser and offline targets

Primary: real iPad Safari with Apple Pencil and a compatible stylus. Secondary: finger input and desktop development. Exact supported iPadOS versions must be recorded from device tests, not claimed from desktop emulation. iPhone and Android optimization are deferred.

After a successful online load and confirmed offline cache readiness, the installed/site app should reopen, load all 50 kanji, and save progress offline. IndexedDB holds progress; service-worker caches hold application assets. Browser data clearing or eviction can remove local progress. Device/browser storage is not cloud backup. See [offline specification](docs/deployment-and-offline.md).

## Build and GitHub Pages

M0 establishes a static build in `dist/`. M7 adds a manual Pages workflow and tests both `/` and `/kanji-dojo/`. The required subpath build command is:

```sh
VITE_BASE_PATH=/kanji-dojo/ npm run build
```

This environment variable must be explicitly read and validated by the future Vite configuration. Navigation uses hash routes. [Deployment instructions](docs/deployment-and-offline.md) define manifest paths, service-worker scope, verification, and owner approval before deployment. Do not enable automatic publishing on push.

## Limitations and future integration

Matching thresholds begin as engineering hypotheses and require real handwriting calibration. Only the curriculum's canonical stroke sequences are initially supported. Pressure and tilt are optional. Grading uses explicit Check and has no manual pass override, as confirmed by the owner.

Future Anki integration can map external note/card identifiers to stable local writing-card IDs and convert review logs through a dedicated adapter. Synchronization, conflict resolution, and Anki scheduling parity are explicitly outside v0.1.
