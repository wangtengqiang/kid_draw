import { beforeEach, describe, expect, it } from 'vitest'
import { ROOM_CAP } from '../types.ts'
import { animalLabel, createRoom, getRoom, newRoomCode, submitAnimal } from './rooms.ts'

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

describe('copy', () => {
  it('labels animals in Chinese', () => {
    expect(animalLabel('deer')).toBe('小朋友的小鹿')
  })
})
