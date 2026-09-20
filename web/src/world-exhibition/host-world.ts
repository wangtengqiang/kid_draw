/**
 * 观展世界：对着 gen-forest-empty 搭可走石径、圆冠树、蘑菇和小溪。
 * 网格、灯光都要省，避免把浏览器 GPU 打崩。不打阴影。
 */
import * as THREE from 'three'
import type { AnimalId, EmoteId, PlacedAnimal, ThemeId, WorldAction } from '../types'
import { isMarine } from '../types'
import { createAnimalModel, tickAction } from './models'
import { applyDrawingCoat, isBitmapCoat } from './drawing-coat'
import { HOST_ORBIT, OrbitZoom } from './orbit-zoom'
import {
  paintBark,
  paintDirt,
  paintFlagstone,
  paintForestPanorama,
  paintGrassGround,
  paintWater,
} from './forest-art'
import { applyLandView, CARTOON_RIG_PACK, keepPawsOnPath, wrapPi } from './cartoon-rig'
import { ART_CUTOUT_PACK } from './art-cutout'
import { LAND_GLTF_PACK } from './gltf-kit'

interface Actor {
  id: string
  animalId: AnimalId
  group: THREE.Group
  angle: number
  radius: number
  speed: number
  lane: number
  phase: number
  marine: boolean
  frozen: boolean
  emote: THREE.Sprite | null
  emoteUntil: number
}

export type LandAction = Exclude<WorldAction, 'swim'>

/** 陆生动物自己轮换的节拍，错开相位后不会同时做一个姿势。 */
export const LAND_BEATS: { action: LandAction; duration: number }[] = [
  { action: 'walk', duration: 9 },
  { action: 'drink', duration: 3.2 },
  { action: 'walk', duration: 6.5 },
  { action: 'sit', duration: 3.6 },
  { action: 'walk', duration: 7.5 },
  { action: 'rest', duration: 4 },
]

export const LAND_CYCLE = LAND_BEATS.reduce((sum, beat) => sum + beat.duration, 0)

export function actorPhase(index: number): number {
  return index * 11.3
}

export function autoLandAction(t: number, phase: number): LandAction {
  let u = ((t + phase) % LAND_CYCLE + LAND_CYCLE) % LAND_CYCLE
  for (const beat of LAND_BEATS) {
    if (u < beat.duration) return beat.action
    u -= beat.duration
  }
  return 'walk'
}

export function autoActorAction(marine: boolean, t: number, phase: number): WorldAction {
  return marine ? 'swim' : autoLandAction(t, phase)
}

/**
 * 石径从相机近处伸进林子（x, z），对着 gen-forest-empty。
 * 陆生动物走这条路，不是绕一圈米色草坪。
 */
export const PATH_POINTS: [number, number][] = [
  [0.05, 7.8],
  [-0.4, 5.4],
  [0.18, 3.0],
  [0.52, 0.6],
  [0.12, -2.4],
  [-0.32, -6.0],
  [0.22, -10.2],
  [0.04, -16.4],
]

/** 石径右侧的小溪，不是挡在镜头前的大海。 */
export const CREEK_POINTS: [number, number][] = [
  [2.45, 4.4],
  [2.95, 2.1],
  [3.4, -0.15],
  [3.1, -2.7],
  [3.55, -5.6],
  [4.15, -9.2],
]

export const MUSHROOM_SPOTS: { x: number; z: number; s: number }[] = [
  { x: -2.35, z: 6.35, s: 1 },
  { x: -1.72, z: 5.85, s: 0.55 },
  { x: 2.55, z: 6.15, s: 0.92 },
  { x: 3.05, z: 5.45, s: 0.48 },
  { x: -2.9, z: 1.6, s: 0.62 },
  { x: -3.15, z: -0.8, s: 0.58 },
]

/**
 * 海湾里的游泳圈放在林子东边，默认镜头看石径。
 * 喝水站在小溪边。
 */
export const OCEAN = { x: 18.4, z: -1.2, rx: 2.15, rz: 3.4 }
export const GROUND_RADIUS = 46
export const TREE_INSTANCE_CAP = 96
/** 默认镜头拉远一倍：动物、树、蘑菇、石径在画面里都大约一半大。 */
export const FOREST_CAMERA_PULL = 2

/** 水面外轮廓（x, z）：大湾接向远处的海，不是小方池。 */
export const WATER_RING: [number, number][] = [
  [12.4, 5.2],
  [14.8, 10.6],
  [19.2, 15.4],
  [25.6, 18.8],
  [32.2, 16.2],
  [37.4, 9.2],
  [38.8, 1.6],
  [36.6, -6.4],
  [37.2, -13.8],
  [32.4, -19.2],
  [24.6, -19.8],
  [17.4, -16.0],
  [13.8, -10.6],
  [12.6, -5.4],
  [13.2, -0.8],
  [12.2, 1.6],
  [13.4, 3.4],
  [12.5, 4.4],
]

const shared = {
  trunkGeo: new THREE.CylinderGeometry(0.12, 0.28, 1, 7),
  heroTrunkGeo: new THREE.CylinderGeometry(0.22, 0.62, 2.6, 8),
  canopyGeo: new THREE.SphereGeometry(0.62, 8, 6),
  hillGeo: new THREE.SphereGeometry(1, 9, 7),
  stoneGeo: new THREE.CylinderGeometry(0.42, 0.48, 0.12, 8),
  cobbleGeo: new THREE.SphereGeometry(0.28, 7, 5),
  impostorGeo: new THREE.SphereGeometry(0.75, 7, 5),
  stemGeo: new THREE.CylinderGeometry(0.07, 0.1, 0.42, 6),
  capGeo: new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  dotGeo: new THREE.SphereGeometry(0.045, 6, 5),
  fernGeo: new THREE.SphereGeometry(0.38, 7, 5),
  trunkMat: new THREE.MeshLambertMaterial({ color: '#7a4a24' }),
  barkMat: new THREE.MeshLambertMaterial({ color: '#8a5a32' }),
  canopyMat: new THREE.MeshLambertMaterial({ color: '#3fa844' }),
  canopyMat2: new THREE.MeshLambertMaterial({ color: '#2d7a34' }),
  canopyMat3: new THREE.MeshLambertMaterial({ color: '#62c24e' }),
  farMat: new THREE.MeshLambertMaterial({ color: '#2a6e32' }),
  stoneMat: new THREE.MeshLambertMaterial({ color: '#d4c4a0' }),
  dirtMat: new THREE.MeshLambertMaterial({ color: '#c9a066' }),
  shoreMat: new THREE.MeshLambertMaterial({ color: '#d4c09a' }),
  bankMat: new THREE.MeshLambertMaterial({ color: '#6a9a48' }),
  waterMat: new THREE.MeshLambertMaterial({ color: '#4aa8c8' }),
  deepMat: new THREE.MeshLambertMaterial({ color: '#2a6f90' }),
  sideMat: new THREE.MeshLambertMaterial({ color: '#2e7a9c' }),
  rockMat: new THREE.MeshLambertMaterial({ color: '#8a9078' }),
  snowMat: new THREE.MeshLambertMaterial({ color: '#eef3ea' }),
  stemMat: new THREE.MeshLambertMaterial({ color: '#f3e2b8' }),
  capMat: new THREE.MeshLambertMaterial({ color: '#e24b3a' }),
  dotMat: new THREE.MeshLambertMaterial({ color: '#fff8ee' }),
  flowerMats: [
    new THREE.MeshLambertMaterial({ color: '#f08ab0' }),
    new THREE.MeshLambertMaterial({ color: '#f4d96a' }),
    new THREE.MeshLambertMaterial({ color: '#8ec5ff' }),
    new THREE.MeshLambertMaterial({ color: '#fff8e0' }),
  ],
}

