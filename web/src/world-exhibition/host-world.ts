/**
 * 世界观展：共享 3D 场景（森林 / 雪原 / 海底）。
 * 只展示已经送进来的动物，不涂色、不送画。
 */
import * as THREE from 'three'
import type { AnimalId, EmoteId, PlacedAnimal, ThemeId } from '../types'
import { createAnimalModel, tickWalk } from './models'
import { HOST_ORBIT, OrbitZoom } from './orbit-zoom'

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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    this.camera.position.set(0, 8.2, 11.5)
    this.camera.lookAt(0, 0.4, 0)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0, 0.4, 0), HOST_ORBIT)
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshLambertMaterial({ color: '#3d6b3a' }),
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
      const group = createAnimalModel(item.animalId, item.regionColors)
      group.scale.setScalar(0.95)
      const actor: Actor = {
        id: item.id,
        animalId: item.animalId,
        group,
        angle: (i / Math.max(list.length, 1)) * Math.PI * 2 + Math.random(),
        radius: 3.2 + (i % 3) * 0.7,
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
    })
    this.renderer.render(this.scene, this.camera)
  }

  private addLight(l: THREE.Light): void {
    this.scene.add(l)
    this.lights.push(l)
  }

  private buildForest(): void {
    this.scene.background = new THREE.Color('#b7d7a8')
    this.scene.fog = new THREE.Fog('#b7d7a8', 12, 28)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#3f7a3a')
    this.addLight(new THREE.HemisphereLight('#fff4d6', '#3d5c32', 1.15))
    const sun = new THREE.DirectionalLight('#fff1cc', 1.1)
    sun.position.set(6, 10, 4)
    sun.castShadow = true
    this.addLight(sun)
    for (let i = 0; i < 14; i++) {
      const tree = treeMesh('#2f6b32', '#8b5a2b')
      const a = (i / 14) * Math.PI * 2
      tree.position.set(Math.cos(a) * 7.2, 0, Math.sin(a) * 7.2)
      this.decorations.add(tree)
    }
    const path = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 4.6, 40),
      new THREE.MeshLambertMaterial({ color: '#c4a574' }),
    )
    path.rotation.x = -Math.PI / 2
    path.position.y = 0.02
    this.decorations.add(path)
  }

  private buildSnow(): void {
    this.scene.background = new THREE.Color('#d9ebf7')
    this.scene.fog = new THREE.Fog('#d9ebf7', 10, 26)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#f4f8ff')
    this.addLight(new THREE.HemisphereLight('#eef6ff', '#9bb4c8', 1.1))
    const sun = new THREE.DirectionalLight('#ffffff', 0.9)
    sun.position.set(4, 12, 6)
    sun.castShadow = true
    this.addLight(sun)
    for (let i = 0; i < 12; i++) {
      const tree = treeMesh('#1f4d3a', '#5a4634')
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.45, 8),
        new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      )
      cap.position.y = 2.15
      tree.add(cap)
      const a = (i / 12) * Math.PI * 2 + 0.2
      tree.position.set(Math.cos(a) * 7.1, 0, Math.sin(a) * 7.1)
      this.decorations.add(tree)
    }
    this.particles = makePoints('#ffffff', 180, 8)
    this.scene.add(this.particles)
  }

  private buildUnderwater(): void {
    this.scene.background = new THREE.Color('#0b4f6c')
    this.scene.fog = new THREE.Fog('#0b4f6c', 8, 22)
    ;(this.ground.material as THREE.MeshLambertMaterial).color.set('#c2b280')
    this.addLight(new THREE.HemisphereLight('#7fd3ff', '#063447', 1.05))
    const sun = new THREE.DirectionalLight('#9ee7ff', 0.85)
    sun.position.set(2, 10, 3)
    this.addLight(sun)
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
    this.particles = makePoints('#b9f3ff', 90, 6)
    this.scene.add(this.particles)
  }
}

function treeMesh(leaf: string, trunk: string): THREE.Group {
  const g = new THREE.Group()
  const t = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.8, 7),
    new THREE.MeshLambertMaterial({ color: trunk }),
  )
  t.position.y = 0.4
  t.castShadow = true
  const l = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.8, 9),
    new THREE.MeshLambertMaterial({ color: leaf }),
  )
  l.position.y = 1.5
  l.castShadow = true
  g.add(t, l)
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
