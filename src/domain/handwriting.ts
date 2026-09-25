/** Normalized coordinates shared by reference paths, input, and scoring. */
export type Point = Readonly<{ x: number; y: number }>

/** One completed pointer contact; timestamp is relative to stroke start. */
export type InkPoint = Point & Readonly<{ t: number; pressure?: number; tiltX?: number; tiltY?: number }>
export type CapturedStroke = Readonly<{
  points: readonly InkPoint[]
  pointerType: 'pen' | 'touch' | 'mouse'
}>

/** Ordered reference stroke extracted from a pinned source asset. */
export type ReferenceStroke = Readonly<{
  index: number
  pathD: string
  samples: readonly Point[]
  length: number
}>

/** Stable content identity; content changes retain the card ID. */
export type KanjiId = `u${string}`
export type CardId = `writing:${KanjiId}:v1`
export type Reading = Readonly<{ kana: string; kind: 'on' | 'kun'; showInPrompt: boolean }>
export type KanjiDefinition = Readonly<{
  id: KanjiId
  character: string
  curriculumOrder: number
  promptMeaning: string
  readings: readonly Reading[]
  strokeCount: number
  viewBox: readonly [number, number, number, number]
  strokes: readonly ReferenceStroke[]
  provenanceId: string
}>

export type DiagnosticCode = 'stroke-count' | 'order' | 'direction' | 'start' | 'end' | 'trajectory' | 'length' | 'structure' | 'degenerate'
export type MatchResult = Readonly<{
  accepted: boolean
  diagnostics: readonly Readonly<{ code: DiagnosticCode; strokeIndex?: number }>[]
  matcherVersion: string
}>