const _dummy = new THREE.Object3D()
let waterTex: THREE.CanvasTexture | null = null
let _path: THREE.CatmullRomCurve3 | null = null
let _creek: THREE.CatmullRomCurve3 | null = null

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function waterMap(): THREE.CanvasTexture {
  if (waterTex) return waterTex
  const tex = new THREE.CanvasTexture(paintWater())
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2.2, 2.2)
  tex.premultiplyAlpha = false
  waterTex = tex
  return tex
}

function bindMaps(): void {
  if (shared.dirtMat.map) return
  const dirt = new THREE.CanvasTexture(paintDirt())
  dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping
  dirt.repeat.set(2, 2)
  dirt.colorSpace = THREE.SRGBColorSpace
  shared.dirtMat.map = dirt
  const stone = new THREE.CanvasTexture(paintFlagstone())
  stone.colorSpace = THREE.SRGBColorSpace
  shared.stoneMat.map = stone
  const bark = new THREE.CanvasTexture(paintBark())
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping
  bark.colorSpace = THREE.SRGBColorSpace
  shared.barkMat.map = bark
  shared.trunkMat.map = bark
}

export function pathCurve(): THREE.CatmullRomCurve3 {
  if (_path) return _path
  _path = new THREE.CatmullRomCurve3(
    PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.05, z)),
    false,
    'catmullrom',
    0.32,
  )
  return _path
}

export function pointOnPath(u: number, lane = 0): { x: number; z: number; heading: number } {
  const curve = pathCurve()
  const t = ((u % 1) + 1) % 1
  const p = curve.getPointAt(t)
  const tan = curve.getTangentAt(t)
  const nx = -tan.z
  const nz = tan.x
  const nLen = Math.hypot(nx, nz) || 1
  return {
    x: p.x + (nx / nLen) * lane * 0.42,
    z: p.z + (nz / nLen) * lane * 0.42,
    heading: Math.atan2(tan.x, tan.z),
  }
}

export function distToPath(x: number, z: number): number {
  const pts = pathCurve().getSpacedPoints(28)
  let d = Infinity
  for (const p of pts) d = Math.min(d, Math.hypot(x - p.x, z - p.z))
  return d
}

export function creekCurve(): THREE.CatmullRomCurve3 {
  if (_creek) return _creek
  _creek = new THREE.CatmullRomCurve3(
    CREEK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.03, z)),
    false,
    'catmullrom',
    0.4,
  )
  return _creek
}

/** 溪心到岸的最小距离：Tube 半径 0.42，再留整只剪纸宽度。水不是地面。 */
export const CREEK_CLEAR = 1.92

/** 陆地动物固定世界身高。不按镜头距离放大，远处自然变矮。 */
export const LAND_WORLD_SCALE = 1.12

/** Sit/sleep further down the path so a steep camera + QR panel never clips a head. */
export const PATH_WALK_MIN_U = 0.16
export const PATH_WALK_MAX_U = 0.92
export const PATH_SIT_U = 0.54
export const PATH_REST_U = 0.4

/** Steep look-front: nearest pet stays mid-path, camera pulled back. */
export const LOOK_FRONT = {
  lionU: 0.62,
  deerU: 0.46,
  tigerU: 0.32,
  camY: 7.6,
  camZ: 14.8,
} as const

export function pinLandScale(group: THREE.Object3D): void {
  group.scale.setScalar(LAND_WORLD_SCALE)
}

export function distToCreek(x: number, z: number): number {
  const pts = creekCurve().getSpacedPoints(24)
  let d = Infinity
  for (const p of pts) d = Math.min(d, Math.hypot(x - p.x, z - p.z))
  return d
}

export function onCreekWater(x: number, z: number): boolean {
  return distToCreek(x, z) < CREEK_CLEAR
}

/** 脚在水上就往石径推，蓝条不是路。 */
export function keepOffCreek(x: number, z: number): { x: number; z: number } {
  const creekPts = creekCurve().getSpacedPoints(24)
  let creek = creekPts[0]!
  let cd = Infinity
  for (const p of creekPts) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < cd) {
      cd = d
      creek = p
    }
  }
  if (cd >= CREEK_CLEAR) return { x, z }
  const pathPts = pathCurve().getSpacedPoints(28)
  let nearest = pathPts[0]!
  let best = Infinity
  for (const p of pathPts) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < best) {
      best = d
      nearest = p
    }
  }
  const dx = nearest.x - creek.x
  const dz = nearest.z - creek.z
  const len = Math.hypot(dx, dz) || 1
  return {
    x: creek.x + (dx / len) * CREEK_CLEAR,
    z: creek.z + (dz / len) * CREEK_CLEAR,
  }
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ)
}

/**
 * 真 3D：朝向就是模型绕 Y 的 yaw。走路跟石径向，喝水朝溪，坐下/睡觉回头。
 * 不再把一张正面 PNG 拧扁，也不再夹死在 3/4 剪纸角。
 */
export function landYaw(action: 'walk' | 'drink' | 'sit' | 'rest', desired: number, lane = 0): number {
  if (action === 'drink') return desired
  if (action === 'sit' || action === 'rest') return wrapPi(desired + Math.PI * 0.62)
  const spread = lane < 0 ? -0.22 : lane > 0 ? 0.22 : 0
  return wrapPi(desired + spread)
}

/** 喝水站在石径靠溪一侧，脸朝溪，爪子踩石头/草，不踩蓝条。 */
export function drinkStand(slot = 0): { x: number; z: number; heading: number } {
  const along = pointOnPath(0.18 + slot * 0.13, 0.85)
  const feet = keepOffCreek(along.x, along.z)
  const water = creekCurve().getPointAt(Math.min(0.78, Math.max(0.12, 0.2 + slot * 0.16)))
  return {
    x: feet.x,
    z: feet.z,
    heading: landYaw('drink', yawToward(feet.x, feet.z, water.x, water.z), slot),
  }
}

export const SHORE_DRINK = drinkStand(0)

export function smoothCoast(ring: [number, number][] = WATER_RING, count = 40): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(
    ring.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.42,
  )
  return curve.getSpacedPoints(count).map((p) => [p.x, p.z])
}

export function offsetRing(ring: [number, number][], amt: number): [number, number][] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length
  return ring.map(([x, z]) => {
    const dx = x - cx
    const dz = z - cz
    const L = Math.hypot(dx, dz) || 1
    return [x + (dx / L) * amt, z + (dz / L) * amt]
  })
}

export function pointInRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]
    const zi = ring[i]![1]
    const xj = ring[j]![0]
    const zj = ring[j]![1]
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-9) + xi
    if (hit) inside = !inside
  }
  return inside
}

function xzShape(ring: [number, number][]): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(ring[0]![0], -ring[0]![1])
  for (let i = 1; i < ring.length; i++) s.lineTo(ring[i]![0], -ring[i]![1])
  s.closePath()
  return s
}

function flattenXZ(geo: THREE.BufferGeometry, y: number, mat: THREE.Material = shared.shoreMat): THREE.Mesh {
  geo.rotateX(-Math.PI / 2)
  const m = new THREE.Mesh(geo, mat)
  m.position.y = y
  return m
}

