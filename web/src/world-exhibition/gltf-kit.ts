/**
 * Load shipped animal glTF (Kenney Cube Pets + Gobkit whale + fallback turtle).
 * Kid paint tints the body mesh; original atlas / vertex colors stay on the map.
 */
import * as THREE from 'three'
import { AnimationUtils } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { AnimalId } from '../types'
import { ANIMAL_IDS, isMarine } from '../types'
import { coatTexture } from './coat'

type AnimalTemplate = {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
  skinned: boolean
  zForward: boolean
}

const templates = new Map<AnimalId, AnimalTemplate>()
let loading: Promise<void> | null = null
let bufferProvider: ((id: AnimalId) => Promise<ArrayBuffer | Uint8Array>) | null = null

const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function installGltfDomShims(): void {
  const patchUrl = (url: typeof URL | undefined): void => {
    if (!url || typeof url.createObjectURL === 'function') return
    url.createObjectURL = () => PIXEL_PNG
    url.revokeObjectURL = () => {}
  }
  patchUrl(globalThis.URL)
  patchUrl((globalThis as { self?: { URL?: typeof URL } }).self?.URL)

  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
  if (!isJsdom) return

  THREE.TextureLoader.prototype.load = function (_url, onLoad) {
    const tex = new THREE.DataTexture(new Uint8Array([255, 248, 230, 255]), 1, 1)
    tex.needsUpdate = true
    queueMicrotask(() => onLoad?.(tex))
    return tex
  }
}

const LEG_ALIASES: [string, string][] = [
  ['legFL', 'leg-front-left'],
  ['legFR', 'leg-front-right'],
  ['legBL', 'leg-back-left'],
  ['legBR', 'leg-back-right'],
  ['legFL', 'LeftLegF'],
  ['legFR', 'RightLegF'],
  ['legBL', 'LeftLegB'],
  ['legBR', 'RightLegB'],
]

const FLIPPER_ALIASES = ['flipperFR', 'flipperFL', 'flipperBR', 'flipperBL', 'wing-right', 'wing-left', 'LeftHand', 'RightHand']
const TAIL_ALIASES = ['tail', 'Tail']
const EYE_ALIASES = ['eyeL', 'eyeR', 'LeftEye', 'RightEye']

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

function clipsFor(id: AnimalId, raw: THREE.AnimationClip[]): THREE.AnimationClip[] {
  if (id !== 'dolphin' || raw.length !== 1) return raw
  const master = raw[0]!
  return [
    AnimationUtils.subclip(master, 'idle', 0, 30, 24),
    AnimationUtils.subclip(master, 'walk', 90, 120, 24),
  ]
}

