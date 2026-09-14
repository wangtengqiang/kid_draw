/**
 * 观展相机：单指绕看、双指捏缩放、滚轮缩放。
 * 角度和距离都夹在展览默认范围内，小孩甩不飞。
 */
import type { PerspectiveCamera } from 'three'
import { Vector3 } from 'three'

export type OrbitLimits = {
  minRadius: number
  maxRadius: number
  minPhi: number
  maxPhi: number
}

/** 主机森林：可以拉远看深处，也可以捏近看小动物。 */
export const HOST_ORBIT: OrbitLimits = {
  minRadius: 2.6,
  maxRadius: 34,
  minPhi: (14 * Math.PI) / 180,
  maxPhi: (72 * Math.PI) / 180,
}

/** 作品夹转台更近，缩放幅度更小。 */
export const PREVIEW_ORBIT: OrbitLimits = {
  minRadius: 2.2,
  maxRadius: 6.5,
  minPhi: (18 * Math.PI) / 180,
  maxPhi: (78 * Math.PI) / 180,
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function clampOrbit(radius: number, phi: number, limits: OrbitLimits): { radius: number; phi: number } {
  return {
    radius: clamp(radius, limits.minRadius, limits.maxRadius),
    phi: clamp(phi, limits.minPhi, limits.maxPhi),
  }
}

export function offsetFromSpherical(radius: number, theta: number, phi: number): { x: number; y: number; z: number } {
  const sinPhi = Math.sin(phi)
  return {
    x: radius * sinPhi * Math.sin(theta),
    y: radius * Math.cos(phi),
    z: radius * sinPhi * Math.cos(theta),
  }
}

export class OrbitZoom {
  readonly target: Vector3
  readonly limits: OrbitLimits
  radius: number
  theta: number
  phi: number
  private el: HTMLElement
  private camera: PerspectiveCamera
  private pointers = new Map<number, { x: number; y: number }>()
  private pinchStart = 0
  private pinchRadius = 0
  private readonly onDown: (e: PointerEvent) => void
  private readonly onMove: (e: PointerEvent) => void
  private readonly onUp: (e: PointerEvent) => void
  private readonly onWheel: (e: WheelEvent) => void

  constructor(el: HTMLElement, camera: PerspectiveCamera, target: Vector3, limits: OrbitLimits) {
    this.el = el
    this.camera = camera
    this.target = target
    this.limits = limits
    const ox = camera.position.x - target.x
    const oy = camera.position.y - target.y
    const oz = camera.position.z - target.z
    this.radius = Math.hypot(ox, oy, oz)
    this.phi = Math.acos(clamp(oy / Math.max(this.radius, 1e-6), -1, 1))
    this.theta = Math.atan2(ox, oz)
    const clamped = clampOrbit(this.radius, this.phi, limits)
    this.radius = clamped.radius
    this.phi = clamped.phi
    this.onDown = (e) => this.handleDown(e)
    this.onMove = (e) => this.handleMove(e)
    this.onUp = (e) => this.handleUp(e)
    this.onWheel = (e) => this.handleWheel(e)
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    this.apply()
  }

  get interacting(): boolean {
    return this.pointers.size > 0
  }

  apply(): void {
    const o = offsetFromSpherical(this.radius, this.theta, this.phi)
    this.camera.position.set(this.target.x + o.x, this.target.y + o.y, this.target.z + o.z)
    this.camera.lookAt(this.target)
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown)
    this.el.removeEventListener('pointermove', this.onMove)
    this.el.removeEventListener('pointerup', this.onUp)
    this.el.removeEventListener('pointercancel', this.onUp)
    this.el.removeEventListener('wheel', this.onWheel)
    this.pointers.clear()
  }

  private handleDown(e: PointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      this.el.setPointerCapture(e.pointerId)
    } catch {
      /* 测试环境没有 capture */
    }
    if (this.pointers.size === 2) this.beginPinch()
  }

  private handleMove(e: PointerEvent): void {
    const prev = this.pointers.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    this.pointers.set(e.pointerId, next)
    if (this.pointers.size >= 2) {
      this.pinch()
      return
    }
    this.theta -= (next.x - prev.x) * 0.005
    this.phi = clamp(this.phi - (next.y - prev.y) * 0.004, this.limits.minPhi, this.limits.maxPhi)
    this.apply()
  }

  private handleUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId)
    if (this.pointers.size === 2) this.beginPinch()
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault()
    const factor = Math.exp(e.deltaY * 0.0015)
    this.radius = clamp(this.radius * factor, this.limits.minRadius, this.limits.maxRadius)
    this.apply()
  }

  private beginPinch(): void {
    const pts = [...this.pointers.values()]
    if (pts.length < 2) return
    this.pinchStart = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
    this.pinchRadius = this.radius
  }

  private pinch(): void {
    const pts = [...this.pointers.values()]
    if (pts.length < 2 || this.pinchStart < 8) return
    const d = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
    this.radius = clamp(this.pinchRadius * (this.pinchStart / Math.max(d, 8)), this.limits.minRadius, this.limits.maxRadius)
    this.apply()
  }
}
