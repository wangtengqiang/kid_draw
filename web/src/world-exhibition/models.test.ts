import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { loadAnimalTemplates, playAnimalClip, setAnimalModelProvider } from './gltf-kit'
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

describe('land layer 1: approved cartoon cutouts', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('puts the generated cartoon on screen and does not load loft glTF', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(ART_CUTOUT_PACK)
      expect(group.userData.source).toBe('art-cutout')
      expect(group.getObjectByName(`animal-${kind}`)).toBeTruthy()
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body).toBeTruthy()
      expect(body.visible).toBe(true)
      expect(body.geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect(body.userData.cutout).toBe(true)
      expect(group.userData.pack).not.toBe('land-gltf')
      expect(group.userData.pack).not.toBe('kenney-cube-pets')
      expect(group.userData.pack).not.toBe('standing-quad')
      let skinned = false
      group.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) skinned = true
      })
      expect(skinned).toBe(false)
    }
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    deer.updateMatrixWorld(true)
    const deerBox = new THREE.Box3().setFromObject(deer)
    expect(deerBox.max.y - deerBox.min.y).toBeGreaterThan(0.8)
  })

  it('swaps front/3-quarter/side art instead of yawing a front PNG into a card', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
    camera.position.set(0, 1.2, 4)
    expect(pickLandView('walk', 0, 0).view).toBe('front')
    expect(pickLandView('walk', Math.PI / 2, 0).view).toBe('side')
    expect(pickLandView('sit', 0, 0).view).toBe('sit')
    expect(pickLandView('drink', 0, 0).view).toBe('drink')
    expect(pickLandView('rest', 0, 0).view).toBe('sleep')
    applyLandView(lion, camera, 'walk', Math.PI / 2)
    expect(lion.rotation.y).toBe(0)
    expect((lion.getObjectByName('body') as THREE.Mesh).visible).toBe(true)
    expect(lion.userData.landView).toBe('side')
  })

  it('kid coloring does not recolor authored eyes', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#e24b4b' })
    const iris = lion.getObjectByName('irisL') as THREE.Mesh
    expect((iris.material as THREE.MeshLambertMaterial).color.getHexString()).not.toBe('e24b4b')
    expect((lion.getObjectByName('body') as THREE.Mesh).visible).toBe(true)
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
