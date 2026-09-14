/**
 * 世界观展：共享 3D 场景（森林 / 雪原 / 海底）。
 * 只展示已经送进来的动物，不涂色、不送画。
 */
import * as THREE from 'three'
import type { AnimalId, EmoteId, PlacedAnimal, ThemeId } from '../types'
import { createAnimalModel, tickWalk } from './models'
import { HOST_ORBIT, OrbitZoom } from './orbit-zoom'
import { paintBushSprite, paintForestPanorama, paintGrassGround, paintTreeSprite, paintWater } from './forest-art'

interface Actor {
  id: string
  animalId: AnimalId
  group: THREE.Group
  angle: number
  radius: number
  speed: number
  emote: THREE.Sprite | null
  emoteUntil: number
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

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140)
    this.camera.position.set(0, 3.2, 9.4)
    this.camera.lookAt(0, 0.7, 0)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0, 0.7, 0), HOST_ORBIT)
    const grass = new THREE.CanvasTexture(paintGrassGround())
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(6, 6)
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(28, 72),
      new THREE.MeshLambertMaterial({ map: grass, color: '#8fb56a' }),
    )
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)
    this.scene.add(this.decorations)
    this.applyTheme('forest')
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.loop()
  }

  resize(): void {
    const canvas = this.renderer.domElement
    const parent = canvas.parentElement
    const w = parent?.clientWidth || window.innerWidth
    const h = parent?.clientHeight || window.innerHeight
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
      group.scale.setScalar(1.05)
      const actor: Actor = {
        id: item.id,
        animalId: item.animalId,
        group,
        angle: Math.PI / 2 + i * 0.85,
        radius: 3.35 + (i % 3) * 0.55,
        speed: 0.18 + Math.random() * 0.12,
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
    this.renderer.dispose()
  }

  private loop = (): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const t = this.clock.getElapsedTime()
    const dt = this.clock.getDelta()
    for (const actor of this.actors.values()) {
      actor.angle += actor.speed * Math.min(dt, 0.05)
      const x = Math.cos(actor.angle) * actor.radius
      const z = Math.sin(actor.angle) * actor.radius
      actor.group.position.x = x
      actor.group.position.z = z
      actor.group.rotation.y = -actor.angle + Math.PI / 2
      tickWalk(actor.group, t + actor.angle, true)
      if (actor.emote && performance.now() > actor.emoteUntil) {
        actor.group.remove(actor.emote)
        actor.emote = null
      } else if (actor.emote) {
        actor.emote.position.y = 2.1 + Math.sin(t * 4) * 0.08
      }
    }
    if (this.particles) {
      const pos = this.particles.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + (this.theme === 'underwater' ? 0.02 : -0.03)
        if (this.theme === 'snow' && y < 0) y = 7
        if (this.theme === 'underwater' && y > 6) y = 0.2
        pos.setY(i, y)
      }
      pos.needsUpdate = true
    }
    this.decorations.children.forEach((c, i) => {
      if (c.userData.kelp) c.rotation.z = Math.sin(t * 1.4 + i) * 0.15
      if (c.userData.water && c instanceof THREE.Mesh) {
        const mat = c.material
        if (mat instanceof THREE.MeshPhongMaterial) {
          mat.opacity = 0.68 + Math.sin(t * 1.1 + i) * 0.06
        }
      }
    })
    this.renderer.render(this.scene, this.camera)
  }

  private addLight(l: THREE.Light): void {
    this.scene.add(l)
    this.lights.push(l)
  }

  private buildForest(): void {
    this.scene.background = new THREE.Color('#c5d6a0')
    this.scene.fog = new THREE.Fog('#c5d6a0', 28, 72)
    const grassMat = this.ground.material as THREE.MeshLambertMaterial
    grassMat.color.set('#7da85a')
    this.addLight(new THREE.AmbientLight('#ffe6b8', 0.5))
    this.addLight(new THREE.HemisphereLight('#fff4d4', '#3d5c32', 1.05))
    const sun = new THREE.DirectionalLight('#ffe6b0', 1.1)
    sun.position.set(6, 12, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.addLight(sun)

    const woods = new THREE.CanvasTexture(paintForestPanorama())
    woods.colorSpace = THREE.SRGBColorSpace
    const woodsMat = new THREE.MeshBasicMaterial({ map: woods, side: THREE.BackSide, fog: false })
    const backdrop = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 16, 56, 1, true), woodsMat)
    backdrop.position.y = 6.4
    this.decorations.add(backdrop)

    this.addStonePath()
    this.addLake(-7.4, 3.6, 2.7, 0.08)
    this.addLake(8.6, -5.2, 1.7, 0.12)

    for (let i = 0; i < 7; i++) {
      const hill = rollingHill(i)
      const a = (i / 7) * Math.PI * 2 + 0.4
      hill.position.set(Math.cos(a) * 12.5, 0, Math.sin(a) * 12.5)
      this.decorations.add(hill)
    }
    for (let i = 0; i < 6; i++) {
      const mtn = mountain(i)
      const a = (i / 6) * Math.PI * 2 + 0.18
      mtn.position.set(Math.cos(a) * 20, 0, Math.sin(a) * 20)
      this.decorations.add(mtn)
    }

    for (let i = 0; i < 18; i++) {
      const tree = woodTree(i)
      const a = (i / 18) * Math.PI * 2 + 0.07
      tree.position.set(Math.cos(a) * 6.8, 0, Math.sin(a) * 6.8)
      tree.scale.setScalar(1.05 + (i % 4) * 0.1)
      this.decorations.add(tree)
    }
    for (let i = 0; i < 20; i++) {
      const tree = woodTree(i + 40)
      const a = (i / 20) * Math.PI * 2 + 0.31
      tree.position.set(Math.cos(a) * 9.6, 0, Math.sin(a) * 9.6)
      tree.scale.setScalar(1.35 + (i % 3) * 0.12)
      this.decorations.add(tree)
    }
    for (let i = 0; i < 14; i++) {
      const tree = woodTree(i + 80)
      const a = (i / 14) * Math.PI * 2 + 0.55
      tree.position.set(Math.cos(a) * 14.2, 0, Math.sin(a) * 14.2)
      tree.scale.setScalar(1.7)
      this.decorations.add(tree)
    }
    for (let i = 0; i < 16; i++) {
      const bush = bushSprite(i)
      const a = (i / 16) * Math.PI * 2 + 0.4
      bush.position.set(Math.cos(a) * 5.4, 0, Math.sin(a) * 5.4)
      this.decorations.add(bush)
    }
    for (let i = 0; i < 8; i++) {
      const reed = reedClump(i)
      reed.position.set(-7.4 + Math.cos(i) * 2.2, 0, 3.6 + Math.sin(i * 1.3) * 1.6)
      this.decorations.add(reed)
    }
  }

  private addStonePath(): void {
    const dirt = new THREE.Mesh(
      new THREE.RingGeometry(3.05, 5.05, 64),
      new THREE.MeshLambertMaterial({ color: '#b79a72' }),
    )
    dirt.rotation.x = -Math.PI / 2
    dirt.position.y = 0.012
    this.decorations.add(dirt)
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2 + (i % 7) * 0.01
      const r = 3.35 + (i % 6) * 0.22
      const sides = 5 + (i % 3)
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 + (i % 4) * 0.05, 0.2 + (i % 3) * 0.04, 0.07, sides),
        new THREE.MeshLambertMaterial({ color: i % 3 ? '#a3988c' : '#cfc4b6' }),
      )
      stone.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r)
      stone.rotation.y = a * 0.7
      stone.receiveShadow = true
      this.decorations.add(stone)
    }
  }

  private addLake(x: number, z: number, radius: number, rot: number): void {
    const shore = new THREE.Mesh(
      new THREE.CircleGeometry(radius + 0.55, 40),
      new THREE.MeshLambertMaterial({ color: '#cbb58a' }),
    )
    shore.rotation.x = -Math.PI / 2
    shore.position.set(x, 0.018, z)
    shore.rotation.z = rot
    shore.scale.set(1.25, 1, 0.82)
    this.decorations.add(shore)

    const waterTex = new THREE.CanvasTexture(paintWater())
    waterTex.colorSpace = THREE.SRGBColorSpace
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping
    waterTex.repeat.set(2, 2)
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 48),
      new THREE.MeshPhongMaterial({
        map: waterTex,
        color: '#5aa7c2',
        transparent: true,
        opacity: 0.72,
        shininess: 90,
        specular: '#d7f4ff',
        depthWrite: false,
      }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.set(x, 0.04, z)
    water.scale.set(1.25, 1, 0.82)
    water.userData.water = true
    this.decorations.add(water)
  }

  private buildSnow(): void {
    this.scene.background = new THREE.Color('#d9ebf7')
    this.scene.fog = new THREE.Fog('#d9ebf7', 22, 70)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#f4f8ff')
    this.addLight(new THREE.HemisphereLight('#eef6ff', '#9bb4c8', 1.1))
    const sun = new THREE.DirectionalLight('#ffffff', 0.95)
    sun.position.set(4, 12, 6)
    sun.castShadow = true
    this.addLight(sun)
    this.addStonePath()
    const ice = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 40),
      new THREE.MeshPhongMaterial({ color: '#cfe8f6', shininess: 70, specular: '#ffffff' }),
    )
    ice.rotation.x = -Math.PI / 2
    ice.position.set(-7.2, 0.04, 3.4)
    ice.scale.set(1.2, 1, 0.8)
    ice.userData.water = true
    this.decorations.add(ice)
    for (let i = 0; i < 6; i++) {
      const mtn = mountain(i, true)
      const a = (i / 6) * Math.PI * 2 + 0.2
      mtn.position.set(Math.cos(a) * 20, 0, Math.sin(a) * 20)
      this.decorations.add(mtn)
    }
    for (let i = 0; i < 14; i++) {
      const tree = woodTree(i + 3)
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 10, 8),
        new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      )
      cap.position.y = 2.5
      cap.scale.set(1.2, 0.55, 1.2)
      tree.add(cap)
      const a = (i / 14) * Math.PI * 2 + 0.2
      tree.position.set(Math.cos(a) * 8.4, 0, Math.sin(a) * 8.4)
      this.decorations.add(tree)
    }
    this.particles = makePoints('#ffffff', 180, 10)
    this.scene.add(this.particles)
  }

  private buildUnderwater(): void {
    this.scene.background = new THREE.Color('#0b4f6c')
    this.scene.fog = new THREE.Fog('#0b4f6c', 10, 36)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#c2b280')
    this.addLight(new THREE.HemisphereLight('#7fd3ff', '#063447', 1.05))
    const sun = new THREE.DirectionalLight('#9ee7ff', 0.85)
    sun.position.set(2, 10, 3)
    this.addLight(sun)
    for (let i = 0; i < 8; i++) {
      const mound = rollingHill(i)
      const a = (i / 8) * Math.PI * 2
      mound.position.set(Math.cos(a) * 10, 0, Math.sin(a) * 10)
      mound.scale.setScalar(0.7)
      this.decorations.add(mound)
    }
    for (let i = 0; i < 16; i++) {
      const kelp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 2.4 + Math.random(), 6),
        new THREE.MeshLambertMaterial({ color: i % 2 ? '#1f8a5b' : '#2bb673' }),
      )
      kelp.position.set((Math.random() - 0.5) * 12, 1.2, (Math.random() - 0.5) * 12)
      kelp.userData.kelp = true
      this.decorations.add(kelp)
    }
    for (let i = 0; i < 8; i++) {
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.7, 7),
        new THREE.MeshLambertMaterial({ color: i % 2 ? '#e07a7a' : '#d98a3a' }),
      )
      const a = (i / 8) * Math.PI * 2
      coral.position.set(Math.cos(a) * 6.4, 0.35, Math.sin(a) * 6.4)
      this.decorations.add(coral)
    }
    this.particles = makePoints('#b9f3ff', 90, 8)
    this.scene.add(this.particles)
  }
}

