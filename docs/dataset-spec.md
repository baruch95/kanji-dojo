# Dataset and curriculum specification

## Content ownership

Use a pinned KanjiVG snapshot for vector strokes. Keep curated meaning/reading prompts separate from those vectors, and keep all mutable study progress separate from both. The app loads one validated internal dataset; it never fetches upstream SVGs during a session.

The canonical IDs and data shape are in [data contracts](data-contracts.md). One character has one writing card in v0.1. Updating its meaning or reference paths does not create a new card ID or reset its schedule. Bump dataset version and invalidate active-session version snapshots safely.

## Candidate 50-card curriculum

The following is the proposed introduction order and editorial starting point, **not a verified dictionary extract**. M6 must verify every cue/reading and record its source/reviewer. An owner or competent Japanese reader must review ambiguous cues. These single reading cues are intentionally selective, not exhaustive pronunciation claims. Extra kana readings may be stored, but show at most two selected readings in the prompt. Never add romanization or a vocabulary quiz.

| Order | Kanji | Proposed meaning cue | Proposed kana cue |
| --- | --- | --- | --- |
| 1 | 一 | one | いち |
| 2 | 二 | two | に |
| 3 | 三 | three | さん |
| 4 | 四 | four | よん |
| 5 | 五 | five | ご |
| 6 | 六 | six | ろく |
| 7 | 七 | seven | なな |
| 8 | 八 | eight | はち |
| 9 | 九 | nine | きゅう |
| 10 | 十 | ten | じゅう |
| 11 | 百 | hundred | ひゃく |
| 12 | 千 | thousand | せん |
| 13 | 日 | sun; day | ひ |
| 14 | 月 | moon; month | つき |
| 15 | 火 | fire | ひ |
| 16 | 水 | water | みず |
| 17 | 木 | tree; wood | き |
| 18 | 金 | gold; metal | きん |
| 19 | 土 | earth; soil | つち |
| 20 | 山 | mountain | やま |
| 21 | 川 | river | かわ |
| 22 | 田 | rice field | た |
| 23 | 人 | person | ひと |
| 24 | 口 | mouth | くち |
| 25 | 目 | eye | め |
| 26 | 耳 | ear | みみ |
| 27 | 手 | hand | て |
| 28 | 足 | foot; leg | あし |
| 29 | 力 | power; strength | ちから |
| 30 | 女 | woman | おんな |
| 31 | 男 | man | おとこ |
| 32 | 子 | child | こ |
| 33 | 大 | large | だい |
| 34 | 小 | small | しょう |
| 35 | 中 | inside; middle | なか |
| 36 | 上 | above; up | うえ |
| 37 | 下 | below; down | した |
| 38 | 左 | left | ひだり |
| 39 | 右 | right | みぎ |
| 40 | 本 | book; origin | ほん |
| 41 | 学 | study; learning | がく |
| 42 | 生 | life; birth | せい |
| 43 | 先 | ahead; previous | さき |
| 44 | 年 | year | とし |
| 45 | 白 | white | しろ |
| 46 | 赤 | red | あか |
| 47 | 青 | blue | あお |
| 48 | 天 | sky; heaven | てん |
| 49 | 雨 | rain | あめ |
| 50 | 林 | grove | はやし |

Validate uniqueness of characters, IDs, and curriculum positions. Ten is the first technical slice because its two strokes expose order and direction errors; that does not change its final curriculum order. Do not store guessed stroke counts in this table: derive counts from the reviewed canonical source and validate them.

## Reproducible import

1. Choose an explicit upstream revision/tag and record the immutable commit hash, download URL, and file checksums. Keep only required canonical source files plus upstream notices under `data/sources/kanjivg/`. No runtime downloads and no rolling `latest` input.
2. Curated `data/metadata.json` joins character/ID to prompts, curriculum order, verification notes, and source filename. Fail on missing joins or duplicates.
3. Parse XML at build time with external entity/network resolution disabled. Extract only the `StrokePaths` group's path data in documented order. Ignore stroke-number text as geometry. Validate contiguous stroke IDs and matching character. KanjiVG describes these conventions in its [SVG format specification](https://kanjivg.tagaini.net/svg-format.html).
4. Whitelist supported path commands and validate numeric operands. Reject unsupported transforms, multiple subpaths, unexpected elements, or out-of-frame geometry until explicitly handled; do not silently approximate unrecognized syntax. Preserve the original viewBox and explicit normalization.
5. Generate renderable paths, sampled geometry, lengths, and provenance using the same pinned converter/library versions. Generate deterministic JSON under `src/data/generated/`; check generated files into the repository once commit approval is given.
6. `npm run data:generate` regenerates from local pinned inputs. `npm run data:validate` checks the schema, geometry, curriculum, provenance, and expected size. CI compares a freshly regenerated output with checked-in output; no network is required for that check.
7. Produce a review gallery showing each character, meaning, kana, count, and stroke animation. Keep developer inspection UI out of ordinary review mode.

Prefer one canonical, suffix-free KanjiVG file per character for v0.1. Do not combine variant strokes or accept alternate stroke orders without explicit representation and tests. If a chosen source is visibly unsuitable, record it in the Astra file with the original and proposed alternative.

## Editorial release gate

For each entry, verify character, cue correctness, selected reading kind, absence of target glyph in cue text, human-readable disambiguation, path count/order, visible proportions, complete animation, and attribution. Record reviewer/date and evidence in `docs/dataset-review.md` when implemented. Homophones are acceptable when English cues distinguish the cards (e.g. 日 and 火).

KanjiVG supplies vector information, not a complete source for meanings/readings. The default is short independently curated prompts with recorded verification references. If an agent proposes importing a dictionary dataset, investigate that exact license and log the decision before copying content. Do not assume all Japanese dictionaries or publicly visible websites permit bulk redistribution.
