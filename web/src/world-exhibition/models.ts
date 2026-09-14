/**
 * 观展动物：按儿童插画搭的圆体积——大亮眼、层状鬃毛、关节腿、蹄爪贴地。
 * 身子用豆形网格，不是拉长的球/胶囊。孩子分区色铺在 UV 皮毛上；眼和鬃毛保持雕塑色。
 */
import * as THREE from 'three'
import type { AnimalId, WorldAction } from '../types'
import { ANIMAL_META, isMarine } from '../types'
import { coatTexture } from './coat'
import { type Ring } from '../silhouettes'

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

const GEO = {
  sphere: new THREE.SphereGeometry(1, 16, 12),
  fluffy: new THREE.SphereGeometry(1, 10, 8),
  fluff: [0, 1, 2, 3, 4, 5].map((seed) => makeFluff(seed)),
  flower: makeFlower(),
  hoof: makeSplitHoof(),
}

function makeFluff(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1)
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const n = 0.72 + 0.38 * hash(seed * 17 + i * 3)
    pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * (0.9 + 0.2 * hash(seed + i)), pos.getZ(i) * n)
  }
  g.computeVertexNormals()
  return g
}

function makeFlower(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const petals = 5
  for (let i = 0; i <= petals * 8; i++) {
    const t = i / (petals * 8)
    const a = t * Math.PI * 2 - Math.PI / 2
    const r = 0.55 + 0.45 * Math.abs(Math.cos(t * petals * Math.PI))
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false, steps: 1, curveSegments: 2 })
  g.center()
  g.computeVertexNormals()
  return g
}

function makeSplitHoof(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-0.9, 0.1)
  shape.lineTo(-0.95, -0.55)
  shape.quadraticCurveTo(-0.45, -1.05, -0.08, -0.2)
  shape.lineTo(0.08, -0.2)
  shape.quadraticCurveTo(0.45, -1.05, 0.95, -0.55)
  shape.lineTo(0.9, 0.1)
  shape.quadraticCurveTo(0, 0.45, -0.9, 0.1)
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false, steps: 1 })
  g.center()
  g.computeVertexNormals()
  return g
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const beanCache = new Map<string, THREE.BufferGeometry>()

/** 一头圆、中间胖的豆形实体。不是 Sphere/Capsule。 */
export function beanGeometry(length: number, height: number, width: number, segs = 16): THREE.BufferGeometry {
  const key = `${length.toFixed(3)}:${height.toFixed(3)}:${width.toFixed(3)}:${segs}`
  const hit = beanCache.get(key)
  if (hit) return hit
  const ring = 14
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const u = t * 2 - 1
    const plump = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 3.2)), 0.34)
    const x = (t - 0.5) * length
    const ry = (height / 2) * Math.max(plump, 0.04)
    const rz = (width / 2) * Math.max(plump, 0.04)
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2
      positions.push(x, Math.sin(a) * ry, Math.cos(a) * rz)
      uvs.push(t, 0.5 + 0.5 * Math.sin(a))
    }
  }
  const cols = ring + 1
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * cols + j
      const b = a + cols
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  beanCache.set(key, geo)
  return geo
}

function toon(color: string, map?: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    map: map ?? null,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    blending: THREE.NormalBlending,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: map ? 0.04 : 0.12,
  })
}

function mesh(geo: THREE.BufferGeometry, color: string, map?: THREE.Texture): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color, map))
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

