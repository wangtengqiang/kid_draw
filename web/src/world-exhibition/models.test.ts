import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { LAND_GLTF_PACK, loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel, tickAction } from './models'
import { LAND_BONE_NAMES, keepPawsOnPath } from './cartoon-rig'
import type { AnimalId } from '../types'

const PUBLIC = resolve(process.cwd(), 'public')

function bytesOf(file: string): ArrayBuffer {
  const buf = readFileSync(resolve(PUBLIC, file))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function glbJson(file: string): {
  asset?: { generator?: string }
  nodes?: { name?: string }[]
  meshes?: { primitives?: { attributes?: Record<string, number> }[] }[]
  skins?: { joints?: number[] }[]
  animations?: { name?: string }[]
} {
  const buf = readFileSync(resolve(PUBLIC, file))
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const chunkLen = dv.getUint32(12, true)
  const jsonBytes = buf.subarray(20, 20 + chunkLen)
  return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\0+$/, '')) as {
    asset?: { generator?: string }
    nodes?: { name?: string }[]
    meshes?: { primitives?: { attributes?: Record<string, number> }[] }[]
    skins?: { joints?: number[] }[]
    animations?: { name?: string }[]
  }
}

describe('land glTF lion/deer/tiger', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads one skinned volume mesh, not Kenney cubes, fox/wolf, sphere cubs, or a PNG plate', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(LAND_GLTF_PACK)
      expect(group.userData.source).toBe('gltf')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
      expect(group.getObjectByName('neck')).toBeTruthy()
      expect(group.getObjectByName('eyeL')).toBeTruthy()
      expect(group.getObjectByName('nose')).toBeTruthy()
      expect(group.getObjectByName('leg-front-left')).toBeTruthy()
      const body = group.getObjectByName('body') as THREE.SkinnedMesh
      expect(body).toBeInstanceOf(THREE.SkinnedMesh)
      expect(body.geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.PlaneGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.CapsuleGeometry)
      expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
      expect(body.visible).toBe(true)
      expect(body.userData.ghost).toBeFalsy()
      const uv = body.geometry.getAttribute('uv')
      expect(uv).toBeTruthy()
      expect(uv.count).toBeGreaterThan(8)
      const joints = body.geometry.getAttribute('skinIndex') || body.geometry.getAttribute('joints')
      expect(joints).toBeTruthy()
      const boneNames = body.skeleton.bones.map((b) => b.name)
      for (const name of LAND_BONE_NAMES) expect(boneNames).toContain(name)
      expect(group.userData.clips).toEqual(
        expect.arrayContaining(['walk', 'idle', 'sit', 'drink', 'sleep', 'turn']),
      )
      expect(group.getObjectByName('portrait')).toBeFalsy()
      const json = glbJson(`models/${kind}.glb`)
      const names = (json.nodes || []).map((n) => n.name || '')
      expect(names.join(' ')).not.toMatch(/fox|wolf/i)
      expect(json.skins?.length).toBeGreaterThan(0)
      const skinned = (json.meshes || []).some((m) =>
        (m.primitives || []).some((p) => p.attributes && 'JOINTS_0' in p.attributes && 'TEXCOORD_0' in p.attributes),
      )
      expect(skinned).toBe(true)
    }
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    lion.updateMatrixWorld(true)
    const lionBox = new THREE.Box3().setFromObject(lion)
    const lionSize = lionBox.getSize(new THREE.Vector3())
    expect(lionSize.z).toBeGreaterThan(lionSize.y * 0.55)
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    deer.updateMatrixWorld(true)
    const deerBox = new THREE.Box3().setFromObject(deer)
    expect(deerBox.max.y - deerBox.min.y).toBeGreaterThan(0.8)
  })

  it('does not use standing-quad sphere GLBs as the land default', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.userData.pack).not.toBe('standing-quad')
    const body = lion.getObjectByName('body') as THREE.Mesh
    expect(body.geometry).not.toBeInstanceOf(THREE.SphereGeometry)
  })

  it('plays walk, sit, drink, sleep and turn on the same lion skeleton', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(playAnimalClip(lion, 'walk', 0.016)).toBe(true)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('walk')
    tickAction(lion, 'sit', 0.8)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('sit')
    tickAction(lion, 'drink', 1.6)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('drink')
    tickAction(lion, 'rest', 2.4)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('sleep')
    expect(playAnimalClip(lion, 'turn', 0.016)).toBe(true)
    expect((lion.userData.activeClip as THREE.AnimationAction).getClip().name).toBe('turn')
  })

  it('yaws the model on Y instead of billboarding a cutout plate', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    lion.rotation.y = 1.12
    lion.updateMatrixWorld(true)
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    expect(body.visible).toBe(true)
    expect(groupHasPlane(lion)).toBe(false)
    const q = new THREE.Quaternion()
    body.getWorldQuaternion(q)
    const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ')
    expect(Math.abs(euler.y)).toBeGreaterThan(0.4)
    expect(Math.abs(euler.x)).toBeLessThan(0.35)
    expect(Math.abs(euler.z)).toBeLessThan(0.35)
  })

  it('keeps generated paws on the path and does not cover the mesh with a hull or PNG', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    expect(body.visible).toBe(true)
    expect(lion.getObjectByName('portrait')).toBeFalsy()
    const mixer = lion.userData.mixer as THREE.AnimationMixer
    const actions = lion.userData.actions as Record<string, THREE.AnimationAction>
    for (const pose of ['walk', 'sit', 'drink', 'rest'] as const) {
      tickAction(lion, pose, 0.8)
      const active = lion.userData.activeClip as THREE.AnimationAction
      for (const clip of Object.values(actions)) {
        if (clip !== active) clip.stop()
      }
      active.enabled = true
      active.setEffectiveWeight(1)
      active.time = 0.8
      mixer.update(0)
      keepPawsOnPath(lion)
      lion.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(lion)
      expect(box.min.y).toBeGreaterThanOrEqual(-0.02)
      expect(body.visible).toBe(true)
    }
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

  it('multiplies kid paint onto coat albedo and keeps mesh UVs', async () => {
    await loadShipped()
    const data = new Uint8Array([204, 34, 68, 255, 17, 68, 170, 255, 204, 34, 68, 255, 17, 68, 170, 255])
    const paper = new THREE.DataTexture(data, 2, 2)
    paper.needsUpdate = true
    const lion = createAnimalModel('lion', { body: '#ffffff' }, paper)
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(body.geometry).not.toBeInstanceOf(THREE.PlaneGeometry)
    const uv = body.geometry.getAttribute('uv')
    expect(uv).toBeTruthy()
    expect(uv.count).toBeGreaterThan(3)
    if (mat.map && lion.userData.drawing) {
      expect(mat.map).toBe(lion.userData.drawing)
      expect(mat.map).not.toBe(paper)
    }
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

function groupHasPlane(root: THREE.Object3D): boolean {
  let hit = false
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.PlaneGeometry && obj.visible) hit = true
  })
  return hit
}
