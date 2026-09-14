/**
 * 世界观展：共享 3D 场景（森林 / 雪原 / 海底）。
 * 网格、灯光、贴图都要省，避免把浏览器 GPU 打崩。
 */
import * as THREE from 'three'
import type { AnimalId, EmoteId, PlacedAnimal, ThemeId, WorldAction } from '../types'
import { isMarine } from '../types'
import { createAnimalModel, tickAction } from './models'
import { HOST_ORBIT, OrbitZoom } from './orbit-zoom'
import { paintBushSprite, paintForestPanorama, paintGrassGround, paintTreeSprite } from './forest-art'

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

/** 森林右侧大海：岸在小路外，海面铺开。 */
export const OCEAN = { x: 10.2, z: 0.5, rx: 4.9, rz: 7.4 }
export const SHORE_DRINK = { x: 5.25, z: 1.15 }

const shared = {
  trunkGeo: new THREE.CylinderGeometry(0.08, 0.12, 1, 5),
  canopyGeo: new THREE.SphereGeometry(0.55, 7, 6),
  coneGeo: new THREE.ConeGeometry(1, 1, 5),
  stoneGeo: new THREE.CylinderGeometry(0.2, 0.22, 0.07, 5),
  diskGeo: new THREE.CircleGeometry(1, 16),
  trunkMat: new THREE.MeshLambertMaterial({ color: '#5c3a22' }),
  canopyMat: new THREE.MeshLambertMaterial({ color: '#3d8f44' }),
  canopyMat2: new THREE.MeshLambertMaterial({ color: '#2f7a38' }),
  stoneMat: new THREE.MeshLambertMaterial({ color: '#b7aea3' }),
  dirtMat: new THREE.MeshLambertMaterial({ color: '#b79a72' }),
  shoreMat: new THREE.MeshLambertMaterial({ color: '#cbb58a' }),
  waterMat: new THREE.MeshLambertMaterial({ color: '#4f9db8' }),
  rockMat: new THREE.MeshLambertMaterial({ color: '#7f9570' }),
  snowMat: new THREE.MeshLambertMaterial({ color: '#eef3ea' }),
}

let treeSprite: THREE.MeshLambertMaterial | null = null
let bushSpriteMat: THREE.MeshLambertMaterial | null = null

function treeMat(): THREE.MeshLambertMaterial {
  if (treeSprite) return treeSprite
  const tex = new THREE.CanvasTexture(paintTreeSprite(1))
  tex.colorSpace = THREE.SRGBColorSpace
  treeSprite = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  })
  return treeSprite
}

