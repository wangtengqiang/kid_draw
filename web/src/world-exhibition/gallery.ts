/**
 * 世界观展：只读作品列表。不涂色、不送画。
 */
import type { GalleryItem } from '../types'
import { LOCAL_GALLERY_KEY } from '../sync/keys'

export function listWorks(): GalleryItem[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_GALLERY_KEY) || '[]') as GalleryItem[]
    return all.filter((g) => g && g.thumb)
  } catch {
    return []
  }
}

export function getWork(id: string): GalleryItem | undefined {
  return listWorks().find((g) => g.id === id)
}
