import { describe, expect, it } from 'vitest'
import { snapshotSrc } from './pet-snapshot'

describe('standing quad snapshot paths', () => {
  it('points at the baked glTF front stills, not ellipse art', () => {
    expect(snapshotSrc('deer')).toBe('/models/snapshots/deer.png')
    expect(snapshotSrc('lion')).toBe('/models/snapshots/lion.png')
  })
})
