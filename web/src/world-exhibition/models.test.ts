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

function pngSize(file: string): { w: number; h: number } {
  const buf = readFileSync(resolve(PUBLIC, file))
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

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

describe('land layer: approved cutouts; lion.glb kept off the forest', () => {
  afterEach(() => {
    setAnimalModelProvider(null)
  })

  async function loadShipped(): Promise<void> {
    setAnimalModelProvider((id) => Promise.resolve(bytesOf(`models/${id}.glb`)))
    await loadAnimalTemplates()
  }

  it('puts the generated cartoon on screen for lion, deer, and tiger', async () => {
    await loadShipped()
    for (const kind of ['lion', 'deer', 'tiger'] as AnimalId[]) {
      const group = createAnimalModel(kind, { body: '#ffffff' })
      expect(group.userData.pack).toBe(ART_CUTOUT_PACK)
      const body = group.getObjectByName('body') as THREE.Mesh
      expect(body.geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect(body.visible).toBe(true)
    }
  })

  it('keeps an authored lion.glb with neck bone and walk for review, without loading it', async () => {
    const json = glbJson('models/lion.glb')
    const names = (json.nodes || []).map((n) => n.name || '')
    expect(names).toEqual(expect.arrayContaining(['neck', 'head', 'hips', 'leg-front-left', 'body']))
    expect(names.join(' ')).not.toMatch(/fox|wolf/i)
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    expect(lion.userData.pack).toBe(ART_CUTOUT_PACK)
    expect(lion.userData.pack).not.toBe(LAND_GLTF_PACK)
  })

  it('swaps deer/tiger views instead of yawing a front PNG', async () => {
    await loadShipped()
    const deer = createAnimalModel('deer', { body: '#ffffff' })
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
    camera.position.set(0, 1.2, 4)
    expect(pickLandView('walk', Math.PI / 2, 0).view).toBe('side')
    applyLandView(deer, camera, 'walk', Math.PI / 2)
    expect(deer.rotation.y).toBe(0)
  })

  it('pitches the sit cutout toward a steep camera so legs are not edge-on', async () => {
    await loadShipped()
    const lion = createAnimalModel('lion', { body: '#ffffff' })
    const portrait = lion.getObjectByName('body') as THREE.Mesh
    const steep = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    steep.position.set(0.4, 9.6, 3.8)
    applyLandView(lion, steep, 'sit', 0)
    expect(lion.rotation.y).toBe(0)
    expect(portrait.rotation.x).toBeLessThan(-0.35)
    expect(portrait.rotation.x).toBeGreaterThan(-0.8)
    const eye = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    eye.position.set(0.38, 2.62, 12.2)
    applyLandView(lion, eye, 'sit', 0)
    expect(Math.abs(portrait.rotation.x)).toBeLessThan(0.22)
  })

  it('sit and sleep cutouts are tall enough to include a body, not just a mane', () => {
    const sit = pngSize('models/cutouts/lion-sit.png')
    const sleep = pngSize('models/cutouts/lion-sleep.png')
    expect(sit.w).toBeGreaterThan(360)
    expect(sit.h).toBeGreaterThan(500)
    expect(sleep.w).toBeGreaterThan(350)
    expect(sleep.h).toBeGreaterThan(300)
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
