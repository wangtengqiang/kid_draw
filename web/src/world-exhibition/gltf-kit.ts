/**
 * Layer 1: land lion/deer/tiger keep the approved generated cartoon cutouts
 * (`play-action-walk.png`). No loft glTF over the forest. Marine still glTF.
 * Volume/bones come in a later layer under this same art.
 */
import * as THREE from 'three'
import { AnimationUtils } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { AnimalId } from '../types'
import { ANIMAL_IDS, isMarine } from '../types'
import { ART_CUTOUT_PACK, buildArtCutout, loadCutoutTexture } from './art-cutout'
import { attachViewTextures, CARTOON_RIG_PACK } from './cartoon-rig'

export const LAND_GLTF_PACK = 'land-gltf'

type AnimalTemplate = {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
  skinned: boolean
  zForward: boolean
  pack?: string
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
  ['legFL', 'FrontLowerLeg.L'],
  ['legFR', 'FrontLowerLeg.R'],
  ['legBL', 'BackLowerLeg.L'],
  ['legBR', 'BackLowerLeg.R'],
  ['legFL', 'FrontLowerLegL'],
  ['legFR', 'FrontLowerLegR'],
  ['legBL', 'BackLowerLegL'],
  ['legBR', 'BackLowerLegR'],
  ['legFL', 'LeftLegF'],
  ['legFR', 'RightLegF'],
  ['legBL', 'LeftLegB'],
  ['legBR', 'RightLegB'],
]

const FLIPPER_ALIASES = ['flipperFR', 'flipperFL', 'flipperBR', 'flipperBL', 'wing-right', 'wing-left', 'LeftHand', 'RightHand']
const TAIL_ALIASES = ['tail', 'Tail', 'Tail1']
const EYE_ALIASES = ['eyeL', 'eyeR', 'LeftEye', 'RightEye', 'Eyes_Lion', 'Eyes_Cat']

const CLIP_ALIASES: Record<string, string[]> = {
  walk: ['walk', 'Walk'],
  idle: ['idle', 'Idle', 'static'],
  static: ['static', 'idle', 'Idle'],
  eat: ['eat', 'Eating', 'drink', 'Idle'],
  sit: ['sit', 'Sit', 'idle'],
  drink: ['drink', 'Drink', 'eat'],
  rest: ['sleep', 'rest', 'idle'],
  sleep: ['sleep', 'rest', 'idle'],
  turn: ['turn', 'Turn', 'idle'],
}

export function setAnimalModelProvider(
  fn: ((id: AnimalId) => Promise<ArrayBuffer | Uint8Array>) | null,
): void {
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
  if (raw.length !== 1) return raw
  if (id !== 'dolphin' && id !== 'turtle') return raw
  const master = raw[0]!
  return [AnimationUtils.subclip(master, 'idle', 0, 30, 24), AnimationUtils.subclip(master, 'walk', 90, 120, 24)]
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
        if (!isMarine(id)) {
          const map = await loadCutoutTexture(id)
          const scene = buildArtCutout(id, map)
          await attachViewTextures(scene, id)
          templates.set(id, {
            scene,
            animations: (scene.userData.cutoutClips as THREE.AnimationClip[]) || [],
            skinned: false,
            zForward: false,
            pack: ART_CUTOUT_PACK,
          })
          return
        }
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
          zForward: true,
          pack: id === 'fish' ? 'kenney-cube-pets' : 'gobkit',
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

function keepFaceName(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('eye') || n.includes('iris') || n.includes('pupil') || n.includes('shine') || n.includes('nose')
}

function opaqueLambert(src: THREE.Material, map: THREE.Texture | null, color: THREE.Color): THREE.MeshLambertMaterial {
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace
    map.needsUpdate = true
  }
  const mat = new THREE.MeshLambertMaterial({
    color,
    map,
    vertexColors: false,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
  })
  mat.name = src.name
  return mat
}

