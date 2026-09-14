/**
 * 把小朋友画板上的原始像素当成皮毛：2D 像素 = 涂层纹素。
 * 不拉直、不按分区吸附、不重上色、不另画「标准」条纹。
 */
import * as THREE from 'three'

export type CoatSource = string | HTMLCanvasElement | HTMLImageElement | THREE.Texture

function keepFace(obj: THREE.Object3D): boolean {
  const n = `${obj.name} ${obj.userData.region || ''} ${obj.parent?.name || ''}`.toLowerCase()
  const mats = obj instanceof THREE.Mesh ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
  const matName = mats.map((m) => m.name || '').join(' ').toLowerCase()
  return /eye|iris|pupil|shine|nose/.test(`${n} ${matName}`)
}

export function isBitmapCoat(value: unknown): value is string {
  return typeof value === 'string' && /^(data:image|blob:|https?:)/i.test(value)
}

function configure(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = true
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.premultiplyAlpha = false
  tex.needsUpdate = true
  return tex
}

export function textureFromCoat(source: CoatSource): THREE.Texture {
  if (source instanceof THREE.Texture) return configure(source)
  if (typeof source === 'string') {
    const img = document.createElement('img')
    img.decoding = 'sync'
    img.src = source
    const tex = new THREE.Texture(img)
    configure(tex)
    if (img.complete && img.naturalWidth > 0) tex.needsUpdate = true
    else {
      img.onload = () => {
        tex.needsUpdate = true
      }
    }
    return tex
  }
  if (source instanceof HTMLCanvasElement) {
    return configure(new THREE.CanvasTexture(source))
  }
  const tex = new THREE.Texture(source)
  return configure(tex)
}

function rootLocal(
  mesh: THREE.Mesh,
  vertex: THREE.Vector3,
  rootInv: THREE.Matrix4,
): THREE.Vector3 {
  return vertex.applyMatrix4(mesh.matrixWorld).applyMatrix4(rootInv)
}

function uniqueGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  if (mesh.userData.drawingGeo) return mesh.geometry
  mesh.geometry = mesh.geometry.clone()
  mesh.userData.drawingGeo = true
  return mesh.geometry
}

/**
 * 立方体展开：每张朝外的面都铺同一张画。
 * U = 画纸左右，V = 画纸上下（脚在下，和涂色本一致）。
 */
export function projectBoxUVs(root: THREE.Object3D): void {
  root.updateMatrixWorld(true)
  const rootInv = root.matrixWorld.clone().invert()
  const rootNormal = new THREE.Matrix3().getNormalMatrix(rootInv)
  const box = new THREE.Box3()
  const p = new THREE.Vector3()
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || keepFace(obj)) return
    const pos = obj.geometry.getAttribute('position')
    if (!pos) return
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      box.expandByPoint(rootLocal(obj, p, rootInv))
    }
  })
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  if (size.x < 1e-5 && size.y < 1e-5 && size.z < 1e-5) return

  const n = new THREE.Vector3()
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || keepFace(obj)) return
    const geo = uniqueGeometry(obj)
    const pos = geo.getAttribute('position')
    if (!pos) return
    if (!geo.getAttribute('normal')) geo.computeVertexNormals()
    const nor = geo.getAttribute('normal')
    const uv = new Float32Array(pos.count * 2)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      const local = rootLocal(obj, p, rootInv)
      if (nor) {
        n.fromBufferAttribute(nor, i)
        n.applyMatrix3(normalMatrix).normalize()
        n.applyMatrix3(rootNormal).normalize()
      } else {
        n.copy(local).sub(center).normalize()
      }
      const ax = Math.abs(n.x)
      const ay = Math.abs(n.y)
      const az = Math.abs(n.z)
      let u: number
      const v = (local.y - box.min.y) / (size.y || 1)
      if (ay >= ax && ay >= az) {
        u = (local.z - box.min.z) / (size.z || 1)
      } else if (ax >= az) {
        u = (local.z - box.min.z) / (size.z || 1)
      } else {
        u = (local.x - box.min.x) / (size.x || 1)
      }
      uv[i * 2] = THREE.MathUtils.clamp(u, 0, 1)
      uv[i * 2 + 1] = THREE.MathUtils.clamp(v, 0, 1)
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  })
}

function stampTexture(root: THREE.Object3D, tex: THREE.Texture): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || keepFace(obj)) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      if (!('map' in mat)) continue
      const lambert = mat as THREE.MeshLambertMaterial
      lambert.map = tex
      lambert.color.set('#ffffff')
      lambert.vertexColors = false
      lambert.transparent = false
      lambert.opacity = 1
      lambert.needsUpdate = true
    }
  })
}

/** 把画板 / 拍照原图像素贴上身子。已投影过的网格只换贴图。 */
export function applyDrawingCoat(root: THREE.Group, source: CoatSource): void {
  if (!root.userData.drawingUVs) {
    projectBoxUVs(root)
    root.userData.drawingUVs = true
  }
  const prev = root.userData.drawing as THREE.Texture | undefined
  if (
    prev &&
    prev instanceof THREE.CanvasTexture &&
    source instanceof HTMLCanvasElement &&
    prev.image === source
  ) {
    prev.needsUpdate = true
    return
  }
  const tex = textureFromCoat(source)
  root.userData.drawing = tex
  root.userData.coat = tex
  stampTexture(root, tex)
}

export function refreshDrawingCoat(root: THREE.Group): void {
  const tex = root.userData.drawing as THREE.Texture | undefined
  if (tex) tex.needsUpdate = true
}
