import { readFileSync } from 'node:fs'
import { Box3, BufferGeometry, FrontSide, Group, Mesh, MeshLambertMaterial, Vector3 } from 'three'
import { beforeAll, describe, expect, it } from 'vitest'
import { ANIMAL_IDS, LAND_IDS, type AnimalId } from '../types'
import { createAnimalModel, loadAnimalTemplates, profileVolume, setAnimalModelProvider, tickAction, tickWalk } from './models'
import { DEER_BODY } from '../silhouettes'

setAnimalModelProvider(async (id: AnimalId) => Uint8Array.from(readFileSync(`public/models/${id}.glb`)))

function sizeOf(group: Group): Vector3 {
  return new Box3().setFromObject(group).getSize(new Vector3())
}

function bodyGeo(group: Group): BufferGeometry {
  let geo: BufferGeometry | undefined
  group.traverse((obj) => {
    if (obj instanceof Mesh && String(obj.userData.region || obj.name).toLowerCase().includes('body')) {
      geo = obj.geometry as BufferGeometry
    }
  })
  if (!geo) {
    group.traverse((obj) => {
      if (obj instanceof Mesh && !geo) geo = obj.geometry as BufferGeometry
    })
  }
  if (!geo) throw new Error('missing body')
  return geo
}

function assertNotPrimitive(geo: { type: string }): void {
  expect(geo.type).toBe('BufferGeometry')
  expect(geo.type).not.toBe('SphereGeometry')
  expect(geo.type).not.toBe('CapsuleGeometry')
  expect(geo.type).not.toBe('CylinderGeometry')
  expect(geo.type).not.toBe('TorusGeometry')
}

