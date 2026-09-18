/**
 * Lion only, industry order: connected mesh + approved cartoon coat,
 * then quadruped bones, then a walk clip. Not loft shards, Kenney, or Mixamo.
 * Deer and tiger stay art-cutout.
 *
 * Mesh is a straight silhouette prism: cartoon UVs on the caps, solid mane/coat
 * on the rim. Inner rings stay full-size so the edge is a stuffed band, not
 * stacked cardboard.
 */
import * as THREE from 'three'
import { LION_CONTOUR } from './lion-contour'

export const LION_MESH_PACK = 'lion-mesh'
export const LION_COAT_SRC = '/models/cutouts/lion-three-quarter.png'
export const LION_BONE_NAMES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'tail',
  'leg-front-left',
  'leg-front-right',
  'leg-back-left',
  'leg-back-right',
] as const

const REST: number[] = [0, 0, 0, 1]
const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)

function quat(axis: THREE.Vector3, angle: number): number[] {
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  return [q.x, q.y, q.z, q.w]
}

function qtrack(name: string, times: number[], poses: number[][]): THREE.QuaternionKeyframeTrack {
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, poses.flat())
}

function dummy(name: string, hex: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 5),
    new THREE.MeshLambertMaterial({ color: hex }),
  )
  mesh.name = name
  mesh.visible = false
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  return mesh
}

function jointMark(parent: THREE.Bone): void {
  const mark = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#7cff4a', depthTest: false, depthWrite: false }),
  )
  mark.name = `joint-${parent.name}`
  mark.userData.boneMark = true
  mark.visible = false
  mark.renderOrder = 8
  mark.frustumCulled = false
  parent.add(mark)
}

function resample(count = 72): THREE.Vector2[] {
  const pts = LION_CONTOUR.map(([x, y]) => new THREE.Vector3(x, y, 0))
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.08)
  return curve.getSpacedPoints(count).map((p) => new THREE.Vector2(p.x, p.y))
}

function uvAt(x: number, y: number): [number, number] {
  let best = LION_CONTOUR[0]!
  let d = Infinity
  for (const p of LION_CONTOUR) {
    const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2
    if (dd < d) {
      d = dd
      best = p
    }
  }
  return [best[2], best[3]]
}

function rimColor(x: number, y: number): THREE.Color {
  if (y > 0.6) return new THREE.Color('#c86a24')
  if (x > 0.2 && y < 0.58) return new THREE.Color('#e0a040')
  if (y < 0.17) return new THREE.Color('#d4923c')
  if (y < 0.4 && Math.abs(x) < 0.09) return new THREE.Color('#ffe6b0')
  return new THREE.Color('#f0b54a')
}

