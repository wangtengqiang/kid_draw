/**
 * 房间同步层：房号、主题、在场名单、本机 BroadcastChannel。
 * 不导出贴图、不渲染 3D。贴图写入看 child-creation/；列表与预览看 world-exhibition/。
 */
import type { AnimalId, EmoteId, PlacedAnimal, RoomState, ThemeId } from '../types'
import { ROOM_CAP } from '../types'
import { LOCAL_CREATOR_KEY, LOCAL_ROOMS_KEY, ROOM_CHANNEL } from './keys'

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(ROOM_CHANNEL) : null

function loadRooms(): Record<string, RoomState> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '{}') as Record<string, RoomState>
  } catch {
    return {}
  }
}

function saveRooms(rooms: Record<string, RoomState>): void {
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms))
  channel?.postMessage({ kind: 'rooms' })
}

export function creatorId(): string {
  let id = localStorage.getItem(LOCAL_CREATOR_KEY)
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(LOCAL_CREATOR_KEY, id)
  }
  return id
}

export function newRoomCode(): string {
  const rooms = loadRooms()
  for (let i = 0; i < 40; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000))
    const existing = rooms[code]
    if (!existing || existing.ended || Date.now() - existing.hostAliveAt > 1000 * 60 * 30) {
      return code
    }
  }
  return String(1000 + Math.floor(Math.random() * 9000))
}

export function createRoom(id: string): RoomState {
  const rooms = loadRooms()
  const room: RoomState = {
    id,
    theme: 'forest',
    paused: false,
    ended: false,
    hostAliveAt: Date.now(),
    animals: [],
    emotes: [],
  }
  rooms[id] = room
  saveRooms(rooms)
  return room
}

export function getRoom(id: string): RoomState | null {
  const room = loadRooms()[id]
  if (!room || room.ended) return null
  if (Date.now() - room.hostAliveAt > 1000 * 60 * 120) return null
  return room
}

export function patchRoom(id: string, patch: Partial<RoomState>): RoomState | null {
  const rooms = loadRooms()
  const room = rooms[id]
  if (!room || room.ended) return null
  const next = { ...room, ...patch, id }
  rooms[id] = next
  saveRooms(rooms)
  return next
}

export function touchHost(id: string): void {
  const rooms = loadRooms()
  if (rooms[id] && !rooms[id].ended) {
    rooms[id].hostAliveAt = Date.now()
    saveRooms(rooms)
  }
}

export function setTheme(id: string, theme: ThemeId): RoomState | null {
  return patchRoom(id, { theme })
}

export function endRoom(id: string): void {
  patchRoom(id, { ended: true, animals: [] })
}

export function clearAnimals(id: string): RoomState | null {
  return patchRoom(id, { animals: [], emotes: [] })
}

export function submitAnimal(
  roomId: string,
  animal: Omit<PlacedAnimal, 'id' | 'createdAt'>,
): { ok: true; placed: PlacedAnimal } | { ok: false; reason: 'missing' | 'paused' | 'full' } {
  const rooms = loadRooms()
  const room = rooms[roomId]
  if (!room || room.ended) return { ok: false, reason: 'missing' }
  if (room.paused) return { ok: false, reason: 'paused' }
  if (room.animals.length >= ROOM_CAP) return { ok: false, reason: 'full' }
  const placed: PlacedAnimal = {
    ...animal,
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  }
  room.animals = [...room.animals, placed]
  rooms[roomId] = room
  saveRooms(rooms)
  return { ok: true, placed }
}

export function sendEmote(roomId: string, animalId: string, emote: EmoteId): void {
  const rooms = loadRooms()
  const room = rooms[roomId]
  if (!room || room.ended) return
  const item = { id: `e-${Date.now()}`, animalId, emote, at: Date.now() }
  room.emotes = [...room.emotes.filter((e) => Date.now() - e.at < 4000), item]
  rooms[roomId] = room
  saveRooms(rooms)
}

export function onSync(handler: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ROOMS_KEY) handler()
  }
  const onMsg = () => handler()
  window.addEventListener('storage', onStorage)
  channel?.addEventListener('message', onMsg)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onMsg)
  }
}

/** 扫码 / 分享卡片带 join=房号。主机自己的 URL 用 host=1，不要走这里。 */
export function joinQuery(): string | null {
  return new URLSearchParams(window.location.search).get('join')
}

export function isHostQuery(): boolean {
  const q = new URLSearchParams(window.location.search)
  return q.get('host') === '1' || q.get('role') === 'host'
}

export function creatorJoinUrl(roomId: string): string {
  const url = new URL(window.location.href)
  url.search = `?join=${roomId}`
  return url.toString()
}

export function animalLabel(animalId: AnimalId): string {
  const names = { deer: '小鹿', tiger: '小老虎', lion: '小狮子' }
  return `小朋友的${names[animalId]}`
}
