/**
 * 涂层原图单独存。房间心跳名单只留动物 id，避免大 PNG 把刚送来的动物写丢。
 */
import type { PlacedAnimal } from '../types'
import { LOCAL_GALLERY_KEY } from './keys'

export const LOCAL_COATS_KEY = 'kid-draw-coats-v1'

function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_COATS_KEY) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, string>): void {
  const ids = Object.keys(all)
  if (ids.length > 32) {
    for (const id of ids.slice(0, ids.length - 32)) delete all[id]
  }
  localStorage.setItem(LOCAL_COATS_KEY, JSON.stringify(all))
}

export function rememberCoat(id: string, dataUrl: string): void {
  if (!id || !dataUrl) return
  try {
    const all = readAll()
    all[id] = dataUrl
    writeAll(all)
  } catch {
    try {
      const all = readAll()
      const ids = Object.keys(all)
      for (const old of ids.slice(0, Math.max(1, ids.length - 8))) delete all[old]
      all[id] = dataUrl
      writeAll(all)
    } catch {
      /* quota */
    }
  }
}

export function coatOf(id: string): string {
  return readAll()[id] || ''
}

function galleryThumb(id: string): string {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_GALLERY_KEY) || '[]') as {
      id?: string
      thumb?: string | { url?: string }
    }[]
    const hit = all.find((g) => g && g.id === id)
    if (!hit) return ''
    if (typeof hit.thumb === 'string') return hit.thumb
    if (hit.thumb && typeof hit.thumb.url === 'string') return hit.thumb.url
    return ''
  } catch {
    return ''
  }
}

/** 主机名单上的空 thumb 用涂层库 / 作品夹补回原图像素。 */
export function hydrateThumbs(animals: PlacedAnimal[]): PlacedAnimal[] {
  return animals.map((a) => {
    if (a.thumb && /^(data:image|blob:)/i.test(a.thumb)) return a
    const coat = coatOf(a.id) || galleryThumb(a.id)
    return coat ? { ...a, thumb: coat } : a
  })
}
