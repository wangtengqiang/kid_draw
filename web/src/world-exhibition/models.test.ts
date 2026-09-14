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

describe('downloaded Kenney Cube Pets + Gobkit glTF', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads Kenney Cube Pets GLBs as the default lion/deer/tiger', async () => {
    await loadShipped()

    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.kind).toBe(kind)
      expect(group.userData.source).toBe('gltf')
      expect(group.userData.pack).toBe('kenney-cube-pets')
      expect(group.getObjectByName('body')).toBeTruthy()
      expect(group.getObjectByName('leg-front-left')).toBeTruthy()
      expect(group.getObjectByName('leg-front-right')).toBeTruthy()
      expect(group.getObjectByName('leg-back-left')).toBeTruthy()
      expect(group.getObjectByName('leg-back-right')).toBeTruthy()
      expect(group.getObjectByName('iris-left')).toBeFalsy()
      expect(group.getObjectByName('iris-right')).toBeFalsy()
      expect(group.getObjectByName('outline')).toBeFalsy()
      if (kind !== 'deer') expect(group.getObjectByName('tail')).toBeTruthy()

      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
      expect(body.geometry.getAttribute('position').count).toBeGreaterThan(200)
      const mat = body.material as THREE.MeshLambertMaterial
      expect(mat.map).toBeTruthy()
      expect(mat.transparent).toBe(false)
      expect(mat.opacity).toBe(1)
    }
  })

  it('Kenney lion/deer/tiger GLBs ship a walk clip the mixer can play', async () => {
    for (const name of ['lion', 'deer', 'tiger'] as const) {
      const names = (glbJson(`models/${name}.glb`).animations || []).map((c) => c.name)
      expect(names).toContain('walk')
      expect(names).toContain('idle')
    }

    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    const active = lion.userData.activeClip as THREE.AnimationAction
    expect(active.getClip().name).toBe('walk')
  })

  it('does not ship clay metaballs, sticker eyes, or capsule primitives', () => {
    const json = glbJson('models/lion.glb')
    const names = (json.nodes || []).map((n) => n.name || '')
    expect(names).not.toContain('clay-body')
    expect(names).not.toContain('iris-left')
    expect(names.some((n) => n.startsWith('ball-'))).toBe(false)
    expect(json.asset?.generator ?? '').not.toMatch(/kid-draw-metaball|kid-draw-original/i)
    expect(json.asset?.generator ?? '').toMatch(/UnityGLTF|Khronos|Blender|gltf/i)
  })

  it('Gobkit whale/seal remain the marine stand-ins', async () => {
    await loadShipped()
    const dolphin = createAnimalModel('dolphin', { body: '#ffffff' })
    const turtle = createAnimalModel('turtle', { body: '#ffffff' })
    expect(dolphin.userData.pack).toBe('gobkit')
    expect(turtle.userData.pack).toBe('gobkit')
    expect(dolphin.children.length).toBeGreaterThan(0)
    expect(playAnimalClip(dolphin, 'walk', 0.016)).toBe(true)
  })

  it('kid coloring tints the Kenney coat but keeps it opaque', async () => {
    await loadShipped()
    const group = createAnimalModel('lion', { body: '#e24b4b' })
    const body = group.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(mat.transparent).toBe(false)
    expect(mat.opacity).toBe(1)
    expect(mat.map).toBeTruthy()
    expect(mat.color.getHexString()).toBe('e24b4b')
  })

  it('createAnimalModel still returns opaque GPU-safe meshes with a mixer', async () => {
    await loadShipped()
    const group = createAnimalModel('lion', { body: '#ffffff' })
    expect(group.userData.mixer).toBeInstanceOf(THREE.AnimationMixer)
    group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        expect(m.transparent).toBe(false)
        expect(m.opacity).toBe(1)
      }
    })
  })
})
