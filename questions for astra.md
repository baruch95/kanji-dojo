# Questions for Astra

Implementation agents: write questions and doubts here. Astra will check this file when the owner later asks Astra to review the project. This file is not an automatic notification or scheduled task.

Preserve IDs and history. Append new entries with increasing IDs. Only Astra or the owner resolves an entry; an implementation agent may add evidence and a recommendation. Link the final answer to the decision log and affected specs. Do not treat silence as approval.

## Entry template

```text
## Q-NNN — Short question
Status: OPEN | ANSWERED | SUPERSEDED
Raised by / date:
Milestone / requirements / files:
Question and evidence:
Options and tradeoffs:
Recommendation / temporary assumption:
Blocking: no | affected task | release
Independent work that can continue:
Answer (Astra/owner, date):
Follow-through / changed documents / validation:
```

## Q-001 — Review checking and manual override preferences

Status: ANSWERED
Raised by / date: Astra planning pass, 2026-09-25
Milestone / requirements / files: M3; R-03, R-05; `docs/product-spec.md`
Question and evidence: Owner preferences requested during planning: explicit Check versus automatic submission, and whether an “Accept anyway” override is wanted.
Options and tradeoffs: Explicit Check supports editing without early answer feedback. Automatic grading is faster but can reveal stroke count and prevent correction. A manual override can mitigate false rejections but changes automatic grading and review logs.
Recommendation / temporary assumption: Explicit Check in every stage; no manual pass override in v0.1. Matcher calibration remains mandatory.
Blocking: no
Independent work that can continue: All baseline implementation. If override is requested, define audit/rating semantics before implementing it.
Answer (Astra/owner, date): Owner confirmed on 2026-09-25: “Tap Check to grade” and “Retry through learning; no manual pass in v0.1.”
Follow-through / changed documents / validation: Product specification, state machine, agent instructions, and test requirements use these choices. Decision D-02 records confirmation.

## Q-002 — Physical-device validation availability

Status: OPEN
Raised by / date: Astra planning pass, 2026-09-25
Milestone / requirements / files: M1/M8; R-06; `docs/test-plan.md`
Question and evidence: Owner reports testing the published 十 prototype on iPad Air M1 with MetaPen and "latest" iPadOS; correct and incorrect feedback was accurate. The exact iPadOS version, attempt counts, pointer/palm details, and recorded fixtures remain unknown. Desktop emulation cannot establish these behaviors.
Options and tradeoffs: Owner provides device test results/recordings, or a tester with suitable hardware runs the same protocol.
Recommendation / temporary assumption: Continue software work; record the exact OS version and protocol evidence before claiming full support.
Blocking: release; physical-input part of M1 remains unverified until evidence exists.
Independent work that can continue: Scaffold, import adapter, pure matcher, learning reducer, scheduler, and storage tests. Do not mark the hardware gate passed.
Answer (Astra/owner, date): Pending.
Follow-through / changed documents / validation: Add evidence to `docs/verification.md` when implemented.

## Q-003 — Application source-code license

Status: OPEN
Raised by / date: Astra planning pass, 2026-09-25
Milestone / requirements / files: M8; `docs/sources-and-licensing.md`
Question and evidence: No license for original application code was specified. Third-party data and packages have their own obligations.
Options and tradeoffs: Owner chooses a software license, or retains rights without granting an open-source license.
Recommendation / temporary assumption: Do not add a project LICENSE yet. Preserve all external notices independently. Obtain the owner's choice before representing the project as open source.
Blocking: no; blocks an unsupported open-source licensing claim, not local implementation.
Independent work that can continue: All implementation and third-party attribution work.
Answer (Astra/owner, date): Pending.
Follow-through / changed documents / validation: Update README and notices once the owner decides.

## Q-004 — M2 handwriting calibration evidence

Status: OPEN
Raised by / date: Codex M2 implementation, 2026-09-25
Milestone / requirements / files: M2.3; R-07; `docs/handwriting-spec.md`, `docs/matcher-calibration.md`
Question and evidence: The owner reports accurate correct/incorrect 十 feedback on iPad Air M1 with MetaPen, but no labeled recordings, counts, exact iPadOS version, second writer, or nine-character natural attempts are available. The required held-out calibration cannot be computed.
Options and tradeoffs: Collect the specified fixture set with the ten-character developer capture surface, or provide independently labeled compatible files from external sessions. Omitting the set leaves matcher thresholds uncalibrated.
Recommendation / temporary assumption: Keep `m2-provisional-1` thresholds unchanged; perform the writer/session split and held-out analysis once recordings are available. Do not mark M2 gate complete from synthetic tests.
Blocking: M2 calibration gate and release.
Independent work that can continue: Data conversion, schema validation, pure matcher tests, and downstream pure domain work using the provisional versioned contract.
Answer (Astra/owner, date): Pending.
Follow-through / changed documents / validation: Pending fixture collection and report.

## Q-005 — Fifty-card editorial review

Status: OPEN
Raised by / date: Codex M3–M7 implementation, 2026-09-25
Milestone / requirements / files: M6; R-02, R-14; `data/metadata.json`, `docs/dataset-spec.md`, `docs/dataset-review.md`
Question and evidence: The owner asked for implementation through M7. All 50 proposed characters and cues are available in the project candidate table, but that table explicitly says they are not a verified dictionary extract. A competent Japanese reader/owner review of ambiguous cues and selected readings is still required before a release claim.
Options and tradeoffs: Continue with the provisional candidate cues for development and request editorial sign-off before release, or replace individual cues after review with documented sources and regenerate the dataset. Claiming completed editorial review without evidence would misstate the M6 gate.
Recommendation / temporary assumption: Build and test all 50 reference paths now, label cues provisional, and hold the editorial release gate until a reviewer signs off. Keep IDs stable when cues change.
Blocking: M6 editorial gate and release claim; software implementation can continue.
Independent work that can continue: FSRS, persistence, sessions, 50-vector generation, PWA, and browser tests.
Answer (Astra/owner, date): Pending.
Follow-through / changed documents / validation: Pending editorial review record.
