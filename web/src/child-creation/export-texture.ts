/**
 * 儿童创作：从涂色画布导出贴图。到此为止还不联网。
 */
import type { PaintSurface } from './paint'

export function exportTexture(paint: PaintSurface): {
  thumb: string
  regionColors: Record<string, string>
} {
  return {
    thumb: paint.thumb(),
    regionColors: paint.sampleRegions(),
  }
}