function makeTerrain(): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(GROUND_RADIUS, 48)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  const coast = smoothCoast()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    let y =
      0.22 * Math.sin(x * 0.16 + 0.5) * Math.cos(z * 0.13) + 0.1 * Math.sin(x * 0.38 - z * 0.24)
    if (distToPath(x, z) < 2.4) y = 0.015
    else if (r < 5) y *= 0.15
    else if (r > 22) y += 0.28 * Math.sin(r * 0.18)
    if (pointInRing(x, z, coast)) y = -0.5
    pos.setY(i, y)
  }
  geo.computeVertexNormals()
  return geo
}

export class HostWorld {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  private actors = new Map<string, Actor>()
  private decorations = new THREE.Group()
  private ground: THREE.Mesh
  private lights: THREE.Light[] = []
  private particles: THREE.Points | null = null
  private theme: ThemeId = 'forest'
  private clock = new THREE.Clock()
  private running = true
  private raf = 0
  private orbit: OrbitZoom
  private coast = smoothCoast()

  constructor(canvas: HTMLCanvasElement) {
    bindMaps()
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,
    })
    this.renderer.setClearColor('#8ec8f0', 1)
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = false
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 200)
    this.camera.position.set(0.32, 3.52, 18.2)
    this.camera.lookAt(0.08, 0.55, -4.2)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0.08, 0.55, -3.2), HOST_ORBIT)
    if (typeof window !== 'undefined') {
      const w = window as Window & {
        __kidDrawFrameHost?: () => boolean
        __kidDrawFramePath?: () => void
        __kidDrawPoseLineup?: () => boolean
        __kidDrawPoseClose?: (kind: AnimalId) => boolean
        __kidDrawPoseAction?: (action: WorldAction, kind?: AnimalId) => boolean
        __kidDrawPoseActionClose?: (action: WorldAction, kind?: AnimalId) => boolean
        __kidDrawPoseSpread?: () => boolean
        __kidDrawPosePerspective?: () => boolean
        __kidDrawPoseOrbit?: () => boolean
        __kidDrawPoseLookFront?: () => boolean
        __kidDrawPoseFace?: (side: 'left' | 'right') => boolean
        __kidDrawPoseLionProcess?: (layer: 'mesh' | 'bones' | 'effect') => boolean
        __kidDrawCapturePng?: () => string
      }
      w.__kidDrawFrameHost = () => this.frameFirstAnimal()
      w.__kidDrawFramePath = () => this.framePathVista()
      w.__kidDrawPoseLineup = () => this.poseLineup()
      w.__kidDrawPoseClose = (kind) => this.poseClose(kind)
      w.__kidDrawPoseAction = (action, kind) => this.poseAction(action, kind)
      w.__kidDrawPoseActionClose = (action, kind) => this.poseActionClose(action, kind)
      w.__kidDrawPoseSpread = () => this.poseSpreadFacings()
      w.__kidDrawPosePerspective = () => this.posePerspective()
      w.__kidDrawPoseOrbit = () => this.poseOrbit()
      w.__kidDrawPoseLookFront = () => this.poseLookFront()
      w.__kidDrawPoseFace = (side) => this.poseFace(side)
      w.__kidDrawPoseLionProcess = (layer) => this.poseLionProcess(layer)
      w.__kidDrawCapturePng = () => this.renderer.domElement.toDataURL('image/png')
    }
    const grass = new THREE.CanvasTexture(paintGrassGround())
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(10, 10)
    grass.premultiplyAlpha = false
    this.ground = new THREE.Mesh(
      makeTerrain(),
      new THREE.MeshLambertMaterial({ map: grass, color: '#6aaa4a' }),
    )
    this.scene.add(this.ground)
    this.scene.add(this.decorations)
    this.applyTheme('forest')
    this.resize()
    window.addEventListener('resize', this.onResize)
    this.loop()
  }

  private onResize = (): void => this.resize()

  resize(): void {
    const canvas = this.renderer.domElement
    const parent = canvas.parentElement
    const w = Math.min(parent?.clientWidth || window.innerWidth, 1600)
    const h = Math.min(parent?.clientHeight || window.innerHeight, 1200)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(h, 1)
    this.camera.updateProjectionMatrix()
  }

  applyTheme(theme: ThemeId): void {
    if (theme === this.theme && this.decorations.children.length > 0) return
    this.theme = theme
    this.decorations.clear()
    this.lights.forEach((l) => this.scene.remove(l))
    this.lights = []
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles = null
    }
    if (theme === 'forest') this.buildForest()
    else if (theme === 'snow') this.buildSnow()
    else this.buildUnderwater()
  }

  syncAnimals(list: PlacedAnimal[]): void {
    const seen = new Set(list.map((a) => a.id))
    for (const [id, actor] of this.actors) {
      if (!seen.has(id)) {
        this.scene.remove(actor.group)
        this.actors.delete(id)
      }
    }
    list.forEach((item, i) => {
      const existing = this.actors.get(item.id)
      if (existing) {
        if (item.thumb && isBitmapCoat(item.thumb) && !existing.group.userData.drawing) {
          applyDrawingCoat(existing.group, item.thumb)
        }
        return
      }
      const group = createAnimalModel(item.animalId, item.regionColors, item.thumb || undefined)
      if (isMarine(item.animalId)) group.scale.setScalar(1)
      else pinLandScale(group)
      const marine = isMarine(item.animalId)
      const actor: Actor = {
        id: item.id,
        animalId: item.animalId,
        group,
        angle: marine ? Math.PI / 2 + i * 0.85 : 0.12 + i * 0.16,
        radius: marine ? 1.45 + (i % 3) * 0.32 : 0,
        speed: (marine ? 0.28 : 0.045) + Math.random() * 0.02,
        lane: (i % 3) - 1,
        phase: actorPhase(i),
        marine,
        frozen: false,
        emote: null,
        emoteUntil: 0,
      }
      this.scene.add(group)
      this.actors.set(item.id, actor)
    })
  }

  /** 镜头对着石径上最新送来的陆地动物。 */
  frameFirstAnimal(): boolean {
    const actors = [...this.actors.values()]
    const land = actors.filter((a) => !a.marine)
    const actor = (land.length ? land : actors).at(-1)
    if (!actor) {
      this.framePathVista()
      return false
    }
    const target = new THREE.Vector3()
    const head = actor.group.getObjectByName('head')
    const body = actor.group.getObjectByName('body')
    if (head && body) {
      const hp = new THREE.Vector3()
      const bp = new THREE.Vector3()
      head.getWorldPosition(hp)
      body.getWorldPosition(bp)
      target.lerpVectors(bp, hp, 0.5)
    } else if (head) head.getWorldPosition(target)
    else actor.group.getWorldPosition(target)
    this.orbit.target.copy(target)
    this.camera.position.set(
      target.x + 0.15 * FOREST_CAMERA_PULL,
      target.y + 1.05 * FOREST_CAMERA_PULL,
      target.z + 4.6 * FOREST_CAMERA_PULL,
    )
    this.syncOrbitFromCamera()
    return true
  }

  private snapClip(group: THREE.Group, time: number): void {
    const mixer = group.userData.mixer as THREE.AnimationMixer | undefined
    const active = group.userData.activeClip as THREE.AnimationAction | undefined
    const actions = group.userData.actions as Record<string, THREE.AnimationAction> | undefined
    if (!mixer || !active) return
    if (actions) {
      for (const clip of Object.values(actions)) {
        if (clip !== active) clip.stop()
      }
    }
    active.enabled = true
    active.setEffectiveWeight(1)
    active.time = time
    mixer.update(0)
  }

  /** 狮 / 鹿 / 虎站在石径上，对着 gen-forest-with-animals。 */
  poseLineup(): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    const byKind = (id: AnimalId) => land.filter((a) => a.animalId === id)
    const order = [...byKind('lion'), ...byKind('deer'), ...byKind('tiger'), ...land.filter((a) => !['lion', 'deer', 'tiger'].includes(a.animalId))]
    const slots: [number, number][] = [
      [-1.35, 3.35],
      [0.12, 0.55],
      [1.05, -2.15],
    ]
    order.forEach((actor, i) => {
      const slot = slots[Math.min(i, slots.length - 1)]!
      actor.frozen = true
      pinLandScale(actor.group)
      const feet = keepOffCreek(slot[0], slot[1])
      actor.group.position.set(feet.x, 0.02, feet.z)
      const along = pointOnPath(0.18 + i * 0.22, 0)
      this.settleLand(actor, 'walk', landYaw('walk', along.heading, i - 1), 0.35)
    })
    this.orbit.target.set(0.05, 0.62, -0.4)
    this.camera.position.set(0.18, 2.85, 12.4)
    this.syncOrbitFromCamera()
    this.reorientLand()
    return order.length > 0
  }

  poseAction(action: WorldAction, kind?: AnimalId): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    const chosen = kind ? land.filter((a) => a.animalId === kind) : land
    if (!chosen.length) return false
    const alongUs = [0.14, 0.4, 0.78]
    chosen.forEach((actor, i) => {
      actor.frozen = true
      actor.group.visible = true
      pinLandScale(actor.group)
      if (action === 'drink') {
        const stand = drinkStand(i)
        actor.group.position.set(stand.x, 0.02, stand.z)
        this.settleLand(actor, 'drink', stand.heading, 0.8)
      } else {
        const along = pointOnPath(alongUs[Math.min(i, alongUs.length - 1)]!, i - 1)
        const feet = keepOffCreek(along.x, along.z)
        actor.group.position.set(feet.x, 0.02, feet.z)
        const pose = action === 'rest' ? 'rest' : action === 'sit' ? 'sit' : 'walk'
        const heading =
          pose === 'walk'
            ? wrapPi(along.heading + Math.PI)
            : landYaw(pose, along.heading, i - 1)
        this.settleLand(actor, pose, heading, pose === 'walk' ? 0.28 : 0.8)
      }
    })
    if (action === 'drink') {
      const look = drinkStand(1)
      this.orbit.target.set(look.x, 0.52, look.z)
      this.camera.position.set(-0.35, 2.7, look.z + 8.6)
    } else {
      this.orbit.target.set(0.12, 0.55, -1.6)
      this.camera.position.set(0.38, 2.62, 12.2)
    }
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  poseClose(kind: AnimalId): boolean {
    this.poseLineup()
    const actor = [...this.actors.values()].find((a) => a.animalId === kind)
    if (!actor) return false
    const target = new THREE.Vector3()
    actor.group.getWorldPosition(target)
    target.y += 0.72
    this.orbit.target.copy(target)
    this.camera.position.set(
      target.x + 0.15 * FOREST_CAMERA_PULL,
      target.y + 1.05 * FOREST_CAMERA_PULL,
      target.z + 4.6 * FOREST_CAMERA_PULL,
    )
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  /**
   * 截图用：定住一只陆地动物的 walk/sit/drink/sleep，镜头拉近到能看清脚掌，
   * 不经过 poseLineup（那会把姿势打回走路）。
   */
  poseActionClose(action: WorldAction, kind: AnimalId = 'lion'): boolean {
    const actor = [...this.actors.values()].find((a) => a.animalId === kind && !a.marine)
    if (!actor) return false
    for (const other of this.actors.values()) {
      other.frozen = true
      other.group.visible = other === actor
    }
    pinLandScale(actor.group)
    const stand = action === 'drink' ? drinkStand(0) : null
    const along = pointOnPath(0.22, 0)
    const onPath = stand
      ? { x: stand.x, z: stand.z }
      : keepOffCreek(0.1, 2.55)
    actor.group.position.set(onPath.x, 0.02, onPath.z)
    const heading = stand
      ? stand.heading
      : landYaw(action === 'sit' || action === 'rest' ? 'sit' : 'walk', along.heading, 0)
    this.settleLand(actor, action === 'rest' ? 'rest' : action, heading, action === 'walk' ? 0.32 : 0.9)
    const target = new THREE.Vector3()
    actor.group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(actor.group)
    if (!box.isEmpty()) {
      box.getCenter(target)
      target.y = Math.max(0.42, box.min.y + (box.max.y - box.min.y) * 0.42)
    } else {
      actor.group.getWorldPosition(target)
      target.y += 0.55
    }
    this.orbit.target.copy(target)
    this.camera.position.set(target.x + 1.15, 1.28, target.z + 3.05)
    this.syncOrbitFromCamera()
    keepPawsOnPath(actor.group)
    const pose = action === 'rest' ? 'rest' : action
    const face =
      actor.group.userData.pack === LAND_GLTF_PACK
        ? Math.atan2(this.camera.position.x - target.x, this.camera.position.z - target.z)
        : heading
    this.orientLand(actor.group, pose, face)
    return true
  }

  /** Process stills: mesh / bones overlay / in-game effect of the lion glb. */
  poseLionProcess(layer: 'mesh' | 'bones' | 'effect'): boolean {
    if (!this.poseActionClose('walk', 'lion')) return false
    const actor = [...this.actors.values()].find((a) => a.animalId === 'lion' && !a.marine)
    if (!actor) return false
    for (const other of this.actors.values()) {
      other.frozen = true
      other.group.visible = other === actor
    }
    const sample = layer === 'effect' ? 0.34 : 0
    this.snapClip(actor.group, sample)
    this.showLionBones(actor.group, layer === 'bones')
    keepPawsOnPath(actor.group)
    const target = new THREE.Vector3()
    actor.group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(actor.group)
    if (!box.isEmpty()) box.getCenter(target)
    else actor.group.getWorldPosition(target)
    const face = Math.atan2(this.camera.position.x - target.x, this.camera.position.z - target.z)
    this.orientLand(actor.group, 'walk', face)
    if (layer === 'effect') {
      this.camera.position.set(target.x + 0.55, 1.35, target.z + 3.4)
      this.orbit.target.set(target.x, Math.max(0.5, target.y * 0.9), target.z)
      this.syncOrbitFromCamera()
      this.orientLand(
        actor.group,
        'walk',
        Math.atan2(this.camera.position.x - target.x, this.camera.position.z - target.z),
      )
    }
    return true
  }

  private showLionBones(group: THREE.Group, visible: boolean): void {
    const stale: THREE.Object3D[] = []
    group.traverse((obj) => {
      if (obj.userData.boneMark) stale.push(obj)
    })
    for (const obj of stale) obj.removeFromParent()
    let helper = group.getObjectByName('lion-bones-overlay') as THREE.SkeletonHelper | undefined
    if (!visible) {
      if (helper) helper.visible = false
      return
    }
    group.traverse((obj) => {
      if (!(obj as THREE.Bone).isBone) return
      const mark = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#7cff4a', depthTest: false, depthWrite: false }),
      )
      mark.name = `joint-${obj.name}`
      mark.userData.boneMark = true
      mark.renderOrder = 20
      mark.frustumCulled = false
      obj.add(mark)
    })
    const body = group.getObjectByName('body') as THREE.SkinnedMesh | undefined
    if (!helper && body && (body as THREE.SkinnedMesh).isSkinnedMesh) {
      helper = new THREE.SkeletonHelper(body)
      helper.name = 'lion-bones-overlay'
      helper.frustumCulled = false
      const mat = helper.material as THREE.LineBasicMaterial
      mat.depthTest = false
      mat.depthWrite = false
      group.add(helper)
    }
    if (helper) helper.visible = true
  }

  /** 狮走路、鹿坐下回头、虎喝水：三只朝向不同，脚不踩溪。 */
  poseSpreadFacings(): boolean {
    if (!this.poseAction('walk')) return false
    this.poseAction('sit', 'deer')
    this.poseAction('drink', 'tiger')
    this.orbit.target.set(0.55, 0.52, 0.8)
    this.camera.position.set(-0.15, 2.45, 9.6)
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  /** 近处一只大、远处一只小：同一世界身高，透视自己缩。 */
  posePerspective(): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    if (!land.length) return false
    const byKind = (id: AnimalId) => land.find((a) => a.animalId === id)
    const near = byKind('lion') || land[0]!
    const far = byKind('tiger') || land.at(-1)!
    const mid = byKind('deer')
    const place = (actor: Actor, u: number, lane: number, heading: number) => {
      actor.frozen = true
      actor.group.visible = true
      pinLandScale(actor.group)
      const along = pointOnPath(u, lane)
      const feet = keepOffCreek(along.x, along.z)
      actor.group.position.set(feet.x, 0.02, feet.z)
      this.settleLand(actor, 'walk', heading, 0.28)
    }
    for (const actor of this.actors.values()) {
      actor.frozen = true
      if (!actor.marine && actor !== near && actor !== far && actor !== mid) actor.group.visible = false
    }
    place(near, 0.05, 0, 0)
    if (mid && mid !== near && mid !== far) place(mid, 0.38, -0.8, 0.85)
    if (far !== near) place(far, 0.86, 0.35, 1.55)
    const look = pointOnPath(0.48, 0)
    this.orbit.target.set(look.x, 0.48, look.z)
    this.camera.position.set(0.55, 2.55, 11.4)
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  /** 手机侧视：动物沿石径走，镜头在路旁，能看见身子厚度，不是拧扁的卡片。 */
  poseOrbit(): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    if (!land.length) return false
    const byKind = (id: AnimalId) => land.find((a) => a.animalId === id)
    const order = [byKind('lion'), byKind('deer'), byKind('tiger')].filter((a): a is Actor => Boolean(a))
    const lineup = order.length ? order : land
    lineup.forEach((actor, i) => {
      actor.frozen = true
      actor.group.visible = true
      pinLandScale(actor.group)
      const along = pointOnPath(0.16 + i * 0.18, i === 1 ? -0.8 : i === 2 ? 0.7 : 0)
      const feet = keepOffCreek(along.x, along.z)
      actor.group.position.set(feet.x, 0.02, feet.z)
      this.settleLand(actor, 'walk', landYaw('walk', along.heading, i - 1), 0.32)
    })
    for (const actor of this.actors.values()) {
      if (actor.marine || !lineup.includes(actor)) actor.group.visible = actor.marine
    }
    const look = pointOnPath(0.28, 0)
    this.orbit.target.set(look.x, 0.62, look.z)
    this.camera.position.set(look.x - 6.4, 2.35, look.z + 3.4)
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  /**
   * 王腾强 top-down path shot: steep camera down the stones.
   * Lion sits, deer sits, tiger sleeps — legs/paws/tail must stay opaque.
   */
  poseLookFront(): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    if (!land.length) return false
    const byKind = (id: AnimalId) => land.find((a) => a.animalId === id)
    const place = (actor: Actor, u: number, lane: number, action: WorldAction) => {
      actor.frozen = true
      actor.group.visible = true
      pinLandScale(actor.group)
      const along = pointOnPath(u, lane)
      const feet = keepOffCreek(along.x, along.z)
      actor.group.position.set(feet.x, 0.02, feet.z)
      const pose = action === 'rest' ? 'rest' : action === 'sit' ? 'sit' : 'walk'
      const heading =
        pose === 'walk'
          ? wrapPi(along.heading + Math.PI)
          : landYaw(pose, along.heading, lane)
      this.settleLand(actor, pose, heading, pose === 'walk' ? 0.3 : 0.85)
    }
    const lion = byKind('lion')
    const deer = byKind('deer')
    const tiger = byKind('tiger')
    if (lion) place(lion, LOOK_FRONT.lionU, 0, 'sit')
    if (deer) place(deer, LOOK_FRONT.deerU, -0.08, 'sit')
    if (tiger) place(tiger, LOOK_FRONT.tigerU, 0.12, 'rest')
    for (const actor of this.actors.values()) {
      if (actor.marine) continue
      if (actor !== lion && actor !== deer && actor !== tiger) actor.group.visible = false
    }
    const look = pointOnPath((LOOK_FRONT.tigerU + LOOK_FRONT.lionU) / 2, 0)
    this.orbit.target.set(look.x, 0.32, look.z)
    this.camera.position.set(look.x + 0.22, LOOK_FRONT.camY, look.z + LOOK_FRONT.camZ)
    this.syncOrbitFromCamera()
    this.reorientLand()
    return true
  }

  /** Same path lineup as look-front, sit/sleep cutouts flipped left or right. */
  poseFace(side: 'left' | 'right'): boolean {
    if (!this.poseLookFront()) return false
    const heading = side === 'left' ? 1.05 : -1.05
    for (const actor of this.actors.values()) {
      if (actor.marine || !actor.group.visible) continue
      const action = (actor.group.userData.landAction as WorldAction) || 'sit'
      this.orientLand(actor.group, action, heading)
    }
    return true
  }

  /**
   * Layer 1: swap front/3-quarter/side/pose art. Do not yaw a front PNG into a card.
   */
  private orientLand(group: THREE.Group, action: WorldAction, heading: number): void {
    group.userData.heading = heading
    group.userData.landAction = action
    if (group.userData.pack === ART_CUTOUT_PACK || group.userData.pack === CARTOON_RIG_PACK) {
      applyLandView(group, this.camera, action, heading)
      return
    }
    group.rotation.y = heading
  }

  private reorientLand(): void {
    for (const actor of this.actors.values()) {
      if (actor.marine || !actor.group.visible) continue
      const action = (actor.group.userData.landAction as WorldAction) || 'walk'
      const heading = (actor.group.userData.heading as number) || 0
      this.orientLand(actor.group, action, heading)
    }
  }

  private settleLand(actor: Actor, action: WorldAction, heading: number, sample: number): void {
    this.orientLand(actor.group, action, heading)
    actor.group.userData._animT = undefined
    tickAction(actor.group, action, sample)
    this.snapClip(actor.group, sample)
    keepPawsOnPath(actor.group)
    if (actor.group.userData.pack === ART_CUTOUT_PACK || actor.group.userData.pack === CARTOON_RIG_PACK) {
      this.orientLand(actor.group, action, heading)
    } else {
      this.aimLandHead(actor.group)
    }
  }

  /** 身子跟走路朝向；头可以靠脖子骨轻轻看镜头，夹住角度。 */
  private aimLandHead(group: THREE.Group): void {
    const neck = group.getObjectByName('neck')
    if (!neck) return
    const pos = new THREE.Vector3()
    group.getWorldPosition(pos)
    const toCam = Math.atan2(this.camera.position.x - pos.x, this.camera.position.z - pos.z)
    const rel = wrapPi(toCam - group.rotation.y)
    neck.rotation.y = THREE.MathUtils.clamp(rel * 0.38, -0.45, 0.45)
  }

  private syncOrbitFromCamera(): void {
    const ox = this.camera.position.x - this.orbit.target.x
    const oy = this.camera.position.y - this.orbit.target.y
    const oz = this.camera.position.z - this.orbit.target.z
    this.orbit.radius = Math.hypot(ox, oy, oz)
    this.orbit.phi = Math.acos(Math.min(1, Math.max(-1, oy / Math.max(this.orbit.radius, 1e-6))))
    this.orbit.theta = Math.atan2(ox, oz)
    this.orbit.apply()
  }

  /** 空林子：顺着石径往里看，蘑菇在近处。 */
  framePathVista(): void {
    this.orbit.target.set(0.08, 0.5, -3.6)
    this.camera.position.set(0.36, 3.7, 18.8)
    this.syncOrbitFromCamera()
  }

  showEmote(animalId: string, emote: EmoteId): void {
    const actor = this.actors.get(animalId)
    if (!actor) return
    if (actor.emote) actor.group.remove(actor.emote)
    actor.emote = makeEmote(emote)
    actor.emote.position.set(0, 2.1, 0)
    actor.group.add(actor.emote)
    actor.emoteUntil = performance.now() + 2600
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.orbit.dispose()
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
  }

  private loop = (): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const t = this.clock.getElapsedTime()
    const dt = this.clock.getDelta()
    for (const actor of this.actors.values()) {
      this.placeActor(actor, t, dt)
      if (actor.emote && performance.now() > actor.emoteUntil) {
        actor.group.remove(actor.emote)
        actor.emote = null
      }
    }
    if (this.particles) {
      const pos = this.particles.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + (this.theme === 'underwater' ? 0.02 : -0.03)
        if (this.theme === 'snow' && y < 0) y = 6
        if (this.theme === 'underwater' && y > 6) y = 0.2
        pos.setY(i, y)
      }
      pos.needsUpdate = true
    }
    this.renderer.render(this.scene, this.camera)
  }

  private placeActor(actor: Actor, t: number, dt: number): void {
    if (!actor.marine) pinLandScale(actor.group)
    if (actor.frozen) {
      if (!actor.marine) {
        const action = (actor.group.userData.landAction as WorldAction) || 'walk'
        const heading = (actor.group.userData.heading as number) || 0
        this.orientLand(actor.group, action, heading)
        keepPawsOnPath(actor.group)
      }
      return
    }
    const step = Math.min(dt, 0.05)
    if (actor.marine) {
      actor.angle += actor.speed * step
      let x = OCEAN.x + Math.cos(actor.angle) * actor.radius
      let z = OCEAN.z + Math.sin(actor.angle) * actor.radius * 0.82
      if (!pointInRing(x, z, this.coast)) {
        x = OCEAN.x + Math.cos(actor.angle) * 1.2
        z = OCEAN.z + Math.sin(actor.angle) * 1.1
      }
      const bob = Math.sin(t * 3.1 + actor.angle) * 0.08
      actor.group.position.set(x, 0.1 + bob, z)
      actor.group.rotation.y = -actor.angle + Math.PI / 2
      tickAction(actor.group, 'swim', t + actor.angle)
      return
    }

    const action = autoLandAction(t, actor.phase)
    if (action === 'drink') {
      const stand = drinkStand(Math.max(0, actor.lane + 1))
      actor.group.position.set(stand.x, 0.02, stand.z)
      this.orientLand(actor.group, 'drink', stand.heading)
      tickAction(actor.group, 'drink', t)
      keepPawsOnPath(actor.group)
      return
    }
    if (action === 'rest') {
      const p = pointOnPath(PATH_REST_U, actor.lane * 0.35)
      const feet = keepOffCreek(p.x, p.z)
      actor.group.position.set(feet.x, 0.02, feet.z)
      const heading = landYaw('rest', p.heading, actor.lane)
      this.orientLand(actor.group, 'rest', heading)
      tickAction(actor.group, 'rest', t)
      keepPawsOnPath(actor.group)
      return
    }
    if (action === 'sit') {
      const p = pointOnPath(PATH_SIT_U, actor.lane * 0.35)
      const feet = keepOffCreek(p.x, p.z)
      actor.group.position.set(feet.x, 0, feet.z)
      const heading = landYaw('sit', p.heading, actor.lane)
      this.orientLand(actor.group, 'sit', heading)
      tickAction(actor.group, 'sit', t)
      keepPawsOnPath(actor.group)
      return
    }

    actor.angle += actor.speed * step
    if (actor.angle > PATH_WALK_MAX_U) actor.angle = PATH_WALK_MIN_U
    const p = pointOnPath(actor.angle, actor.lane)
    const feet = keepOffCreek(p.x, p.z)
    actor.group.position.set(feet.x, 0.02, feet.z)
    const heading = landYaw('walk', p.heading, actor.lane)
    this.orientLand(actor.group, 'walk', heading)
    tickAction(actor.group, 'walk', t + actor.angle)
    keepPawsOnPath(actor.group)
  }

  private addLight(l: THREE.Light): void {
    this.scene.add(l)
    this.lights.push(l)
  }

  private buildForest(): void {
    this.scene.background = new THREE.Color('#8ec8f0')
    this.scene.fog = new THREE.Fog('#c5e0a8', 42, 120)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#6aaa4a')
    this.addLight(new THREE.HemisphereLight('#fff3c8', '#3d6a32', 1.22))
    const sun = new THREE.DirectionalLight('#ffe6a8', 1.05)
    sun.position.set(10, 16, 8)
    this.addLight(sun)
    const fill = new THREE.DirectionalLight('#d4f0b0', 0.42)
    fill.position.set(-8, 7, 5)
    this.addLight(fill)
    const rim = new THREE.DirectionalLight('#fff6d8', 0.28)
    rim.position.set(2, 6, -10)
    this.addLight(rim)

    const woods = new THREE.CanvasTexture(paintForestPanorama())
    woods.colorSpace = THREE.SRGBColorSpace
    const backdrop = new THREE.Mesh(
      new THREE.CylinderGeometry(54, 54, 20, 24, 1, true),
      new THREE.MeshBasicMaterial({ map: woods, side: THREE.BackSide, fog: false }),
    )
    backdrop.position.y = 7.5
    this.decorations.add(backdrop)

    this.addHills()
    this.addStonePath()
    this.addCreek()
    this.addHeroTrees()
    this.addMushrooms()
    this.addFernsAndFlowers()
    this.addOcean()
    this.addWoods()
  }

  private addHills(): void {
    for (const [x, z, sx, sy, sz] of [
      [-8.6, -8.4, 3.2, 1.05, 2.6],
      [-11.4, 2.2, 2.8, 0.85, 2.4],
      [6.4, -9.8, 3.0, 0.95, 2.6],
      [-6.2, 9.6, 2.4, 0.7, 2.0],
      [8.2, 8.4, 2.2, 0.62, 1.8],
    ] as const) {
      if (pointInRing(x, z, this.coast) || distToPath(x, z) < 4) continue
      const hill = new THREE.Mesh(shared.hillGeo, shared.bankMat)
      hill.position.set(x, 0.06, z)
      hill.scale.set(sx, sy, sz)
      this.decorations.add(hill)
    }
  }

  private addStonePath(): void {
    const curve = pathCurve()
    const dirtPts = curve.getSpacedPoints(22)
    for (let i = 0; i < dirtPts.length; i++) {
      const p = dirtPts[i]!
      const patch = new THREE.Mesh(shared.hillGeo, shared.dirtMat)
      patch.position.set(p.x, 0.03, p.z)
      patch.scale.set(1.18 + (i % 3) * 0.08, 0.06, 0.92)
      this.decorations.add(patch)
    }
    const stones = curve.getSpacedPoints(38)
    for (let i = 0; i < stones.length; i++) {
      const p = stones[i]!
      const stone = new THREE.Mesh(shared.stoneGeo, shared.stoneMat)
      const wobble = (hash01(i + 3) - 0.5) * 0.55
      const tan = curve.getTangentAt(i / Math.max(stones.length - 1, 1))
      stone.position.set(p.x - tan.z * wobble, 0.055, p.z + tan.x * wobble)
      stone.scale.set(1.15 + hash01(i) * 0.45, 0.85, 0.95 + hash01(i + 8) * 0.4)
      stone.rotation.y = hash01(i + 11) * Math.PI
      this.decorations.add(stone)
    }
  }

  private addCreek(): void {
    const curve = creekCurve()
    const water = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.42, 6, false),
      new THREE.MeshLambertMaterial({ color: '#5eb8d0', map: waterMap() }),
    )
    water.scale.y = 0.12
    this.decorations.add(water)
    const banks = curve.getSpacedPoints(10)
    for (let i = 0; i < banks.length; i++) {
      const p = banks[i]!
      const bank = new THREE.Mesh(shared.hillGeo, i % 2 ? shared.shoreMat : shared.bankMat)
      const side = i % 2 ? 0.7 : -0.7
      bank.position.set(p.x + side, 0.04, p.z)
      bank.scale.set(0.55, 0.16, 0.42)
      this.decorations.add(bank)
      if (i % 2 === 0) {
        const rock = new THREE.Mesh(shared.cobbleGeo, shared.rockMat)
        rock.position.set(p.x + 0.55, 0.1, p.z + 0.12)
        rock.scale.set(0.7, 0.55, 0.65)
        this.decorations.add(rock)
      }
    }
  }

  private addHeroTrees(): void {
    const spots: [number, number, number, number][] = [
      [-3.55, 5.55, 1.35, 1],
      [-4.15, 2.35, 1.15, 4],
      [-4.85, -1.2, 1.28, 7],
      [-4.4, -5.1, 1.08, 11],
      [3.95, 5.25, 1.32, 3],
      [4.65, 1.85, 1.18, 8],
      [5.05, -2.05, 1.22, 12],
      [4.45, -6.2, 1.05, 15],
      [-6.2, 4.1, 0.92, 18],
      [6.4, 3.6, 0.88, 21],
    ]
    for (const [x, z, s, seed] of spots) {
      const tree = heroTree(s, seed)
      tree.position.set(x, 0.02, z)
      this.decorations.add(tree)
    }
  }

  private addMushrooms(): void {
    for (const spot of MUSHROOM_SPOTS) {
      const shroom = mushroom(spot.s)
      shroom.position.set(spot.x, 0.02, spot.z)
      this.decorations.add(shroom)
    }
  }

  private addFernsAndFlowers(): void {
    const ferns: [number, number, number][] = [
      [-2.8, 6.8, 1.1],
      [-3.2, 5.2, 0.9],
      [3.15, 6.6, 1.05],
      [3.5, 5.1, 0.85],
      [-2.4, 2.2, 0.8],
      [2.6, 2.4, 0.75],
    ]
    for (const [x, z, s] of ferns) {
      const bush = new THREE.Mesh(shared.fernGeo, shared.canopyMat2)
      bush.position.set(x, 0.22 * s, z)
      bush.scale.set(1.15 * s, 0.45 * s, 0.95 * s)
      this.decorations.add(bush)
    }
    for (let i = 0; i < 18; i++) {
      const u = 0.08 + hash01(i + 40) * 0.7
      const p = pointOnPath(u, (hash01(i) > 0.5 ? 1 : -1) * (2.6 + hash01(i + 2) * 1.2))
      if (distToPath(p.x, p.z) < 2.3) continue
      const bloom = new THREE.Mesh(shared.dotGeo, shared.flowerMats[i % shared.flowerMats.length]!)
      bloom.position.set(p.x, 0.06, p.z)
      bloom.scale.setScalar(1.4 + hash01(i + 9) * 0.6)
      this.decorations.add(bloom)
    }
  }

  private addWoods(): void {
    const used = { n: 0 }
    const take = (want: number) => {
      const left = TREE_INSTANCE_CAP - used.n
      const n = Math.max(0, Math.min(want, left))
      used.n += n
      return n
    }
    const tall = scatterTrees(take(28), 7.5, 14, 11, this.coast)
    const mid = scatterTrees(take(34), 13, 24, 23, this.coast)
    const far = scatterTrees(take(34), 22, 40, 41, this.coast)
    const trunks = tall.concat(mid)
    if (trunks.length) this.decorations.add(instancedTrunks(trunks))
    if (tall.length) this.decorations.add(instancedCanopies(tall, shared.canopyMat, 1.12))
    if (mid.length) this.decorations.add(instancedCanopies(mid, shared.canopyMat2, 1.02))
    if (far.length) this.decorations.add(instancedFar(far))
  }

  private addOcean(): void {
    const coast = this.coast
    const sandRing = offsetRing(coast, 0.95)
    const sand = new THREE.Shape()
    sand.moveTo(sandRing[0]![0], -sandRing[0]![1])
    for (let i = 1; i < sandRing.length; i++) sand.lineTo(sandRing[i]![0], -sandRing[i]![1])
    sand.closePath()
    const hole = new THREE.Path()
    hole.moveTo(coast[0]![0], -coast[0]![1])
    for (let i = 1; i < coast.length; i++) hole.lineTo(coast[i]![0], -coast[i]![1])
    hole.closePath()
    sand.holes.push(hole)
    this.decorations.add(flattenXZ(new THREE.ShapeGeometry(sand, 2), 0.11, shared.shoreMat))

    const basin = new THREE.ExtrudeGeometry(xzShape(coast), {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.2,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 1,
    })
    basin.rotateX(-Math.PI / 2)
    const water = new THREE.Mesh(basin, shared.sideMat)
    water.position.y = -0.55
    this.decorations.add(water)

    this.decorations.add(
      flattenXZ(
        new THREE.ShapeGeometry(xzShape(coast), 2),
        0.04,
        new THREE.MeshLambertMaterial({
          color: '#4aa3c4',
          map: waterMap(),
          transparent: false,
          opacity: 1,
          depthWrite: true,
        }),
      ),
    )
    this.decorations.add(flattenXZ(new THREE.ShapeGeometry(xzShape(offsetRing(coast, -1.15)), 2), 0.05, shared.deepMat))
  }

  private addLake(x: number, z: number, radius: number): void {
    const shore = new THREE.Mesh(shared.hillGeo, shared.shoreMat)
    shore.position.set(x, -0.02, z)
    shore.scale.set(radius * 1.45, 0.18, radius * 1.05)
    const water = new THREE.Mesh(shared.hillGeo, shared.waterMat)
    water.position.set(x, -0.04, z)
    water.scale.set(radius * 1.2, 0.16, radius * 0.88)
    this.decorations.add(shore, water)
  }

  private buildSnow(): void {
    this.scene.background = new THREE.Color('#d9ebf7')
    this.scene.fog = new THREE.Fog('#d9ebf7', 22, 52)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#f4f8ff')
    this.addLight(new THREE.HemisphereLight('#eef6ff', '#9bb4c8', 1.15))
    this.addStonePath()
    this.addLake(6.4, -3.0, 2.4)
    const mtn = new THREE.Mesh(shared.hillGeo, new THREE.MeshLambertMaterial({ color: '#8aa0b0' }))
    mtn.position.set(0, 2.2, -14)
    mtn.scale.set(4.2, 4.6, 3.6)
    this.decorations.add(mtn)
    for (let i = 0; i < 8; i++) {
      const tree = heroTree(0.85, i)
      const a = (i / 8) * Math.PI * 2 + 0.2
      tree.position.set(Math.cos(a) * 8.4, 0, Math.sin(a) * 8.4)
      this.decorations.add(tree)
    }
    this.particles = makePoints('#ffffff', 40, 8)
    this.scene.add(this.particles)
  }

  private buildUnderwater(): void {
    this.scene.background = new THREE.Color('#0b4f6c')
    this.scene.fog = new THREE.Fog('#0b4f6c', 10, 28)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#c2b280')
    this.addLight(new THREE.HemisphereLight('#7fd3ff', '#063447', 1.05))
    for (let i = 0; i < 8; i++) {
      const kelp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 2.2, 5),
        new THREE.MeshLambertMaterial({ color: i % 2 ? '#1f8a5b' : '#2bb673' }),
      )
      const a = (i / 8) * Math.PI * 2
      kelp.position.set(Math.cos(a) * 6, 1.1, Math.sin(a) * 6)
      this.decorations.add(kelp)
    }
    for (const [x, z] of [
      [-4, -3],
      [3.5, 2],
      [-2, 4],
    ] as const) {
      const dune = new THREE.Mesh(shared.hillGeo, shared.shoreMat)
      dune.position.set(x, 0.1, z)
      dune.scale.set(1.8, 0.45, 1.4)
      this.decorations.add(dune)
    }
    this.particles = makePoints('#b9f3ff', 36, 7)
    this.scene.add(this.particles)
  }
}