function volume(
  length: number,
  height: number,
  width: number,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
  x: number,
  y: number,
  z: number,
  map?: THREE.Texture,
): THREE.Mesh {
  const m = part(beanGeometry(length, height, width), region, animal, painted, map)
  m.position.set(x, y, z)
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

function tuftMesh(seed: number, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const m = mesh(GEO.fluff[seed % GEO.fluff.length]!, color)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.rotation.set(hash(seed) * 2, hash(seed + 2) * 3, hash(seed + 4) * 2)
  m.userData.region = 'mane'
  return m
}

function branch(
  points: THREE.Vector3[],
  radius: number,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, radius, radius * 0.82, 0, Math.PI * 2, false, 0)
  const geo = new THREE.ExtrudeGeometry(shape, {
    extrudePath: curve,
    steps: Math.max(8, points.length * 4),
    bevelEnabled: false,
    curveSegments: 8,
  })
  geo.computeVertexNormals()
  return part(geo, region, animal, painted)
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
 * 测试与少量配件仍用；主体改成豆形网格。
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
  g.add(volume(1.12, 0.58, 0.56, 'body', a, painted, 0.02, 0.68, 0, coat))
  g.add(volume(0.78, 0.28, 0.4, 'belly', a, painted, 0.08, 0.5, 0))
  g.add(volume(0.34, 0.28, 0.26, 'neck', a, painted, 0.46, 0.92, 0))
  g.add(volume(0.48, 0.44, 0.42, 'head', a, painted, 0.78, 1.16, 0))
  g.add(volume(0.28, 0.18, 0.2, 'head', a, painted, 1.08, 1.04, 0))

  const earL = volume(0.1, 0.28, 0.12, 'earL', a, painted, 0.66, 1.42, 0.16)
  earL.rotation.z = 0.35
  earL.rotation.x = 0.25
  const earR = volume(0.1, 0.28, 0.12, 'earR', a, painted, 0.66, 1.42, -0.16)
  earR.rotation.z = 0.35
  earR.rotation.x = -0.25
  g.add(earL, earR)
  g.add(volume(0.16, 0.18, 0.12, 'tail', a, painted, -0.56, 0.86, 0))

  const antlers = [
    {
      region: 'antlerL',
      pts: [
        [0.64, 1.4, 0.1],
        [0.58, 1.68, 0.16],
        [0.5, 1.96, 0.14],
      ],
      tines: [
        [
          [0.56, 1.7, 0.16],
          [0.38, 1.9, 0.24],
        ],
        [
          [0.54, 1.82, 0.14],
          [0.7, 2.08, 0.1],
        ],
      ],
    },
    {
      region: 'antlerR',
      pts: [
        [0.64, 1.4, -0.1],
        [0.6, 1.7, -0.16],
        [0.54, 1.98, -0.14],
      ],
      tines: [
        [
          [0.58, 1.72, -0.16],
          [0.74, 2.08, -0.1],
        ],
        [
          [0.56, 1.84, -0.14],
          [0.38, 1.92, -0.24],
        ],
      ],
    },
  ] as const
  for (const side of antlers) {
    g.add(
      branch(
        side.pts.map((p) => new THREE.Vector3(...p)),
        0.032,
        side.region,
        a,
        painted,
      ),
    )
    for (const tine of side.tines) {
      g.add(
        branch(
          tine.map((p) => new THREE.Vector3(...p)),
          0.024,
          side.region,
          a,
          painted,
        ),
      )
    }
  }

  const flowers: [string, number, number, number, number][] = [
    ['spot1', 0.18, 0.78, 0.26, 0.11],
    ['spot2', -0.12, 0.84, 0.24, 0.1],
    ['spot3', 0.04, 0.62, 0.22, 0.09],
    ['spot1', -0.28, 0.68, 0.2, 0.085],
    ['spot2', 0.32, 0.64, 0.18, 0.08],
    ['spot3', -0.08, 0.54, 0.16, 0.075],
  ]
  for (const [name, x, y, z, s] of flowers) {
    for (const side of [1, -1]) {
      const blossom = part(GEO.flower, name, a, painted)
      blossom.position.set(x, y, side * z)
      blossom.scale.setScalar(s)
      blossom.rotation.y = side > 0 ? 0 : Math.PI
      g.add(blossom)
    }
  }

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.34, z: 0.26, hipY: 0.5, radius: 0.09, foot: 'hoof' },
    { name: 'legFR', x: 0.34, z: -0.26, hipY: 0.5, radius: 0.09, foot: 'hoof' },
    { name: 'legBL', x: -0.32, z: 0.28, hipY: 0.52, radius: 0.1, foot: 'hoof' },
    { name: 'legBR', x: -0.32, z: -0.28, hipY: 0.52, radius: 0.1, foot: 'hoof' },
  ])
  cartoonFace(g, { x: 0.96, y: 1.18, z: 0.16, scale: 1.15, iris: '#5b3318', look: 0.42 })
  g.userData.legs = legs
  return g
}

