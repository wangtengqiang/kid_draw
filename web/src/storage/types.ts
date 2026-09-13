import type { AnimalId, ThemeId } from '../types'

/** 云存储上的一张涂色 PNG。mock 时 fileID 就是 data URL。 */
export interface TextureRef {
  fileID: string
  url: string
}

/** 云数据库 rooms：只存元数据，不存角色走路。 */
export interface RoomMetaRecord {
  code: string
  theme: ThemeId
  paused: boolean
  ended: boolean
  hostAliveAt: number
  cap: number
}

/** 已送进某场展览的动物（贴图引用），不含 x/z/朝向。 */
export interface RoomAnimalRecord {
  id: string
  roomCode: string
  creatorId: string
  animalId: AnimalId
  label: string
  texture: TextureRef
  regionColors: Record<string, string>
  createdAt: number
}

/** 云数据库 gallery */
export interface GalleryRecord {
  id: string
  creatorId: string
  animalId: AnimalId
  texture: TextureRef
  thumb: TextureRef
  regionColors: Record<string, string>
  roomCode: string | null
  createdAt: number
}

/**
 * 客户端唯一持久化入口。
 * LocalMockStore：网页预览 / 未配云环境。
 * CloudBaseStore：微信云开发（云存储 + 云数据库）。
 * 走动与表情不要经过这里。
 */
export interface StorageBackend {
  putTexture(dataUrl: string, hint: string): Promise<TextureRef>
  createRoom(meta: RoomMetaRecord): Promise<RoomMetaRecord>
  getRoom(code: string): Promise<RoomMetaRecord | null>
  updateRoomMeta(code: string, patch: Partial<RoomMetaRecord>): Promise<RoomMetaRecord | null>
  listRoomAnimals(code: string): Promise<RoomAnimalRecord[]>
  addRoomAnimal(record: RoomAnimalRecord): Promise<void>
  clearRoomAnimals(code: string): Promise<void>
  listGallery(creatorId: string): Promise<GalleryRecord[]>
  saveGalleryItem(record: GalleryRecord): Promise<void>
}