function bushMat(): THREE.MeshLambertMaterial {
  if (bushSpriteMat) return bushSpriteMat
  const tex = new THREE.CanvasTexture(paintBushSprite(2))
  tex.colorSpace = THREE.SRGBColorSpace
  bushSpriteMat = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
  })
  return bushSpriteMat
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

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = false
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.2, 70)
    this.camera.position.set(2.4, 4.8, 12.6)
    this.camera.lookAt(2.2, 1.0, -2.2)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(2.0, 0.65, -0.2), HOST_ORBIT)
    const grass = new THREE.CanvasTexture(paintGrassGround())
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(4, 4)
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 24),
      new THREE.MeshLambertMaterial({ map: grass, color: '#8fb56a' }),
    )
    this.ground.rotation.x = -Math.PI / 2
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
        radius: marine ? 2.7 + (i % 3) * 0.45 : 3.35 + (i % 3) * 0.55,
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
      const x = OCEAN.x + Math.cos(actor.angle) * actor.radius
      const z = OCEAN.z + Math.sin(actor.angle) * actor.radius * 0.72
      const bob = swimming ? Math.sin(t * 3.1 + actor.angle) * 0.1 : 0.02
      actor.group.position.set(x, 0.24 + bob, z)
      actor.group.rotation.y = -actor.angle + Math.PI / 2
      tickAction(actor.group, swimming ? 'swim' : this.action, t + actor.angle)
      return
    }

    if (this.action === 'drink') {
      actor.group.position.set(SHORE_DRINK.x, 0, SHORE_DRINK.z + actor.lane * 0.55)
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
      actor.group.position.set(Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15)
      actor.group.rotation.y = a + Math.PI
      tickAction(actor.group, 'sit', t)
      return
    }

    actor.angle += actor.speed * step
    actor.group.position.set(Math.cos(actor.angle) * actor.radius, 0, Math.sin(actor.angle) * actor.radius)
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
    this.addLight(new THREE.HemisphereLight('#fff4d4', '#3d5c32', 1.2))
    const sun = new THREE.DirectionalLight('#ffe6b0', 0.7)
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

    this.addStonePath()
    this.addOcean()

    ;[
      [0, -14.2, 6.2],
      [-5.8, -15.2, 5.4],
      [5.6, -14.8, 5.8],
    ].forEach(([x, z, h]) => {
      const mtn = new THREE.Mesh(shared.coneGeo, shared.rockMat)
      mtn.position.set(x, h / 2, z)
      mtn.scale.set(3.2, h, 3.2)
      const cap = new THREE.Mesh(shared.coneGeo, shared.snowMat)
      cap.position.set(x, h * 0.82, z)
      cap.scale.set(1.15, h * 0.28, 1.15)
      this.decorations.add(mtn, cap)
    })

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.25
      const x = Math.cos(a) * 8.6
      const z = Math.sin(a) * 8.6
      if (z > 5.5 || x > 4.6) continue
      const tree = woodTree()
      tree.position.set(x, 0, z)
      tree.scale.setScalar(1.05 + (i % 3) * 0.08)
      this.decorations.add(tree)
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.5
      const x = Math.cos(a) * 12.2
      const z = Math.sin(a) * 12.2
      if (z > 6 || x > 5) continue
      const tree = woodTree()
      tree.position.set(x, 0, z)
      tree.scale.setScalar(1.25)
      this.decorations.add(tree)
    }
    for (let i = 0; i < 8; i++) {
      const bush = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), bushMat())
      const a = (i / 8) * Math.PI * 2 + 0.4
      bush.position.set(Math.cos(a) * 5.4, 0.4, Math.sin(a) * 5.4)
      this.decorations.add(bush)
    }
  }

  private addStonePath(): void {
    const dirt = new THREE.Mesh(new THREE.RingGeometry(3.05, 5.05, 24), shared.dirtMat)
    dirt.rotation.x = -Math.PI / 2
    dirt.position.y = 0.012
    this.decorations.add(dirt)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r = 3.5 + (i % 3) * 0.35
      const stone = new THREE.Mesh(shared.stoneGeo, shared.stoneMat)
      stone.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r)
      this.decorations.add(stone)
    }
  }

  private addOcean(): void {
    const shore = new THREE.Mesh(shared.diskGeo, shared.shoreMat)
    shore.rotation.x = -Math.PI / 2
    shore.position.set(OCEAN.x - 0.35, 0.016, OCEAN.z)
    shore.scale.set(OCEAN.rx * 1.22, 1, OCEAN.rz * 1.12)
    const water = new THREE.Mesh(
      shared.diskGeo,
      new THREE.MeshLambertMaterial({ color: '#3a8fb5' }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.set(OCEAN.x, 0.028, OCEAN.z)
    water.scale.set(OCEAN.rx, 1, OCEAN.rz)
    const deep = new THREE.Mesh(
      shared.diskGeo,
      new THREE.MeshLambertMaterial({ color: '#2a6f96' }),
    )
    deep.rotation.x = -Math.PI / 2
    deep.position.set(OCEAN.x + 1.4, 0.034, OCEAN.z)
    deep.scale.set(OCEAN.rx * 0.62, 1, OCEAN.rz * 0.7)
    this.decorations.add(shore, water, deep)
    for (const [x, z, s] of [
      [5.7, 2.6, 1.1],
      [6.1, -1.4, 0.85],
      [5.5, 0.2, 0.7],
    ] as const) {
      const rock = new THREE.Mesh(shared.stoneGeo, shared.rockMat)
      rock.position.set(x, 0.06, z)
      rock.scale.set(s * 1.8, s, s * 1.6)
      this.decorations.add(rock)
    }
  }

  private addLake(x: number, z: number, radius: number): void {
    const shore = new THREE.Mesh(shared.diskGeo, shared.shoreMat)
    shore.rotation.x = -Math.PI / 2
    shore.position.set(x, 0.018, z)
    shore.scale.set(radius * 1.35, 1, radius * 0.9)
    const water = new THREE.Mesh(shared.diskGeo, shared.waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.set(x, 0.03, z)
    water.scale.set(radius * 1.15, 1, radius * 0.75)
    this.decorations.add(shore, water)
  }

  private buildSnow(): void {
    this.scene.background = new THREE.Color('#d9ebf7')
    this.scene.fog = new THREE.Fog('#d9ebf7', 22, 52)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#f4f8ff')
    this.addLight(new THREE.HemisphereLight('#eef6ff', '#9bb4c8', 1.15))
    this.addStonePath()
    this.addLake(6.4, -3.0, 2.4)
    const mtn = new THREE.Mesh(shared.coneGeo, new THREE.MeshLambertMaterial({ color: '#8aa0b0' }))
    mtn.position.set(0, 3.4, -14)
    mtn.scale.set(3.4, 6.8, 3.4)
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
    this.particles = makePoints('#b9f3ff', 36, 7)
    this.scene.add(this.particles)
  }
}

function woodTree(): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(shared.trunkGeo, shared.trunkMat)
  trunk.position.y = 0.5
  const leaf = new THREE.Mesh(shared.canopyGeo, shared.canopyMat)
  leaf.position.y = 1.55
  leaf.scale.set(1.3, 1.05, 1.3)
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), treeMat())
  sprite.position.y = 1.7
  g.add(trunk, leaf, sprite)
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
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
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
