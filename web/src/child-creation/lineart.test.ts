import { beforeEach, describe, expect, it } from 'vitest'
import { ANIMAL_IDS, LAND_IDS, MARINE_IDS } from '../types'
import { COLOR_FRAME } from './coloring-book'
import { officialLineArtSrc, pickCardSrc } from './lineart'
import { parseJoinFromQr } from './scan-qr'
import { listDrafts, MAX_DRAFTS, replaceDraft, saveDraft, DRAFT_KEY } from './drafts'

describe('paint drafts', () => {
  beforeEach(() => localStorage.removeItem(DRAFT_KEY))

  it('saves and lists a local coloring', () => {
    const result = saveDraft({
      roomId: '1001',
      animalId: 'deer',
      colorPng: 'data:image/png;base64,aa',
      thumb: 'data:image/png;base64,aa',
    })
    expect(result.ok).toBe(true)
    const listed = listDrafts()
    expect(listed.ok).toBe(true)
    if (listed.ok) expect(listed.drafts).toHaveLength(1)
  })

  it('caps at 10 and lets a kid replace one', () => {
    for (let i = 0; i < MAX_DRAFTS; i++) {
      const animal = i % 3 === 0 ? 'deer' : i % 3 === 1 ? 'tiger' : 'lion'
      const r = saveDraft({
        roomId: '1001',
        animalId: animal,
        colorPng: `data:image/png;base64,${i}`,
        thumb: `data:image/png;base64,${i}`,
      })
      expect(r.ok).toBe(true)
    }
    const full = saveDraft({
      roomId: '1001',
      animalId: 'deer',
      colorPng: 'data:image/png;base64,new',
      thumb: 'data:image/png;base64,new',
    })
    expect(full.ok).toBe(false)
    if (!full.ok) expect(full.drafts).toHaveLength(MAX_DRAFTS)
    const listed = listDrafts()
    if (!listed.ok) throw new Error('list failed')
    const replaced = replaceDraft(listed.drafts[0]!.id, {
      roomId: '1001',
      animalId: 'lion',
      colorPng: 'data:image/png;base64,new',
      thumb: 'data:image/png;base64,new',
    })
    expect(replaced?.animalId).toBe('lion')
    const after = listDrafts()
    expect(after.ok && after.drafts).toHaveLength(MAX_DRAFTS)
  })
})

describe('official land coloring pages', () => {
  for (const id of LAND_IDS) {
    it(`${id} uses the shipped PNG lineart, not a canvas oval`, () => {
      expect(officialLineArtSrc(id)).toBe(`/lineart/${id}.png`)
      expect(pickCardSrc(id)).toBe(`/picks/${id}.png`)
    })
  }

  it('marine animals keep the canvas coloring book', () => {
    for (const id of MARINE_IDS) {
      expect(officialLineArtSrc(id)).toBeNull()
      expect(pickCardSrc(id)).toBeNull()
    }
  })
})

describe('coloring-book frame', () => {
  for (const id of MARINE_IDS) {
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

  it('every animal still has a frame box for marine fallback math', () => {
    for (const id of ANIMAL_IDS) {
      const b = COLOR_FRAME[id]
      expect(b.maxX).toBeGreaterThan(b.minX)
      expect(b.maxY).toBeGreaterThan(b.minY)
    }
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
