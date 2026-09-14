/**
 * 观展动物：小朋友卡通体——大头、圆身子、短粗腿、蹄爪贴地。
 * 共享圆球/圆柱，不打阴影。孩子分区色铺在 UV 皮毛上，斑点/鬣毛是独立网格。
 */
import * as THREE from 'three'
import type { AnimalId, WorldAction } from '../types'
import { ANIMAL_META, isMarine } from '../types'
import { coatTexture } from './coat'
import { type Ring } from '../silhouettes'

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

/** 全场共用几何，避免每只动物再 new 一份。 */
const GEO = {
  sphere: new THREE.SphereGeometry(1, 16, 12),
  fluffy: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12, 1, false),
}

const Y_UP = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()

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
  m.castShadow = false
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

function ball(
  geo: THREE.SphereGeometry,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  map?: THREE.Texture,
): THREE.Mesh {
  const m = part(geo, region, animal, painted, map)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  return m
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

/** 圆柱从 from 接到 to，共享 GEO.cyl。 */
function stick(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
): THREE.Mesh {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  const len = Math.hypot(dx, dy, dz) || 0.01
  const m = limb(GEO.cyl, region, animal, painted)
  m.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2)
  m.scale.set(radius, len, radius)
  m.quaternion.setFromUnitVectors(Y_UP, _dir.set(dx / len, dy / len, dz / len))
  return m
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
 * 测试与少量配件仍用；主体改成圆球组装。
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

export function createAnimalModel(
  animal: AnimalId,
  painted: Record<string, string>,
  thumb?: string,
): THREE.Group {
  void thumb
  const coat = coatTexture(animal, painted)
  const g =
    animal === 'deer'
      ? deer(painted, coat)
      : animal === 'tiger'
        ? tiger(painted, coat)
        : animal === 'lion'
          ? lion(painted, coat)
          : animal === 'fish'
            ? fish(painted, coat)
            : animal === 'turtle'
              ? turtle(painted, coat)
              : dolphin(painted, coat)
  g.userData.kind = animal
  g.userData.coat = coat
  g.userData.marine = isMarine(animal)
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
  g.add(ball(GEO.sphere, 'body', a, painted, 0.06, 0.62, 0, 0.58, 0.4, 0.46, coat))
  g.add(ball(GEO.sphere, 'belly', a, painted, 0.1, 0.44, 0, 0.42, 0.22, 0.34))
  g.add(ball(GEO.fluffy, 'neck', a, painted, 0.42, 0.82, 0, 0.2, 0.18, 0.18))
  g.add(ball(GEO.sphere, 'head', a, painted, 0.72, 1.02, 0, 0.34, 0.32, 0.32))
  g.add(ball(GEO.sphere, 'head', a, painted, 1.0, 0.92, 0, 0.22, 0.15, 0.16))
  g.add(ball(GEO.fluffy, 'earL', a, painted, 0.6, 1.28, 0.14, 0.08, 0.14, 0.05))
  g.add(ball(GEO.fluffy, 'earR', a, painted, 0.6, 1.28, -0.14, 0.08, 0.14, 0.05))
  g.add(ball(GEO.fluffy, 'tail', a, painted, -0.5, 0.78, 0, 0.12, 0.16, 0.1))

  const antlers: [readonly [number, number, number], readonly [number, number, number], number, string][] = [
    [[0.58, 1.26, 0.1], [0.46, 1.72, 0.14], 0.038, 'antlerL'],
    [[0.5, 1.5, 0.12], [0.3, 1.7, 0.18], 0.03, 'antlerL'],
    [[0.48, 1.58, 0.12], [0.62, 1.82, 0.1], 0.028, 'antlerL'],
    [[0.58, 1.26, -0.1], [0.5, 1.74, -0.14], 0.038, 'antlerR'],
    [[0.52, 1.52, -0.12], [0.68, 1.84, -0.1], 0.03, 'antlerR'],
    [[0.5, 1.56, -0.12], [0.34, 1.76, -0.18], 0.028, 'antlerR'],
  ]
  for (const [from, to, r, region] of antlers) g.add(stick(from, to, r, region, a, painted))

  const spots: [string, number, number, number, number][] = [
    ['spot1', 0.22, 0.72, 0.11, 0.09],
    ['spot2', -0.06, 0.78, 0.1, 0.08],
    ['spot3', 0.08, 0.58, 0.09, 0.07],
    ['spot1', -0.22, 0.64, 0.08, 0.07],
    ['spot2', 0.32, 0.56, 0.07, 0.06],
    ['spot3', -0.12, 0.5, 0.07, 0.055],
  ]
  for (const [name, x, y, sx, sy] of spots) {
    for (const z of [0.4, -0.4]) {
      g.add(ball(GEO.fluffy, name, a, painted, x, y, z, sx, sy, 0.045))
    }
  }

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.32, z: 0.3, hipY: 0.46, radius: 0.1, foot: 'hoof' },
    { name: 'legFR', x: 0.32, z: -0.3, hipY: 0.46, radius: 0.1, foot: 'hoof' },
    { name: 'legBL', x: -0.28, z: 0.32, hipY: 0.48, radius: 0.11, foot: 'hoof' },
    { name: 'legBR', x: -0.28, z: -0.32, hipY: 0.48, radius: 0.11, foot: 'hoof' },
  ])
  cuteFace(g, 0.92, 1.04, 0.22, 1.05)
  g.userData.legs = legs
  return g
}

