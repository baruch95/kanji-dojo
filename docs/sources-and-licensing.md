# Primary sources and licensing plan

Sources inspected during planning on 2026-09-25. References document upstream facts; our product policies, thresholds, state machine, and architecture are project decisions. M1 now includes one pinned KanjiVG SVG and its upstream license; exact revision, checksums, and transformations are in [`data/sources/kanjivg/NOTICE.md`](../data/sources/kanjivg/NOTICE.md). Recheck versions and license files as more dependencies/assets are added.

| Source | What was verified | Implementation consequence |
| --- | --- | --- |
| [KanjiVG project](https://kanjivg.tagaini.net/) | Ordered vector stroke data; credited to Ulrich Apel; stated CC BY-SA 3.0 license | Selected vector source; pin snapshot and preserve exact source notices |
| [KanjiVG SVG format](https://kanjivg.tagaini.net/svg-format.html) | StrokePaths ordering, individual paths and stroke IDs; separate stroke-number display group | Build-time adapter extracts geometry, not number-label text |
| [CC BY-SA 3.0 deed](https://creativecommons.org/licenses/by-sa/3.0/) | Attribution, change indication, and share-alike conditions for adapted material | Attribute derived geometry and distribute its license information |
| [ts-fsrs package documentation](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md) | TypeScript scheduler, card/rating operations, configuration and logging | Use wrapper instead of custom interval math; pin version in M4 |
| [ts-fsrs license](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE) | MIT license in the inspected upstream repository | Preserve selected-version copyright/license notices |
| [FSRS parameter reference](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/FSRSParameters.html) | Short-term steps bypassed when disabled | Verify our immediate-practice policy against installed release |
| [FSRS card reference](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/Card.html) | Required/optional fields and date values; field deprecations | Versioned lossless card/log codec based on installed version |
| [W3C Pointer Events](https://www.w3.org/TR/pointerevents/) | Pointer capture/cancellation and touch-action behavior | Feature-detect optional APIs; isolate writing-surface gestures |
| [IndexedDB guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) | Schema upgrades, transaction completion/abort, lifecycle | Atomic grade commits and explicit recovery tests |
| [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) | Quota, eviction, and persistence behavior | Do not promise permanent local retention |
| [Vite static deployment](https://vite.dev/guide/static-deploy.html) | GitHub Pages base-path requirements | Root and subpath artifacts both tested |
| [Vite PWA static assets](https://vite-pwa-org.netlify.app/guide/static-assets) | Asset inclusion and precache configuration | Verify all essential content is cached |
| [Vite PWA update prompts](https://vite-pwa-org.netlify.app/guide/prompt-for-update) | Prompt-driven refresh lifecycle | Defer updates until safe session boundary |

## Required dataset notice when assets are added

Create `data/sources/kanjivg/NOTICE.md` plus the upstream license/notice files and a distributed notice reachable from Settings → About/data sources. Include:

- Dataset title and credited creator(s), preserving each imported source's copyright notice.
- Exact source URL, pinned commit/release, source filenames/checksums, and import date.
- Link to CC BY-SA 3.0 and a distributed copy/reference as required by the selected asset's license.
- A clear change statement: selected subset; extracted SVG paths; normalized/resampled geometry; metadata additions recorded separately.
- The applicable license for the derived geometry. Do not relabel these assets as exclusively covered by an eventual application-code license.

Keep originals/provenance and transformed output traceable. Render required attribution offline as well as online. An agent must inspect the selected snapshot and notices rather than treating this research table as the imported asset's license file.

## Readings, meanings, and software

The candidate curriculum contains independently drafted short cues requiring editorial verification. A proposed dictionary import needs its own exact source/version/license review. KanjiVG attribution alone does not cover a different dictionary's text. Record cue verification sources without copying unlicensed explanations or bulk data.

When packages are installed, inventory direct dependencies and distribution notices for their locked versions. Preserve MIT or other required notices as applicable. Audit any SVG parsing/geometry helper and the build/PWA dependencies before distribution. Build-time status alone is not a reason to ignore a license.

The owner has not selected a license for original application code (Q-003). This baseline adds no `LICENSE` granting rights over that code. State the status accurately and obtain the owner's decision before claiming an open-source license. Third-party attribution obligations remain independent of that decision.
