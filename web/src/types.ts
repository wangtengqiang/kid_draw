export type AnimalId = 'deer' | 'tiger' | 'lion' | 'fish' | 'turtle' | 'dolphin'
export type AnimalKind = AnimalId
export type Habitat = 'land' | 'marine'
export type ThemeId = 'forest' | 'snow' | 'underwater'
export type ToolId = 'brush' | 'fill' | 'eraser'
export type WorldAction = 'walk' | 'swim' | 'drink' | 'rest' | 'sit'

export const LAND_IDS: AnimalId[] = ['deer', 'tiger', 'lion']
export const MARINE_IDS: AnimalId[] = ['fish', 'turtle', 'dolphin']
export const ANIMAL_IDS: AnimalId[] = [...LAND_IDS, ...MARINE_IDS]
export const THEME_IDS: ThemeId[] = ['forest', 'snow', 'underwater']
export const WORLD_ACTIONS: WorldAction[] = ['walk', 'swim', 'drink', 'rest', 'sit']

export function isMarine(id: AnimalId): boolean {
  return id === 'fish' || id === 'turtle' || id === 'dolphin'
}

export const ACTION_META: Record<WorldAction, { name: string }> = {
  walk: { name: '走路' },
  swim: { name: '游泳' },
  drink: { name: '喝水' },
  rest: { name: '休息' },
  sit: { name: '坐下' },
}

export const ANIMAL_META: Record<
  AnimalId,
  { name: string; hint: string; defaults: Record<string, string> }
> = {
  deer: {
    name: '小鹿',
    hint: '',
    defaults: {
      antlerL: '#8b6914',
      antlerR: '#8b6914',
      earL: '#d4a574',
      earR: '#d4a574',
      head: '#e2b98a',
      neck: '#d4a574',
      body: '#c9965a',
      belly: '#f3e0c2',
      spot1: '#fff6e0',
      spot2: '#fff6e0',
      spot3: '#fff6e0',
      legFL: '#c48a48',
      legFR: '#c48a48',
      legBL: '#c48a48',
      legBR: '#c48a48',
      tail: '#d4a574',
    },
  },
  tiger: {
    name: '老虎',
    hint: '',
    defaults: {
      earL: '#e8a23a',
      earR: '#e8a23a',
      innerL: '#f5d0c8',
      innerR: '#f5d0c8',
      head: '#f0b14a',
      muzzle: '#fff3d6',
      body: '#e89a2d',
      belly: '#fff1cf',
      legFL: '#d88920',
      legFR: '#d88920',
      legBL: '#d88920',
      legBR: '#d88920',
      tail: '#e89a2d',
    },
  },
  fish: {
    name: '小鱼',
    hint: '',
    defaults: {
      body: '#3b82f6',
      belly: '#fff8e7',
      tail: '#2563eb',
      fin: '#22d3ee',
      head: '#60a5fa',
      stripe: '#1e3a8a',
    },
  },
  turtle: {
    name: '海龟',
    hint: '',
    defaults: {
      shell: '#2bb673',
      body: '#2bb673',
      scute: '#a3e635',
      head: '#8fdd74',
      flipperFL: '#3d8f44',
      flipperFR: '#3d8f44',
      flipperBL: '#3d8f44',
      flipperBR: '#3d8f44',
      belly: '#f3e0c2',
    },
  },
  dolphin: {
    name: '海豚',
    hint: '',
    defaults: {
      body: '#64748b',
      belly: '#fff8e7',
      snout: '#94a3b8',
      fin: '#475569',
      tail: '#334155',
    },
  },
  lion: {
    name: '狮子',
    hint: '',
    defaults: {
      mane: '#d4922a',
      earL: '#e6c36a',
      earR: '#e6c36a',
      head: '#f0d48a',
      muzzle: '#fff4d4',
      body: '#e6c36a',
      belly: '#f7e7b8',
      legFL: '#d4b05a',
      legFR: '#d4b05a',
      legBL: '#d4b05a',
      legBR: '#d4b05a',
      tail: '#e6c36a',
      tuft: '#b8741e',
    },
  },
}

export const THEME_META: Record<ThemeId, { name: string; emoji: string }> = {
  forest: { name: '森林', emoji: '🌲' },
  snow: { name: '雪原', emoji: '❄️' },
  underwater: { name: '海底', emoji: '🫧' },
}

export const PALETTE: { hex: string; name: string }[] = [
  { hex: '#fff8e7', name: '白' },
  { hex: '#f2d14a', name: '黄' },
  { hex: '#f08a3a', name: '橙' },
  { hex: '#e24b4b', name: '红' },
  { hex: '#ec4899', name: '粉' },
  { hex: '#8d4cf5', name: '紫' },
  { hex: '#3b82f6', name: '蓝' },
  { hex: '#22d3ee', name: '青' },
  { hex: '#2bb673', name: '绿' },
  { hex: '#a3e635', name: '柠' },
  { hex: '#8b5a2b', name: '棕' },
  { hex: '#1f1a17', name: '黑' },
]

export const EMOTES = ['❤️', '⭐', '🎉', '👏', '🌸'] as const
export type EmoteId = (typeof EMOTES)[number]

export const ROOM_CAP = 8

export interface PlacedAnimal {
  id: string
  animalId: AnimalId
  creatorId: string
  label: string
  thumb: string
  regionColors: Record<string, string>
  createdAt: number
}

export interface RoomState {
  id: string
  theme: ThemeId
  paused: boolean
  ended: boolean
  hostAliveAt: number
  animals: PlacedAnimal[]
  /** 名单版本。心跳只改 hostAliveAt，不能盖掉更新的动物列表。 */
  animalsGen: number
  emotes: { id: string; animalId: string; emote: EmoteId; at: number }[]
}

export interface GalleryItem {
  id: string
  animalId: AnimalId
  thumb: string
  regionColors: Record<string, string>
  roomId: string | null
  createdAt: number
}
