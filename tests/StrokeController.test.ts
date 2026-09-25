import { describe, expect, it, vi } from 'vitest'
import { StrokeController } from '../src/drawing/StrokeController'

const bounds = { left: 10, top: 20, width: 100, height: 100 }
const pointer = (x: number, y: number, pointerId = 1, pointerType = 'pen', timeStamp = 10) => ({ clientX: x, clientY: y, pointerId, pointerType, timeStamp, button: 0, isPrimary: true })

describe('pointer capture lifecycle', () => {
  it('completes one stroke and Undo removes exactly that completed stroke', () => {
    const controller = new StrokeController(vi.fn(), vi.fn())
    expect(controller.begin(pointer(20, 30), bounds, false)).toBe(true)
    controller.move(1, [{ clientX: 30, clientY: 40, timeStamp: 11 }, { clientX: 30, clientY: 40, timeStamp: 11 }])
    expect(controller.end(1, { clientX: 50, clientY: 60, timeStamp: 12 })).toBe(true)
    expect(controller.strokes).toHaveLength(1)
    expect(controller.strokes[0]!.points).toHaveLength(3)
    expect(controller.strokes[0]!.points[0]).toMatchObject({ x: 0.1, y: 0.1 })
    controller.undo()
    expect(controller.strokes).toHaveLength(0)
  })

  it('cancels off-canvas input and rejects a second pointer and touch by default', () => {
    const canceled = vi.fn()
    const controller = new StrokeController(vi.fn(), canceled)
    expect(controller.begin(pointer(20, 30, 1, 'touch'), bounds, false)).toBe(false)
    expect(controller.begin(pointer(20, 30), bounds, false)).toBe(true)
    expect(controller.begin(pointer(40, 40, 2), bounds, false)).toBe(false)
    controller.move(2, [{ clientX: 50, clientY: 50, timeStamp: 11 }])
    controller.move(1, [{ clientX: 120, clientY: 50, timeStamp: 12 }])
    expect(controller.isActive).toBe(false)
    expect(controller.strokes).toHaveLength(0)
    expect(canceled).toHaveBeenCalledOnce()
  })

  it('lets a pen replace incomplete touch and keeps completed strokes on cancellation', () => {
    const controller = new StrokeController(vi.fn(), vi.fn())
    controller.begin(pointer(20, 30, 1, 'touch'), bounds, true)
    controller.begin(pointer(30, 40, 2, 'pen'), bounds, true)
    expect(controller.activePointerId).toBe(2)
    controller.end(2, { clientX: 70, clientY: 80, timeStamp: 20 })
    controller.begin(pointer(20, 30, 3), bounds, false)
    controller.cancel(3)
    expect(controller.strokes).toHaveLength(1)
    controller.clear()
    expect(controller.strokes).toHaveLength(0)
  })
})
