import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider, LAND_GLTF_PACK } from './gltf-kit'
import { createAnimalModel } from './models'
import { applyLandView, pickLandView } from './cartoon-rig'
import { ART_CUTOUT_PACK } from './art-cutout'
import type { AnimalId } from '../types'

const PUBLIC = resolve(process.cwd(), 'public')

function bytesOf(file: string): ArrayBuffer {
  const buf = readFileSync(resolve(PUBLIC, file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function glbJson(file: string): {
  nodes?: { name?: string }[]
} {
  const buf = readFileSync(resolve(PUBLIC, file))
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const chunkLen = dv.getUint32(12, true)
  const jsonBytes = buf.subarray(20, 20 + chunkLen)
  return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\0+$/, '')) as {
    nodes?: { name?: string }[]
  }
}

describe('land: lion glTF, deer/tiger cutouts', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('keeps deer and tiger as approved cartoon cutouts', async () => {
    await loadShipped()
    for (const kind of ['deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(ART_CUTOUT_PACK)
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect(body.visible).toBe(true)
    }
  })

  it('loads a connected lion glTF with coat, neck bone, and walk — not a plane, cube, or fox', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.userData.pack).toBe(LAND_GLTF_PACK)
    expect(lion.userData.source).toBe('land-gltf')
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    expect(body).toBeInstanceOf(THREE.SkinnedMesh)
    expect(body.geometry).not.toBeInstanceOf(THREE.PlaneGeometry)
    expect(body.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    const names: string[] = []
    lion.traverse((o) => names.push(o.name))
    expect(names).toEqual(expect.arrayContaining(['neck', 'head', 'hips', 'leg-front-left']))
    expect(names.join(' ')).not.toMatch(/fox|wolf/i)
    expect(lion.userData.clips).toEqual(expect.arrayContaining(['walk']))
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    lion.updateMatrixWorld(true)
    const size = new THREE.Box3().setFromObject(lion).getSize(new THREE.Vector3())
    expect(size.y).toBeGreaterThan(0.8)
    expect(size.z).toBeGreaterThan(0.35)
    const json = glbJson('models/lion.glb')
    expect((json.nodes || []).some((n) => n.name === 'neck')).toBe(true)
  })

  it('yaws the lion mesh and still swaps deer/tiger views', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    lion.rotation.y = 1.1
    lion.updateMatrixWorld(true)
    const body = lion.getObjectByName('body') as THREE.Mesh
    expect(body.visible).toBe(true)
    const q = new THREE.Quaternion()
    body.getWorldQuaternion(q)
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ')
    expect(Math.abs(euler.y)).toBeGreaterThan(0.4)

    const deer = createAnimalModel('deer', { body: '#ffffff' })
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
    camera.position.set(0, 1.2, 4)
    expect(pickLandView('walk', Math.PI / 2, 0).view).toBe('side')
    applyLandView(deer, camera, 'walk', Math.PI / 2)
    expect(deer.rotation.y).toBe(0)
  })

  it('kid coloring does not recolor authored eyes on cutouts', async () => {
    await loadShipped()
    const deer = createAnimalModel('deer', { body: '#e24b4b' })
    const iris = deer.getObjectByName('irisL') as THREE.Mesh
    expect((iris.material as THREE.MeshLambertMaterial).color.getHexString()).not.toBe('e24b4b')
    expect((deer.getObjectByName('body') as THREE.Mesh).visible).toBe(true)
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