function tiger(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  g.add(volume(1.18, 0.56, 0.58, 'body', a, painted, 0.02, 0.62, 0, coat))
  g.add(volume(0.82, 0.28, 0.42, 'belly', a, painted, 0.08, 0.44, 0))
  g.add(volume(0.56, 0.52, 0.52, 'head', a, painted, 0.72, 1.02, 0))
  g.add(volume(0.32, 0.22, 0.3, 'muzzle', a, painted, 1.08, 0.86, 0))
  g.add(volume(0.16, 0.16, 0.18, 'muzzle', a, painted, 1.02, 0.88, 0.14))
  g.add(volume(0.16, 0.16, 0.18, 'muzzle', a, painted, 1.02, 0.88, -0.14))

  const earL = volume(0.12, 0.2, 0.1, 'earL', a, painted, 0.58, 1.32, 0.2)
  const earR = volume(0.12, 0.2, 0.1, 'earR', a, painted, 0.58, 1.32, -0.2)
  g.add(earL, earR)
  g.add(volume(0.06, 0.1, 0.05, 'innerL', a, painted, 0.62, 1.3, 0.22))
  g.add(volume(0.06, 0.1, 0.05, 'innerR', a, painted, 0.62, 1.3, -0.22))

  const tail = new THREE.Group()
  tail.add(volume(0.7, 0.12, 0.12, 'tail', a, painted, -0.86, 0.72, 0))
  const tip = volume(0.22, 0.12, 0.12, 'tail', a, painted, -1.28, 0.52, 0)
  tip.rotation.z = 0.7
  tail.add(tip)
  g.add(tail)
  g.userData.tail = tail

  const stripe = '#3a2210'
  for (const [x, y, sy, z] of [
    [0.28, 0.74, 0.16, 0.27],
    [0.08, 0.78, 0.18, 0.27],
    [-0.12, 0.76, 0.16, 0.26],
    [-0.32, 0.7, 0.14, 0.25],
    [0.18, 0.54, 0.1, 0.24],
    [-0.2, 0.52, 0.1, 0.24],
  ] as const) {
    for (const side of [1, -1]) {
      const band = mesh(beanGeometry(0.07, sy * 2, 0.08), stripe)
      band.position.set(x, y, side * z)
      g.add(band)
    }
  }
  for (const [x, y, z, sy] of [
    [0.78, 1.08, 0.24, 0.12],
    [0.64, 1.1, 0.26, 0.12],
    [0.86, 1.22, 0.08, 0.1],
  ] as const) {
    for (const side of z === 0.08 ? [1, -1] : [1, -1]) {
      const mark = mesh(beanGeometry(0.05, sy * 2, 0.06), stripe)
      mark.position.set(x, y, side * z)
      g.add(mark)
    }
  }

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.36, z: 0.28, hipY: 0.46, radius: 0.11, foot: 'paw' },
    { name: 'legFR', x: 0.36, z: -0.28, hipY: 0.46, radius: 0.11, foot: 'paw' },
    { name: 'legBL', x: -0.32, z: 0.3, hipY: 0.48, radius: 0.12, foot: 'paw' },
    { name: 'legBR', x: -0.32, z: -0.3, hipY: 0.48, radius: 0.12, foot: 'paw' },
  ])
  cartoonFace(g, { x: 0.92, y: 1.06, z: 0.18, scale: 1.22, iris: '#7a3b12', look: 0.38 })
  g.userData.legs = legs
  return g
}