function plumpMesh(halfW = 0.12, slices = 6): THREE.BufferGeometry {
  const ring = resample(80)
  const n = ring.length
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const pushVert = (x: number, y: number, z: number) => {
    const [u, v] = uvAt(x, y)
    const c = rimColor(x, y)
    positions.push(x, y, z)
    uvs.push(u, v)
    colors.push(c.r, c.g, c.b)
  }
  for (let s = 0; s < slices; s++) {
    const t = slices === 1 ? 0 : s / (slices - 1)
    const z = (1 - 2 * t) * halfW
    for (const p of ring) pushVert(p.x, p.y, z)
  }
  const indices: number[] = []
  for (let s = 0; s < slices - 1; s++) {
    for (let i = 0; i < n; i++) {
      const i0 = s * n + i
      const i1 = s * n + ((i + 1) % n)
      const i2 = (s + 1) * n + i
      const i3 = (s + 1) * n + ((i + 1) % n)
      indices.push(i0, i2, i1, i1, i2, i3)
    }
  }
  const rimCount = indices.length
  const tris = THREE.ShapeUtils.triangulateShape(ring, [])
  const back = (slices - 1) * n
  for (const tri of tris) {
    const a = tri[0]!
    const b = tri[1]!
    const c = tri[2]!
    indices.push(a, c, b)
    indices.push(back + a, back + b, back + c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.clearGroups()
  geo.addGroup(0, rimCount, 1)
  geo.addGroup(rimCount, indices.length - rimCount, 0)
  geo.computeVertexNormals()
  return geo
}

function bone(name: string, world: THREE.Vector3, parent?: THREE.Bone): THREE.Bone {
  const b = new THREE.Bone()
  b.name = name
  if (parent) {
    parent.updateWorldMatrix(true, false)
    const pw = new THREE.Vector3()
    parent.getWorldPosition(pw)
    b.position.copy(world).sub(pw)
    parent.add(b)
  } else {
    b.position.copy(world)
  }
  jointMark(b)
  return b
}

function skin(geo: THREE.BufferGeometry, bones: THREE.Bone[]): void {
  const pos = geo.getAttribute('position')
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const world = bones.map((b) => {
    b.updateWorldMatrix(true, false)
    return b.getWorldPosition(new THREE.Vector3())
  })
  void world
  const indexOf = (name: string) => bones.findIndex((b) => b.name === name)
  const tmp = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    let primary = 'spine'
    if (tmp.y < 0.2) {
      if (tmp.x < -0.02) primary = tmp.z <= 0 ? 'leg-front-left' : 'leg-front-right'
      else if (tmp.x > 0.08) primary = tmp.z <= 0 ? 'leg-back-left' : 'leg-back-right'
      else primary = tmp.x < 0.03 ? 'leg-front-left' : 'leg-back-left'
    } else if (tmp.x > 0.2 && tmp.y < 0.55) primary = 'tail'
    else if (tmp.y > 0.72) primary = 'head'
    else if (tmp.y > 0.58) primary = 'neck'
    else if (tmp.x < 0) primary = 'chest'
    else primary = tmp.y < 0.4 ? 'hips' : 'spine'
    const a = Math.max(0, indexOf(primary))
    const second = indexOf(primary === 'head' ? 'neck' : primary.startsWith('leg-') ? 'hips' : 'spine')
    const b = second >= 0 && second !== a ? second : a
    skinIndex[i * 4] = a
    skinIndex[i * 4 + 1] = b
    skinWeight[i * 4] = 0.88
    skinWeight[i * 4 + 1] = 0.12
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function clipsFor(): THREE.AnimationClip[] {
  const walkT = [0, 0.25, 0.5, 0.75, 1]
  const A = [REST, quat(Z, 0.28), REST, quat(Z, -0.22), REST]
  const B = [REST, quat(Z, -0.22), REST, quat(Z, 0.28), REST]
  const walk = new THREE.AnimationClip('walk', 1, [
    qtrack('leg-front-left', walkT, A),
    qtrack('leg-front-right', walkT, B),
    qtrack('leg-back-left', walkT, B),
    qtrack('leg-back-right', walkT, A),
    qtrack('tail', walkT, [REST, quat(Y, 0.18), REST, quat(Y, -0.18), REST]),
    qtrack('head', walkT, [REST, quat(X, 0.05), REST, quat(X, -0.03), REST]),
    new THREE.VectorKeyframeTrack('hips.position', walkT, [0.06, 0.32, 0, 0.06, 0.35, 0, 0.06, 0.32, 0, 0.06, 0.35, 0, 0.06, 0.32, 0]),
  ])
  const idle = new THREE.AnimationClip('idle', 2.2, [
    qtrack('head', [0, 1.1, 2.2], [REST, quat(X, 0.04), REST]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.1, 2.2], [0.06, 0.32, 0, 0.06, 0.334, 0, 0.06, 0.32, 0]),
  ])
  const stat = new THREE.AnimationClip('static', 0.1, [qtrack('head', [0, 0.1], [REST, REST])])
  return [walk, idle, stat]
}

export function buildLionMesh(map: THREE.Texture): THREE.Group {
  const root = new THREE.Group()
  root.name = 'animal-lion'

  const hips = bone('hips', new THREE.Vector3(0.06, 0.32, 0))
  root.add(hips)
  hips.updateWorldMatrix(true, false)
  const spine = bone('spine', new THREE.Vector3(0.02, 0.44, 0), hips)
  spine.updateWorldMatrix(true, false)
  const chest = bone('chest', new THREE.Vector3(-0.04, 0.54, 0), spine)
  chest.updateWorldMatrix(true, false)
  const neck = bone('neck', new THREE.Vector3(-0.1, 0.68, 0), chest)
  neck.updateWorldMatrix(true, false)
  const head = bone('head', new THREE.Vector3(-0.14, 0.84, 0.02), neck)
  bone('tail', new THREE.Vector3(0.24, 0.42, 0), hips)
  const fl = bone('leg-front-left', new THREE.Vector3(-0.04, 0.2, -0.05), chest)
  fl.updateWorldMatrix(true, false)
  bone('leg-front-left-low', new THREE.Vector3(-0.04, 0.08, -0.05), fl)
  const fr = bone('leg-front-right', new THREE.Vector3(-0.04, 0.2, 0.05), chest)
  fr.updateWorldMatrix(true, false)
  bone('leg-front-right-low', new THREE.Vector3(-0.04, 0.08, 0.05), fr)
  const bl = bone('leg-back-left', new THREE.Vector3(0.12, 0.2, -0.05), hips)
  bl.updateWorldMatrix(true, false)
  bone('leg-back-left-low', new THREE.Vector3(0.12, 0.08, -0.05), bl)
  const br = bone('leg-back-right', new THREE.Vector3(0.12, 0.2, 0.05), hips)
  br.updateWorldMatrix(true, false)
  bone('leg-back-right-low', new THREE.Vector3(0.12, 0.08, 0.05), br)

  const eyeL = dummy('eyeL', '#fffdf7')
  const eyeR = dummy('eyeR', '#fffdf7')
  const irisL = dummy('irisL', '#3c9ee0')
  const irisR = dummy('irisR', '#3c9ee0')
  const nose = dummy('nose', '#c45c4a')
  eyeL.position.set(-0.06, 0.02, 0.08)
  eyeR.position.set(0.02, 0.02, 0.08)
  nose.position.set(-0.02, -0.04, 0.1)
  eyeL.add(irisL)
  eyeR.add(irisR)
  head.add(eyeL, eyeR, nose)

  const bones: THREE.Bone[] = []
  hips.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.push(obj as THREE.Bone)
  })

  const geo = plumpMesh()
  skin(geo, bones)
  map.colorSpace = THREE.SRGBColorSpace
  map.needsUpdate = true
  const coat = new THREE.MeshLambertMaterial({
    map,
    color: '#ffffff',
    vertexColors: false,
    alphaTest: 0.28,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  })
  coat.name = 'coat'
  const rim = new THREE.MeshLambertMaterial({
    map: null,
    color: '#ffffff',
    vertexColors: true,
    alphaTest: 0,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
  })
  rim.name = 'rim'
  rim.userData.rim = true
  const body = new THREE.SkinnedMesh(geo, [coat, rim])
  body.name = 'body'
  body.userData.rigged = true
  body.userData.region = 'body'
  body.userData.coat = true
  body.castShadow = false
  body.receiveShadow = false
  body.frustumCulled = false
  const skeleton = new THREE.Skeleton(bones)
  body.bind(skeleton)
  body.normalizeSkinWeights()
  root.add(body)

  root.userData.spriteMap = map
  root.userData.spriteH = 1
  root.userData.rigClips = clipsFor()
  root.userData.pack = LION_MESH_PACK
  return root
}

