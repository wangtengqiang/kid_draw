import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO = resolve(process.cwd(), '..')
const require = createRequire(import.meta.url)
const { PaintSurface } = require(resolve(REPO, 'minigame/child-creation/paint.js')) as {
  PaintSurface: new (animalId: string) => {
    animalId: string
    colorHex: string
    natural: boolean
    strokes: unknown[]
    tool: string
    applyNatural: () => void
    brushAt: (x: number, y: number) => void
    thumb: () => string
  }
}

describe('WeChat 标准色', () => {
  it('only switches the crayon and keeps the kid strokes', () => {
    const paint = new PaintSurface('tiger')
    paint.brushAt(0.4, 0.5)
    expect(paint.strokes.length).toBe(1)
    paint.applyNatural()
    expect(paint.natural).toBe(false)
    expect(paint.strokes.length).toBe(1)
    expect(paint.colorHex).toBe('#e89a2d')
    expect(paint.tool).toBe('brush')
    expect(paint.thumb()).not.toMatch(/"natural":true/)
  })

  it('does not stamp the pick card over line art on the paint paper', () => {
    const src = readFileSync(resolve(REPO, 'minigame/child-creation/screens.js'), 'utf8')
    const paintFn = src.split('prototype.paintScreen')[1]?.split('prototype.')[0] || ''
    expect(paintFn).toMatch(/drawLineGuide/)
    expect(paintFn).not.toMatch(/drawPickCard/)
    expect(paintFn).not.toMatch(/paint\.natural/)
  })
})