function heroTree(scale: number, seed: number): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(shared.heroTrunkGeo, shared.barkMat)
  trunk.position.y = 1.35 * scale
  trunk.scale.set(scale * 0.95, scale * 1.05, scale * 0.95)
  g.add(trunk)
  const moss = new THREE.Mesh(shared.canopyGeo, shared.canopyMat2)
  moss.position.set(scale * 0.18, 0.7 * scale, scale * 0.12)
  moss.scale.set(0.35 * scale, 0.55 * scale, 0.28 * scale)
  g.add(moss)
  const lifts = [
    [0, 2.55, 0, 1.55, 1.15, 1.5],
    [0.55, 2.85, 0.22, 1.15, 0.95, 1.1],
    [-0.5, 2.95, -0.28, 1.05, 0.9, 1.05],
    [0.15, 3.25, -0.15, 0.95, 0.82, 0.95],
    [0.35, 2.45, -0.45, 0.85, 0.7, 0.85],
  ] as const
  const mats = [shared.canopyMat, shared.canopyMat3, shared.canopyMat2, shared.canopyMat, shared.canopyMat3]
  lifts.forEach((row, i) => {
    const leaf = new THREE.Mesh(shared.canopyGeo, mats[(seed + i) % mats.length]!)
    leaf.position.set(row[0] * scale, row[1] * scale, row[2] * scale)
    leaf.scale.set(row[3] * scale, row[4] * scale, row[5] * scale)
    g.add(leaf)
  })
  return g
}

