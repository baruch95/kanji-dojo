/** Normalized coordinates shared by reference paths, input, and scoring. */
export type Point = Readonly<{ x: number; y: number }>

/** One completed pointer contact; timestamp is relative to stroke start. */
export type InkPoint = Point & Readonly<{ t: number }>
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

export type DiagnosticCode = 'stroke-count' | 'order' | 'direction' | 'start' | 'end' | 'trajectory' | 'length' | 'degenerate'
export type MatchResult = Readonly<{
  accepted: boolean
  diagnostics: readonly Readonly<{ code: DiagnosticCode; strokeIndex?: number }>[]
  matcherVersion: string
}>
