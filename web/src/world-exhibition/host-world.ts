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
  marine: boolean
  emote: THREE.Sprite | null
  emoteUntil: number
}

/**
 * 海湾里的游泳圈（必须落在弯岸水面内，别再贴方池角）。
 * 喝水站在沙滩上，面朝水面。
 */
export const OCEAN = { x: 9.05, z: 1.15, rx: 2.05, rz: 3.25 }
export const SHORE_DRINK = { x: 4.55, z: 1.28 }

/** 水面外轮廓（x, z）：湾、岬、沙滩，不是矩形。 */
export const WATER_RING: [number, number][] = [
  [5.35, 5.55],
  [6.7, 6.35],
  [8.45, 7.55],
  [10.7, 6.85],
  [12.35, 7.45],
  [13.7, 5.7],
  [13.45, 3.55],
  [12.25, 2.15],
  [13.55, 0.75],
  [13.85, -1.25],
  [12.7, -3.05],
  [13.35, -5.05],
  [11.7, -6.25],
  [9.45, -5.95],
  [7.55, -5.15],
  [6.15, -3.55],
  [5.55, -1.75],
  [6.15, 0.05],
  [4.95, 1.25],
  [5.45, 3.15],
  [5.05, 4.55],
]

const shared = {
  trunkGeo: new THREE.CylinderGeometry(0.09, 0.13, 1.1, 6),
  canopyGeo: new THREE.SphereGeometry(0.55, 8, 7),
  hillGeo: new THREE.SphereGeometry(1, 10, 8),
  stoneGeo: new THREE.SphereGeometry(0.22, 7, 6),
  trunkMat: new THREE.MeshLambertMaterial({ color: '#5c3a22' }),
  canopyMat: new THREE.MeshLambertMaterial({ color: '#3d8f44' }),
  canopyMat2: new THREE.MeshLambertMaterial({ color: '#2f7a38' }),
  canopyMat3: new THREE.MeshLambertMaterial({ color: '#4a9a4e' }),
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
  const geo = new THREE.CircleGeometry(18, 40)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  const coast = smoothCoast()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    let y =
      0.2 * Math.sin(x * 0.28 + 0.5) * Math.cos(z * 0.22) + 0.1 * Math.sin(x * 0.62 - z * 0.4)
    if (r < 5.5) y *= 0.12
    if (pointInRing(x, z, coast)) y = -0.42
    else if (x > 3.8 && r < 14) y += 0.08
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
  private action: WorldAction = 'walk'
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
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.2, 70)
    this.camera.position.set(2.8, 5.15, 12.6)
    this.camera.lookAt(4.1, 0.55, 0.15)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(4.0, 0.45, 0.35), HOST_ORBIT)
    const grass = new THREE.CanvasTexture(paintGrassGround())
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(4, 4)
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

  setAction(action: WorldAction): void {
    this.action = action
  }

  getAction(): WorldAction {
    return this.action
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
      group.scale.setScalar(isMarine(item.animalId) ? 0.92 : 1.05)
      const marine = isMarine(item.animalId)
      const actor: Actor = {
        id: item.id,
        animalId: item.animalId,
        group,
        angle: Math.PI / 2 + i * 0.85,
        radius: marine ? 1.45 + (i % 3) * 0.32 : 3.35 + (i % 3) * 0.55,
        speed: (marine ? 0.28 : 0.18) + Math.random() * 0.12,
        lane: (i % 5) - 2,
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
      const swimming = this.action === 'swim' || this.action === 'walk' || this.action === 'drink'
      actor.angle += (swimming ? actor.speed : 0.03) * step
      let x = OCEAN.x + Math.cos(actor.angle) * actor.radius
      let z = OCEAN.z + Math.sin(actor.angle) * actor.radius * 0.82
      if (!pointInRing(x, z, this.coast)) {
        x = OCEAN.x + Math.cos(actor.angle) * 1.2
        z = OCEAN.z + Math.sin(actor.angle) * 1.1
      }
      const bob = swimming ? Math.sin(t * 3.1 + actor.angle) * 0.08 : 0.02
      actor.group.position.set(x, 0.1 + bob, z)
      actor.group.rotation.y = -actor.angle + Math.PI / 2
      tickAction(actor.group, swimming ? 'swim' : this.action, t + actor.angle)
      return
    }

    if (this.action === 'drink') {
      actor.group.position.set(SHORE_DRINK.x, 0.02, SHORE_DRINK.z + actor.lane * 1.15)
      actor.group.rotation.y = 0
      tickAction(actor.group, 'drink', t)
      return
    }
    if (this.action === 'rest') {
      const a = actor.angle
      actor.group.position.set(Math.cos(a) * 1.35, 0.42, Math.sin(a) * 1.35)
      actor.group.rotation.y = a
      tickAction(actor.group, 'rest', t)
      return
    }
    if (this.action === 'sit') {
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
    this.scene.background = new THREE.Color('#d3e4f0')
    this.scene.fog = new THREE.Fog('#cfe0ea', 28, 58)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#7da85a')
    this.addLight(new THREE.HemisphereLight('#fff4d4', '#3d5c32', 1.25))
    const sun = new THREE.DirectionalLight('#ffe6b0', 0.75)
    sun.position.set(6, 12, 8)
    this.addLight(sun)

    const woods = new THREE.CanvasTexture(paintForestPanorama())
    woods.colorSpace = THREE.SRGBColorSpace
    const backdrop = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 14, 20, 1, true),
      new THREE.MeshBasicMaterial({ map: woods, side: THREE.BackSide, fog: false }),
    )
    backdrop.position.y = 5.5
    this.decorations.add(backdrop)

    this.addHills()
    this.addStonePath()
    this.addOcean()
    this.addMountains()
    this.addWoods()
  }

  private addHills(): void {
    for (const [x, z, sx, sy, sz] of [
      [-6.4, -5.2, 2.8, 0.85, 2.2],
      [-8.2, 2.4, 2.4, 0.7, 2.0],
      [1.6, -7.6, 2.6, 0.75, 2.3],
      [-3.2, 6.8, 2.2, 0.65, 1.8],
      [2.8, 7.2, 1.8, 0.55, 1.6],
    ] as const) {
      if (pointInRing(x, z, this.coast)) continue
      const hill = new THREE.Mesh(shared.hillGeo, shared.bankMat)
      hill.position.set(x, 0.05, z)
      hill.scale.set(sx, sy, sz)
      this.decorations.add(hill)
    }
  }

  private addMountains(): void {
    const clumps: [number, number, number, number][] = [
      [-1.2, -14.4, 4.4, 5.6],
      [-5.4, -15.0, 3.6, 4.8],
      [4.2, -14.6, 3.8, 5.2],
      [1.8, -16.2, 2.6, 3.6],
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
    const spots: [number, number, number][] = [
      [-6.6, -3.1, 1.05],
      [-7.4, -1.7, 1.22],
      [-6.2, -0.4, 0.95],
      [-5.9, 4.0, 1.12],
      [-4.5, 5.4, 0.98],
      [-7.8, 3.2, 1.18],
      [1.1, -7.2, 1.08],
      [2.5, -8.0, 1.25],
      [-2.4, -8.6, 1.15],
      [3.0, 6.6, 1.02],
      [-8.6, 0.6, 1.28],
      [-3.8, -6.4, 0.92],
      [0.4, 7.4, 1.1],
      [-1.2, -9.4, 1.2],
    ]
    for (const [x, z, s] of spots) {
      if (pointInRing(x, z, this.coast)) continue
      if (Math.hypot(x, z) < 5.7) continue
      const tree = woodTree()
      tree.position.set(x, 0.02, z)
      tree.scale.setScalar(s)
      this.decorations.add(tree)
    }
    for (const [x, z] of [
      [-5.2, 3.2],
      [2.2, -6.4],
      [-4.6, -5.8],
      [3.4, 5.5],
    ] as const) {
      const bush = new THREE.Mesh(shared.canopyGeo, shared.canopyMat2)
      bush.position.set(x, 0.28, z)
      bush.scale.set(1.1, 0.55, 0.95)
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
    const beach = flattenXZ(new THREE.ShapeGeometry(sand, 2), 0.06, shared.shoreMat)
    this.decorations.add(beach)

    const basin = new THREE.ExtrudeGeometry(xzShape(coast), {
      depth: 0.52,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.16,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 1,
    })
    basin.rotateX(-Math.PI / 2)
    const water = new THREE.Mesh(basin, shared.sideMat)
    water.position.y = -0.44
    this.decorations.add(water)

    const surface = flattenXZ(
      new THREE.ShapeGeometry(xzShape(coast), 2),
      0.09,
      new THREE.MeshLambertMaterial({
        color: '#4aa3c4',
        map: waterMap(),
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
    )
    this.decorations.add(surface)

    const deep = flattenXZ(new THREE.ShapeGeometry(xzShape(offsetRing(coast, -1.15)), 2), 0.1, shared.deepMat)
    this.decorations.add(deep)

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
  trunk.position.y = 0.55
  const leaf = new THREE.Mesh(shared.canopyGeo, shared.canopyMat)
  leaf.position.y = 1.48
  leaf.scale.set(1.45, 1.15, 1.45)
  const leaf2 = new THREE.Mesh(shared.canopyGeo, shared.canopyMat2)
  leaf2.position.set(0.38, 1.72, 0.18)
  leaf2.scale.set(1.05, 0.9, 1.05)
  const leaf3 = new THREE.Mesh(shared.canopyGeo, shared.canopyMat3)
  leaf3.position.set(-0.32, 1.88, -0.22)
  leaf3.scale.set(0.95, 0.82, 0.95)
  g.add(trunk, leaf, leaf2, leaf3)
  return g
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
