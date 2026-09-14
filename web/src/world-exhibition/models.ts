/**
 * 观展动物：可爱、能认出的行走侧影（鹿角 / 虎纹 / 狮鬣），
 * 不是圆球圆锥，也不是薄片。孩子分区色铺在 UV 皮毛上。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'
import { coatTexture } from './coat'
import {
  DEER_ANTLER_L_BEAM,
  DEER_ANTLER_R_BEAM,
  DEER_BODY,
  DEER_EAR_L,
  DEER_EAR_R,
  DEER_TAIL,
  LION_BODY,
  LION_EAR_L,
  LION_EAR_R,
  LION_HEAD,
  LION_MANE,
  LION_MUZZLE,
  LION_TUFT,
  TIGER_BODY,
  TIGER_EAR_L,
  TIGER_EAR_R,
  TIGER_HEAD,
  TIGER_MUZZLE,
  type Ring,
} from '../silhouettes'

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

function toon(
  color: string,
  map?: THREE.Texture,
  doubleSide = false,
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    map: map ?? null,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: map ? 0.04 : 0.12,
  })
}

function mesh(
  geo: THREE.BufferGeometry,
  color: string,
  map?: THREE.Texture,
  doubleSide = false,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color, map, doubleSide))
  m.castShadow = true
  m.receiveShadow = false
  return m
}

function part(
  geo: THREE.BufferGeometry,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
  map?: THREE.Texture,
): THREE.Mesh {
  const color = map ? '#ffffff' : colorOf(animal, region, painted)
  const m = mesh(geo, color, map)
  m.userData.region = region
  return m
}

function addBody(g: THREE.Group, m: THREE.Mesh): void {
  g.add(m)
}

function smoothRing(pts: Ring, count = 72): THREE.Vector2[] {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'catmullrom',
    0.08,
  )
  return curve.getSpacedPoints(count).map((p) => new THREE.Vector2(p.x, p.y))
}

/**
 * 侧影挤成有厚度的身子：侧面是真轮廓，切片往中心收成圆滚滚的胸宽。
 */
export function profileVolume(
  pts: Ring,
  halfW: number,
  widthAt: (x: number, y: number) => number = () => 1,
  slices = 12,
): THREE.BufferGeometry {
  const contour = smoothRing(pts)
  const n = contour.length
  const cx = contour.reduce((s, p) => s + p.x, 0) / n
  const cy = contour.reduce((s, p) => s + p.y, 0) / n
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of contour) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const positions: number[] = []
  const uvs: number[] = []
  for (let s = 0; s < slices; s++) {
    const t = slices === 1 ? 0 : (s / (slices - 1)) * 2 - 1
    const round = Math.sqrt(Math.max(0, 1 - t * t))
    const pull = 0.14 * (1 - round)
    for (let i = 0; i < n; i++) {
      const p = contour[i]!
      const w = halfW * widthAt(p.x, p.y)
      positions.push(p.x + (cx - p.x) * pull, p.y + (cy - p.y) * pull, t * w)
      uvs.push((p.x - minX) / (maxX - minX || 1), (p.y - minY) / (maxY - minY || 1))
    }
  }
  const indices: number[] = []
  for (let s = 0; s < slices - 1; s++) {
    for (let i = 0; i < n; i++) {
      const i0 = s * n + i
      const i1 = s * n + ((i + 1) % n)
      const i2 = (s + 1) * n + i
      const i3 = (s + 1) * n + ((i + 1) % n)
      indices.push(i0, i1, i2, i1, i3, i2)
    }
  }
  const tris = THREE.ShapeUtils.triangulateShape(contour, [])
  const back = (slices - 1) * n
  for (const tri of tris) {
    const a = tri[0]!
    const b = tri[1]!
    const c = tri[2]!
    // 第 0 片在 −Z，朝外要反向；末片在 +Z。
    indices.push(a, c, b)
    indices.push(back + a, back + b, back + c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function tube(pts: THREE.Vector3[], radius: number, tubular = 12): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), tubular, radius, 10, false)
}

