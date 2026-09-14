/**
 * Kid-cartoon look on downloaded glTF: toon steps, ink outline, sticker eyes.
 * Body stays the third-party mesh — no capsule animals.
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'

let gradient: THREE.DataTexture | null = null

function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient
  const data = new Uint8Array([90, 72, 52, 255, 150, 122, 88, 255, 210, 184, 140, 255, 255, 248, 230, 255])
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  gradient = tex
  return tex
}

export function makeToonMaterial(color: THREE.Color, map: THREE.Texture | null, vertexColors = false): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color,
    map: map || null,
    gradientMap: toonGradient(),
    vertexColors,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
  })
  return mat
}

export function addInkOutline(mesh: THREE.Mesh): void {
  if (mesh.userData.outline || mesh.userData.region === 'outline') return
  const mat = new THREE.MeshBasicMaterial({
    color: '#1a140e',
    side: THREE.BackSide,
    transparent: false,
    depthWrite: true,
  })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += objectNormal * 0.03;`,
    )
  }
  const hull =
    mesh instanceof THREE.SkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, mat) : new THREE.Mesh(mesh.geometry, mat)
  if (hull instanceof THREE.SkinnedMesh && mesh instanceof THREE.SkinnedMesh) {
    hull.bind(mesh.skeleton, mesh.bindMatrix)
  }
  hull.userData.outline = true
  hull.userData.region = 'outline'
  hull.castShadow = false
  hull.receiveShadow = false
  mesh.add(hull)
}

function ball(r: number, color: string, region: string, toon = true): THREE.Mesh {
  const mat = toon
    ? makeToonMaterial(new THREE.Color(color), null)
    : new THREE.MeshBasicMaterial({ color, depthWrite: true })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat)
  mesh.userData.region = region
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

/** Round coloring-book eye, facing local +Z. */
export function stickerEye(iris: string): THREE.Group {
  const g = new THREE.Group()
  g.userData.region = 'eye'
  const white = ball(1, '#fffdf6', 'eye')
  white.scale.set(1, 1.14, 0.78)
  const ir = ball(0.52, iris, 'iris')
  ir.position.set(0.12, 0.04, 0.58)
  const pupil = ball(0.26, '#1a120c', 'pupil', false)
  pupil.position.set(0.14, 0.04, 0.92)
  const shine = ball(0.13, '#ffffff', 'shine', false)
  shine.position.set(-0.22, 0.32, 1.02)
  g.add(white, ir, pupil, shine)
  return g
}

function irisFor(animal: AnimalId): string {
  if (animal === 'tiger') return '#6d3b12'
  if (animal === 'deer') return '#4a2e14'
  if (animal === 'lion') return '#5c3a14'
  return '#2a3d55'
}

/**
 * Cover the pack's black eye pits with round sticker eyes on the same face.
 */
export function attachCartoonEyes(root: THREE.Object3D, animal: AnimalId): THREE.Object3D[] {
  const hosts: THREE.Mesh[] = []
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name.toLowerCase().includes('eye')) hosts.push(obj)
  })
  const made: THREE.Object3D[] = []
  const iris = irisFor(animal)
  for (const host of hosts) {
    const parent = host.parent
    if (!parent) continue
    host.geometry.computeBoundingBox()
    const bb = host.geometry.boundingBox
    if (!bb) continue
    const center = bb.getCenter(new THREE.Vector3())
    const size = bb.getSize(new THREE.Vector3())
    host.updateMatrixWorld(true)
    center.applyMatrix4(host.matrixWorld)
    parent.updateMatrixWorld(true)
    parent.worldToLocal(center)
    const holder = new THREE.Group()
    holder.position.copy(center)
    parent.add(holder)
    host.visible = false
    const width = Math.max(size.x, 0.08)
    const L = stickerEye(iris)
    const R = stickerEye(iris)
    const s = width * (animal === 'tiger' ? 0.3 : 0.4)
    L.scale.setScalar(s)
    R.scale.setScalar(s)
    L.position.set(-width * 0.22, size.y * 0.08, size.z * 0.2)
    R.position.set(width * 0.22, size.y * 0.08, size.z * 0.2)
    holder.add(L, R)
    made.push(L, R)
  }
  if (made.length) return made

  let head: THREE.Object3D | undefined
  root.traverse((obj) => {
    if (!head && obj.name === 'Head') head = obj
  })
  if (!head) return made
  const L = stickerEye(iris)
  const R = stickerEye(iris)
  L.scale.setScalar(0.11)
  R.scale.setScalar(0.11)
  L.position.set(-0.08, 0.06, 0.16)
  R.position.set(0.08, 0.06, 0.16)
  head.add(L, R)
  made.push(L, R)
  return made
}

export function ensureBoxUv(geo: THREE.BufferGeometry): void {
  if (geo.getAttribute('uv')) return
  geo.computeBoundingBox()
  const b = geo.boundingBox
  if (!b) return
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  const dx = b.max.x - b.min.x || 1
  const dy = b.max.y - b.min.y || 1
  const dz = b.max.z - b.min.z || 1
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getZ(i) - b.min.z) / dz
    uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / dy + (pos.getX(i) - b.min.x) / dx * 0.08
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}
