import type {
  GalleryRecord,
  RoomAnimalRecord,
  RoomMetaRecord,
  StorageBackend,
  TextureRef,
} from './types'

const META_KEY = 'kid-draw-cloudmock-rooms'
const ANIMALS_KEY = 'kid-draw-cloudmock-room-animals'
const GALLERY_KEY = 'kid-draw-cloudmock-gallery'

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** MVP 本机实现。字段与云数据库 / 云存储对齐，方便整文件替换为 CloudBaseStore。 */
export class LocalMockStore implements StorageBackend {
  async putTexture(dataUrl: string, hint: string): Promise<TextureRef> {
    const fileID = `local://${hint}/${Date.now().toString(36)}`
    const blobs = read<Record<string, string>>('kid-draw-cloudmock-files', {})
    blobs[fileID] = dataUrl
    write('kid-draw-cloudmock-files', blobs)
    return { fileID, url: dataUrl }
  }

  async createRoom(meta: RoomMetaRecord): Promise<RoomMetaRecord> {
    const rooms = read<Record<string, RoomMetaRecord>>(META_KEY, {})
    rooms[meta.code] = meta
    write(META_KEY, rooms)
    return meta
  }

  async getRoom(code: string): Promise<RoomMetaRecord | null> {
    const rooms = read<Record<string, RoomMetaRecord>>(META_KEY, {})
    return rooms[code] ?? null
  }

  async updateRoomMeta(
    code: string,
    patch: Partial<RoomMetaRecord>,
  ): Promise<RoomMetaRecord | null> {
    const rooms = read<Record<string, RoomMetaRecord>>(META_KEY, {})
    const cur = rooms[code]
    if (!cur) return null
    const next = { ...cur, ...patch, code }
    rooms[code] = next
    write(META_KEY, rooms)
    return next
  }

  async listRoomAnimals(code: string): Promise<RoomAnimalRecord[]> {
    const all = read<RoomAnimalRecord[]>(ANIMALS_KEY, [])
    return all.filter((a) => a.roomCode === code)
  }

  async addRoomAnimal(record: RoomAnimalRecord): Promise<void> {
    const all = read<RoomAnimalRecord[]>(ANIMALS_KEY, [])
    write(ANIMALS_KEY, [...all, record])
  }

  async clearRoomAnimals(code: string): Promise<void> {
    const all = read<RoomAnimalRecord[]>(ANIMALS_KEY, [])
    write(
      ANIMALS_KEY,
      all.filter((a) => a.roomCode !== code),
    )
  }

  async listGallery(creatorId: string): Promise<GalleryRecord[]> {
    const all = read<GalleryRecord[]>(GALLERY_KEY, [])
    return all.filter((g) => g.creatorId === creatorId)
  }

  async saveGalleryItem(record: GalleryRecord): Promise<void> {
    const all = read<GalleryRecord[]>(GALLERY_KEY, [])
    write(GALLERY_KEY, [record, ...all.filter((g) => g.id !== record.id)].slice(0, 80))
  }
}
