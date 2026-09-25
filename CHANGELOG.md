# Changelog

Meaningful product and architecture changes are recorded here. The first application release will be 0.1.0; no application release exists yet.

## Unreleased

### Changed

- The Check control becomes Continue, Start learning, Finish session, or Retry save in the same place after submission. Provisional matcher `m2-provisional-2` makes the 50% geometric limits comparable to the former 10% level following owner feedback; hard stroke rules remain fixed. Updating from the prior matcher safely ends an active session while preserving card progress.

### Added

- M3–M7 software, published on GitHub Pages from `7fbd78c`: Trace/Copy/Recall/Review with fading under-ink guide, FSRS Good/Again scheduling, atomic IndexedDB progress, session quotas/resume/settings, 50 pinned vector cards, and a scoped offline PWA with deferred updates. Calibration and editorial gates remain open.
- M2 software foundation: ten pinned KanjiVG references, deterministic generated dataset with runtime validation and CI comparison, full provisional strictness matcher, and synthetic regression tests. Real handwriting calibration remains open.
- Manual GitHub Pages workflow for the owner-requested M1 prototype publication; deployment remains distinct from the v0.1 release gates.
- M1 software slice: pinned KanjiVG 十 source and attribution, generated normalized stroke reference, visible-reference writing lab, pointer capture and ink controls, a basic order/direction/shape comparison, local fixture export, and Chromium/WebKit browser tests. Physical iPad validation remains open.
- M0 development foundation: pinned Node 24 LTS and exact dependencies, strict React/TypeScript/Vite shell, hash navigation, validated hosting base path, accessible Home/Session/Settings status screens, lint/unit/build scripts, and checks-only CI.
- Planning baseline for an iPad writing-only kanji trainer: product requirements, module/data contracts, deterministic learning and FSRS policy, handwriting validation and calibration, curriculum, offline deployment, and release gates.
- Milestone roadmap and implementation-agent instructions, including the shared `questions for astra.md` review queue and explicit approval rules for commits, pushes, and deployment.
- Preserved original project brief and primary technical/licensing references.
