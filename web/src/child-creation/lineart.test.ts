import { describe, expect, it } from 'vitest'
import { ANIMAL_IDS } from '../types'
import { COLOR_FRAME } from './coloring-book'
import { parseJoinFromQr } from './scan-qr'
import { loadDraft, saveDraft, DRAFT_KEY } from './drafts'

describe('coloring-book frame', () => {
  for (const id of ANIMAL_IDS) {
    it(`${id} fits a 320×360 pick card with padding`, () => {
      const b = COLOR_FRAME[id]
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

  it('deer is standing (taller than a sideways blob)', () => {
    const b = COLOR_FRAME.deer
    const height = b.maxY - b.minY
    const width = b.maxX - b.minX
    expect(height).toBeGreaterThan(width * 0.7)
    expect(b.maxY).toBeGreaterThan(2)
  })
})

describe('parseJoinFromQr', () => {
  it('reads ?join= from a host URL', () => {
    expect(parseJoinFromQr('http://127.0.0.1:43187/?join=2774')).toBe('2774')
  })

  it('reads a bare 4-digit room', () => {
    expect(parseJoinFromQr('1001')).toBe('1001')
  })

  it('rejects junk', () => {
    expect(parseJoinFromQr('hello')).toBeNull()
  })
})

describe('paint drafts', () => {
  it('saves and restores a local coloring', () => {
    localStorage.removeItem(DRAFT_KEY)
    saveDraft({ roomId: '1001', animalId: 'deer', colorPng: 'data:image/png;base64,aa', savedAt: 1 })
    expect(loadDraft('1001', 'deer')?.colorPng).toContain('data:image/png')
    expect(loadDraft('1001', 'tiger')).toBeNull()
  })
})
