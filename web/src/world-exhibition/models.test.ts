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
    if (obj instanceof Mesh && obj.userData.region === 'body') geo = obj.geometry as BufferGeometry
  })
  if (!geo) throw new Error('missing body')
  return geo
}

describe('3D animal volumes', () => {
  beforeAll(async () => {
    await loadAnimalTemplates()
  }, 30000)

  it('builds a deer that is long, tall, and has chest depth', () => {
    const g = createAnimalModel('deer', { body: '#e24b4b' })
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.5)
    expect(s.y).toBeGreaterThan(1.6)
    expect(s.z).toBeGreaterThan(0.5)
    expect((g.userData.legs as Group[]).length).toBe(4)
    let spots = 0
    g.traverse((obj) => {
      if (String(obj.userData.region || '').startsWith('spot')) spots += 1
    })
    expect(spots).toBeGreaterThan(5)
    g.traverse((obj) => {
      if (!(obj instanceof Mesh) || !String(obj.userData.region || '').startsWith('spot')) return
      expect(obj.geometry.type).toBe('BufferGeometry')
      expect(obj.geometry.type).not.toBe('SphereGeometry')
    })
  })

  it('builds a tiger with a feline head and four legs', () => {
    const g = createAnimalModel('tiger', {})
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.7)
    expect(s.z).toBeGreaterThan(0.5)
    expect((g.userData.legs as Group[]).length).toBe(4)
  })

  it('builds a lion with a fused mane mesh, not a torus of capsules', () => {
    const g = createAnimalModel('lion', {})
    let mane = 0
    let maneVerts = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh) || obj.userData.region !== 'mane') return
      mane += 1
      maneVerts += obj.geometry.getAttribute('position').count
      expect(obj.geometry.type).not.toBe('TorusGeometry')
      expect(obj.geometry.type).not.toBe('CapsuleGeometry')
      expect(obj.geometry.type).not.toBe('CylinderGeometry')
      expect(obj.geometry.type).not.toBe('SphereGeometry')
    })
    expect(mane).toBe(1)
    expect(maneVerts).toBeGreaterThan(200)
    expect(sizeOf(g).y).toBeGreaterThan(1.2)
    expect(sizeOf(g).z).toBeGreaterThan(0.5)
    const eyes = g.userData.eyes as Group[]
    expect(eyes.length).toBe(2)
    for (const eye of eyes) {
      const s = new Box3().setFromObject(eye).getSize(new Vector3())
      expect(s.y).toBeGreaterThan(0.18)
    }
  })

  it('instances land bodies from triangle glTF, not runtime primitives', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      const geo = bodyGeo(g)
      expect(geo.type).toBe('BufferGeometry')
      expect(geo.type).not.toBe('SphereGeometry')
      expect(geo.type).not.toBe('CapsuleGeometry')
      expect(geo.type).not.toBe('CylinderGeometry')
      expect(geo.getAttribute('position').count).toBeGreaterThan(400)
      expect((g.userData.legs as Group[]).length).toBe(4)
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
        expect(Math.abs(leg.rotation.z)).toBeLessThan(0.001)
        const s = new Box3().setFromObject(leg).getSize(new Vector3())
        expect(s.x).toBeGreaterThan(0.16)
        expect(s.y).toBeGreaterThan(0.28)
        expect(s.y / s.x).toBeLessThan(3.2)
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
    const zs = legs.map((leg) => leg.position.z)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.4)
    for (const leg of legs) {
      expect(Math.abs(leg.position.z)).toBeGreaterThan(0.2)
      expect(leg.position.y).toBeGreaterThan(0.35)
      expect(leg.position.y).toBeLessThan(0.55)
      let shafts = 0
      leg.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        if (!String(obj.userData.region || '').startsWith('leg')) return
        expect(obj.geometry.type).not.toBe('CapsuleGeometry')
        expect(obj.geometry.type).not.toBe('CylinderGeometry')
        expect(obj.geometry.type).not.toBe('SphereGeometry')
        const mat = obj.material as MeshLambertMaterial
        expect(mat.transparent).toBe(false)
        expect(mat.opacity).toBe(1)
        expect(mat.depthWrite).toBe(true)
        expect(mat.side).toBe(FrontSide)
        expect(obj.geometry.getAttribute('position').count).toBeGreaterThan(80)
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
    expect(Math.abs((dolphin.userData.tail as Group).rotation.y)).toBeGreaterThan(0.1)
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
})