function tiger(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  g.add(ball(GEO.sphere, 'body', a, painted, 0.04, 0.56, 0, 0.62, 0.38, 0.46, coat))
  g.add(ball(GEO.sphere, 'belly', a, painted, 0.08, 0.4, 0, 0.44, 0.2, 0.34))
  g.add(ball(GEO.sphere, 'head', a, painted, 0.72, 0.94, 0, 0.4, 0.38, 0.38, coat))
  g.add(ball(GEO.sphere, 'muzzle', a, painted, 1.06, 0.8, 0, 0.22, 0.16, 0.22))

  const earL = ball(GEO.fluffy, 'earL', a, painted, 0.58, 1.26, 0.2, 0.1, 0.12, 0.06)
  const earR = ball(GEO.fluffy, 'earR', a, painted, 0.58, 1.26, -0.2, 0.1, 0.12, 0.06)
  g.add(earL, earR)
  g.add(ball(GEO.fluffy, 'innerL', a, painted, 0.6, 1.24, 0.22, 0.05, 0.06, 0.03))
  g.add(ball(GEO.fluffy, 'innerR', a, painted, 0.6, 1.24, -0.22, 0.05, 0.06, 0.03))

  g.add(stick([-0.52, 0.62, 0], [-1.12, 0.92, 0.04], 0.055, 'tail', a, painted))
  g.add(stick([-1.12, 0.92, 0.04], [-1.38, 0.52, -0.02], 0.05, 'tail', a, painted))
  g.add(ball(GEO.fluffy, 'tail', a, painted, -1.4, 0.44, 0, 0.1, 0.1, 0.1))

  const stripe = '#4a2a12'
  for (const [x, y, sy] of [
    [0.28, 0.7, 0.16],
    [0.08, 0.74, 0.18],
    [-0.12, 0.72, 0.16],
    [-0.3, 0.66, 0.14],
    [0.22, 0.5, 0.12],
    [-0.18, 0.5, 0.12],
  ] as const) {
    for (const z of [0.42, -0.42]) {
      const band = mesh(GEO.fluffy, stripe)
      band.position.set(x, y, z)
      band.scale.set(0.045, sy, 0.05)
      g.add(band)
    }
  }
  for (const [x, z] of [
    [0.78, 0.28],
    [0.62, 0.32],
    [0.78, -0.28],
    [0.62, -0.32],
  ] as const) {
    const mark = mesh(GEO.fluffy, stripe)
    mark.position.set(x, 0.98, z)
    mark.scale.set(0.035, 0.12, 0.04)
    g.add(mark)
  }

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.34, z: 0.32, hipY: 0.44, radius: 0.11, foot: 'paw' },
    { name: 'legFR', x: 0.34, z: -0.32, hipY: 0.44, radius: 0.11, foot: 'paw' },
    { name: 'legBL', x: -0.3, z: 0.34, hipY: 0.46, radius: 0.12, foot: 'paw' },
    { name: 'legBR', x: -0.3, z: -0.34, hipY: 0.46, radius: 0.12, foot: 'paw' },
  ])
  cuteFace(g, 0.92, 0.96, 0.26, 1.18)
  g.userData.legs = legs
  return g
}

