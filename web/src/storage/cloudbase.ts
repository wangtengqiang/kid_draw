import type {
  GalleryRecord,
  RoomAnimalRecord,
  RoomMetaRecord,
  StorageBackend,
  TextureRef,
} from './types'

/**
 * 微信云开发后端（个人主体）。
 *
 * 云存储：涂色 PNG → wx.cloud.uploadFile
 * 云数据库：gallery / rooms / room_animals
 * 走动与表情：不要写 collection，主机内存即可
 *
 * 环境 ID 只能来自运行时配置或云控制台，禁止写进仓库。
 * 未配置时不要调用本类——index.ts 会回落 LocalMockStore。
 */
export class CloudBaseStore implements StorageBackend {
  private envId: string
  constructor(envId: string) {
    this.envId = envId
    if (!envId) {
      throw new Error('CloudBase env id missing; ask the user, do not hardcode')
    }
  }

  private ensureCloud(): void {
    const wx = (globalThis as { wx?: { cloud?: { init: (o: { env: string }) => void } } }).wx
    if (!wx?.cloud) {
      throw new Error('wx.cloud unavailable; use LocalMockStore in the web preview')
    }
    wx.cloud.init({ env: this.envId })
  }

  async putTexture(_dataUrl: string, _hint: string): Promise<TextureRef> {
    this.ensureCloud()
    // wx.cloud.uploadFile({ cloudPath: `textures/${hint}.png`, filePath })
    throw new Error('CloudBaseStore.putTexture: wire wx.cloud.uploadFile when env is provided')
  }

  async createRoom(_meta: RoomMetaRecord): Promise<RoomMetaRecord> {
    this.ensureCloud()
    // db.collection('rooms').add({ data: meta })
    throw new Error('CloudBaseStore.createRoom: wire db.collection(rooms)')
  }

  async getRoom(_code: string): Promise<RoomMetaRecord | null> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.getRoom: wire db.collection(rooms).where({ code })')
  }

  async updateRoomMeta(_code: string, _patch: Partial<RoomMetaRecord>): Promise<RoomMetaRecord | null> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.updateRoomMeta: wire db.collection(rooms).doc().update')
  }

  async listRoomAnimals(_code: string): Promise<RoomAnimalRecord[]> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.listRoomAnimals: wire db.collection(room_animals)')
  }

  async addRoomAnimal(_record: RoomAnimalRecord): Promise<void> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.addRoomAnimal: wire db.collection(room_animals).add')
  }

  async clearRoomAnimals(_code: string): Promise<void> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.clearRoomAnimals: wire db.collection(room_animals).where.remove')
  }

  async listGallery(_creatorId: string): Promise<GalleryRecord[]> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.listGallery: wire db.collection(gallery)')
  }

  async saveGalleryItem(_record: GalleryRecord): Promise<void> {
    this.ensureCloud()
    throw new Error('CloudBaseStore.saveGalleryItem: wire db.collection(gallery).add')
  }
}
