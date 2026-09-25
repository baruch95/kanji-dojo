# KanjiVG source notice — 50-card curriculum

The 50 SVG files in this directory are from **KanjiVG**, credited in their source headers to Ulrich Apel (copyright 2009/2010/2011). They are licensed under [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The upstream `COPYING` text is included in this directory. Project site: https://kanjivg.tagaini.net/.

- Pinned revision: `422b5538595676da918c288a4230cb5e22a1ee7e`
- Source URL pattern: `https://github.com/KanjiVG/kanjivg/blob/422b5538595676da918c288a4230cb5e22a1ee7e/kanji/<filename>`
- Imported: 2026-09-25
- SHA-256 of each SVG: pinned in `data/source-hashes.json` and copied into generated provenance records. For `05341.svg`: `3a949bec637d519d51c89d2720cc4db11d7e645f4573b93aee8ecf0e316e9daa`.
- SHA-256 of `COPYING`: `d255e07978fd16ddfec38bc59dc9d857b885dd44ddbf4e79baf207d30746bdcc`
- Changes: selected only canonical ordered `StrokePaths`, excluded stroke-number labels, extracted `d` values, normalized and sampled paths in their common 109 × 109 coordinate frame. The resulting geometry in `src/data/generated/curriculum-v1.json`, the calibration subset, and legacy `ten.ts` remains under CC BY-SA 3.0.

The English and kana cues are separately drafted provisional metadata; they are not part of the KanjiVG SVG and need editorial review in M6. The original application code has no selected license yet.
