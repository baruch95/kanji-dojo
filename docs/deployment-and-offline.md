# Static hosting and offline specification

The owner published the M2 prototype on 2026-09-25. M3–M7 PWA and offline software are implemented locally, with a **manual** GitHub Pages workflow prepared. The live Pages revision is still M2 until a later approved commit, push, and deployment. The M8 physical-device, editorial, and handwriting gates remain open.

## Base path and navigation

Read `VITE_BASE_PATH` in `vite.config.ts`, validate a same-origin path beginning and ending with `/`, and default to `/` for local development. Production may use `/kanji-dojo/` or the actual repository name; do not hardcode that example as the permanent destination. Reject URLs, query strings, hash fragments, and ambiguous traversal segments in this config.

Use Vite imports for bundled assets and `import.meta.env.BASE_URL` for necessary runtime/public asset URLs. Never write leading `/assets/...` for repository-hosted resources. The [Vite static deployment guide](https://vite.dev/guide/static-deploy.html) distinguishes root and repository base paths; build with the destination's actual path.

Hash routes: `#/`, `#/session`, `#/settings`; unknown hash falls back to Home. The document path stays `/repository-name/`, so refresh does not require server rewrites or a custom 404 trick. A session URL alone does not reveal/start a card; it resumes an existing session or returns Home.

Manifest scope and start URL resolve to the base path. Icons are local bundled files and have correct base-aware URLs. The service worker is served inside that path and controls only that scope. Confirm these values in the generated build, not only in source configuration.

## Offline lifecycle

Use `vite-plugin-pwa` with prompt-based registration and generated precaching. Bundle every required application chunk, CSS, icon, dataset, reference, attribution text, and font (prefer system fonts). No runtime CDN dependency and no lazy remote kanji fetch. Verify all generated dataset/chunk sizes are within the configured precache limits; adjust intentionally if necessary.

Show “Available offline” only after the worker is activated, controlling the app, and required precache installation succeeded. First visit still needs internet. A failed cache install keeps the indicator unavailable and offers a later retry; do not promise that loading Home alone cached everything. Actual offline cold-open tests are required.

Keep mutable progress in IndexedDB, never in Cache Storage. Use cache names scoped to app/base/build and clean only obsolete caches belonging to this app. Installing a new worker must not clear progress. Settings reset must not unregister workers or evict the curriculum.

Request persistence via feature-detected StorageManager API only if useful; a refusal is not an error that blocks practice. Browser persistence is not guaranteed. WebKit describes quota/eviction behavior and persistence support in its [storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/). The UI should say local progress can disappear if site data is cleared or evicted; it must not promise backup or retention duration.

## Updates

Use a prompt update strategy, not automatic refresh. [Vite PWA's update guidance](https://vite-pwa-org.netlify.app/guide/prompt-for-update) provides the underlying registration flow; the application owns when it is safe to offer activation.

An active session (including suspended/resumable), pending save, or active ink prevents update activation. Show a quiet “Update available after this session” status, then offer update on Home after ending/completing the session. User acceptance triggers activation/reload. Do not lose current writing through `skipWaiting` or a forced refresh.

Caches must keep the still-running version usable until the safe update. Test old-page/new-worker interactions. On startup, validate app/storage/content versions; incompatible session dataset/matcher versions safely end that queue while preserving progress. Unknown newer DB versions require an update/recovery message. Never delete storage to make an old deployment work.

## Local production verification

1. Build for `/` and serve `dist/` through Vite preview or another correctly configured static server. Test hash refresh, every screen, and service-worker readiness.
2. Rebuild for `/kanji-dojo/` and serve at that prefix. Verify document, JS, CSS, data, icons, manifest, worker script, and worker scope have no 404s or root-relative leaks.
3. For each build, load online and wait for controlled readiness; close the page; block the network and reopen on the same origin/profile. Complete and save a session; reopen again and check progress.
4. Test update from a previous build with active input, then after a completed session. Verify storage and correct caching across update.
5. Record actual origin, base, build ID, browser, and outcomes. Clear only the test profile between independent cases.

Service workers require a secure context (localhost is suitable on the development machine). Plain HTTP to a LAN IP on iPad is insufficient for PWA evidence. Use a trusted HTTPS staging origin or an owner-approved test deployment. Do not publish merely to obtain a test URL without permission.

## Prepared GitHub Actions workflow

The workflow at `.github/workflows/deploy-pages.yml` uses `workflow_dispatch` only. It checks out the selected revision, sets up the pinned Node version, installs with `npm ci`, runs typecheck/lint/unit/data/browser/PWA gates, builds for `/kanji-dojo/`, uploads `dist/`, and deploys through pinned GitHub Actions. The PWA gate builds and tests `/` and `/kanji-dojo/` locally, including offline reopen and a deferred-update scenario. No push-triggered publish job exists.

Set least required workflow/job permissions: build checkout read access; deployment `pages: write` and `id-token: write`. Use the `github-pages` environment and suitable concurrency to avoid overlapping publishes. Configure the exact repository base explicitly, including `/` for user/organization root repositories or custom-domain deployment. Do not infer an unknown remote/owner from the local folder name.

## Operator runbook (after approval)

1. Confirm all release gates and the actual repository/branch/destination. Build and inspect the intended artifact locally.
2. Ask separately for any missing commit and push approval; before push show branch, exact commits, and destination remote. Do not create a remote or GitHub repository without authorization.
3. Obtain explicit approval to enable Pages/configure its environment and deploy. Then set Pages source to GitHub Actions and dispatch the prepared workflow for the approved revision.
4. Inspect the deployment result and visit its exact URL. Run live base-path/hash/manifest/worker checks and actual-device offline test. Record the deployed commit/build and URL in release evidence.
5. If broken, propose redeploying a known compatible build. Do not rewrite Git history or erase browser data. A rollback that cannot read newer local schema is unsafe until compatibility is established.

No deployment approval is implicit in permission to prepare this runbook or workflow.