export async function loadLionCoat(): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      LION_COAT_SRC,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.premultiplyAlpha = false
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.needsUpdate = true
        resolve(tex)
      },
      undefined,
      () => reject(new Error('无法加载狮子皮毛')),
    )
  })
}

export function isLionMesh(obj: THREE.Object3D | undefined | null): boolean {
  return Boolean(obj && obj.userData.pack === LION_MESH_PACK)
}

export function isRimMaterial(mat: THREE.Material): boolean {
  return mat.name === 'rim' || Boolean(mat.userData.rim)
}

/** Bind-pose overlay for the bones layer still. Hidden on mesh and walk. */
export function showLionBones(root: THREE.Object3D, visible: boolean): void {
  root.traverse((obj) => {
    if (obj.userData.boneMark) obj.visible = visible
  })
  let helper = root.getObjectByName('lion-bones-overlay') as THREE.SkeletonHelper | undefined
  if (visible && !helper) {
    const body = root.getObjectByName('body') as THREE.SkinnedMesh | undefined
    if (body && (body as THREE.SkinnedMesh).isSkinnedMesh) {
      helper = new THREE.SkeletonHelper(body)
      helper.name = 'lion-bones-overlay'
      helper.frustumCulled = false
      const mat = helper.material as THREE.LineBasicMaterial
      mat.depthTest = false
      mat.depthWrite = false
      root.add(helper)
    }
  }
  if (helper) helper.visible = visible
}
