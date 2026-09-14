/**
 * 观展世界：有起伏的地形、交叠的树、弯岸海湾。
 * 网格、灯光都要省，避免把浏览器 GPU 打崩。不打阴影。
 */
import * as THREE from 'three'
import type { AnimalId, EmoteId, PlacedAnimal, ThemeId, WorldAction } from '../types'
import { isMarine } from '../types'
import { createAnimalModel, tickAction } from './models'
import { HOST_ORBIT, OrbitZoom } from './orbit-zoom'
import { paintForestPanorama, paintGrassGround, paintWater } from './forest-art'

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
 * 海湾里的游泳圈（必须落在弯岸水面内，别再贴方池角）。
 * 喝水站在沙滩上，面朝水面。
 */
export const OCEAN = { x: 9.2, z: 1.2, rx: 2.15, rz: 3.4 }
export const SHORE_DRINK = { x: 4.55, z: 1.32 }
export const GROUND_RADIUS = 46
export const TREE_INSTANCE_CAP = 96

/** 水面外轮廓（x, z）：大湾接向远处的海，不是小方池。 */
export const WATER_RING: [number, number][] = [
  [5.45, 6.4],
  [7.6, 9.8],
  [11.8, 14.2],
  [17.6, 18.4],
  [24.8, 20.2],
  [31.4, 16.6],
  [35.8, 9.8],
  [37.2, 2.4],
  [35.6, -5.8],
  [36.4, -13.2],
  [31.8, -19.0],
  [23.4, -19.6],
  [15.6, -16.4],
  [9.6, -11.8],
  [6.5, -6.9],
  [5.55, -2.5],
  [6.45, 0.15],
  [5.12, 1.38],
  [5.65, 3.7],
  [5.28, 5.15],
]

const shared = {
  trunkGeo: new THREE.CylinderGeometry(0.08, 0.13, 1, 6),
  canopyGeo: new THREE.SphereGeometry(0.55, 7, 6),
  hillGeo: new THREE.SphereGeometry(1, 9, 7),
  stoneGeo: new THREE.SphereGeometry(0.22, 7, 6),
  impostorGeo: new THREE.SphereGeometry(0.7, 6, 5),
  trunkMat: new THREE.MeshLambertMaterial({ color: '#5c3a22' }),
  canopyMat: new THREE.MeshLambertMaterial({ color: '#3d8f44' }),
  canopyMat2: new THREE.MeshLambertMaterial({ color: '#2f7a38' }),
  canopyMat3: new THREE.MeshLambertMaterial({ color: '#5aa85a' }),
  farMat: new THREE.MeshLambertMaterial({ color: '#2a5e32' }),
  stoneMat: new THREE.MeshLambertMaterial({ color: '#b7aea3' }),
  dirtMat: new THREE.MeshLambertMaterial({ color: '#b79a72' }),
  shoreMat: new THREE.MeshLambertMaterial({ color: '#d4c09a' }),
  bankMat: new THREE.MeshLambertMaterial({ color: '#8a9a58' }),
  waterMat: new THREE.MeshLambertMaterial({ color: '#3a8fb5' }),
  deepMat: new THREE.MeshLambertMaterial({ color: '#1f5f86' }),
  sideMat: new THREE.MeshLambertMaterial({ color: '#2e7a9c' }),
  rockMat: new THREE.MeshLambertMaterial({ color: '#7f8f70' }),
  snowMat: new THREE.MeshLambertMaterial({ color: '#eef3ea' }),
}

const _dummy = new THREE.Object3D()

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

