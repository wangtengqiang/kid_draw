import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel } from './models'
import { applyLandView, pickLandView } from './cartoon-rig'
import { ART_CUTOUT_PACK } from './art-cutout'
import { LION_BONE_NAMES, LION_MESH_PACK } from './lion-volume'
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

describe('land layer 2: lion mesh, deer/tiger cutouts', () => {
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

  it('builds a connected lion volume with the cartoon coat, not a loft glTF or Kenney cube', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.userData.pack).toBe(LION_MESH_PACK)
    expect(lion.userData.source).toBe('lion-mesh')
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    expect(body).toBeInstanceOf(THREE.SkinnedMesh)
    expect(body.visible).toBe(true)
    expect(body.geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(body.geometry).not.toBeInstanceOf(THREE.PlaneGeometry)
    expect(body.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
    const pos = body.geometry.getAttribute('position')
    expect(pos.count).toBeGreaterThan(80)
    const uv = body.geometry.getAttribute('uv')
    expect(uv).toBeTruthy()
    const mat = body.material as THREE.MeshLambertMaterial
    expect(mat.map).toBeTruthy()
    lion.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(lion)
    const size = box.getSize(new THREE.Vector3())
    expect(size.y).toBeGreaterThan(0.8)
    expect(size.z).toBeGreaterThan(0.12)
    expect(lion.userData.pack).not.toBe('land-gltf')
    expect(lion.userData.pack).not.toBe('kenney-cube-pets')
  })

  it('binds quadruped bones and plays a walk clip on the lion only', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    const names = body.skeleton.bones.map((b) => b.name)
    for (const name of LION_BONE_NAMES) expect(names).toContain(name)
    expect(lion.userData.clips).toEqual(expect.arrayContaining(['walk', 'idle']))
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('walk')
  })

  it('yaws the lion mesh instead of swapping a front PNG card', async () => {
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
  })

  it('still swaps deer/tiger views instead of yawing their cutouts', async () => {
    await loadShipped()
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
    camera.position.set(0, 1.2, 4)
    expect(pickLandView('walk', Math.PI / 2, 0).view).toBe('side')
    applyLandView(deer, camera, 'walk', Math.PI / 2)
    expect(deer.rotation.y).toBe(0)
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
