/**
 * 世界观展：单角色 3D 转台。只读，不涂色、不送画。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { applyDrawingCoat, refreshDrawingCoat, type CoatSource } from './drawing-coat'
import { createAnimalModel, tickWalk, tintAnimal } from './models'
import { OrbitZoom, PREVIEW_ORBIT } from './orbit-zoom'
import { ART_CUTOUT_PACK } from './art-cutout'
import { applyLandView, CARTOON_RIG_PACK } from './cartoon-rig'
import { LAND_GLTF_PACK } from './gltf-kit'

export class PreviewStage {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private model: THREE.Group | null = null
  private rot = 0
  private raf = 0
  private running = true
  private clock = new THREE.Clock()
  private orbit: OrbitZoom

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false })
    this.renderer.setClearColor('#e8f2d2', 1)
    this.renderer.setPixelRatio(1)
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)
    this.camera.position.set(-2.9, 1.15, 2.15)
    this.camera.lookAt(0.05, 0.72, 0)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0.05, 0.72, 0), PREVIEW_ORBIT)
    this.scene.background = new THREE.Color('#e8f2d2')
    this.scene.add(new THREE.AmbientLight('#ffe9c8', 0.85))
    this.scene.add(new THREE.HemisphereLight('#fff6e8', '#7a9a58', 1.05))
    const key = new THREE.DirectionalLight('#fff4d8', 1.05)
    key.position.set(-4, 5, 2)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight('#fff8ee', 0.55)
    fill.position.set(3, 2, 4)
    this.scene.add(fill)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshLambertMaterial({ color: '#c5b89a' }),
    )
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)
    this.resize()
    this.loop()
  }

  show(animal: AnimalId, colors: Record<string, string>, thumb?: CoatSource): void {
    if (this.model) this.scene.remove(this.model)
    this.model = createAnimalModel(animal, colors, thumb)
    this.scene.add(this.model)
  }

  tint(colors: Record<string, string>): void {
    if (this.model) tintAnimal(this.model, colors)
  }

  setCoat(source: CoatSource): void {
    if (this.model) applyDrawingCoat(this.model, source)
  }

  refreshCoat(): void {
    if (this.model) refreshDrawingCoat(this.model)
  }

  resize(): void {
    const p = this.canvas.parentElement
    const w = p?.clientWidth || 320
    const h = p?.clientHeight || 360
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(h, 1)
    this.camera.updateProjectionMatrix()
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
    if (this.model) {
      if (this.model.userData.pack === ART_CUTOUT_PACK || this.model.userData.pack === CARTOON_RIG_PACK) {
        if (!this.orbit.interacting) this.rot += 0.006
        applyLandView(this.model, this.camera, 'walk', this.rot)
        tickWalk(this.model, t, true)
      } else if (this.model.userData.pack === LAND_GLTF_PACK) {
        if (!this.orbit.interacting) {
          this.rot += 0.006
          this.model.rotation.y = this.rot
        }
        tickWalk(this.model, t, true)
      } else if (!this.orbit.interacting) {
        this.rot += 0.006
        this.model.rotation.y = this.rot
        tickWalk(this.model, t, false)
      } else {
        tickWalk(this.model, t, false)
      }
      if (this.model.userData.drawing) refreshDrawingCoat(this.model)
    }
    this.renderer.render(this.scene, this.camera)
  }
}