function lion(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  g.add(ball(GEO.sphere, 'body', a, painted, 0.0, 0.54, 0, 0.56, 0.36, 0.44, coat))
  g.add(ball(GEO.sphere, 'belly', a, painted, 0.04, 0.38, 0, 0.4, 0.18, 0.32))

  const mane = new THREE.Group()
  mane.userData.region = 'mane'
  const maneColor = colorOf(a, 'mane', painted)
  for (const [ox, oy, oz, s] of [
    [0.4, 0.92, 0, 0.34],
    [0.44, 1.2, 0.14, 0.24],
    [0.44, 1.2, -0.14, 0.24],
    [0.38, 0.64, 0.16, 0.22],
    [0.38, 0.64, -0.16, 0.22],
    [0.52, 0.96, 0.34, 0.24],
    [0.52, 0.96, -0.34, 0.24],
    [0.66, 1.26, 0.16, 0.2],
    [0.66, 1.26, -0.16, 0.2],
    [0.7, 0.64, 0.2, 0.18],
    [0.7, 0.64, -0.2, 0.18],
    [0.56, 1.36, 0, 0.22],
    [0.28, 1.08, 0.1, 0.2],
    [0.28, 1.08, -0.1, 0.2],
    [0.82, 1.08, 0.22, 0.16],
    [0.82, 1.08, -0.22, 0.16],
    [0.8, 0.76, 0.2, 0.14],
    [0.8, 0.76, -0.2, 0.14],
  ] as const) {
    const tuft = mesh(GEO.fluffy, maneColor)
    tuft.position.set(ox, oy, oz)
    tuft.scale.setScalar(s)
    tuft.userData.region = 'mane'
    mane.add(tuft)
  }
  g.add(mane)

  g.add(ball(GEO.sphere, 'head', a, painted, 0.74, 0.9, 0, 0.3, 0.28, 0.28))
  g.add(ball(GEO.sphere, 'muzzle', a, painted, 1.0, 0.78, 0, 0.18, 0.14, 0.18))
  g.add(ball(GEO.fluffy, 'earL', a, painted, 0.62, 1.28, 0.16, 0.08, 0.1, 0.05))
  g.add(ball(GEO.fluffy, 'earR', a, painted, 0.62, 1.28, -0.16, 0.08, 0.1, 0.05))

  g.add(stick([-0.48, 0.58, 0], [-1.02, 0.82, 0.04], 0.04, 'tail', a, painted))
  g.add(stick([-1.02, 0.82, 0.04], [-1.22, 0.58, 0], 0.036, 'tail', a, painted))
  g.add(ball(GEO.fluffy, 'tuft', a, painted, -1.26, 0.5, 0, 0.12, 0.12, 0.12))

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.3, z: 0.3, hipY: 0.44, radius: 0.11, foot: 'paw' },
    { name: 'legFR', x: 0.3, z: -0.3, hipY: 0.44, radius: 0.11, foot: 'paw' },
    { name: 'legBL', x: -0.28, z: 0.32, hipY: 0.46, radius: 0.12, foot: 'paw' },
    { name: 'legBR', x: -0.28, z: -0.32, hipY: 0.46, radius: 0.12, foot: 'paw' },
  ])
  cuteFace(g, 0.9, 0.92, 0.2, 1.08)
  g.userData.legs = legs
  return g
}