function lion(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  g.add(volume(1.02, 0.54, 0.56, 'body', a, painted, 0.0, 0.6, 0, coat))
  g.add(volume(0.72, 0.26, 0.4, 'belly', a, painted, 0.06, 0.42, 0))

  const mane = new THREE.Group()
  mane.userData.region = 'mane'
  const maneColor = colorOf(a, 'mane', painted)
  const inner = new THREE.Color(maneColor).multiplyScalar(0.82).getStyle()
  const cx = 0.54
  const cy = 0.98
  const n = 28
  for (let i = 0; i < n; i++) {
    const golden = Math.PI * (3 - Math.sqrt(5))
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    const dirx = Math.cos(theta) * r
    const diry = y
    const dirz = Math.sin(theta) * r
    if (dirx > 0.62 && Math.abs(dirz) < 0.42 && Math.abs(diry) < 0.38) continue
    const rad = 0.4 + 0.16 * hash(i + 9)
    const sx = 0.16 + 0.07 * hash(i)
    const sy = 0.18 + 0.08 * hash(i + 3)
    const sz = 0.16 + 0.07 * hash(i + 5)
    mane.add(tuftMesh(i, i % 2 ? maneColor : inner, cx + dirx * rad, cy + diry * rad * 0.95, dirz * rad, sx, sy, sz))
  }
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2
    const rad = 0.46
    mane.add(
      tuftMesh(
        i + 40,
        maneColor,
        cx + Math.cos(a0) * 0.12 + 0.08,
        cy + Math.sin(a0) * rad * 0.55,
        Math.sin(a0 * 1.3) * rad * 0.7,
        0.2,
        0.22,
        0.18,
      ),
    )
  }
  for (const [x, y, z, s] of [
    [0.38, 0.72, 0.22, 0.18],
    [0.38, 0.72, -0.22, 0.18],
    [0.28, 0.86, 0.12, 0.16],
    [0.28, 0.86, -0.12, 0.16],
    [0.48, 1.36, 0, 0.2],
  ] as const) {
    mane.add(tuftMesh(Math.round(x * 20 + z * 8), inner, x, y, z, s, s * 1.1, s))
  }
  g.add(mane)

  g.add(volume(0.5, 0.46, 0.46, 'head', a, painted, 0.72, 0.98, 0))
  g.add(volume(0.28, 0.2, 0.28, 'muzzle', a, painted, 1.02, 0.84, 0))
  g.add(volume(0.14, 0.14, 0.16, 'muzzle', a, painted, 0.96, 0.86, 0.12))
  g.add(volume(0.14, 0.14, 0.16, 'muzzle', a, painted, 0.96, 0.86, -0.12))
  const earL = volume(0.1, 0.16, 0.08, 'earL', a, painted, 0.6, 1.3, 0.16)
  const earR = volume(0.1, 0.16, 0.08, 'earR', a, painted, 0.6, 1.3, -0.16)
  g.add(earL, earR)

  const tail = new THREE.Group()
  tail.add(volume(0.62, 0.08, 0.08, 'tail', a, painted, -0.78, 0.68, 0))
  const tuft = tuftMesh(21, colorOf(a, 'tuft', painted), -1.16, 0.5, 0, 0.14, 0.14, 0.14)
  tuft.userData.region = 'tuft'
  tail.add(tuft)
  g.add(tail)
  g.userData.tail = tail

  const legs = placeLegs(g, a, painted, [
    { name: 'legFL', x: 0.32, z: 0.26, hipY: 0.46, radius: 0.11, foot: 'paw' },
    { name: 'legFR', x: 0.32, z: -0.26, hipY: 0.46, radius: 0.11, foot: 'paw' },
    { name: 'legBL', x: -0.28, z: 0.28, hipY: 0.48, radius: 0.12, foot: 'paw' },
    { name: 'legBR', x: -0.28, z: -0.28, hipY: 0.48, radius: 0.12, foot: 'paw' },
  ])
  cartoonFace(g, { x: 0.9, y: 1.02, z: 0.17, scale: 1.28, iris: '#8a4a16', look: 0.4 })
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
  cartoonFace(g, { x: 0.78, y: 0.58, z: 0.14, scale: 0.72, iris: '#1e3a8a', look: 0.2 })
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
  cartoonFace(g, { x: 0.82, y: 0.52, z: 0.12, scale: 0.62, iris: '#1a3a16', look: 0.18 })
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
  cartoonFace(g, { x: 0.72, y: 0.54, z: 0.14, scale: 0.68, iris: '#1e293b', look: 0.2 })
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

/** 髋-膝-踝的实心腿：豆形大腿和小腿，蹄/爪贴地。 */
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
    const footH = spec.foot === 'hoof' ? 0.06 : 0.055
    const thighLen = spec.hipY * 0.48
    const shinLen = Math.max(0.12, spec.hipY - thighLen - footH)

    const thigh = part(beanGeometry(spec.radius * 2.1, thighLen * 1.15, spec.radius * 2.05), spec.name, animal, painted)
    thigh.rotation.z = Math.PI / 2
    thigh.position.y = -thighLen * 0.48
    hip.add(thigh)

    const kneeCap = part(beanGeometry(spec.radius * 1.9, spec.radius * 1.5, spec.radius * 1.9), spec.name, animal, painted)
    kneeCap.position.y = -thighLen
    hip.add(kneeCap)

    const knee = new THREE.Group()
    knee.position.y = -thighLen
    hip.add(knee)
    const shin = part(beanGeometry(spec.radius * 1.7, shinLen * 1.1, spec.radius * 1.65), spec.name, animal, painted)
    shin.rotation.z = Math.PI / 2
    shin.position.y = -shinLen * 0.46
    knee.add(shin)

    const ankle = new THREE.Group()
    ankle.position.y = -shinLen
    knee.add(ankle)
    ankle.add(makeFoot(spec, animal, painted, footH))

    hip.userData.knee = knee
    hip.userData.ankle = ankle
    g.add(hip)
    legs.push(hip)
  }
  return legs
}

