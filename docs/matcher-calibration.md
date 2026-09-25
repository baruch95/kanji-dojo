# M2 matcher calibration — evidence pending

The current `m2-provisional-2` matcher implements the owner-adjusted table in `handwriting-spec.md`. The owner reported that 50% was too strict in practice and 10% was usable, so the new default 50% uses the former 10% geometric limits. No threshold has been adjusted against a labeled handwriting set. The ten-character generated dataset is `calibration-10-v1`.

## Evidence available

- Synthetic canonical references: 10/10 accepted at accuracy 50. The designated reversed-first-stroke variants: 0/10 accepted at accuracy 0. 十 has additional count, reversal, swap, and degenerate tests at 0/50/100. A modest whole-character shift now passes at 50 while gross displacement still fails.
- The owner reports that correct and incorrect 十 attempts were judged accurately on an iPad Air M1 with MetaPen and latest iPadOS, without an exact version or counts. This is an informal device report, not a labeled dataset.
- Browser automation: twelve practice and developer-capture flows pass across Chromium and WebKit after the new matcher was connected. These are scripted pointer events, not natural handwriting.

## Required calibration before the M2 gate

Collect at least 100 independently labeled natural correct attempts across all ten characters from at least two writers and 50 deliberately incorrect attempts. Record writer/session identifiers without personal information, device/input description, label, rationale, and permission. Split by writer/session 60/40 before tuning. Measure held-out correct acceptance (target ≥90%) and incorrect acceptance (target ≤5%) at accuracy 50. Report per-character and per-error counts. Synthetic regressions alone cannot satisfy this gate.

The developer-only practice lab now lets a tester select any of the ten characters and export labeled local JSON. It is a visible-reference capture surface, so a human must label each attempt independently of the matcher verdict. No held-out rates or per-character real handwriting rates are claimed yet. Q-004 tracks the missing evidence.