function fish(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'fish'
  g.add(ball(GEO.sphere, 'body', a, painted, 0.12, 0.52, 0, 0.7, 0.4, 0.32, coat))
  g.add(ball(GEO.sphere, 'belly', a, painted, 0.16, 0.36, 0, 0.46, 0.18, 0.22))
  g.add(ball(GEO.sphere, 'head', a, painted, 0.62, 0.54, 0, 0.28, 0.26, 0.24))
  const tail = ball(GEO.fluffy, 'tail', a, painted, -0.7, 0.52, 0, 0.22, 0.28, 0.06)
  g.add(tail)
  g.userData.tail = tail
  const fin = ball(GEO.fluffy, 'fin', a, painted, 0.08, 0.92, 0, 0.16, 0.2, 0.05)
  g.add(fin)
  cuteFace(g, 0.78, 0.58, 0.16, 0.95)
  g.userData.legs = []
  g.position.y = 0.12
  return g
}

function turtle(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'turtle'
  g.add(ball(GEO.sphere, 'shell', a, painted, -0.04, 0.52, 0, 0.62, 0.32, 0.5, coat))
  g.add(ball(GEO.sphere, 'scute', a, painted, -0.04, 0.68, 0, 0.36, 0.16, 0.32))
  g.add(ball(GEO.sphere, 'belly', a, painted, -0.02, 0.32, 0, 0.48, 0.12, 0.38))
  g.add(ball(GEO.sphere, 'head', a, painted, 0.7, 0.48, 0, 0.22, 0.18, 0.2))
  const flippers: THREE.Group[] = []
  for (const spec of [
    { name: 'flipperFR', x: 0.32, z: 0.32, rot: -0.4 },
    { name: 'flipperFL', x: 0.32, z: -0.32, rot: 0.4 },
    { name: 'flipperBR', x: -0.42, z: 0.3, rot: -0.5 },
    { name: 'flipperBL', x: -0.42, z: -0.3, rot: 0.5 },
  ] as const) {
    const hip = new THREE.Group()
    hip.position.set(spec.x, 0.3, spec.z)
    const pad = ball(GEO.fluffy, spec.name, a, painted, 0, 0, 0, 0.22, 0.07, 0.12)
    pad.rotation.y = spec.rot
    hip.add(pad)
    g.add(hip)
    flippers.push(hip)
  }
  cuteFace(g, 0.82, 0.52, 0.14, 0.9)
  g.userData.flippers = flippers
  g.userData.legs = []
  return g
}

function dolphin(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'dolphin'
  g.add(ball(GEO.sphere, 'body', a, painted, 0.08, 0.48, 0, 0.82, 0.34, 0.3, coat))
  g.add(ball(GEO.sphere, 'belly', a, painted, 0.12, 0.32, 0, 0.55, 0.14, 0.2))
  g.add(ball(GEO.sphere, 'snout', a, painted, 0.98, 0.44, 0, 0.28, 0.12, 0.12))
  g.add(ball(GEO.fluffy, 'fin', a, painted, 0.05, 0.86, 0, 0.14, 0.2, 0.05))
  const tail = ball(GEO.fluffy, 'tail', a, painted, -0.82, 0.42, 0, 0.12, 0.08, 0.28)
  g.add(tail)
  g.userData.tail = tail
  cuteFace(g, 0.72, 0.54, 0.16, 0.95)
  g.userData.legs = []
  g.position.y = 0.1
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

/** 短粗直柱：髋到地面，蹄/爪贴地。共享圆柱，几乎不收尖。 */
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
    const footH = spec.foot === 'hoof' ? 0.055 : 0.05
    const length = Math.max(0.16, spec.hipY - footH)
    const shaft = limb(GEO.cyl, spec.name, animal, painted)
    shaft.scale.set(spec.radius, length, spec.radius)
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
    const hoof = mesh(GEO.sphere, '#3a2418', undefined, true)
    hoof.scale.set(spec.radius * 1.45, spec.radius * 0.7, spec.radius * 1.15)
    hoof.position.set(0.03, 0.032, 0)
    f.add(hoof)
  } else {
    const pad = mesh(GEO.sphere, colorOf(animal, spec.name, painted), undefined, true)
    pad.scale.set(spec.radius * 1.7, spec.radius * 0.55, spec.radius * 1.45)
    pad.position.set(0.05, 0.03, 0)
    f.add(pad)
    for (const tz of [-0.65, 0, 0.65]) {
      const toe = mesh(GEO.fluffy, '#3a2418', undefined, true)
      toe.scale.set(spec.radius * 0.55, spec.radius * 0.35, spec.radius * 0.45)
      toe.position.set(spec.radius * 1.55, 0.02, spec.radius * tz)
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
    const eye = new THREE.Mesh(GEO.sphere, white)
    eye.position.set(x, y, s * z)
    eye.scale.set(0.052 * scale * 0.95, 0.052 * scale * 1.12, 0.052 * scale * 0.8)
    const pupil = new THREE.Mesh(GEO.fluffy, ink)
    pupil.position.set(x + 0.026 * scale, y - 0.004, s * (z + 0.03 * scale))
    pupil.scale.setScalar(0.026 * scale)
    const hi = new THREE.Mesh(GEO.fluffy, shine)
    hi.position.set(x + 0.018 * scale, y + 0.018 * scale, s * (z + 0.042 * scale))
    hi.scale.setScalar(0.011 * scale)
    g.add(eye, pupil, hi)
  }
  const nose = new THREE.Mesh(GEO.fluffy, ink)
  nose.position.set(x + 0.18 * scale, y - 0.08 * scale, 0)
  nose.scale.set(0.03 * scale * 1.25, 0.03 * scale * 0.85, 0.03 * scale * 0.9)
  g.add(nose)
}

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  tickAction(group, 'walk', moving ? t : 0)
}

