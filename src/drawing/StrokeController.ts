import type { CapturedStroke, InkPoint } from '../domain/handwriting'

export type PointerSample = Readonly<{ clientX: number; clientY: number; timeStamp: number }>
export type PointerInput = PointerSample & Readonly<{
  pointerId: number
  pointerType: string
  button: number
  isPrimary: boolean
}>
export type SquareBounds = Readonly<{ left: number; top: number; width: number; height: number }>
type ActiveStroke = { pointerId: number; pointerType: CapturedStroke['pointerType']; startedAt: number; bounds: SquareBounds; points: InkPoint[] }

/** Keeps pointer lifecycle and scoring coordinates separate from Canvas rendering. */
export class StrokeController {
  private completed: CapturedStroke[] = []
  private active: ActiveStroke | null = null
  private readonly onChange: () => void
  private readonly onCancel: () => void

  constructor(onChange: () => void, onCancel: () => void) {
    this.onChange = onChange
    this.onCancel = onCancel
  }

  get strokes(): readonly CapturedStroke[] { return this.completed }
  get activePoints(): readonly InkPoint[] { return this.active?.points ?? [] }
  get isActive(): boolean { return this.active !== null }
  get activePointerId(): number | null { return this.active?.pointerId ?? null }

  begin(input: PointerInput, bounds: SquareBounds, fingerEnabled: boolean): boolean {
    const type = input.pointerType
    if (!((type === 'pen') || (type === 'mouse' && input.button === 0 && input.isPrimary) || (type === 'touch' && fingerEnabled && input.isPrimary))) return false
    if (this.active) {
      if (!(type === 'pen' && this.active.pointerType === 'touch')) return false
      this.cancel()
    }
    if (bounds.width <= 0 || bounds.height <= 0) return false
    this.active = { pointerId: input.pointerId, pointerType: type as CapturedStroke['pointerType'], startedAt: input.timeStamp, bounds, points: [] }
    if (!this.append(input)) { this.cancel(); return false }
    this.onChange()
    return true
  }

  move(pointerId: number, samples: readonly PointerSample[]): void {
    if (this.active?.pointerId !== pointerId) return
    for (const sample of samples) if (!this.append(sample)) { this.cancel(); return }
    this.onChange()
  }

  end(pointerId: number, sample: PointerSample): boolean {
    if (this.active?.pointerId !== pointerId) return false
    if (!this.append(sample)) { this.cancel(); return false }
    const active = this.active
    this.completed = [...this.completed, { pointerType: active.pointerType, points: active.points }]
    this.active = null
    this.onChange()
    return true
  }

  cancel(pointerId?: number): void {
    if (!this.active || (pointerId !== undefined && this.active.pointerId !== pointerId)) return
    this.active = null
    this.onCancel()
    this.onChange()
  }

  undo(): void {
    if (this.active || this.completed.length === 0) return
    this.completed = this.completed.slice(0, -1)
    this.onChange()
  }

  clear(): void {
    if (this.active || this.completed.length === 0) return
    this.completed = []
    this.onChange()
  }

  private append(sample: PointerSample): boolean {
    const active = this.active
    if (!active) return false
    const { left, top, width, height } = active.bounds
    const x = (sample.clientX - left) / width
    const y = (sample.clientY - top) / height
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return false
    const point = { x, y, t: Math.max(0, sample.timeStamp - active.startedAt) }
    const previous = active.points.at(-1)
    if (!previous || previous.x !== point.x || previous.y !== point.y || previous.t !== point.t) active.points.push(point)
    return true
  }
}
