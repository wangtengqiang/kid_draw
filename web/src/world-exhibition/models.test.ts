import { Box3, Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { ANIMAL_IDS } from '../types'
import { createAnimalModel, profileVolume } from './models'
import { DEER_BODY } from '../silhouettes'

function sizeOf(group: Group): Vector3 {
  return new Box3().setFromObject(group).getSize(new Vector3())
}

describe('3D animal volumes', () => {
  it('builds a deer that is long, tall, and has chest depth', () => {
    const g = createAnimalModel('deer', { body: '#e24b4b' })
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.7)
    expect(s.y).toBeGreaterThan(1.75)
    expect(s.z).toBeGreaterThan(0.28)
    expect((g.userData.legs as Group[]).length).toBe(4)
  })

  it('builds a tiger with a feline head and four legs', () => {
    const g = createAnimalModel('tiger', {})
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.9)
    expect(s.z).toBeGreaterThan(0.35)
    expect((g.userData.legs as Group[]).length).toBe(4)
  })

  it('builds a lion with a mane mesh', () => {
    const g = createAnimalModel('lion', {})
    let mane = 0
    g.traverse((obj) => {
      if (obj.userData.region === 'mane') mane += 1
    })
    expect(mane).toBeGreaterThan(0)
    expect(sizeOf(g).y).toBeGreaterThan(1.2)
  })

  it('extrudes a silhouette with thickness on Z', () => {
    const geo = profileVolume(DEER_BODY, 0.2)
    geo.computeBoundingBox()
    const b = geo.boundingBox!
    expect(b.max.z - b.min.z).toBeGreaterThan(0.3)
    expect(b.max.x - b.min.x).toBeGreaterThan(1.5)
  })

  it('keeps a coat map on every species', () => {
    for (const id of ANIMAL_IDS) {
      const g = createAnimalModel(id, { body: '#3b82f6' })
      expect(g.userData.coat).toBeTruthy()
    }
  })
})
