import { describe, expect, it } from 'vitest'
import { ANIMAL_IDS } from '../types'
import { FRAME } from '../silhouettes'

describe('lineart frame', () => {
  for (const id of ANIMAL_IDS) {
    it(`${id} silhouette fits a 320×360 pick card with padding`, () => {
      const b = FRAME[id]
      const w = 320
      const h = 360
      const pad = Math.min(w, h) * 0.08
      const scale = Math.min((w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxY - b.minY))
      const drawW = (b.maxX - b.minX) * scale
      const drawH = (b.maxY - b.minY) * scale
      expect(drawW).toBeLessThanOrEqual(w - pad * 2 + 0.01)
      expect(drawH).toBeLessThanOrEqual(h - pad * 2 + 0.01)
      expect(drawW).toBeGreaterThan(w * 0.5)
      expect(drawH).toBeGreaterThan(h * 0.35)
    })
  }

  it('deer frame is tall enough for antlers', () => {
    expect(FRAME.deer.maxY).toBeGreaterThan(2)
    expect(FRAME.deer.maxX - FRAME.deer.minX).toBeGreaterThan(2)
  })
})