function boxFromCoat(obj: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  obj.updateMatrixWorld(true)
  obj.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.visible || node.userData.ghost) return
    const geo = node.geometry
    if (!geo) return
    if (!geo.boundingBox) geo.computeBoundingBox()
    const local = geo.boundingBox
    if (!local || local.isEmpty()) return
    box.union(local.clone().applyMatrix4(node.matrixWorld))
  })
  return box.isEmpty() ? new THREE.Box3().setFromObject(obj) : box
}

function paintMesh(obj: THREE.Mesh, bodyTint: string): void {
  if (obj.userData.rigged || (obj as THREE.SkinnedMesh).isSkinnedMesh) {
    const src = (Array.isArray(obj.material) ? obj.material[0] : obj.material) as THREE.MeshLambertMaterial
    const copy = src.clone()
    copy.map = src.map
    copy.transparent = false
    copy.depthWrite = true
    copy.side = THREE.DoubleSide
    if (bodyTint && bodyTint !== '#ffffff' && bodyTint !== '#fffdf7') copy.color = new THREE.Color(bodyTint)
    else copy.color = new THREE.Color('#ffffff')
    obj.material = copy
    obj.userData.region = 'body'
    obj.castShadow = false
    obj.receiveShadow = false
    if (obj.userData.ghost) obj.visible = false
    else obj.visible = true
    copy.vertexColors = Boolean(src.vertexColors) && !copy.map
    if (!copy.map) copy.vertexColors = true
    return
  }
  if (obj.userData.cutout || obj.userData.portrait) {
    const src = (Array.isArray(obj.material) ? obj.material[0] : obj.material) as THREE.MeshLambertMaterial
    const copy = src.clone()
    copy.map = src.map
    copy.alphaTest = src.alphaTest || 0.28
    copy.side = THREE.DoubleSide
    copy.transparent = false
    copy.depthWrite = true
    if (obj.userData.portrait) copy.color = new THREE.Color('#ffffff')
    else if (bodyTint && bodyTint !== '#ffffff' && bodyTint !== '#fffdf7') copy.color = new THREE.Color(bodyTint)
    else copy.color = new THREE.Color('#ffffff')
    obj.material = copy
    obj.userData.region = obj.userData.portrait ? 'portrait' : 'body'
    obj.castShadow = false
    obj.receiveShadow = false
    return
  }
  const srcs = Array.isArray(obj.material) ? obj.material : [obj.material]
  const label = `${obj.name} ${obj.parent?.name || ''}`
  const matName = srcs.map((s) => s.name || '').join(' ')
  const keep = keepFaceName(label) || keepFaceName(matName) || Boolean(obj.userData.keepFace)
  const next = srcs.map((src) => {
    const map = 'map' in src && src.map instanceof THREE.Texture ? src.map : null
    const authored = 'color' in src && src.color ? (src.color as THREE.Color).clone() : new THREE.Color('#ffffff')
    const tint = new THREE.Color(bodyTint)
    const color = keep
      ? map
        ? new THREE.Color('#ffffff')
        : authored
      : map
        ? tint
        : bodyTint === '#ffffff' || bodyTint === '#fffdf7'
          ? authored
          : tint
    return opaqueLambert(src, map, color)
  })
  obj.material = next.length === 1 ? next[0]! : next
  if (keep) obj.userData.region = /nose/i.test(matName + label) ? 'nose' : 'eye'
  else if (/body|leg|tail|wing|fur|fugu|whale|seal|cube/i.test(label + obj.name + matName)) {
    obj.userData.region = /leg/i.test(obj.name) ? 'leg' : 'body'
  } else obj.userData.region = obj.name
  obj.castShadow = false
  obj.receiveShadow = false
}

function packOf(animal: AnimalId, tpl?: AnimalTemplate): string {
  if (tpl?.pack) return tpl.pack
  if (animal === 'lion' || animal === 'deer' || animal === 'tiger') return ART_CUTOUT_PACK
  if (animal === 'fish') return 'kenney-cube-pets'
  return 'gobkit'
}