export function createAnimalModel(
  animal: AnimalId,
  painted: Record<string, string>,
  thumb?: string,
): THREE.Group {
  void thumb
  const coat = coatTexture(animal, painted)
  const g = animal === 'deer' ? deer(painted, coat) : animal === 'tiger' ? tiger(painted, coat) : lion(painted, coat)
  g.userData.kind = animal
  g.userData.coat = coat
  return g
}

export function recolorAnimal(
  group: THREE.Group,
  animal: AnimalId,
  painted: Record<string, string>,
): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.region) {
      const mat = obj.material
      if (mat instanceof THREE.MeshLambertMaterial && !mat.map) {
        mat.color.set(colorOf(animal, obj.userData.region, painted))
      }
    }
  })
}

function deer(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'deer'
  const bodyGeo = profileVolume(DEER_BODY, 0.24, (x, y) => {
    if (x > 0.95) return 0.48
    if (x > 0.68 && y > 1.08) return 0.58
    if (y < 0.86) return 0.46
    return 1
  })
  addBody(g, part(bodyGeo, 'body', a, painted, coat))
  const cheek = mesh(new THREE.SphereGeometry(0.14, 16, 14), colorOf(a, 'head', painted))
  cheek.position.set(1.06, 1.32, 0)
  cheek.scale.set(1.2, 1.05, 1.15)
  cheek.userData.region = 'head'
  g.add(cheek)
  addBody(g, part(profileVolume(DEER_EAR_L, 0.028), 'earL', a, painted))
  addBody(g, part(profileVolume(DEER_EAR_R, 0.028), 'earR', a, painted))
  addBody(g, part(profileVolume(DEER_TAIL, 0.045), 'tail', a, painted))

  const antlerPts = (rings: Ring[], zSign: number): THREE.Vector3[][] =>
    rings.map((ring) => ring.map(([x, y]) => new THREE.Vector3(x, y, zSign * 0.07)))
  for (const chain of antlerPts(DEER_ANTLER_L_BEAM, 1)) {
    g.add(part(tube(chain, 0.02, 16), 'antlerL', a, painted))
  }
  for (const chain of antlerPts(DEER_ANTLER_R_BEAM, -1)) {
    g.add(part(tube(chain, 0.02, 16), 'antlerR', a, painted))
  }

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.4, z: 0.24, hipY: 0.7, radius: 0.055, foot: 'hoof' },
    { name: 'legFR', x: 0.4, z: -0.24, hipY: 0.7, radius: 0.055, foot: 'hoof' },
    { name: 'legBL', x:  -0.36, z: 0.26, hipY: 0.72, radius: 0.06, foot: 'hoof' },
    { name: 'legBR', x: -0.36, z: -0.26, hipY: 0.72, radius: 0.06, foot: 'hoof' },
  ])
  cuteFace(g, 1.14, 1.34, 0.12, 1.08)
  g.userData.legs = legs
  return g
}

function tiger(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  const bodyGeo = profileVolume(TIGER_BODY, 0.3, (x, y) => {
    if (x < -0.5) return 0.85
    if (y < 0.74) return 0.52
    return 1
  })
  addBody(g, part(bodyGeo, 'body', a, painted, coat))

  const headGeo = profileVolume(TIGER_HEAD, 0.24, (x) => (x > 1.12 ? 0.72 : 1))
  addBody(g, part(headGeo, 'head', a, painted, coat))
  addBody(g, part(profileVolume(TIGER_MUZZLE, 0.15), 'muzzle', a, painted))
  addBody(g, part(profileVolume(TIGER_EAR_L, 0.045), 'earL', a, painted))
  addBody(g, part(profileVolume(TIGER_EAR_R, 0.045), 'earR', a, painted))
  const innerL = part(profileVolume(TIGER_EAR_L, 0.02), 'innerL', a, painted)
  innerL.scale.set(0.55, 0.55, 1)
  innerL.position.set(0.02, 0.02, 0.03)
  g.add(innerL)
  const innerR = part(profileVolume(TIGER_EAR_R, 0.02), 'innerR', a, painted)
  innerR.scale.set(0.55, 0.55, 1)
  innerR.position.set(-0.02, 0.02, -0.03)
  g.add(innerR)

  const tailGeo = tube(
    [
      new THREE.Vector3(-0.74, 0.72, 0),
      new THREE.Vector3(-1.0, 0.94, 0.06),
      new THREE.Vector3(-1.24, 0.72, 0),
      new THREE.Vector3(-1.3, 0.4, -0.04),
    ],
    0.044,
    16,
  )
  g.add(part(tailGeo, 'tail', a, painted))

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.46, z: 0.32, hipY: 0.64, radius: 0.056, foot: 'paw' },
    { name: 'legFR', x: 0.46, z: -0.32, hipY: 0.64, radius: 0.056, foot: 'paw' },
    { name: 'legBL', x: -0.44, z: 0.34, hipY: 0.66, radius: 0.06, foot: 'paw' },
    { name: 'legBR', x: -0.44, z: -0.34, hipY: 0.66, radius: 0.06, foot: 'paw' },
  ])
  cuteFace(g, 1.08, 0.92, 0.2, 1.12)
  g.userData.legs = legs
  return g
}

