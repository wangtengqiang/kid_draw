import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel } from './models'
import type { AnimalId } from '../types'

const PUBLIC = resolve(process.cwd(), 'public')

function bytesOf(file: string): ArrayBuffer {
  const buf = readFileSync(resolve(PUBLIC, file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function glbJson(file: string): {
  asset?: { generator?: string }
  nodes?: { name?: string }[]
  animations?: { name?: string }[]
} {
  const buf = readFileSync(resolve(PUBLIC, file))
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const chunkLen = dv.getUint32(12, true)
  const jsonBytes = buf.subarray(20, 20 + chunkLen)
  return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\0+$/, '')) as {
    asset?: { generator?: string }
    nodes?: { name?: string }[]
    animations?: { name?: string }[]
  }
}

describe('Kenney Cube Pets as real-species lion/deer/tiger', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads Kenney animal-lion/deer/tiger GLBs, not fox or wolf stand-ins', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const json = glbJson(`models/${kind}.glb`)
      const nodes = (json.nodes || []).map((n) => n.name || '')
      expect(nodes).toContain(`animal-${kind}`)
      expect(nodes).toContain('body')
      expect(nodes).toContain('leg-front-left')
      expect((json.animations || []).map((c) => c.name)).toContain('walk')
      expect(json.asset?.generator ?? '').toMatch(/UnityGLTF/i)

      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe('kenney-cube-pets')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
      expect(group.getObjectByName('iris-left')).toBeFalsy()
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
      const mat = body.material as THREE.MeshLambertMaterial
      expect(mat.map).toBeTruthy()
      expect(mat.transparent).toBe(false)
    }
  })

  it('plays the Kenney walk clip on the lion', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('walk')
  })

  it('kid coloring tints the Kenney coat and keeps it opaque', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#e24b4b' })
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(mat.color.getHexString()).toBe('e24b4b')
    expect(mat.map).toBeTruthy()
    expect(mat.opacity).toBe(1)
  })

  it('Gobkit whale/seal remain marine stand-ins', async () => {
    await loadShipped()
    const dolphin = createAnimalModel('dolphin', { body: '#ffffff' })
    expect(dolphin.userData.pack).toBe('gobkit')
    expect(playAnimalClip(dolphin, 'walk', 0.016)).toBe(true)
  })
})
