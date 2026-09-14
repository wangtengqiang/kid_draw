/**
 * 送进世界前认出是哪只动物。
 * 优先用小朋友开场选的模板；没有模板时用画上的主色做粗分类。
 * 不要求先点满肚子色块。不是云端 CV，也没有 AppSecret。
 */
import type { AnimalId } from '../types'

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length < 6) return [0, 0, 0]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6
  else if (max === G) h = ((B - R) / d + 2) / 6
  else h = ((R - G) / d + 4) / 6
  return { h: h * 360, s, l }
}

export type InferSource = 'template' | 'color' | 'picker'

export type InferResult = {
  animalId: AnimalId
  source: InferSource
}

/** 从开场模板或画上的主色认出动物。认不准时退回小鹿，并标成 picker。 */
export function inferAnimalId(input: {
  startedAs?: AnimalId | null
  averageHex?: string | null
}): InferResult {
  if (input.startedAs) return { animalId: input.startedAs, source: 'template' }
  const hex = input.averageHex
  if (!hex) return { animalId: 'deer', source: 'picker' }
  const [r, g, b] = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  if (s < 0.25 && l > 0.28 && l < 0.6 && h >= 185 && h < 250) {
    return { animalId: 'dolphin', source: 'color' }
  }
  if (s < 0.14) return { animalId: 'deer', source: 'picker' }
  if (h >= 70 && h < 165) return { animalId: 'turtle', source: 'color' }
  if (h >= 165 && h < 255) return { animalId: 'fish', source: 'color' }
  if (h >= 18 && h < 42) return { animalId: 'tiger', source: 'color' }
  if (h >= 42 && h < 70) return { animalId: 'lion', source: 'color' }
  if (h < 18 || h >= 330) return { animalId: 'deer', source: 'color' }
  if (h >= 255 && h < 330) return { animalId: 'fish', source: 'color' }
  return { animalId: 'deer', source: 'picker' }
}

export function needsAnimalPicker(result: InferResult): boolean {
  return result.source === 'picker'
}