function resetPose(group: THREE.Group): void {
  group.rotation.x = 0
  group.rotation.z = 0
  const legs = group.userData.legs as THREE.Group[] | undefined
  legs?.forEach((leg) => {
    leg.rotation.x = 0
    leg.rotation.z = 0
  })
  const flippers = group.userData.flippers as THREE.Group[] | undefined
  flippers?.forEach((f) => {
    f.rotation.x = 0
    f.rotation.z = 0
  })
}

/** 陆地走路/坐下/喝水/休息；海里游泳。陆地动物不会漂起来。 */
export function tickAction(group: THREE.Group, action: WorldAction, t: number): void {
  resetPose(group)
  const marine = Boolean(group.userData.marine)
  const legs = (group.userData.legs as THREE.Group[] | undefined) || []
  const flippers = (group.userData.flippers as THREE.Group[] | undefined) || []
  const tail = group.userData.tail as THREE.Object3D | undefined

  if (marine) {
    const swim = action === 'swim' || action === 'walk'
    if (tail) tail.rotation.y = Math.sin(t * (swim ? 6 : 1.6)) * (swim ? 0.45 : 0.12)
    flippers.forEach((f, i) => {
      f.rotation.x = Math.sin(t * (swim ? 5 : 1.4) + i) * (swim ? 0.35 : 0.08)
    })
    group.rotation.x = swim ? Math.sin(t * 2.2) * 0.12 : 0.04
    return
  }

  if (action === 'walk') {
    legs.forEach((leg, i) => {
      const pair = i === 0 || i === 3 ? 1 : -1
      leg.rotation.z = Math.sin(t * 5.2) * 0.16 * pair
    })
    return
  }
  if (action === 'sit') {
    if (legs[2]) legs[2].rotation.z = 1.15
    if (legs[3]) legs[3].rotation.z = 1.15
    if (legs[0]) legs[0].rotation.z = -0.18
    if (legs[1]) legs[1].rotation.z = -0.18
    group.rotation.x = 0.18
    return
  }
  if (action === 'drink') {
    group.rotation.z = -0.55
    legs.forEach((leg) => {
      leg.rotation.z = 0.12
    })
    return
  }
  if (action === 'rest') {
    group.rotation.z = 1.12
    legs.forEach((leg, i) => {
      leg.rotation.z = i < 2 ? 0.35 : 0.55
    })
    return
  }
  legs.forEach((leg) => {
    leg.rotation.z = 0
  })
}
