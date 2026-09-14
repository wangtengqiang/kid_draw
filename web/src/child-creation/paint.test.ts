import { describe, expect, it } from 'vitest'
import { BRUSH_SIZES, PaintSurface } from './paint'

describe('PaintSurface brush', () => {
  it('starts on free brush, not region fill', () => {
    const paint = new PaintSurface('deer', () => undefined)
    expect(paint.tool).toBe('brush')
    expect(BRUSH_SIZES.map((s) => s.id)).toEqual([12, 36, 64])
  })

  it('keeps a size the kid can change', () => {
    const paint = new PaintSurface('tiger', () => undefined)
    paint.brush = 12
    expect(paint.brush).toBe(12)
    paint.brush = 64
    expect(paint.brush).toBe(64)
    paint.tool = 'eraser'
    expect(paint.tool).toBe('eraser')
  })
})
