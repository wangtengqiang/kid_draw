import { describe, expect, it } from 'vitest'
import { exportTexture } from './export-texture'
import type { PaintSurface } from './paint'

describe('exportTexture keeps the raw paintboard', () => {
  it('exports the color layer, not a lineart composite or region bake', () => {
    const paint = {
      coatDataURL: () => 'data:image/png;raw-stripes',
      sampleRegions: () => ({ body: '#cc2244' }),
      thumb: () => 'data:image/png;with-lineart',
    } as unknown as PaintSurface
    const { thumb, regionColors } = exportTexture(paint)
    expect(thumb).toBe('data:image/png;raw-stripes')
    expect(thumb).not.toBe('data:image/png;with-lineart')
    expect(regionColors.body).toBe('#cc2244')
  })
})