function lion(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  addBody(
    g,
    part(
      profileVolume(LION_BODY, 0.28, (_x, y) => (y < 0.74 ? 0.52 : 1)),
      'body',
      a,
      painted,
      coat,
    ),
  )

  const mane = new THREE.Group()
  mane.userData.region = 'mane'
  const maneColor = colorOf(a, 'mane', painted)
  for (const [ox, oy, oz, s] of [
    [0.7, 1.05, 0, 0.42],
    [0.55, 1.28, 0.12, 0.28],
    [0.55, 1.28, -0.12, 0.28],
    [0.48, 0.92, 0.22, 0.24],
    [0.48, 0.92, -0.22, 0.24],
    [0.88, 1.18, 0.18, 0.22],
    [0.88, 1.18, -0.18, 0.22],
    [0.78, 1.42, 0.08, 0.2],
    [0.78, 1.42, -0.08, 0.2],
    [0.42, 1.1, 0, 0.26],
    [0.95, 0.88, 0.12, 0.18],
    [0.95, 0.88, -0.12, 0.18],
  ] as const) {
    const tuft = mesh(new THREE.SphereGeometry(s, 12, 10), maneColor)
    tuft.position.set(ox, oy, oz)
    tuft.userData.region = 'mane'
    mane.add(tuft)
  }
  g.add(mane)
  addBody(g, part(profileVolume(LION_MANE, 0.18), 'mane', a, painted))

  addBody(g, part(profileVolume(LION_HEAD, 0.2), 'head', a, painted, coat))
  addBody(g, part(profileVolume(LION_MUZZLE, 0.13), 'muzzle', a, painted))
  addBody(g, part(profileVolume(LION_EAR_L, 0.032), 'earL', a, painted))
  addBody(g, part(profileVolume(LION_EAR_R, 0.032), 'earR', a, painted))
  addBody(g, part(profileVolume(LION_TUFT, 0.05), 'tuft', a, painted))

  const tailGeo = tube(
    [
      new THREE.Vector3(-0.68, 0.72, 0),
      new THREE.Vector3(-0.95, 0.92, 0.05),
      new THREE.Vector3(-1.18, 0.7, 0),
    ],
    0.034,
    12,
  )
  g.add(part(tailGeo, 'tail', a, painted))

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.42, z: 0.3, hipY: 0.64, radius: 0.056, foot: 'paw' },
    { name: 'legFR', x: 0.42, z: -0.3, hipY: 0.64, radius: 0.056, foot: 'paw' },
    { name: 'legBL', x: -0.38, z: 0.32, hipY: 0.66, radius: 0.06, foot: 'paw' },
    { name: 'legBR', x: -0.38, z: -0.32, hipY: 0.66, radius: 0.06, foot: 'paw' },
  ])
  cuteFace(g, 1.0, 0.94, 0.18, 1.05)
  g.userData.legs = legs
  return g
}

type FootKind = 'hoof' | 'paw'

