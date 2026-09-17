import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
import { createAnimalModel, tickAction } from './models'
import { CUTOUT_SRC } from './art-cutout'
import { CARTOON_RIG_PACK, LAND_BONE_NAMES, VIEW_SRC, applyLandView, facesHostCamera, keepPawsOnPath, pickLandView } from './cartoon-rig'
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

describe('rigged cartoon lion/deer/tiger', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('loads one skinned cartoon mesh, not Kenney cubes, fox/wolf, or sphere cubs', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(CARTOON_RIG_PACK)
      expect(group.userData.source).toBe('cartoon-rig')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
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
      expect(body.userData.rigged).toBe(true)
      expect(body.visible).toBe(false)
      expect(body.userData.ghost).toBe(true)
      const boneNames = body.skeleton.bones.map((b) => b.name)
      for (const name of LAND_BONE_NAMES) expect(boneNames).toContain(name)
      expect(group.userData.clips).toEqual(
        expect.arrayContaining(['walk', 'sit', 'drink', 'sleep', 'idle']),
      )
      const mat = body.material as THREE.MeshLambertMaterial
      expect(mat.vertexColors).toBe(true)
      expect(mat.map).toBeFalsy()
      const portrait = group.getObjectByName('portrait') as THREE.Mesh
      expect(portrait).toBeTruthy()
      expect(portrait.visible).toBe(true)
      expect(portrait.geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect((portrait.material as THREE.MeshLambertMaterial).map).toBeTruthy()
      expect(CUTOUT_SRC[kind]).toMatch(/\/models\/cutouts\/.+\.png/)
      expect(existsSync(resolve(PUBLIC, `models/cutouts/${kind}.png`))).toBe(true)
      expect(existsSync(resolve(PUBLIC, VIEW_SRC[kind].drink.replace(/^\//, '')))).toBe(true)
      expect(existsSync(resolve(PUBLIC, VIEW_SRC[kind].sit.replace(/^\//, '')))).toBe(true)
      expect(existsSync(resolve(PUBLIC, VIEW_SRC[kind].threeQuarter.replace(/^\//, '')))).toBe(true)
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

  it('plays walk, sit, drink and sleep on the same lion skeleton', async () => {
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
  })

  it('swaps front, three-quarter and side sprites instead of yawing the cutout', async () => {
    await loadShipped()
    expect(pickLandView('walk', 0, 0).view).toBe('front')
    expect(pickLandView('walk', 0.85, 0).view).toBe('threeQuarter')
    expect(pickLandView('walk', 1.55, 0).view).toBe('side')
    expect(pickLandView('drink', 0.82, 0).view).toBe('drink')
    expect(pickLandView('sit', -0.78, 0).view).toBe('sit')
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    lion.position.set(0, 0, 0)
    lion.rotation.y = 0.82
    const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 100)
    camera.position.set(0.4, 2.2, 8)
    const picked = applyLandView(lion, camera, 'walk', 0)
    expect(picked.view).toBe('front')
    expect(lion.rotation.y).toBe(0)
    const portrait = lion.getObjectByName('portrait') as THREE.Mesh
    expect(Math.abs(portrait.rotation.x)).toBeLessThan(0.01)
    expect(Math.abs(portrait.rotation.z)).toBeLessThan(0.01)
    expect(Math.abs(portrait.rotation.y)).toBeGreaterThan(0.01)
    expect(existsSync(resolve(PUBLIC, 'models/cutouts/lion-front.png'))).toBe(true)
    expect(existsSync(resolve(PUBLIC, 'models/cutouts/lion-side.png'))).toBe(true)
  })

  it('keeps generated paws on the path and does not cover the cutout with a hull', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const body = lion.getObjectByName('body') as THREE.SkinnedMesh
    const portrait = lion.getObjectByName('portrait') as THREE.Mesh
    expect(body.visible).toBe(false)
    expect(portrait.visible).toBe(true)
    expect(facesHostCamera(lion)).toBe(false)
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
      const box = new THREE.Box3().setFromObject(portrait)
      expect(box.min.y).toBeGreaterThanOrEqual(-0.01)
      expect(body.visible).toBe(false)
      expect(portrait.visible).toBe(true)
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

  it('keeps the cartoon coat when kid paint cannot be composited', async () => {
    await loadShipped()
    const data = new Uint8Array([204, 34, 68, 255, 17, 68, 170, 255, 204, 34, 68, 255, 17, 68, 170, 255])
    const paper = new THREE.DataTexture(data, 2, 2)
    paper.needsUpdate = true
    const lion = createAnimalModel('lion', { body: '#e24b4b' }, paper)
    const body = lion.getObjectByName('body') as THREE.Mesh
    const mat = body.material as THREE.MeshLambertMaterial
    expect(body.userData.rigged).toBe(true)
    expect(mat.map).toBeFalsy()
    expect(mat.map).not.toBe(paper)
    const portrait = lion.getObjectByName('portrait') as THREE.Mesh
    const coat = (portrait.material as THREE.MeshLambertMaterial).map
    expect(coat).toBeTruthy()
    expect(coat).not.toBe(paper)
    const uv = portrait.geometry.getAttribute('uv')
    expect(uv).toBeTruthy()
    expect(uv.count).toBeGreaterThan(3)
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
