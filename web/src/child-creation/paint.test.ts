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

  it('exposes a raw coat bitmap separate from the lineart thumb', () => {
    const paint = new PaintSurface('lion', () => undefined)
    expect(typeof paint.coatDataURL).toBe('function')
    expect(typeof paint.thumb).toBe('function')
    expect(paint.coatDataURL).not.toBe(paint.thumb)
  })

  it('标准色 only switches the crayon, never the paper', () => {
    const paint = new PaintSurface('tiger', () => undefined)
    const before = paint.color.toDataURL()
    const lines = paint.lines.toDataURL()
    const hex = paint.selectStandardColor()
    expect(hex).toBe('#e89a2d')
    expect(paint.colorHex).toBe('#e89a2d')
    expect(paint.tool).toBe('brush')
    expect(paint.color.toDataURL()).toBe(before)
    expect(paint.lines.toDataURL()).toBe(lines)
  })
})
