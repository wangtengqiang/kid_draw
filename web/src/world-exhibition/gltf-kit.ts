/**
 * Load original cartoon animal glTF from /models/*.glb and instance them.
 * Kid coat tints only nodes marked extras.coat (body / shell).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { AnimalId } from '../types'
import { ANIMAL_IDS, ANIMAL_META, isMarine } from '../types'
import { coatTexture } from './coat'

const templates = new Map<AnimalId, THREE.Group>()
let loading: Promise<void> | null = null
let bufferProvider: ((id: AnimalId) => Promise<ArrayBuffer | Uint8Array>) | null = null

const LEG_ORDER = ['legFL', 'legFR', 'legBL', 'legBR'] as const
const FLIPPER_ORDER = ['flipperFR', 'flipperFL', 'flipperBR', 'flipperBL'] as const

export function setAnimalModelProvider(fn: (id: AnimalId) => Promise<ArrayBuffer | Uint8Array>): void {
  bufferProvider = fn
  templates.clear()
  loading = null
}

function asArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data)
  const copy = new Uint8Array(view.byteLength)
  copy.set(view)
  return copy.buffer as ArrayBuffer
}

async function readModel(id: AnimalId): Promise<ArrayBuffer> {
  if (bufferProvider) return asArrayBuffer(await bufferProvider(id))
  const res = await fetch(`/models/${id}.glb`)
  if (!res.ok) throw new Error(`无法加载 ${id} 模型`)
  return res.arrayBuffer()
}

export async function loadAnimalTemplates(): Promise<void> {
  if (templates.size === ANIMAL_IDS.length) return
  if (loading) {
    await loading
    return
  }
  loading = (async () => {
    const loader = new GLTFLoader()
    await Promise.all(
      ANIMAL_IDS.map(async (id) => {
        const buf = await readModel(id)
        const gltf = await loader.parseAsync(buf, '/models/')
        templates.set(id, gltf.scene)
      }),
    )
  })()
  try {
    await loading
  } catch (err) {
    loading = null
    templates.clear()
    throw err
  }
}

export function animalTemplatesReady(): boolean {
  return templates.size === ANIMAL_IDS.length
}

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>, fallback: string): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || fallback
}

function wantsCoat(obj: THREE.Object3D, mat: THREE.Material): boolean {
  const flag = obj.userData.coat ?? (mat.userData as { coat?: boolean }).coat
  if (flag === true || flag === 1) return true
  const region = String(obj.userData.region || obj.name)
  return region === 'body' || region === 'shell'
}

function toon(color: string, map?: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    map: map ?? null,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    blending: THREE.NormalBlending,
    emissive: new THREE.Color(color).multiplyScalar(map ? 0.04 : 0.1),
    emissiveIntensity: map ? 0.05 : 0.12,
  })
}

function namedGroup(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let hit: THREE.Object3D | undefined
  root.traverse((obj) => {
    if (hit) return
    if (obj.name === name) hit = obj
  })
  return hit
}

export function instanceAnimal(animal: AnimalId, painted: Record<string, string>): THREE.Group {
  const tpl = templates.get(animal)
  if (!tpl) throw new Error(`模型未加载：${animal}`)
  const inner = tpl.clone(true)
  const coat = coatTexture(animal, painted)
  inner.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const src = Array.isArray(obj.material) ? obj.material[0] : obj.material
    const region = String(obj.userData.region || obj.name)
    obj.userData.region = region
    const base =
      src && 'color' in src && src.color instanceof THREE.Color ? `#${src.color.getHexString()}` : '#d9b48a'
    if (wantsCoat(obj, src)) {
      obj.material = toon('#ffffff', coat)
    } else {
      obj.material = toon(colorOf(animal, region, painted, base))
    }
    obj.castShadow = false
    obj.receiveShadow = false
  })

  const root = new THREE.Group()
  inner.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(inner)
  if (Number.isFinite(box.min.y)) inner.position.y -= box.min.y
  root.add(inner)

  const legs = LEG_ORDER.map((name) => namedGroup(root, name)).filter((o): o is THREE.Object3D => Boolean(o))
  const eyes = (['eyeL', 'eyeR'] as const)
    .map((name) => namedGroup(root, name))
    .filter((o): o is THREE.Object3D => Boolean(o))
  const flippers = FLIPPER_ORDER.map((name) => namedGroup(root, name)).filter((o): o is THREE.Object3D => Boolean(o))
  const tail = namedGroup(root, 'tail')

  root.userData.kind = animal
  root.userData.coat = coat
  root.userData.marine = isMarine(animal)
  root.userData.legs = legs
  root.userData.eyes = eyes
  root.userData.flippers = flippers
  root.userData.tail = tail
  return root
}