function mushroom(s: number): THREE.Group {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(shared.stemGeo, shared.stemMat)
  stem.position.y = 0.22 * s
  stem.scale.set(s, s, s)
  const cap = new THREE.Mesh(shared.capGeo, shared.capMat)
  cap.position.y = 0.4 * s
  cap.scale.set(1.45 * s, 1.05 * s, 1.45 * s)
  g.add(stem, cap)
  const dots: [number, number, number, number][] = [
    [0.12, 0.52, 0.08, 1.1],
    [-0.1, 0.5, 0.14, 0.9],
    [0.02, 0.54, -0.16, 1.2],
    [0.18, 0.48, -0.06, 0.8],
    [-0.16, 0.49, -0.04, 0.75],
  ]
  for (const [x, y, z, ds] of dots) {
    const dot = new THREE.Mesh(shared.dotGeo, shared.dotMat)
    dot.position.set(x * s, y * s, z * s)
    dot.scale.setScalar(ds * s)
    g.add(dot)
  }
  return g
}

type TreeSpot = { x: number; z: number; s: number; h: number }

function scatterTrees(count: number, r0: number, r1: number, seed: number, coast: [number, number][]): TreeSpot[] {
  const out: TreeSpot[] = []
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const a = hash01(seed + i) * Math.PI * 2
    const r = r0 + hash01(seed + i + 17) * (r1 - r0)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.hypot(x, z) < 5.2) continue
    if (distToPath(x, z) < 3.4) continue
    if (pointInRing(x, z, coast)) continue
    if (Math.abs(x) < 2.2 && z > -2) continue
    out.push({
      x,
      z,
      s: 0.95 + hash01(seed + i + 3) * 0.55,
      h: 2.4 + hash01(seed + i + 9) * 1.8,
    })
  }
  return out
}

