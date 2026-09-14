import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel } from './models'
import { ART_CUTOUT_PACK, CUTOUT_SRC } from './art-cutout'
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

describe('art cutouts as default land lion/deer/tiger', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads PNG cutouts, not Kenney cubes, fox/wolf, or sphere cubs', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(ART_CUTOUT_PACK)
      expect(group.userData.source).toBe('art-cutout')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
      expect(group.getObjectByName('eyeL')).toBeTruthy()
      expect(group.getObjectByName('muzzle')).toBeTruthy()
      expect(group.getObjectByName('leg-front-left')).toBeTruthy()
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
      expect(body.userData.cutout).toBe(true)
      const mat = body.material as THREE.MeshLambertMaterial
      expect(mat.map).toBeTruthy()
      expect(mat.transparent).toBe(false)
      expect(CUTOUT_SRC[kind]).toMatch(/\/models\/cutouts\/.+\.png/)
      expect(existsSync(resolve(PUBLIC, `models/cutouts/${kind}.png`))).toBe(true)
      const png = readFileSync(resolve(PUBLIC, `models/cutouts/${kind}.png`))
      expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      const names: string[] = []
      group.traverse((o) => names.push(o.name))
      expect(names.join(' ')).not.toMatch(/fox|wolf/i)
    }
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.getObjectByName('mane')).toBeTruthy()
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    expect(deer.getObjectByName('antler-left')).toBeTruthy()
    const tiger = createAnimalModel('tiger', { body: '#ffffff' })
    expect(tiger.getObjectByName('mane')).toBeFalsy()
  })

  it('does not use standing-quad sphere GLBs as the land default', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.userData.pack).not.toBe('standing-quad')
    const body = lion.getObjectByName('body') as THREE.Mesh
    expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
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

  it('keeps the art-cutout sprite when kid paint cannot be composited', async () => {
    await loadShipped()
    const data = new Uint8Array([204, 34, 68, 255, 17, 68, 170, 255, 204, 34, 68, 255, 17, 68, 170, 255])
    const paper = new THREE.DataTexture(data, 2, 2)
    paper.needsUpdate = true
    const lion = createAnimalModel('lion', { body: '#e24b4b' }, paper)
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(body.userData.cutout).toBe(true)
    expect(mat.map).toBeTruthy()
    expect(mat.map).not.toBe(paper)
    const uv = body.geometry.getAttribute('uv')
    expect(uv).toBeTruthy()
    expect(uv.count).toBeGreaterThan(8)
    expect(mat.alphaTest).toBeGreaterThan(0)
  })

  it('Gobkit whale/seal remain marine stand-ins', async () => {
    await loadShipped()
    const dolphin = createAnimalModel('dolphin', { body: '#ffffff' })
    expect(dolphin.userData.pack).toBe('gobkit')
    expect(playAnimalClip(dolphin, 'walk', 0.016)).toBe(true)
    const json = glbJson('models/dolphin.glb')
    expect((json.nodes || []).some((n) => /fox|wolf/i.test(n.name || ''))).toBe(false)
  })
})
