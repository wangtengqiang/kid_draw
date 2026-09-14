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

  it('loads Quaternius stag/wolf/fox as deer/tiger/lion with Walk clips and a skeleton', async () => {
    for (const file of ['deer', 'tiger', 'lion'] as const) {
      const json = glbJson(`models/${file}.glb`)
      expect(json.asset?.generator ?? '').toMatch(/Khronos glTF Blender/i)
      expect((json.animations || []).map((c) => c.name)).toContain('Walk')
      expect((json.animations || []).map((c) => c.name)).toContain('Idle')
      expect((json.skins || []).length).toBeGreaterThan(0)
      expect((json.nodes || []).map((n) => n.name)).toContain('FrontLowerLeg.L')
    }

    await loadShipped()
    const group = createAnimalModel('deer', { body: '#c9965a' })
    expect(group.userData.pack).toBe('quaternius')
    expect(group.userData.source).toBe('gltf')
    expect(group.getObjectByName('FrontLowerLegL')).toBeTruthy()
    expect(group.getObjectByName('iris-left')).toBeFalsy()
    expect(playAnimalClip(group, 'walk', 0.016)).toBe(true)
    expect((group.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('Walk')
    expect(playAnimalClip(group, 'eat', 0.016)).toBe(true)

    const lion = createAnimalModel('lion', { body: '#e6c36a' })
    expect(lion.userData.pack).toBe('quaternius')
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)

    let skinned = false
    group.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true
    })
    expect(skinned).toBe(true)
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
