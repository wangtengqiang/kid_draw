/**
 * 世界观展：单角色 3D 转台。只读，不涂色、不送画。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { createAnimalModel, tickWalk } from './models'
import { OrbitZoom, PREVIEW_ORBIT } from './orbit-zoom'

export class PreviewStage {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private model: THREE.Group | null = null
  private rot = 0.4
  private raf = 0
  private running = true
  private clock = new THREE.Clock()
  private orbit: OrbitZoom

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40)
    this.camera.position.set(0, 1.15, 3.5)
    this.camera.lookAt(0, 0.95, 0)
    this.orbit = new OrbitZoom(canvas, this.camera, new THREE.Vector3(0, 0.95, 0), PREVIEW_ORBIT)
    this.scene.background = new THREE.Color('#e7f0d4')
    this.scene.add(new THREE.AmbientLight('#ffe9c8', 0.65))
    this.scene.add(new THREE.HemisphereLight('#fff6e8', '#5c7a48', 1.15))
    const key = new THREE.DirectionalLight('#fff1cc', 1)
    key.position.set(3, 5, 2)
    this.scene.add(key)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshLambertMaterial({ color: '#c5b89a' }),
    )
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)
    this.resize()
    this.loop()
  }

  show(animal: AnimalId, colors: Record<string, string>, thumb?: string): void {
    if (this.model) this.scene.remove(this.model)
    this.model = createAnimalModel(animal, colors, thumb)
    this.scene.add(this.model)
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
      if (!this.orbit.interacting) this.rot += 0.006
      this.model.rotation.y = this.rot
      tickWalk(this.model, t, false)
    }
    this.renderer.render(this.scene, this.camera)
  }
}
