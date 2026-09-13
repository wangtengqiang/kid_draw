import type { AnimalId, EmoteId, GalleryItem, PlacedAnimal, RoomState, ThemeId } from './types'
import { ROOM_CAP } from './types'

const ROOM_KEY = 'kid-draw-rooms-v1'
const GALLERY_KEY = 'kid-draw-gallery-v1'
const CREATOR_KEY = 'kid-draw-creator-id'
const CHANNEL = 'kid-draw-sync-v1'

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

function loadRooms(): Record<string, RoomState> {
  try {
    return JSON.parse(localStorage.getItem(ROOM_KEY) || '{}') as Record<string, RoomState>
  } catch {
    return {}
  }
}

function saveRooms(rooms: Record<string, RoomState>): void {
  localStorage.setItem(ROOM_KEY, JSON.stringify(rooms))
  channel?.postMessage({ kind: 'rooms' })
}

export function creatorId(): string {
  let id = localStorage.getItem(CREATOR_KEY)
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(CREATOR_KEY, id)
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

export function loadGallery(): GalleryItem[] {
  try {
    const all = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]') as GalleryItem[]
    return all.filter((g) => g && g.thumb)
  } catch {
    return []
  }
}

export function saveGalleryItem(item: GalleryItem): void {
  const all = loadGallery()
  localStorage.setItem(GALLERY_KEY, JSON.stringify([item, ...all].slice(0, 60)))
  channel?.postMessage({ kind: 'gallery' })
}

export function onSync(handler: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === ROOM_KEY || e.key === GALLERY_KEY) handler()
  }
  const onMsg = () => handler()
  window.addEventListener('storage', onStorage)
  channel?.addEventListener('message', onMsg)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onMsg)
  }
}

export function joinQuery(): string | null {
  const q = new URLSearchParams(window.location.search)
  return q.get('join') || q.get('room')
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
