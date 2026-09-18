/**
 * 2.5D land pets: official generated character art as alpha cutouts.
 * Not sphere-cub CSG, Kenney cubes, fox/wolf, or 千图网.
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'

export const ART_CUTOUT_PACK = 'art-cutout'

export const CUTOUT_SRC: Record<'deer' | 'tiger' | 'lion', string> = {
  deer: '/models/cutouts/deer.png',
  tiger: '/models/cutouts/tiger.png',
  lion: '/models/cutouts/lion.png',
}

/** Fallback plane shape if the PNG decoder only yields a 1×1 (jsdom tests). */
const FALLBACK_ASPECT: Record<string, number> = {
  lion: 511 / 584,
  deer: 356 / 616,
  tiger: 481 / 532,
}

const REST = [0, 0, 0, 1] as const

function dummy(name: string, hex: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 5),
    new THREE.MeshLambertMaterial({ color: hex }),
  )
  mesh.name = name
  mesh.position.set(x, y, z)
  mesh.visible = false
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  return mesh
}

function cutoutMaterial(map: THREE.Texture): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    map,
    color: '#ffffff',
    transparent: false,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    vertexColors: false,
  })
  mat.name = 'cutout'
  return mat
}

function aspectOf(id: AnimalId, tex: THREE.Texture): number {
  const img = tex.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined
  const w = img?.width || img?.naturalWidth || 0
  const h = img?.height || img?.naturalHeight || 0
  if (w > 2 && h > 2) return w / h
  return FALLBACK_ASPECT[id] || 0.7
}

function clipsFor(bodyY: number): THREE.AnimationClip[] {
  const walkTimes = [0, 0.16, 0.32, 0.48, 0.64]
  const hop = [
    0, bodyY, 0,
    0, bodyY + 0.05, 0,
    0, bodyY, 0,
    0, bodyY + 0.05, 0,
    0, bodyY, 0,
  ]
  const walk = new THREE.AnimationClip('walk', 0.64, [
    new THREE.VectorKeyframeTrack('body.position', walkTimes, hop),
    new THREE.NumberKeyframeTrack('body.rotation[z]', walkTimes, [0, 0.04, 0, -0.04, 0]),
  ])
  const idle = new THREE.AnimationClip('idle', 2.2, [
    new THREE.VectorKeyframeTrack(
      'body.position',
      [0, 1.1, 2.2],
      [0, bodyY, 0, 0, bodyY + 0.02, 0, 0, bodyY, 0],
    ),
  ])
  const eat = new THREE.AnimationClip('eat', 1.4, [
    new THREE.VectorKeyframeTrack(
      'head.position',
      [0, 0.4, 1.0, 1.4],
      [0, 0.72, 0.02, 0, 0.58, 0.08, 0, 0.6, 0.08, 0, 0.72, 0.02],
    ),
  ])
  const stat = new THREE.AnimationClip('static', 0.1, [
    new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.1], [...REST, ...REST]),
  ])
  return [walk, idle, eat, stat]
}

export function buildArtCutout(id: AnimalId, map: THREE.Texture): THREE.Group {
  const aspect = aspectOf(id, map)
  const height = 1
  const width = height * aspect
  const bodyY = height / 2

  const root = new THREE.Group()
  root.name = `animal-${id}`
  root.userData.spriteMap = map
  root.userData.spriteAspect = aspect

  const geo = new THREE.PlaneGeometry(width, height, 4, 4)
  const body = new THREE.Mesh(geo, cutoutMaterial(map))
  body.name = 'body'
  body.position.set(0, bodyY, 0)
  body.userData.cutout = true
  body.userData.portrait = true
  body.userData.region = 'body'
  body.castShadow = false
  body.receiveShadow = false
  root.add(body)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.72, 0.02)
  head.add(dummy('face', '#ffe6b0'))
  head.add(dummy('muzzle', '#ffe6b0', 0, -0.04, 0.04))
  head.add(dummy('eyeL', '#fffdf7', -0.08, 0.02, 0.04))
  head.add(dummy('irisL', '#3c9ee0', -0.08, 0.02, 0.05))
  head.add(dummy('eyeR', '#fffdf7', 0.08, 0.02, 0.04))
  head.add(dummy('irisR', '#3c9ee0', 0.08, 0.02, 0.05))
  head.add(dummy('nose', '#c45c4a', 0, -0.05, 0.05))
  if (id === 'lion') {
    const mane = dummy('mane', '#d47828', 0, -0.08, -0.04)
    mane.visible = false
    head.add(mane)
  }
  if (id === 'deer') {
    head.add(dummy('antler-left', '#8b5a2b', -0.08, 0.16, -0.02))
    head.add(dummy('antler-right', '#8b5a2b', 0.08, 0.16, -0.02))
  }
  root.add(head)

  const mkLeg = (name: string, x: number, z: number) => {
    const leg = new THREE.Group()
    leg.name = name
    leg.position.set(x, 0.2, z)
    leg.add(dummy(`${name}-shaft`, '#e0a04a', 0, -0.08, 0))
    leg.add(dummy(`${name}-paw`, '#d9a066', 0, -0.16, 0.01))
    return leg
  }
  root.add(
    mkLeg('leg-front-left', -0.12, 0.08),
    mkLeg('leg-front-right', 0.12, 0.08),
    mkLeg('leg-back-left', -0.14, -0.08),
    mkLeg('leg-back-right', 0.14, -0.08),
  )

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0.28, 0.42, -0.04)
  tail.add(dummy('tail-shaft', '#f0b54a'))
  root.add(tail)

  root.userData.cutoutClips = clipsFor(bodyY)
  root.userData.spriteH = height
  root.userData.pack = ART_CUTOUT_PACK
  return root
}

export async function loadCutoutTexture(id: AnimalId): Promise<THREE.Texture> {
  const url = CUTOUT_SRC[id as 'deer' | 'tiger' | 'lion']
  if (!url) throw new Error(`没有剪纸贴图：${id}`)
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.premultiplyAlpha = false
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.anisotropy = 1
        tex.needsUpdate = true
        resolve(tex)
      },
      undefined,
      () => reject(new Error(`无法加载剪纸 ${id}`)),
    )
  })
}

/** Y-billboard so the painted PNG always faces the forest / snapshot camera. */
export function billboardY(obj: THREE.Object3D, camera: THREE.Camera): void {
  const px = obj.position.x
  const pz = obj.position.z
  obj.rotation.y = Math.atan2(camera.position.x - px, camera.position.z - pz)
}

export function isArtCutout(obj: THREE.Object3D | undefined | null): boolean {
  return Boolean(obj && obj.userData.pack === ART_CUTOUT_PACK)
}
