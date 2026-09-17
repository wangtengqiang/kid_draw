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
  paintMushroomCap,
  paintWater,
} from './forest-art'
import { ART_CUTOUT_PACK, billboardY } from './art-cutout'

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
  { x: 2.8, z: -1.1, s: 0.7 },
]

/**
 * 海湾里的游泳圈放在林子东边，默认镜头看石径。
 * 喝水站在小溪边。
 */
export const OCEAN = { x: 18.4, z: -1.2, rx: 2.15, rz: 3.4 }
export const SHORE_DRINK = { x: 2.72, z: 1.35 }
export const GROUND_RADIUS = 46
export const TREE_INSTANCE_CAP = 96

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
  capGeo: new THREE.SphereGeometry(0.32, 8, 6),
  fernGeo: new THREE.ConeGeometry(0.28, 0.7, 6),
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
  const cap = new THREE.CanvasTexture(paintMushroomCap())
  cap.colorSpace = THREE.SRGBColorSpace
  shared.capMat.map = cap
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
      preserveDrawingBuffer: false,
    })
    this.renderer.setClearColor('#8ec8f0', 1)
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = false
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 140)
    this.camera.position.set(0.2, 2.05, 9.55)
    this.camera.lookAt(0.08, 0.62, -2.8)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0.08, 0.58, -1.1), HOST_ORBIT)
    if (typeof window !== 'undefined') {
      const w = window as Window & {
        __kidDrawFrameHost?: () => boolean
        __kidDrawFramePath?: () => void
        __kidDrawPoseLineup?: () => boolean
      }
      w.__kidDrawFrameHost = () => this.frameFirstAnimal()
      w.__kidDrawFramePath = () => this.framePathVista()
      w.__kidDrawPoseLineup = () => this.poseLineup()
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
      group.scale.setScalar(isMarine(item.animalId) ? 1.0 : 1.12)
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
    this.camera.position.set(target.x + 0.15, target.y + 1.05, target.z + 4.6)
    const ox = this.camera.position.x - this.orbit.target.x
    const oy = this.camera.position.y - this.orbit.target.y
    const oz = this.camera.position.z - this.orbit.target.z
    this.orbit.radius = Math.hypot(ox, oy, oz)
    this.orbit.phi = Math.acos(Math.min(1, Math.max(-1, oy / Math.max(this.orbit.radius, 1e-6))))
    this.orbit.theta = Math.atan2(ox, oz)
    this.orbit.apply()
    return true
  }

  /** 狮 / 鹿 / 虎站在石径上，对着 gen-forest-with-animals。 */
  poseLineup(): boolean {
    const land = [...this.actors.values()].filter((a) => !a.marine)
    const byKind = (id: AnimalId) => land.filter((a) => a.animalId === id)
    const order = [...byKind('lion'), ...byKind('deer'), ...byKind('tiger'), ...land.filter((a) => !['lion', 'deer', 'tiger'].includes(a.animalId))]
    const slots: [number, number][] = [
      [-1.18, 2.42],
      [0.04, 1.88],
      [1.22, 2.28],
    ]
    order.forEach((actor, i) => {
      const slot = slots[Math.min(i, slots.length - 1)]!
      actor.frozen = true
      actor.group.position.set(slot[0], 0.02, slot[1])
      actor.group.rotation.y = 0
      tickAction(actor.group, 'walk', 0.35)
      if (actor.group.userData.pack === ART_CUTOUT_PACK) billboardY(actor.group, this.camera)
    })
    this.orbit.target.set(0.04, 0.78, 2.05)
    this.camera.position.set(0.12, 1.62, 6.55)
    const ox = this.camera.position.x - this.orbit.target.x
    const oy = this.camera.position.y - this.orbit.target.y
    const oz = this.camera.position.z - this.orbit.target.z
    this.orbit.radius = Math.hypot(ox, oy, oz)
    this.orbit.phi = Math.acos(Math.min(1, Math.max(-1, oy / Math.max(this.orbit.radius, 1e-6))))
    this.orbit.theta = Math.atan2(ox, oz)
    this.orbit.apply()
    return order.length > 0
  }

  /** 空林子：顺着石径往里看，蘑菇在近处。 */
  framePathVista(): void {
    this.orbit.target.set(0.08, 0.55, -1.4)
    this.camera.position.set(0.22, 2.12, 9.6)
    const ox = this.camera.position.x - this.orbit.target.x
    const oy = this.camera.position.y - this.orbit.target.y
    const oz = this.camera.position.z - this.orbit.target.z
    this.orbit.radius = Math.hypot(ox, oy, oz)
    this.orbit.phi = Math.acos(Math.min(1, Math.max(-1, oy / Math.max(this.orbit.radius, 1e-6))))
    this.orbit.theta = Math.atan2(ox, oz)
    this.orbit.apply()
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
    if (actor.frozen) {
      if (actor.group.userData.pack === ART_CUTOUT_PACK) billboardY(actor.group, this.camera)
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
    const cutout = actor.group.userData.pack === ART_CUTOUT_PACK
    if (action === 'drink') {
      actor.group.position.set(SHORE_DRINK.x, 0.02, SHORE_DRINK.z + actor.lane * 0.7)
      actor.group.rotation.y = Math.PI / 2
      tickAction(actor.group, 'drink', t)
      if (cutout) billboardY(actor.group, this.camera)
      return
    }
    if (action === 'rest') {
      const p = pointOnPath(0.28, -3.2)
      actor.group.position.set(p.x, cutout ? 0.02 : 0.42, p.z)
      actor.group.rotation.y = p.heading
      tickAction(actor.group, 'rest', t)
      if (cutout) billboardY(actor.group, this.camera)
      return
    }
    if (action === 'sit') {
      const p = pointOnPath(0.42, 2.8)
      actor.group.position.set(p.x, 0, p.z)
      actor.group.rotation.y = p.heading + Math.PI
      tickAction(actor.group, 'sit', t)
      if (cutout) billboardY(actor.group, this.camera)
      return
    }

    actor.angle += actor.speed * step
    if (actor.angle > 0.92) actor.angle = 0.06
    const p = pointOnPath(actor.angle, actor.lane)
    actor.group.position.set(p.x, 0.02, p.z)
    actor.group.rotation.y = p.heading
    tickAction(actor.group, 'walk', t + actor.angle)
    if (cutout) billboardY(actor.group, this.camera)
  }

  private addLight(l: THREE.Light): void {
    this.scene.add(l)
    this.lights.push(l)
  }

  private buildForest(): void {
    this.scene.background = new THREE.Color('#8ec8f0')
    this.scene.fog = new THREE.Fog('#c5e0a8', 28, 92)
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
      patch.scale.set(1.55 + (i % 3) * 0.12, 0.07, 1.12)
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
    const curve = new THREE.CatmullRomCurve3(
      CREEK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.03, z)),
      false,
      'catmullrom',
      0.4,
    )
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
      const fern = new THREE.Mesh(shared.fernGeo, shared.canopyMat2)
      fern.position.set(x, 0.32 * s, z)
      fern.scale.set(s, s, s)
      this.decorations.add(fern)
    }
    for (let i = 0; i < 28; i++) {
      const u = 0.08 + hash01(i + 40) * 0.7
      const p = pointOnPath(u, (hash01(i) > 0.5 ? 1 : -1) * (2.1 + hash01(i + 2) * 1.4))
      if (distToPath(p.x, p.z) < 1.15) continue
      const bloom = new THREE.Mesh(shared.cobbleGeo, shared.flowerMats[i % shared.flowerMats.length]!)
      bloom.position.set(p.x, 0.08, p.z)
      bloom.scale.setScalar(0.22 + hash01(i + 9) * 0.12)
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
  cap.position.y = 0.46 * s
  cap.scale.set(1.35 * s, 0.72 * s, 1.35 * s)
  g.add(stem, cap)
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