function woodTree(seed: number): THREE.Group {
  const g = new THREE.Group()
  const h = 2.2 + (seed % 5) * 0.28
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 + (seed % 3) * 0.015, 0.11 + (seed % 3) * 0.02, h, 7),
    new THREE.MeshLambertMaterial({ color: seed % 2 ? '#4a321c' : '#5c3a22' }),
  )
  trunk.position.y = h / 2
  trunk.castShadow = true
  g.add(trunk)
  const greens = ['#2f7a38', '#3d8f44', '#246830', '#4ea050']
  for (let i = 0; i < 4; i++) {
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 + (i % 3) * 0.12, 10, 8),
      new THREE.MeshLambertMaterial({ color: greens[(seed + i) % greens.length]! }),
    )
    canopy.position.set(
      Math.sin(seed + i) * 0.28,
      h * 0.72 + (i % 3) * 0.22,
      Math.cos(seed * 0.7 + i) * 0.28,
    )
    canopy.scale.set(1.15, 0.85, 1.1)
    canopy.castShadow = true
    g.add(canopy)
  }
  const tex = new THREE.CanvasTexture(paintTreeSprite(seed))
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  })
  const a = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.1), mat)
  const b = a.clone()
  b.rotation.y = Math.PI / 2
  a.position.y = h * 0.72
  b.position.y = h * 0.72
  g.add(a, b)
  return g
}

