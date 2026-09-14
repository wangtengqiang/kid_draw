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

describe('authored standing quads as default land lion/deer/tiger', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads standing quads, not Kenney cubes or fox/wolf stand-ins', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const json = glbJson(`models/${kind}.glb`)
      const nodes = (json.nodes || []).map((n) => n.name || '')
      expect(nodes).toContain(`animal-${kind}`)
      expect(nodes).toContain('body')
      expect(nodes).toContain('leg-front-left')
      expect(nodes).toContain('eyeL')
      expect(nodes).toContain('muzzle')
      expect(nodes).not.toContain('fox')
      expect(nodes).not.toContain('wolf')
      expect((json.animations || []).map((c) => c.name)).toEqual(expect.arrayContaining(['walk', 'idle', 'eat', 'static']))
      expect(json.asset?.generator ?? '').toMatch(/GLTFExporter/i)

      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe('standing-quad')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
      expect(group.getObjectByName('eyeL')).toBeTruthy()
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
      body.geometry.computeBoundingBox()
      const size = body.geometry.boundingBox!.getSize(new THREE.Vector3())
      expect(size.z).toBeGreaterThan(size.y)
      const mat = body.material as THREE.MeshLambertMaterial
      expect(mat.transparent).toBe(false)
      expect(mat.color.getHexString()).not.toBe('ffffff')
    }
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const mane = lion.getObjectByName('mane') as THREE.Mesh
    expect(mane).toBeTruthy()
    mane.geometry.computeBoundingBox()
    const maneSize = mane.geometry.boundingBox!.getSize(new THREE.Vector3())
    expect(maneSize.z).toBeGreaterThan(0.45)
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    expect(deer.getObjectByName('antler-left')).toBeTruthy()
    const tiger = createAnimalModel('tiger', { body: '#ffffff' })
    expect(tiger.getObjectByName('mane')).toBeFalsy()
  })

  it('plays the walk clip on the lion', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('walk')
  })

  it('kid coloring tints the coat and keeps eyes authored', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#e24b4b' })
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(mat.color.getHexString()).toBe('e24b4b')
    expect(mat.opacity).toBe(1)
    const iris = lion.getObjectByName('irisL') as THREE.Mesh
    expect((iris.material as THREE.MeshLambertMaterial).color.getHexString()).not.toBe('e24b4b')
  })

  it('kid paintboard stripes become the body map, not a single averaged tint', async () => {
    await loadShipped()
    const data = new Uint8Array([204, 34, 68, 255, 17, 68, 170, 255, 204, 34, 68, 255, 17, 68, 170, 255])
    const paper = new THREE.DataTexture(data, 2, 2)
    paper.needsUpdate = true
    const lion = createAnimalModel('lion', { body: '#e24b4b' }, paper)
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(mat.color.getHexString()).toBe('ffffff')
    expect(mat.map).toBe(lion.userData.drawing)
    const uv = body.geometry.getAttribute('uv')
    expect(uv).toBeTruthy()
    expect(uv.count).toBeGreaterThan(8)
    const pix = (mat.map as THREE.DataTexture).image.data
    expect(pix[0]).toBe(204)
    expect(pix[4]).toBe(17)
  })

  it('Gobkit whale/seal remain marine stand-ins', async () => {
    await loadShipped()
    const dolphin = createAnimalModel('dolphin', { body: '#ffffff' })
    expect(dolphin.userData.pack).toBe('gobkit')
    expect(playAnimalClip(dolphin, 'walk', 0.016)).toBe(true)
  })
})
