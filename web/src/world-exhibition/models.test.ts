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

function bodyMeshes(group: Group): Mesh[] {
  const out: Mesh[] = []
  group.traverse((obj) => {
    if (obj instanceof Mesh && obj.userData.region === 'body') out.push(obj)
  })
  return out
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

  it('builds a Quaternius stag with walk clip and four leg bones', () => {
    const g = createAnimalModel('deer', { body: '#e24b4b' })
    const s = sizeOf(g)
    expect(s.x).toBeGreaterThan(1.0)
    expect(s.y).toBeGreaterThan(1.5)
    expect(s.z).toBeGreaterThan(0.4)
    expect((g.userData.legs as Group[]).length).toBe(4)
    const clips = (g.userData.clips as string[]).map((c) => c.toLowerCase())
    expect(clips.some((c) => c === 'walk')).toBe(true)
    const bodies = bodyMeshes(g)
    expect(bodies.length).toBeGreaterThan(0)
    assertNotPrimitive(bodies[0]!.geometry)
    expect(bodies[0]!.geometry.getAttribute('position').count).toBeGreaterThan(200)
  })

  it('builds a Zsky feline tiger stand-in, not capsules', () => {
    const g = createAnimalModel('tiger', {})
    const s = sizeOf(g)
    expect(s.y).toBeGreaterThan(1.2)
    expect(s.z).toBeGreaterThan(0.4)
    const bodies = bodyMeshes(g)
    expect(bodies.length).toBeGreaterThan(0)
    assertNotPrimitive(bodies[0]!.geometry)
  })

  it('builds a Zsky lion with a separate eye mesh, not marching cubes', () => {
    const g = createAnimalModel('lion', {})
    expect(sizeOf(g).y).toBeGreaterThan(1.2)
    const eyes = g.userData.eyes as Group[]
    expect(eyes.length).toBeGreaterThan(0)
    let meshes = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      if (obj.userData.outline) return
      if (['eye', 'iris', 'pupil', 'shine'].includes(String(obj.userData.region))) return
      meshes += 1
      assertNotPrimitive(obj.geometry)
    })
    expect(meshes).toBeGreaterThan(1)
    expect(bodyMeshes(g).length).toBeGreaterThan(0)
    let irises = 0
    g.traverse((obj) => {
      if (obj.userData.region === 'iris') irises += 1
    })
    expect(irises).toBeGreaterThan(1)
  })

  it('instances land bodies from triangle glTF, not runtime primitives', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      const bodies = bodyMeshes(g)
      expect(bodies.length).toBeGreaterThan(0)
      assertNotPrimitive(bodies[0]!.geometry)
      expect(bodies[0]!.geometry.getAttribute('position').count).toBeGreaterThan(200)
    }
  })

  it('extrudes a silhouette with thickness on Z', () => {
    const geo = profileVolume(DEER_BODY, 0.2)
    geo.computeBoundingBox()
    const b = geo.boundingBox!
    expect(b.max.z - b.min.z).toBeGreaterThan(0.3)
    expect(b.max.x - b.min.x).toBeGreaterThan(1.5)
  })

  it('plants land animals on the ground', () => {
    for (const id of LAND_IDS) {
      const g = createAnimalModel(id, {})
      tickWalk(g, 0, false)
      const box = new Box3().setFromObject(g)
      expect(box.min.y).toBeGreaterThan(-0.12)
      expect(box.min.y).toBeLessThan(0.12)
    }
  })

  it('keeps a coat map on every species', () => {
    for (const id of ANIMAL_IDS) {
      const g = createAnimalModel(id, { body: '#3b82f6' })
      expect(g.userData.coat).toBeTruthy()
    }
  })

  it('gives the stag opaque closed volumes', () => {
    const g = createAnimalModel('deer', {})
    const legs = g.userData.legs as Group[]
    expect(legs).toHaveLength(4)
    const worlds = legs.map((leg) => {
      const v = new Vector3()
      leg.getWorldPosition(v)
      return v
    })
    const xs = worlds.map((v) => v.x)
    const zs = worlds.map((v) => v.z)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.2)
    g.traverse((obj) => {
      if (!(obj instanceof Mesh)) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const mat of mats) {
        if (!('transparent' in mat)) continue
        const m = mat as MeshLambertMaterial
        expect(m.transparent).toBe(false)
        expect(m.opacity).toBe(1)
        expect(m.depthWrite).toBe(true)
        if (!obj.userData.outline) expect(m.side).toBe(FrontSide)
      }
    })
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
        const mats = Array.isArray(mat) ? mat : [mat]
        for (const m of mats) {
          if ('transparent' in m) expect(m.transparent).toBe(false)
          if ('opacity' in m) expect(m.opacity).toBe(1)
          if ('depthWrite' in m) expect(m.depthWrite).toBe(true)
        }
      })
    }
  })

  it('does not lift a walking deer off the ground', () => {
    const g = createAnimalModel('deer', {})
    tickAction(g, 'walk', 1.2)
    const box = new Box3().setFromObject(g)
    expect(box.min.y).toBeGreaterThan(-0.2)
    expect(box.min.y).toBeLessThan(0.2)
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

  it('tints the Zsky lion coat without painting the eyes', () => {
    const g = createAnimalModel('lion', { body: '#3b82f6' })
    let bodyTinted = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh) || obj.userData.outline) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      if (obj.userData.region === 'body') {
        const named = mats.find((m) => /fur|main|body/i.test(m.name || '')) || mats[0]
        expect((named as MeshLambertMaterial).color.getHexString()).toBe('3b82f6')
        bodyTinted += 1
      }
    })
    expect(bodyTinted).toBeGreaterThan(0)
  })

  it('bakes tiger stripes onto the coat map', () => {
    const g = createAnimalModel('tiger', { body: '#e89a2d' })
    let mapped = 0
    g.traverse((obj) => {
      if (!(obj instanceof Mesh) || obj.userData.region !== 'body' || obj.userData.outline) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      if ((mats[0] as MeshLambertMaterial).map) mapped += 1
    })
    expect(mapped).toBeGreaterThan(0)
  })
})