function bushSprite(seed: number): THREE.Group {
  const g = new THREE.Group()
  const tex = new THREE.CanvasTexture(paintBushSprite(seed))
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  })
  const a = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), mat)
  const b = a.clone()
  b.rotation.y = Math.PI / 2
  a.position.y = 0.4
  b.position.y = 0.4
  g.add(a, b)
  return g
}

function rollingHill(seed: number): THREE.Group {
  const g = new THREE.Group()
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(2.2 + (seed % 3) * 0.4, 12, 10),
    new THREE.MeshLambertMaterial({ color: seed % 2 ? '#5d8a4a' : '#6b9a55' }),
  )
  hill.scale.set(1.6, 0.38 + (seed % 3) * 0.08, 1.3)
  hill.position.y = 0.15
  g.add(hill)
  g.userData.hill = true
  return g
}

function mountain(seed: number, snowy = false): THREE.Group {
  const g = new THREE.Group()
  const h = 5.4 + (seed % 4) * 1.1
  const r = 3.2 + (seed % 3) * 0.5
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 6 + (seed % 3)),
    new THREE.MeshLambertMaterial({ color: snowy ? '#8aa0b0' : seed % 2 ? '#6d8a62' : '#7f9570' }),
  )
  rock.position.y = h / 2
  rock.rotation.y = seed * 0.7
  g.add(rock)
  const shoulder = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.62, h * 0.7, 6),
    new THREE.MeshLambertMaterial({ color: snowy ? '#9bb0be' : '#5f7a54' }),
  )
  shoulder.position.set(r * 0.35, h * 0.32, -r * 0.1)
  g.add(shoulder)
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.38, h * 0.28, 6),
    new THREE.MeshLambertMaterial({ color: snowy ? '#f4f8fb' : '#e7efe4' }),
  )
  cap.position.y = h * 0.84
  g.add(cap)
  g.userData.mountain = true
  return g
}

function reedClump(seed: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const reed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.7 + (i % 3) * 0.15, 5),
      new THREE.MeshLambertMaterial({ color: i % 2 ? '#3d7a38' : '#5a9448' }),
    )
    reed.position.set(Math.sin(seed + i) * 0.12, 0.4, Math.cos(seed * 0.5 + i) * 0.12)
    reed.rotation.z = (i - 2) * 0.08
    g.add(reed)
  }
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
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.85 }),
  )
}

function makeEmote(text: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.font = '80px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 72)
  }
  const tex = new THREE.CanvasTexture(c)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const s = new THREE.Sprite(mat)
  s.scale.set(1.1, 1.1, 1)
  return s
}