type LegSpec = {
  name: string
  x: number
  z: number
  hipY: number
  radius: number
  foot: FootKind
}

/** 实心锥柱，上粗下细。不要用会漏光的胶囊车削。 */
function solidShaft(radius: number, length: number): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius * 1.04, radius * 0.78, length, 18, 1, false)
}

function limb(
  geo: THREE.BufferGeometry,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
): THREE.Mesh {
  const m = mesh(geo, colorOf(animal, region, painted), undefined, true)
  m.userData.region = region
  return m
}

/** 直柱四肢：髋到地面，蹄/爪贴地。实心不透，双面，不是折管。 */
function placeLegs(
  g: THREE.Group,
  animal: AnimalId,
  painted: Record<string, string>,
  specs: LegSpec[],
): THREE.Group[] {
  const legs: THREE.Group[] = []
  for (const spec of specs) {
    const hip = new THREE.Group()
    hip.position.set(spec.x, spec.hipY, spec.z)
    const footH = spec.foot === 'hoof' ? 0.05 : 0.048
    const length = Math.max(0.12, spec.hipY - footH)
    const shaft = limb(solidShaft(spec.radius, length), spec.name, animal, painted)
    shaft.position.y = -length / 2
    hip.add(shaft)
    hip.add(makeFoot(spec, animal, painted))
    g.add(hip)
    legs.push(hip)
  }
  return legs
}

function makeFoot(spec: LegSpec, animal: AnimalId, painted: Record<string, string>): THREE.Group {
  const f = new THREE.Group()
  f.position.y = -spec.hipY
  if (spec.foot === 'hoof') {
    const hoof = mesh(new THREE.SphereGeometry(spec.radius * 1.35, 12, 10), '#3a2418', undefined, true)
    hoof.scale.set(1.15, 0.55, 0.85)
    hoof.position.set(0.02, 0.028, 0)
    f.add(hoof)
  } else {
    const pad = mesh(
      new THREE.SphereGeometry(spec.radius * 1.45, 12, 10),
      colorOf(animal, spec.name, painted),
      undefined,
      true,
    )
    pad.scale.set(1.35, 0.42, 1.1)
    pad.position.set(0.04, 0.026, 0)
    f.add(pad)
    for (const tz of [-0.7, 0, 0.7]) {
      const toe = mesh(new THREE.SphereGeometry(spec.radius * 0.42, 8, 6), '#3a2418', undefined, true)
      toe.scale.set(1.2, 0.7, 0.9)
      toe.position.set(spec.radius * 1.7, 0.018, spec.radius * tz)
      f.add(toe)
    }
  }
  return f
}

/** 圆眼睛 + 高光 + 圆鼻子，小朋友看得懂的脸。 */
function cuteFace(g: THREE.Group, x: number, y: number, z: number, scale = 1): void {
  const white = new THREE.MeshLambertMaterial({ color: '#fff8ee', emissive: '#22180c', emissiveIntensity: 0.08 })
  const ink = new THREE.MeshBasicMaterial({ color: '#1a120c' })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052 * scale, 14, 12), white)
    eye.position.set(x, y, s * z)
    eye.scale.set(0.95, 1.12, 0.8)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026 * scale, 10, 8), ink)
    pupil.position.set(x + 0.026 * scale, y - 0.004, s * (z + 0.03 * scale))
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.011 * scale, 8, 6), shine)
    hi.position.set(x + 0.018 * scale, y + 0.018 * scale, s * (z + 0.042 * scale))
    g.add(eye, pupil, hi)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 10, 8), ink)
  nose.position.set(x + 0.2 * scale, y - 0.08 * scale, 0)
  nose.scale.set(1.25, 0.85, 0.9)
  g.add(nose)
}

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  const legs = group.userData.legs as THREE.Group[] | undefined
  if (!legs) return
  legs.forEach((leg, i) => {
    const pair = i === 0 || i === 3 ? 1 : -1
    leg.rotation.z = moving ? Math.sin(t * 5) * 0.05 * pair : 0
  })
  group.position.y = 0
}
