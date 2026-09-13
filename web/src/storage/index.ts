import { CloudBaseStore } from './cloudbase'
import { LocalMockStore } from './local-mock'
import type { StorageBackend } from './types'

export type { GalleryRecord, RoomAnimalRecord, RoomMetaRecord, StorageBackend, TextureRef } from './types'

/**
 * 默认 local mock。
 * 要接微信云开发时：在云控制台建环境，把环境 ID 交给运行时
 * （VITE_CLOUDBASE_ENV，gitignored），不要把密钥写进源码。
 */
export function createStorage(): StorageBackend {
  const mode = (import.meta.env.VITE_STORAGE as string | undefined) || 'local'
  const envId = import.meta.env.VITE_CLOUDBASE_ENV as string | undefined
  if (mode === 'cloudbase') {
    if (!envId) {
      console.warn('[kid_draw] VITE_CLOUDBASE_ENV missing; staying on LocalMockStore. Ask the user for the 云开发 env id.')
      return new LocalMockStore()
    }
    return new CloudBaseStore(envId)
  }
  return new LocalMockStore()
}

export const storage: StorageBackend = createStorage()