let waterTex: THREE.CanvasTexture | null = null

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
      0.28 * Math.sin(x * 0.18 + 0.5) * Math.cos(z * 0.14) + 0.14 * Math.sin(x * 0.42 - z * 0.28)
    if (r < 6) y *= 0.1
    else if (r > 22) y += 0.35 * Math.sin(r * 0.2)
    if (pointInRing(x, z, coast)) y = -0.5
    else if (x > 3.6 && r < 18) y += 0.06
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
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    })
    this.renderer.setClearColor('#d3e4f0', 1)
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = false
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.3, 140)
    this.camera.position.set(3.2, 5.8, 11.2)
    this.camera.lookAt(0.3, 0.85, 0.6)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0.4, 0.8, 0.4), HOST_ORBIT)
    const grass = new THREE.CanvasTexture(paintGrassGround())
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(8, 8)
    grass.premultiplyAlpha = false
    this.ground = new THREE.Mesh(
      makeTerrain(),
      new THREE.MeshLambertMaterial({ map: grass, color: '#7da85a' }),
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
      if (this.actors.has(item.id)) return
      const group = createAnimalModel(item.animalId, item.regionColors, item.thumb || undefined)
      group.scale.setScalar(isMarine(item.animalId) ? 1.05 : 1.42)
      const marine = isMarine(item.animalId)
      const actor: Actor = {
        id: item.id,
        animalId: item.animalId,
        group,
        angle: Math.PI / 2 + i * 0.85,
        radius: marine ? 1.45 + (i % 3) * 0.32 : 3.35 + (i % 3) * 0.55,
        speed: (marine ? 0.28 : 0.18) + Math.random() * 0.12,
        lane: (i % 5) - 2,
        phase: actorPhase(i),
        marine,
        emote: null,
        emoteUntil: 0,
      }
      this.scene.add(group)
      this.actors.set(item.id, actor)
    })
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
      actor.group.position.set(SHORE_DRINK.x, 0.02, SHORE_DRINK.z + actor.lane * 1.15)
      actor.group.rotation.y = 0
      tickAction(actor.group, 'drink', t)
      return
    }
    if (action === 'rest') {
      const a = actor.angle
      actor.group.position.set(Math.cos(a) * 1.35, 0.42, Math.sin(a) * 1.35)
      actor.group.rotation.y = a
      tickAction(actor.group, 'rest', t)
      return
    }
    if (action === 'sit') {
      const a = actor.angle
      actor.group.position.set(Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05)
      actor.group.rotation.y = a + Math.PI
      tickAction(actor.group, 'sit', t)
      return
    }

    actor.angle += actor.speed * step
    actor.group.position.set(Math.cos(actor.angle) * actor.radius, 0.02, Math.sin(actor.angle) * actor.radius)
    actor.group.rotation.y = -actor.angle + Math.PI / 2
    tickAction(actor.group, 'walk', t + actor.angle)
  }

  private addLight(l: THREE.Light): void {
    this.scene.add(l)
    this.lights.push(l)
  }

  private buildForest(): void {
    this.scene.background = new THREE.Color('#cfe6f4')
    this.scene.fog = new THREE.Fog('#c5dcc8', 38, 108)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#7da85a')
    this.addLight(new THREE.HemisphereLight('#fff6d8', '#3d5c32', 1.18))
    const sun = new THREE.DirectionalLight('#ffe6b0', 0.85)
    sun.position.set(14, 18, 9)
    this.addLight(sun)

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
    this.addForestTrail()
    this.addOcean()
    this.addMountains()
    this.addWoods()
  }

  private addHills(): void {
    for (const [x, z, sx, sy, sz] of [
      [-9.4, -7.2, 3.6, 1.15, 2.8],
      [-12.2, 3.4, 3.2, 0.95, 2.6],
      [2.2, -11.6, 3.4, 1.05, 2.9],
      [-5.2, 10.8, 2.8, 0.85, 2.2],
      [3.6, 11.4, 2.4, 0.7, 2.0],
      [-16.5, -4.0, 4.2, 1.35, 3.2],
      [-14.8, 12.2, 3.5, 1.1, 2.8],
    ] as const) {
      if (pointInRing(x, z, this.coast)) continue
      const hill = new THREE.Mesh(shared.hillGeo, shared.bankMat)
      hill.position.set(x, 0.08, z)
      hill.scale.set(sx, sy, sz)
      this.decorations.add(hill)
    }
  }

  private addMountains(): void {
    const clumps: [number, number, number, number][] = [
      [-4.2, -28.4, 6.4, 8.2],
      [-11.4, -30.0, 5.2, 7.0],
      [6.2, -29.2, 5.6, 7.6],
      [1.4, -32.6, 4.0, 5.4],
      [-18.0, -26.5, 5.0, 6.4],
    ]
    for (const [x, z, r, h] of clumps) {
      const mtn = new THREE.Mesh(shared.hillGeo, shared.rockMat)
      mtn.position.set(x, h * 0.28, z)
      mtn.scale.set(r, h * 0.72, r * 0.85)
      const cap = new THREE.Mesh(shared.hillGeo, shared.snowMat)
      cap.position.set(x, h * 0.72, z)
      cap.scale.set(r * 0.42, h * 0.22, r * 0.38)
      this.decorations.add(mtn, cap)
    }
  }

  private addWoods(): void {
    const near: [number, number, number][] = [
      [-7.2, -4.4, 1.15],
      [-8.4, -2.2, 1.35],
      [-6.8, -0.6, 1.05],
      [-8.8, 3.6, 1.28],
      [-6.4, 5.8, 1.12],
      [1.4, -9.2, 1.22],
      [-2.8, -10.4, 1.3],
      [2.6, -8.6, 1.08],
    ]
    for (const [x, z, s] of near) {
      if (pointInRing(x, z, this.coast)) continue
      const tree = woodTree()
      tree.position.set(x, 0.02, z)
      tree.scale.setScalar(s)
      this.decorations.add(tree)
    }

    const tall = scatterTrees(28, 8.5, 16, 11, this.coast)
    const mid = scatterTrees(36, 15, 26, 23, this.coast)
    const far = scatterTrees(32, 24, 40, 41, this.coast)
    const trunks = tall.concat(mid)
    if (trunks.length) this.decorations.add(instancedTrunks(trunks))
    if (tall.length) this.decorations.add(instancedCanopies(tall, shared.canopyMat, 1.15))
    if (mid.length) this.decorations.add(instancedCanopies(mid, shared.canopyMat2, 1.05))
    if (far.length) this.decorations.add(instancedFar(far))

    for (const [x, z] of [
      [-5.6, 3.4],
      [2.0, -7.2],
      [-5.0, -6.6],
      [3.2, 6.2],
    ] as const) {
      const bush = new THREE.Mesh(shared.canopyGeo, shared.canopyMat3)
      bush.position.set(x, 0.32, z)
      bush.scale.set(1.15, 0.55, 1.0)
      this.decorations.add(bush)
    }
  }

  private addStonePath(): void {
    const dirt = new THREE.Mesh(new THREE.RingGeometry(3.05, 5.05, 28), shared.dirtMat)
    dirt.rotation.x = -Math.PI / 2
    dirt.position.y = 0.04
    this.decorations.add(dirt)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r = 3.5 + (i % 3) * 0.35
      const stone = new THREE.Mesh(shared.stoneGeo, shared.stoneMat)
      stone.position.set(Math.cos(a) * r, 0.07, Math.sin(a) * r)
      stone.scale.set(1.4 + (i % 3) * 0.2, 0.45, 1.2)
      this.decorations.add(stone)
    }
  }

  private addForestTrail(): void {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.4, 0.06, 3.8),
      new THREE.Vector3(-7.2, 0.08, 6.4),
      new THREE.Vector3(-11.6, 0.1, 5.6),
      new THREE.Vector3(-16.4, 0.14, 9.2),
      new THREE.Vector3(-21.0, 0.18, 13.5),
    ])
    const trail = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.48, 5, false), shared.dirtMat)
    this.decorations.add(trail)
    const toShore = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.4, 0.05, 1.25),
      new THREE.Vector3(4.4, 0.05, 1.3),
      new THREE.Vector3(5.05, 0.04, 1.35),
    ])
    this.decorations.add(new THREE.Mesh(new THREE.TubeGeometry(toShore, 8, 0.38, 5, false), shared.dirtMat))
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
    const beach = flattenXZ(new THREE.ShapeGeometry(sand, 2), 0.11, shared.shoreMat)
    this.decorations.add(beach)

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

    const surface = flattenXZ(
      new THREE.ShapeGeometry(xzShape(coast), 2),
      0.04,
      new THREE.MeshLambertMaterial({
        color: '#4aa3c4',
        map: waterMap(),
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
    )
    this.decorations.add(surface)

    const deep = flattenXZ(new THREE.ShapeGeometry(xzShape(offsetRing(coast, -1.15)), 2), 0.05, shared.deepMat)
    this.decorations.add(deep)

    const lip = offsetRing(coast, 0.55)
    for (let i = 0; i < lip.length; i += 2) {
      const [x, z] = lip[i]!
      const bank = new THREE.Mesh(shared.hillGeo, i % 4 ? shared.shoreMat : shared.bankMat)
      bank.position.set(x, 0.04, z)
      bank.scale.set(0.85, 0.28, 0.62)
      this.decorations.add(bank)
    }

    for (const [x, z, s] of [
      [5.7, 3.5, 0.55],
      [5.9, -0.4, 0.42],
      [6.4, 4.8, 0.38],
      [11.8, -4.6, 0.5],
      [12.2, 2.6, 0.44],
      [7.2, -4.8, 0.36],
    ] as const) {
      const rock = new THREE.Mesh(shared.stoneGeo, shared.rockMat)
      rock.position.set(x, 0.12, z)
      rock.scale.set(s * 2.4, s * 1.6, s * 2.1)
      this.decorations.add(rock)
    }

    for (const [x, z] of [
      [4.7, 2.2],
      [4.6, 0.4],
      [5.2, 4.0],
    ] as const) {
      const bank = new THREE.Mesh(shared.hillGeo, shared.shoreMat)
      bank.position.set(x, 0.02, z)
      bank.scale.set(0.9, 0.22, 0.7)
      this.decorations.add(bank)
    }
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
      const tree = woodTree()
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

function woodTree(): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(shared.trunkGeo, shared.trunkMat)
  trunk.position.y = 1.25
  trunk.scale.set(1.15, 2.5, 1.15)
  const leaf = new THREE.Mesh(shared.canopyGeo, shared.canopyMat)
  leaf.position.y = 2.65
  leaf.scale.set(1.7, 1.35, 1.7)
  const leaf2 = new THREE.Mesh(shared.canopyGeo, shared.canopyMat3)
  leaf2.position.set(0.45, 2.95, 0.22)
  leaf2.scale.set(1.2, 1.0, 1.2)
  const leaf3 = new THREE.Mesh(shared.canopyGeo, shared.canopyMat2)
  leaf3.position.set(-0.4, 3.15, -0.28)
  leaf3.scale.set(1.1, 0.92, 1.1)
  g.add(trunk, leaf, leaf2, leaf3)
  return g
}

type TreeSpot = { x: number; z: number; s: number; h: number }

function scatterTrees(count: number, r0: number, r1: number, seed: number, coast: [number, number][]): TreeSpot[] {
  const out: TreeSpot[] = []
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const a = hash01(seed + i) * Math.PI * 2
    const r = r0 + hash01(seed + i + 17) * (r1 - r0)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.hypot(x, z) < 6.4) continue
    if (pointInRing(x, z, coast)) continue
    out.push({
      x,
      z,
      s: 0.85 + hash01(seed + i + 3) * 0.55,
      h: 2.1 + hash01(seed + i + 9) * 1.6,
    })
  }
  return out
}

function instancedTrunks(spots: TreeSpot[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(shared.trunkGeo, shared.trunkMat, spots.length)
  spots.forEach((p, i) => {
    _dummy.position.set(p.x, p.h * 0.5, p.z)
    _dummy.scale.set(p.s * 1.05, p.h, p.s * 1.05)
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
    const sc = p.s * (1.7 + hash01(i + 8) * 0.4)
    _dummy.scale.set(sc, sc * 0.82, sc)
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
    const sc = p.s * 2.4
    _dummy.scale.set(sc, sc * 1.5, sc)
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
