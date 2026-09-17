/**
 * 把小朋友画板上的原始像素当成皮毛：2D 像素 = 涂层纹素。
 * 不拉直、不按分区吸附、不重上色、不另画「标准」条纹。
 */
import * as THREE from 'three'

export type CoatSource = string | HTMLCanvasElement | HTMLImageElement | THREE.Texture

function keepFace(obj: THREE.Object3D): boolean {
  if (obj.userData.keepFace) return true
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
      if (obj.userData.cutout) {
        lambert.alphaTest = 0.28
        lambert.side = THREE.DoubleSide
        lambert.depthWrite = true
      }
      if (obj.userData.rigged || (obj as THREE.SkinnedMesh).isSkinnedMesh) {
        lambert.alphaTest = 0
        lambert.side = THREE.FrontSide
        lambert.depthWrite = true
      }
      lambert.needsUpdate = true
    }
  })
}

function keepArtPixel(r: number, g: number, b: number): boolean {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  if (mx < 70) return true
  if (b > r + 28 && b > g + 8 && b > 80) return true
  if (mn > 222 && mx - mn < 22 && b >= r - 6) return true
  return false
}

function paintImage(source: CoatSource): CanvasImageSource | null {
  if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) return source
  if (typeof source === 'string') {
    const img = document.createElement('img')
    img.decoding = 'sync'
    img.src = source
    if (img.complete && img.naturalWidth > 0) return img
    return null
  }
  if (source instanceof THREE.Texture && source.image) {
    const img = source.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap
    if (img instanceof HTMLCanvasElement || img instanceof HTMLImageElement) return img
    if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) return img
  }
  return null
}

function whenPaintReady(source: CoatSource, use: (img: HTMLCanvasElement | HTMLImageElement) => void): void {
  const now = paintImage(source)
  if (now instanceof HTMLCanvasElement || now instanceof HTMLImageElement) {
    use(now)
    return
  }
  if (typeof source === 'string') {
    const img = document.createElement('img')
    img.onload = () => use(img)
    img.src = source
    return
  }
  if (source instanceof THREE.Texture && source.image instanceof HTMLImageElement) {
    source.image.addEventListener('load', () => use(source.image as HTMLImageElement), { once: true })
  }
}

function multiplyCutoutCoat(root: THREE.Group, source: CoatSource): boolean {
  const body = root.getObjectByName('body') as THREE.Mesh | undefined
  const portrait = root.getObjectByName('portrait') as THREE.Mesh | undefined
  const bodyMap = body?.material instanceof THREE.MeshLambertMaterial ? body.material.map : null
  const portraitMap =
    portrait?.material instanceof THREE.MeshLambertMaterial ? portrait.material.map : null
  const sprite =
    (root.userData.spriteMap as THREE.Texture | undefined) || portraitMap || bodyMap || undefined
  if (!sprite?.image) return false
  const art = sprite.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined
  const w = art?.width || art?.naturalWidth || 0
  const h = art?.height || art?.naturalHeight || 0
  if (w < 4 || h < 4) return false
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx || typeof ctx.drawImage !== 'function') return false
  try {
    ctx.drawImage(sprite.image as CanvasImageSource, 0, 0, w, h)
  } catch {
    return false
  }
  let base: ImageData
  try {
    base = ctx.getImageData(0, 0, w, h)
  } catch {
    return false
  }
  const paint = paintImage(source)
  if (!paint) return false
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  try {
    ctx.drawImage(paint, 0, 0, w, h)
  } catch {
    ctx.restore()
    return false
  }
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
  let mixed: ImageData
  try {
    mixed = ctx.getImageData(0, 0, w, h)
  } catch {
    return false
  }
  for (let i = 0; i < base.data.length; i += 4) {
    mixed.data[i + 3] = base.data[i + 3]!
    if (keepArtPixel(base.data[i]!, base.data[i + 1]!, base.data[i + 2]!)) {
      mixed.data[i] = base.data[i]!
      mixed.data[i + 1] = base.data[i + 1]!
      mixed.data[i + 2] = base.data[i + 2]!
    }
  }
  ctx.putImageData(mixed, 0, 0)
  const tex = configure(new THREE.CanvasTexture(canvas))
  root.userData.drawing = tex
  root.userData.coat = tex
  const cutout = root.userData.pack === 'art-cutout'
  const cartoon = root.userData.pack === 'cartoon-rig'
  const land = root.userData.pack === 'land-gltf'
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || keepFace(obj) || obj.userData.ghost) return
    const isPortrait = obj.userData.portrait || obj.name === 'portrait'
    const rigged = obj.userData.rigged || (obj as THREE.SkinnedMesh).isSkinnedMesh || obj.name === 'body'
    if (cartoon && !isPortrait) return
    if (!cutout && !cartoon && !land && !rigged) return
    if (land && !rigged && !isPortrait) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      if (!('map' in mat)) continue
      const lambert = mat as THREE.MeshLambertMaterial
      lambert.map = tex
      lambert.color.set('#ffffff')
      lambert.vertexColors = land
      lambert.needsUpdate = true
      if (cutout || isPortrait) {
        lambert.alphaTest = 0.28
        lambert.side = THREE.DoubleSide
      }
    }
  })
  return true
}

function applyArtCoat(root: THREE.Group, source: CoatSource): void {
  if (multiplyCutoutCoat(root, source)) return
  whenPaintReady(source, (img) => {
    multiplyCutoutCoat(root, img)
  })
}

/** 把画板 / 拍照原图像素贴上身子。卡通网格只叠乘，绝不把角色图换成涂色纸。 */
export function applyDrawingCoat(root: THREE.Group, source: CoatSource): void {
  if (root.userData.pack === 'art-cutout' || root.userData.pack === 'cartoon-rig' || root.userData.pack === 'land-gltf') {
    applyArtCoat(root, source)
    return
  }
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
