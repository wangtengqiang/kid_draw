/**
 * 儿童创作：导出画板上的原始像素当皮毛。不按分区平均、不重画线稿。
 */
import type { PaintSurface } from './paint'

export function exportTexture(paint: PaintSurface): {
  thumb: string
  regionColors: Record<string, string>
} {
  return {
    thumb: paint.coatDataURL(),
    regionColors: paint.sampleRegions(),
  }
}