function instancedTrunks(spots: TreeSpot[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(shared.trunkGeo, shared.barkMat, spots.length)
  spots.forEach((p, i) => {
    _dummy.position.set(p.x, p.h * 0.5, p.z)
    _dummy.scale.set(p.s * 1.35, p.h, p.s * 1.35)
    _dummy.rotation.set(0, hash01(i + 4) * 0.8, 0)
    _dummy.updateMatrix()
    mesh.setMatrixAt(i, _dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = false
  return mesh
}

function instancedCanopies(spots: TreeSpot[], mat: THREE.MeshLambertMaterial, lift: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(shared.canopyGeo, mat, spots.length)
  spots.forEach((p, i) => {
    _dummy.position.set(p.x + (hash01(i) - 0.5) * 0.25, p.h * lift, p.z)
    const sc = p.s * (1.85 + hash01(i + 8) * 0.45)
    _dummy.scale.set(sc, sc * 0.78, sc)
    _dummy.rotation.set(0, 0, 0)
    _dummy.updateMatrix()
    mesh.setMatrixAt(i, _dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = false
  return mesh
}

function instancedFar(spots: TreeSpot[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(shared.impostorGeo, shared.farMat, spots.length)
  spots.forEach((p, i) => {
    _dummy.position.set(p.x, p.h * 0.72, p.z)
    const sc = p.s * 2.5
    _dummy.scale.set(sc, sc * 1.45, sc)
    _dummy.rotation.set(0, 0, 0)
    _dummy.updateMatrix()
    mesh.setMatrixAt(i, _dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = false
  return mesh
}

function makePoints(color: string, count: number, spread: number): THREE.Points {
  const geo = new THREE.BufferGeometry()
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * spread * 2
    arr[i * 3 + 1] = Math.random() * 6
    arr[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.08, opacity: 0.8, transparent: true }))
}

function makeEmote(text: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.font = '48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 36)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }))
  s.scale.set(1.1, 1.1, 1)
  return s
}