describe('3D animal volumes', () => {
  beforeAll(async () => {
    await loadAnimalTemplates()
  }, 30000)

  it('builds a deer from the shipped Kenney glTF', () => {
    const g = createAnimalModel('deer', { body: '#e24b4b' })
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.1)
    expect(s.y).toBeGreaterThan(1.5)
    expect(s.z).toBeGreaterThan(0.5)
    expect((g.userData.legs as Group[]).length).toBe(4)
    expect((g.userData.clips as string[]).includes('walk')).toBe(true)
    const geo = bodyGeo(g)
    assertNotPrimitive(geo)
    expect(geo.getAttribute('position').count).toBeGreaterThan(200)
  })

  it('builds a tiger with four legs and a walk clip', () => {
    const g = createAnimalModel('tiger', {})
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.1)
    expect(s.z).toBeGreaterThan(0.5)
    expect((g.userData.legs as Group[]).length).toBe(4)
    expect((g.userData.clips as string[]).includes('walk')).toBe(true)
  })

  it('builds a lion from Kenney Cube Pets, not a torus of capsules', () => {
    const g = createAnimalModel('lion', {})
    expect((g.userData.clips as string[]).includes('walk')).toBe(true)
    expect((g.userData.legs as Group[]).length).toBe(4)
    expect(sizeOf(g).y).toBeGreaterThan(1.2)
    expect(sizeOf(g).z).toBeGreaterThan(0.5)
    let meshes = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      meshes += 1
      assertNotPrimitive(obj.geometry)
      const mat = obj.material as MeshLambertMaterial
      expect(mat.map || mat.color).toBeTruthy()
    })
    expect(meshes).toBeGreaterThan(4)
  })

  it('instances land bodies from triangle glTF, not runtime primitives', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      const geo = bodyGeo(g)
      assertNotPrimitive(geo)
      expect(geo.getAttribute('position').count).toBeGreaterThan(200)
      expect((g.userData.legs as Group[]).length).toBe(4)
      expect((g.userData.clips as string[]).includes('walk')).toBe(true)
    }
  })

  it('extrudes a silhouette with thickness on Z', () => {
    const geo = profileVolume(DEER_BODY, 0.2)
    geo.computeBoundingBox()
    const b = geo.boundingBox!
    expect(b.max.z - b.min.z).toBeGreaterThan(0.3)
    expect(b.max.x - b.min.x).toBeGreaterThan(1.5)
  })

  it('plants four straight legs on the ground', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      tickWalk(g, 0, false)
      const box = new Box3().setFromObject(g)
      expect(box.min.y).toBeGreaterThan(-0.08)
      expect(box.min.y).toBeLessThan(0.08)
      const legs = g.userData.legs as Group[]
      expect(legs).toHaveLength(4)
      for (const leg of legs) {
        expect(Math.abs(leg.rotation.z)).toBeLessThan(0.08)
        const s = new Box3().setFromObject(leg).getSize(new Vector3())
        expect(s.x).toBeGreaterThan(0.12)
        expect(s.y).toBeGreaterThan(0.2)
        expect(s.y / Math.max(s.x, 0.01)).toBeLessThan(4.5)
      }
    }
  })

  it('keeps a coat map on every species', () => {
    for (const id of ANIMAL_IDS) {
      const g = createAnimalModel(id, { body: '#3b82f6' })
      expect(g.userData.coat).toBeTruthy()
    }
  })

  it('gives legs opaque closed volumes outside the torso', () => {
    const g = createAnimalModel('deer', {})
    const legs = g.userData.legs as Group[]
    const worlds = legs.map((leg) => {
      const v = new Vector3()
      leg.getWorldPosition(v)
      return v
    })
    const xs = worlds.map((v) => v.x)
    const zs = worlds.map((v) => v.z)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.3)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.3)
    for (const leg of legs) {
      expect(leg.position.y).toBeGreaterThan(0.12)
      expect(leg.position.y).toBeLessThan(0.7)
      let shafts = 0
      leg.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        assertNotPrimitive(obj.geometry)
        const mat = obj.material as MeshLambertMaterial
        expect(mat.transparent).toBe(false)
        expect(mat.opacity).toBe(1)
        expect(mat.depthWrite).toBe(true)
        expect(mat.side).toBe(FrontSide)
        expect(obj.geometry.getAttribute('position').count).toBeGreaterThanOrEqual(80)
        shafts += 1
      })
      expect(shafts).toBeGreaterThan(0)
    }
  })

  it('builds marine animals that swim without land legs', () => {
    const fish = createAnimalModel('fish', {})
    const turtle = createAnimalModel('turtle', {})
    const dolphin = createAnimalModel('dolphin', {})
    expect(fish.userData.marine).toBe(true)
    expect(turtle.userData.marine).toBe(true)
    expect(dolphin.userData.marine).toBe(true)
    expect(fish.userData.legs).toEqual([])
    tickAction(fish, 'swim', 0.8)
    tickAction(dolphin, 'swim', 0.8)
    const tail = dolphin.userData.tail as Group | undefined
    expect(tail).toBeTruthy()
    expect(Math.abs(tail!.rotation.y)).toBeGreaterThan(0.1)
  })

  it('keeps sit, drink, and rest poses on land animals', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      tickAction(g, 'sit', 0)
      expect(g.rotation.x).toBeGreaterThan(0.1)
      tickAction(g, 'drink', 0)
      expect(g.rotation.z).toBeLessThan(-0.4)
      tickAction(g, 'rest', 0)
      expect(g.rotation.z).toBeGreaterThan(0.8)
    }
  })

  it('keeps every animal mesh opaque', () => {
    for (const id of ANIMAL_IDS) {
      const g = createAnimalModel(id, { body: '#e24b4b' })
      g.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        const mat = obj.material
        if (Array.isArray(mat)) return
        if ('transparent' in mat) expect(mat.transparent).toBe(false)
        if ('opacity' in mat) expect(mat.opacity).toBe(1)
        if ('depthWrite' in mat) expect(mat.depthWrite).toBe(true)
      })
    }
  })

  it('does not lift a walking deer off the ground', () => {
    const g = createAnimalModel('deer', {})
    tickAction(g, 'walk', 1.2)
    const box = new Box3().setFromObject(g)
    expect(box.min.y).toBeGreaterThan(-0.12)
    expect(box.min.y).toBeLessThan(0.12)
    expect(g.position.y).toBe(0)
  })

  it('closes silhouette caps so the flank faces outward', () => {
    const geo = profileVolume(DEER_BODY, 0.2)
    const pos = geo.getAttribute('position')
    const nrm = geo.getAttribute('normal')
    let maxZ = -Infinity
    let maxI = 0
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i)
      if (z > maxZ) {
        maxZ = z
        maxI = i
      }
    }
    expect(maxZ).toBeGreaterThan(0.15)
    expect(nrm.getZ(maxI)).toBeGreaterThan(0)
  })

  it('tints the Kenney coat without dropping the atlas map', () => {
    const g = createAnimalModel('lion', { body: '#3b82f6' })
    let bodyMaps = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      if (obj.name !== 'body') return
      const mat = obj.material as MeshLambertMaterial
      expect(mat.map).toBeTruthy()
      expect(mat.color.getHexString()).toBe('3b82f6')
      bodyMaps += 1
    })
    expect(bodyMaps).toBeGreaterThan(0)
  })
})