function makeFoot(spec: LegSpec, animal: AnimalId, painted: Record<string, string>, footH: number): THREE.Group {
  const f = new THREE.Group()
  f.position.y = -footH
  if (spec.foot === 'hoof') {
    const hoof = mesh(GEO.hoof, '#3a2418')
    hoof.scale.set(spec.radius * 1.05, spec.radius * 0.9, spec.radius * 0.7)
    hoof.rotation.x = Math.PI / 2
    hoof.position.set(0.04, 0.04, 0)
    f.add(hoof)
  } else {
    const pad = part(beanGeometry(spec.radius * 3.2, spec.radius * 1.15, spec.radius * 2.6), spec.name, animal, painted)
    pad.position.set(0.06, 0.04, 0)
    f.add(pad)
    for (const tz of [-0.7, 0, 0.7]) {
      const toe = mesh(beanGeometry(spec.radius * 1.1, spec.radius * 0.7, spec.radius * 0.8), '#3a2418')
      toe.position.set(spec.radius * 1.55, 0.03, spec.radius * tz)
      f.add(toe)
    }
  }
  return f
}

type FaceSpec = { x: number; y: number; z: number; scale: number; iris: string; look: number }

/** 大亮眼 + 虹膜 + 高光 + 圆鼻子，侧脸也能看出是卡通动物。 */
function cartoonFace(g: THREE.Group, spec: FaceSpec): void {
  const { x, y, z, scale, iris, look } = spec
  const whiteMat = new THREE.MeshLambertMaterial({
    color: '#fff8ee',
    emissive: '#fff4e4',
    emissiveIntensity: 0.18,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  })
  const irisMat = new THREE.MeshLambertMaterial({
    color: iris,
    emissive: iris,
    emissiveIntensity: 0.12,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  })
  const ink = new THREE.MeshBasicMaterial({ color: '#1a120c' })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  const eyes: THREE.Group[] = []
  for (const s of [-1, 1]) {
    const eye = new THREE.Group()
    eye.position.set(x, y, s * z)
    eye.rotation.y = s * look
    const white = new THREE.Mesh(GEO.sphere, whiteMat)
    white.scale.set(0.1 * scale, 0.12 * scale, 0.08 * scale)
    const irisMesh = new THREE.Mesh(GEO.sphere, irisMat)
    irisMesh.position.set(0.042 * scale, -0.006 * scale, 0)
    irisMesh.scale.setScalar(0.068 * scale)
    const pupil = new THREE.Mesh(GEO.sphere, ink)
    pupil.position.set(0.062 * scale, -0.008 * scale, 0)
    pupil.scale.set(0.032 * scale, 0.04 * scale, 0.032 * scale)
    const hi = new THREE.Mesh(GEO.sphere, shine)
    hi.position.set(0.05 * scale, 0.034 * scale, 0.02 * scale)
    hi.scale.setScalar(0.028 * scale)
    const hi2 = new THREE.Mesh(GEO.sphere, shine)
    hi2.position.set(0.07 * scale, -0.01 * scale, -0.016 * scale)
    hi2.scale.setScalar(0.012 * scale)
    eye.add(white, irisMesh, pupil, hi, hi2)
    g.add(eye)
    eyes.push(eye)
  }
  const nose = new THREE.Mesh(GEO.sphere, ink)
  nose.position.set(x + 0.2 * scale, y - 0.14 * scale, 0)
  nose.scale.set(0.038 * scale * 1.3, 0.028 * scale, 0.032 * scale)
  g.add(nose)
  const smile = mesh(beanGeometry(0.12 * scale, 0.018 * scale, 0.016 * scale), '#1a120c')
  smile.position.set(x + 0.18 * scale, y - 0.2 * scale, 0)
  smile.rotation.z = 0.15
  g.add(smile)
  g.userData.eyes = eyes
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
    const knee = leg.userData.knee as THREE.Group | undefined
    if (knee) knee.rotation.z = 0
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
      const swing = Math.sin(t * 5.2) * 0.18 * pair
      leg.rotation.z = swing
      const knee = leg.userData.knee as THREE.Group | undefined
      if (knee) knee.rotation.z = Math.abs(swing) * 0.4
    })
    return
  }
  if (action === 'sit') {
    if (legs[2]) {
      legs[2].rotation.z = 0.9
      if (legs[2].userData.knee) (legs[2].userData.knee as THREE.Group).rotation.z = 0.85
    }
    if (legs[3]) {
      legs[3].rotation.z = 0.9
      if (legs[3].userData.knee) (legs[3].userData.knee as THREE.Group).rotation.z = 0.85
    }
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
