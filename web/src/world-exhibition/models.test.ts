import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel } from './models'

const PUBLIC = resolve(process.cwd(), 'public')

function bytesOf(file: string): ArrayBuffer {
  const buf = readFileSync(resolve(PUBLIC, file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function glbJson(file: string): {
  asset?: { generator?: string }
  nodes?: { name?: string }[]
  animations?: { name?: string }[]
  skins?: unknown[]
} {
  const buf = readFileSync(resolve(PUBLIC, file))
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const chunkLen = dv.getUint32(12, true)
  const jsonBytes = buf.subarray(20, 20 + chunkLen)
  return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\0+$/, '')) as {
    asset?: { generator?: string }
    nodes?: { name?: string }[]
    animations?: { name?: string }[]
    skins?: unknown[]
  }
}

describe('industry glTF pipeline (Quaternius + Zsky + Gobkit)', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads Quaternius stag/wolf as deer/tiger with Walk clips and a skeleton', async () => {
    const deer = glbJson('models/deer.glb')
    const tiger = glbJson('models/tiger.glb')
    expect(deer.asset?.generator ?? '').toMatch(/Khronos glTF Blender/i)
    expect((deer.animations || []).map((c) => c.name)).toContain('Walk')
    expect((deer.animations || []).map((c) => c.name)).toContain('Idle')
    expect((deer.animations || []).map((c) => c.name)).toContain('Eating')
    expect((tiger.animations || []).map((c) => c.name)).toContain('Walk')
    expect((deer.skins || []).length).toBeGreaterThan(0)
    expect((deer.nodes || []).map((n) => n.name)).toContain('FrontLowerLeg.L')
    expect((tiger.nodes || []).map((n) => n.name)).toContain('FrontLowerLeg.L')

    await loadShipped()
    const group = createAnimalModel('deer', { body: '#c9965a' })
    expect(group.userData.pack).toBe('quaternius')
    expect(group.userData.source).toBe('gltf')
    expect(group.getObjectByName('FrontLowerLegL')).toBeTruthy()
    expect(group.getObjectByName('iris-left')).toBeFalsy()
    expect(playAnimalClip(group, 'walk', 0.016)).toBe(true)
    expect((group.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('Walk')
    expect(playAnimalClip(group, 'eat', 0.016)).toBe(true)

    let skinned = false
    group.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true
    })
    expect(skinned).toBe(true)
  })

  it('loads Zsky lion mesh with original eyes, no sticker pupils, no sphere mane overlay', async () => {
    const json = glbJson('models/lion.glb')
    const names = (json.nodes || []).map((n) => n.name || '')
    expect(names).toContain('Lion')
    expect(names).toContain('Eyes_Lion')
    expect(names).not.toContain('iris-left')
    expect(names).not.toContain('clay-body')
    expect(json.asset?.generator ?? '').toMatch(/Khronos glTF Blender/i)
    expect(json.asset?.generator ?? '').not.toMatch(/kid-draw-metaball|kid-draw-original/i)

    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#e6c36a' })
    expect(lion.userData.pack).toBe('zsky')
    expect(lion.getObjectByName('Eyes_Lion')).toBeTruthy()
    expect(lion.getObjectByName('iris-left')).toBeFalsy()
    expect(lion.getObjectByName('outline')).toBeFalsy()
    const eye = lion.getObjectByName('Eyes_Lion') as THREE.Mesh
    expect(eye.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
  })

  it('puts kid coloring on the coat UV map, not as a tinted primitive', async () => {
    await loadShipped()
    const tiger = createAnimalModel('tiger', { body: '#e89a2d' })
    expect(tiger.userData.pack).toBe('quaternius')
    expect(playAnimalClip(tiger, 'walk', 0.016)).toBe(true)
    let foundCoat = false
    tiger.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        expect(m.transparent).toBe(false)
        expect(m.opacity).toBe(1)
        if (m instanceof THREE.MeshLambertMaterial && m.map instanceof THREE.CanvasTexture && mesh.userData.region !== 'eye') {
          foundCoat = true
          expect(m.color.getHexString()).toBe('ffffff')
        }
        expect(mesh.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
        expect(mesh.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
      }
    })
    expect(foundCoat).toBe(true)
  })

  it('Gobkit whale/seal remain marine stand-ins with mixer clips', async () => {
    await loadShipped()
    const dolphin = createAnimalModel('dolphin', { body: '#5b6d7a' })
    expect(dolphin.userData.pack).toBe('gobkit')
    expect(playAnimalClip(dolphin, 'walk', 0.016)).toBe(true)
  })
})