export async function loadAnimalTemplates(): Promise<void> {
  if (templates.size === ANIMAL_IDS.length) return
  if (loading) {
    await loading
    return
  }
  loading = (async () => {
    installGltfDomShims()
    const loader = new GLTFLoader()
    await Promise.all(
      ANIMAL_IDS.map(async (id) => {
        const buf = await readModel(id)
        const gltf = await loader.parseAsync(buf, '/models/')
        const scene = gltf.scene
        let skinned = false
        scene.traverse((obj) => {
          if ((obj as THREE.SkinnedMesh).isSkinnedMesh) skinned = true
        })
        templates.set(id, {
          scene,
          animations: clipsFor(id, gltf.animations || []),
          skinned,
          zForward: id !== 'turtle',
        })
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

function named(root: THREE.Object3D, names: string[]): THREE.Object3D | undefined {
  let hit: THREE.Object3D | undefined
  root.traverse((obj) => {
    if (hit) return
    if (names.includes(obj.name)) hit = obj
  })
  return hit
}

function collectLegs(root: THREE.Object3D): THREE.Object3D[] {
  const found: THREE.Object3D[] = []
  for (const [canon, alias] of LEG_ALIASES) {
    if (found.some((o) => o.userData.slot === canon)) continue
    const node = named(root, [canon, alias])
    if (node) {
      node.userData.slot = canon
      found.push(node)
    }
  }
  return found
}

function toonKeepMap(src: THREE.Material, tint: string): THREE.MeshLambertMaterial {
  const map = 'map' in src && src.map instanceof THREE.Texture ? src.map : null
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace
    map.needsUpdate = true
  }
  const color = new THREE.Color(tint)
  return new THREE.MeshLambertMaterial({
    color,
    map,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    blending: THREE.NormalBlending,
    emissive: color.clone().multiplyScalar(map ? 0.03 : 0.08),
    emissiveIntensity: map ? 0.04 : 0.1,
  })
}

function isFaceDetail(obj: THREE.Object3D): boolean {
  const n = obj.name.toLowerCase()
  return n.includes('eye') || n.includes('iris') || n.includes('pupil') || n.includes('shine') || n.includes('nose')
}

function isCoatMesh(obj: THREE.Object3D): boolean {
  return !isFaceDetail(obj)
}

export function instanceAnimal(animal: AnimalId, painted: Record<string, string>): THREE.Group {
  const tpl = templates.get(animal)
  if (!tpl) throw new Error(`模型未加载：${animal}`)
  const cloned = tpl.skinned ? SkeletonUtils.clone(tpl.scene) : tpl.scene.clone(true)
  const inner = cloned as THREE.Group
  const coat = coatTexture(animal, painted)
  const bodyTint = painted.body || painted.shell || '#ffffff'
  inner.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const src = Array.isArray(obj.material) ? obj.material[0] : obj.material
    const region = String(obj.userData.region || obj.name)
    obj.userData.region = region
    const tint = isCoatMesh(obj) ? bodyTint : '#ffffff'
    obj.material = toonKeepMap(src, tint)
    obj.castShadow = false
    obj.receiveShadow = false
  })

  const orient = new THREE.Group()
  if (tpl.zForward) orient.rotation.y = -Math.PI / 2
  orient.add(inner)

  const targetH = isMarine(animal) ? 1.05 : 1.7
  orient.updateMatrixWorld(true)
  const sized = new THREE.Box3().setFromObject(orient)
  const h = sized.max.y - sized.min.y
  if (h > 0.01) orient.scale.setScalar(targetH / h)
  orient.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(orient)
  if (Number.isFinite(grounded.min.y)) orient.position.y -= grounded.min.y

  const root = new THREE.Group()
  root.add(orient)

  const mixer = tpl.animations.length ? new THREE.AnimationMixer(inner) : null
  const actions: Record<string, THREE.AnimationAction> = {}
  if (mixer) {
    for (const clip of tpl.animations) {
      actions[clip.name] = mixer.clipAction(clip)
    }
  }

  root.userData.kind = animal
  root.userData.coat = coat
  root.userData.marine = isMarine(animal)
  root.userData.legs = collectLegs(root)
  root.userData.eyes = EYE_ALIASES.map((n) => named(root, [n])).filter((o): o is THREE.Object3D => Boolean(o))
  root.userData.flippers = FLIPPER_ALIASES.map((n) => named(root, [n])).filter((o): o is THREE.Object3D => Boolean(o))
  root.userData.tail = named(root, TAIL_ALIASES)
  root.userData.mixer = mixer
  root.userData.actions = actions
  root.userData.clips = tpl.animations.map((c) => c.name)
  return root
}

export function playAnimalClip(group: THREE.Group, clipName: string, dt: number): boolean {
  const mixer = group.userData.mixer as THREE.AnimationMixer | undefined
  const actions = group.userData.actions as Record<string, THREE.AnimationAction> | undefined
  if (!mixer || !actions) return false
  const next = actions[clipName] || (clipName === 'static' ? actions.idle : actions[clipName === 'eat' ? 'idle' : 'walk']) || actions.idle
  if (!next) return false
  if (group.userData.activeClip !== next) {
    for (const a of Object.values(actions)) {
      if (a !== next) a.stop()
    }
    next.reset().play()
    group.userData.activeClip = next
  }
  mixer.update(Math.max(0, Math.min(0.05, dt)))
  return true
}