export function instanceAnimal(animal: AnimalId, painted: Record<string, string>): THREE.Group {
  const tpl = templates.get(animal)
  if (!tpl) throw new Error(`模型未加载：${animal}`)
  const cloned = tpl.skinned ? SkeletonUtils.clone(tpl.scene) : tpl.scene.clone(true)
  const inner = cloned as THREE.Group
  const spriteMap = tpl.scene.userData.spriteMap as THREE.Texture | undefined
  if (spriteMap) inner.userData.spriteMap = spriteMap
  inner.userData.viewMaps = tpl.scene.userData.viewMaps
  inner.userData.spriteH = tpl.scene.userData.spriteH
  inner.userData.pack = packOf(animal, tpl)
  const bodyTint = painted.body || painted.shell || '#ffffff'
  inner.traverse((obj) => {
    if (obj instanceof THREE.Mesh) paintMesh(obj, bodyTint)
  })

  const orient = new THREE.Group()
  if (tpl.zForward) orient.rotation.y = -Math.PI / 2
  orient.add(inner)

  const targetH = isMarine(animal) ? 1.05 : 1.7
  orient.updateMatrixWorld(true)
  const sized = boxFromCoat(orient)
  const h = sized.max.y - sized.min.y
  if (h > 0.01) orient.scale.setScalar(targetH / h)
  orient.updateMatrixWorld(true)
  const grounded = boxFromCoat(orient)
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
  root.userData.source =
    tpl.pack === CARTOON_RIG_PACK
      ? 'cartoon-rig'
      : tpl.pack === ART_CUTOUT_PACK
        ? 'art-cutout'
        : 'gltf'
  root.userData.pack = packOf(animal, tpl)
  root.userData.spriteMap = inner.userData.spriteMap
  root.userData.viewMaps = inner.userData.viewMaps
  root.userData.spriteH = inner.userData.spriteH
  root.userData.marine = isMarine(animal)
  root.userData.legs = isMarine(animal) ? [] : collectLegs(root)
  root.userData.eyes = EYE_ALIASES.map((n) => named(root, [n])).filter((o): o is THREE.Object3D => Boolean(o))
  root.userData.flippers = FLIPPER_ALIASES.map((n) => named(root, [n])).filter((o): o is THREE.Object3D => Boolean(o))
  root.userData.tail = named(root, TAIL_ALIASES)
  root.userData.mixer = mixer
  root.userData.actions = actions
  root.userData.clips = tpl.animations.map((c) => c.name)
  return root
}

function findClipAction(
  actions: Record<string, THREE.AnimationAction>,
  clipName: string,
): THREE.AnimationAction | undefined {
  const names = CLIP_ALIASES[clipName.toLowerCase()] || [clipName]
  const keys = Object.keys(actions)
  for (const n of names) {
    if (actions[n]) return actions[n]
    const hit = keys.find((k) => k.toLowerCase() === n.toLowerCase())
    if (hit) return actions[hit]
  }
  return undefined
}

export function playAnimalClip(group: THREE.Group, clipName: string, dt: number): boolean {
  const mixer = group.userData.mixer as THREE.AnimationMixer | undefined
  const actions = group.userData.actions as Record<string, THREE.AnimationAction> | undefined
  if (!mixer || !actions) return false
  const next = findClipAction(actions, clipName)
  if (!next) return false
  if (group.userData.activeClip !== next) {
    const prev = group.userData.activeClip as THREE.AnimationAction | undefined
    next.enabled = true
    next.reset().play()
    if (prev && prev !== next) next.crossFadeFrom(prev, 0.28, false)
    else {
      for (const a of Object.values(actions)) {
        if (a !== next) a.stop()
      }
    }
    group.userData.activeClip = next
  }
  mixer.update(Math.max(0, Math.min(0.05, dt)))
  return true
}
