/**
 * 儿童创作：「送进世界」。
 * 网页预览走 StorageBackend（LocalMock）。
 * 正式小游戏改为 wx.cloud.callFunction({ name: 'sendToWorld' })。
 * 本文件不渲染主机森林、不画 3D 预览。
 */
import { storage } from '../storage'
import { LOCAL_GALLERY_KEY } from '../sync/keys'
import { animalLabel, creatorId, submitAnimal } from '../sync/rooms'
import type { AnimalId, GalleryItem, PlacedAnimal } from '../types'
import { exportTexture } from './export-texture'
import type { PaintSurface } from './paint'

export type SendResult =
  | { ok: true; placed: PlacedAnimal; item: GalleryItem }
  | { ok: false; reason: 'missing' | 'paused' | 'full'; item: GalleryItem }

function cacheGallery(item: GalleryItem): void {
  let all: GalleryItem[] = []
  try {
    all = JSON.parse(localStorage.getItem(LOCAL_GALLERY_KEY) || '[]') as GalleryItem[]
  } catch {
    all = []
  }
  localStorage.setItem(
    LOCAL_GALLERY_KEY,
    JSON.stringify([item, ...all.filter((g) => g.id !== item.id)].slice(0, 60)),
  )
}

export async function sendToWorld(input: {
  roomId: string
  animalId: AnimalId
  paint: PaintSurface
}): Promise<SendResult> {
  const { thumb, regionColors } = exportTexture(input.paint)
  const item: GalleryItem = {
    id: `g-${Date.now()}`,
    animalId: input.animalId,
    thumb,
    regionColors,
    roomId: input.roomId,
    createdAt: Date.now(),
  }

  const result = submitAnimal(input.roomId, {
    animalId: input.animalId,
    creatorId: creatorId(),
    label: animalLabel(input.animalId),
    thumb,
    regionColors,
  })

  if (!result.ok) {
    cacheGallery(item)
    return { ok: false, reason: result.reason, item }
  }

  item.id = result.placed.id
  cacheGallery(item)

  const tex = await storage.putTexture(thumb, `${input.animalId}-${item.id}`)
  await storage.saveGalleryItem({
    id: item.id,
    creatorId: creatorId(),
    animalId: input.animalId,
    texture: tex,
    thumb: tex,
    regionColors,
    roomCode: input.roomId,
    createdAt: item.createdAt,
  })
  await storage.addRoomAnimal({
    id: result.placed.id,
    roomCode: input.roomId,
    creatorId: creatorId(),
    animalId: input.animalId,
    label: result.placed.label,
    texture: tex,
    regionColors,
    createdAt: result.placed.createdAt,
  })

  return { ok: true, placed: result.placed, item }
}
