import { beforeEach, describe, expect, it } from 'vitest'
import { ROOM_CAP } from '../types.ts'
import {
  animalLabel,
  commitRooms,
  createRoom,
  ensurePreviewRoom,
  getRoom,
  newRoomCode,
  PREVIEW_ROOM_ID,
  submitAnimal,
  touchHost,
} from './rooms.ts'
import { coatOf, hydrateThumbs } from './coats.ts'

describe('room codes', () => {
  beforeEach(() => localStorage.clear())

  it('makes 4-digit codes', () => {
    expect(newRoomCode()).toMatch(/^\d{4}$/)
  })
})

describe('submit gate', () => {
  beforeEach(() => localStorage.clear())

  it('accepts an open room', () => {
    createRoom('1234')
    const result = submitAnimal('1234', {
      animalId: 'lion',
      creatorId: 'c1',
      label: '小朋友的小狮子',
      thumb: 'data:image/png;base64,aa',
      regionColors: { body: '#e24b4b' },
    })
    expect(result.ok).toBe(true)
    expect(getRoom('1234')?.animals).toHaveLength(1)
  })

  it('blocks a full room', () => {
    createRoom('2222')
    for (let i = 0; i < ROOM_CAP; i++) {
      const r = submitAnimal('2222', {
        animalId: 'deer',
        creatorId: 'c',
        label: 'x',
        thumb: 't',
        regionColors: {},
      })
      expect(r.ok).toBe(true)
    }
    const full = submitAnimal('2222', {
      animalId: 'tiger',
      creatorId: 'c',
      label: 'x',
      thumb: 't',
      regionColors: {},
    })
    expect(full.ok).toBe(false)
    if (!full.ok) expect(full.reason).toBe('full')
  })
})

describe('preview draw room', () => {
  beforeEach(() => localStorage.clear())

  it('opens a local room without ?join=', () => {
    expect(ensurePreviewRoom()).toBe(PREVIEW_ROOM_ID)
    expect(getRoom(PREVIEW_ROOM_ID)?.ended).toBe(false)
    expect(submitAnimal(PREVIEW_ROOM_ID, {
      animalId: 'deer',
      creatorId: 'c',
      label: 'x',
      thumb: 't',
      regionColors: {},
    }).ok).toBe(true)
  })
})

describe('copy', () => {
  it('labels animals in Chinese', () => {
    expect(animalLabel('deer')).toBe('小朋友的小鹿')
  })
})

describe('host heartbeat', () => {
  beforeEach(() => localStorage.clear())

  it('does not drop animals when a stale empty snapshot is saved', () => {
    createRoom('7777')
    const stale = JSON.parse(localStorage.getItem('kid-draw-rooms-v1') || '{}')
    submitAnimal('7777', {
      animalId: 'deer',
      creatorId: 'c',
      label: 'x',
      thumb: 't',
      regionColors: { body: '#e24b4b' },
    })
    expect(getRoom('7777')?.animals).toHaveLength(1)
    commitRooms(stale)
    expect(getRoom('7777')?.animals).toHaveLength(1)
  })

  it('keeps animals across a live host heartbeat', () => {
    createRoom('8888')
    submitAnimal('8888', {
      animalId: 'lion',
      creatorId: 'c',
      label: 'x',
      thumb: 'data:image/png;base64,' + 'A'.repeat(8000),
      regionColors: {},
    })
    for (let i = 0; i < 8; i++) touchHost('8888')
    expect(getRoom('8888')?.animals).toHaveLength(1)
    expect(getRoom('8888')?.animals[0]?.thumb).toBe('')
    expect(coatOf(getRoom('8888')!.animals[0]!.id).length).toBeGreaterThan(20)
    expect(hydrateThumbs(getRoom('8888')!.animals)[0]?.thumb.length).toBeGreaterThan(20)
  })
})
