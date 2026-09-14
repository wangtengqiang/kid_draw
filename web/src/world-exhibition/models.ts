/**
 * 观展动物：侧影挤出 + 管状四肢/鹿角，不是圆球圆锥。
 * 孩子的分区色作为皮毛贴图铺在身体上。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'
import { coatTexture } from './coat'

const RAMP = makeRamp()

function makeRamp(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 1
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#7a7a7a'
    ctx.fillRect(1, 0, 1, 1)
    ctx.fillStyle = '#bcbcbc'
    ctx.fillRect(2, 0, 1, 1)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(3, 0, 1, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  return tex
}

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

function toon(color: string, map?: THREE.Texture): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: RAMP,
    map: map ?? null,
  })
  return mat
}

function mesh(geo: THREE.BufferGeometry, color: string, map?: THREE.Texture): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color, map))
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function outline(geo: THREE.BufferGeometry, inflate = 1.045): THREE.Mesh {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: '#1a140c', side: THREE.BackSide }),
  )
  m.scale.setScalar(inflate)
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

function ring(pts: [number, number][]): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i]![0], pts[i]![1])
  s.closePath()
  return s
}

function extrude(pts: [number, number][], depth: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(ring(pts), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: depth * 0.12,
    bevelSegments: 2,
    curveSegments: 8,
  })
}

function tube(pts: THREE.Vector3[], radius: number): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, 10, radius, 8, false)
}

function addPair(g: THREE.Group, meshA: THREE.Mesh, geo: THREE.BufferGeometry, inflate?: number): void {
  g.add(meshA)
  g.add(outline(geo, inflate))
}

export function createAnimalModel(
  animal: AnimalId,
  painted: Record<string, string>,
  thumb?: string,
): THREE.Group {
  const coat = coatTexture(animal, painted, thumb)
  const inner = animal === 'deer' ? deer(painted, coat) : animal === 'tiger' ? tiger(painted, coat) : lion(painted, coat)
  inner.rotation.y = -Math.PI / 2
  const g = new THREE.Group()
  g.add(inner)
  g.userData.kind = animal
  g.userData.coat = coat
  g.userData.legs = inner.userData.legs
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
      if (mat instanceof THREE.MeshToonMaterial && !mat.map) {
        mat.color.set(colorOf(animal, obj.userData.region, painted))
      }
    }
  })
}

function deer(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'deer'
  const bodyGeo = extrude(
    [
      [0.58, 0.9],
      [0.42, 1.1],
      [0.12, 1.14],
      [-0.22, 1.1],
      [-0.5, 1.0],
      [-0.62, 0.78],
      [-0.54, 0.56],
      [-0.22, 0.48],
      [0.22, 0.46],
      [0.55, 0.52],
      [0.68, 0.66],
      [0.7, 0.8],
    ],
    0.32,
  )
  addPair(g, part(bodyGeo, 'body', a, painted, coat), bodyGeo, 1.03)

  const bellyGeo = extrude(
    [
      [-0.2, 0.5],
      [0.28, 0.48],
      [0.42, 0.58],
      [0.2, 0.7],
      [-0.12, 0.7],
    ],
    0.22,
  )
  addPair(g, part(bellyGeo, 'belly', a, painted), bellyGeo)

  const neckGeo = extrude(
    [
      [0.5, 0.92],
      [0.68, 1.16],
      [0.8, 1.32],
      [0.74, 1.4],
      [0.58, 1.18],
      [0.46, 0.98],
    ],
    0.18,
  )
  addPair(g, part(neckGeo, 'neck', a, painted, coat), neckGeo, 1.04)

  const headGeo = extrude(
    [
      [0.76, 1.3],
      [0.74, 1.48],
      [0.88, 1.46],
      [1.08, 1.34],
      [1.14, 1.26],
      [1.04, 1.18],
      [0.88, 1.2],
      [0.76, 1.24],
    ],
    0.2,
  )
  addPair(g, part(headGeo, 'head', a, painted, coat), headGeo, 1.04)

  for (const [name, z] of [
    ['earL', 0.08],
    ['earR', -0.08],
  ] as const) {
    const earGeo = extrude(
      [
        [0.78, 1.46],
        [0.74, 1.62],
        [0.82, 1.58],
        [0.86, 1.46],
      ],
      0.04,
    )
    const ear = part(earGeo, name, a, painted)
    ear.position.z = z
    g.add(ear)
  }

  const antlerL = [
    new THREE.Vector3(0.78, 1.48, 0.06),
    new THREE.Vector3(0.7, 1.72, 0.08),
    new THREE.Vector3(0.64, 1.96, 0.05),
  ]
  const antlerR = [
    new THREE.Vector3(0.8, 1.48, -0.06),
    new THREE.Vector3(0.74, 1.74, -0.09),
    new THREE.Vector3(0.7, 1.98, -0.05),
  ]
  const tineL = [
    new THREE.Vector3(0.72, 1.68, 0.08),
    new THREE.Vector3(0.58, 1.82, 0.12),
    new THREE.Vector3(0.52, 1.9, 0.1),
  ]
  const tineR = [
    new THREE.Vector3(0.76, 1.7, -0.08),
    new THREE.Vector3(0.62, 1.86, -0.12),
    new THREE.Vector3(0.56, 1.94, -0.1),
  ]
  for (const [name, pts] of [
    ['antlerL', antlerL],
    ['antlerL', tineL],
    ['antlerR', antlerR],
    ['antlerR', tineR],
  ] as const) {
    const geo = tube(pts, 0.028)
    addPair(g, part(geo, name, a, painted), geo, 1.12)
  }

  const legs: THREE.Group[] = []
  const legSpecs: [string, number, number, number][] = [
    ['legFL', 0.48, 0.06, 0.12],
    ['legFR', 0.52, -0.06, -0.02],
    ['legBL', -0.38, 0.07, -0.08],
    ['legBR', -0.32, -0.07, 0.1],
  ]
  for (const [name, x, z, kick] of legSpecs) {
    const hip = new THREE.Group()
    hip.position.set(x, 0.52, z)
    const geo = tube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(kick * 0.4, -0.28, 0), new THREE.Vector3(kick, -0.5, 0)],
      0.038,
    )
    const m = part(geo, name, a, painted)
    hip.add(m, outline(geo, 1.1))
    const hoofGeo = new THREE.SphereGeometry(0.045, 8, 6)
    const hoof = mesh(hoofGeo, '#3a2418')
    hoof.scale.set(1, 0.55, 1.2)
    hoof.position.set(kick, -0.52, 0)
    hip.add(hoof)
    g.add(hip)
    legs.push(hip)
  }

  const tailGeo = tube(
    [new THREE.Vector3(-0.6, 0.82, 0), new THREE.Vector3(-0.72, 0.9, 0), new THREE.Vector3(-0.78, 0.82, 0)],
    0.035,
  )
  addPair(g, part(tailGeo, 'tail', a, painted), tailGeo)

  for (const [name, x, y] of [
    ['spot1', 0.1, 0.92],
    ['spot2', -0.12, 1.0],
    ['spot3', 0.28, 0.86],
  ] as const) {
    const s = part(new THREE.SphereGeometry(0.05, 8, 8), name, a, painted)
    s.position.set(x, y, 0.16)
    g.add(s)
  }

  addFace(g, 0.98, 1.34, 0.12)
  g.userData.legs = legs
  return g
}

function tiger(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  const bodyGeo = extrude(
    [
      [0.72, 0.72],
      [0.55, 0.88],
      [0.1, 0.92],
      [-0.4, 0.88],
      [-0.72, 0.78],
      [-0.8, 0.58],
      [-0.62, 0.42],
      [-0.1, 0.38],
      [0.5, 0.4],
      [0.78, 0.5],
      [0.82, 0.62],
    ],
    0.38,
  )
  addPair(g, part(bodyGeo, 'body', a, painted, coat), bodyGeo, 1.03)

  const bellyGeo = extrude(
    [
      [-0.4, 0.42],
      [0.45, 0.4],
      [0.55, 0.52],
      [0.2, 0.64],
      [-0.28, 0.64],
    ],
    0.26,
  )
  addPair(g, part(bellyGeo, 'belly', a, painted), bellyGeo)

  const headGeo = extrude(
    [
      [0.78, 0.7],
      [0.76, 1.08],
      [0.92, 1.16],
      [1.12, 1.08],
      [1.2, 0.9],
      [1.14, 0.72],
      [0.96, 0.64],
      [0.8, 0.64],
    ],
    0.34,
  )
  addPair(g, part(headGeo, 'head', a, painted, coat), headGeo, 1.035)

  const muzzleGeo = extrude(
    [
      [1.08, 0.78],
      [1.18, 0.88],
      [1.32, 0.82],
      [1.3, 0.72],
      [1.16, 0.68],
    ],
    0.22,
  )
  addPair(g, part(muzzleGeo, 'muzzle', a, painted), muzzleGeo)

  for (const [name, inner, z] of [
    ['earL', 'innerL', 0.12],
    ['earR', 'innerR', -0.12],
  ] as const) {
    const earGeo = extrude(
      [
        [0.86, 1.08],
        [0.82, 1.28],
        [0.96, 1.26],
        [0.98, 1.1],
      ],
      0.05,
    )
    const ear = part(earGeo, name, a, painted)
    ear.position.z = z
    g.add(ear)
    const inn = part(new THREE.SphereGeometry(0.04, 8, 6), inner, a, painted)
    inn.position.set(0.9, 1.18, z + 0.03)
    g.add(inn)
  }

  const stripeColor = darken(colorOf(a, 'body', painted), 0.45)
  for (let i = 0; i < 6; i++) {
    const x = -0.5 + i * 0.2
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.42, 0.42),
      toon(stripeColor),
    )
    stripe.position.set(x, 0.68, 0)
    stripe.rotation.z = 0.15 * (i % 2 ? 1 : -1)
    stripe.userData.region = 'body'
    g.add(stripe)
  }

  const legs: THREE.Group[] = []
  const spec: [string, number, number, number][] = [
    ['legFL', 0.52, 0.12, 0.1],
    ['legFR', 0.56, -0.12, -0.04],
    ['legBL', -0.48, 0.12, -0.06],
    ['legBR', -0.42, -0.12, 0.12],
  ]
  for (const [name, x, z, kick] of spec) {
    const hip = new THREE.Group()
    hip.position.set(x, 0.42, z)
    const geo = tube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(kick * 0.3, -0.2, 0), new THREE.Vector3(kick, -0.4, 0)],
      0.055,
    )
    hip.add(part(geo, name, a, painted), outline(geo, 1.08))
    const paw = mesh(new THREE.SphereGeometry(0.06, 8, 6), colorOf(a, name, painted))
    paw.scale.set(1.2, 0.5, 1)
    paw.position.set(kick, -0.42, 0)
    hip.add(paw)
    g.add(hip)
    legs.push(hip)
  }

  const tailGeo = tube(
    [
      new THREE.Vector3(-0.72, 0.7, 0),
      new THREE.Vector3(-0.95, 0.9, 0.05),
      new THREE.Vector3(-1.15, 0.72, 0),
      new THREE.Vector3(-1.22, 0.52, -0.04),
    ],
    0.04,
  )
  addPair(g, part(tailGeo, 'tail', a, painted), tailGeo)

  addFace(g, 1.04, 0.96, 0.16)
  g.userData.legs = legs
  return g
}

function lion(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  const bodyGeo = extrude(
    [
      [0.62, 0.74],
      [0.42, 0.9],
      [0.05, 0.94],
      [-0.38, 0.9],
      [-0.68, 0.8],
      [-0.74, 0.58],
      [-0.55, 0.42],
      [-0.05, 0.4],
      [0.42, 0.42],
      [0.7, 0.52],
      [0.74, 0.64],
    ],
    0.4,
  )
  addPair(g, part(bodyGeo, 'body', a, painted, coat), bodyGeo, 1.03)

  const bellyGeo = extrude(
    [
      [-0.35, 0.44],
      [0.38, 0.42],
      [0.48, 0.54],
      [0.12, 0.66],
      [-0.22, 0.66],
    ],
    0.26,
  )
  addPair(g, part(bellyGeo, 'belly', a, painted), bellyGeo)

  const manePts: [number, number][] = []
  for (let i = 0; i <= 16; i++) {
    const ang = (i / 16) * Math.PI * 2
    const r = 0.52 + (i % 2 === 0 ? 0.14 : 0)
    manePts.push([0.82 + Math.cos(ang) * r * 0.35, 0.92 + Math.sin(ang) * r])
  }
  const maneGeo = extrude(manePts, 0.36)
  addPair(g, part(maneGeo, 'mane', a, painted), maneGeo, 1.02)

  const headGeo = extrude(
    [
      [0.7, 0.78],
      [0.68, 1.1],
      [0.84, 1.18],
      [1.02, 1.1],
      [1.1, 0.92],
      [1.04, 0.76],
      [0.86, 0.7],
      [0.72, 0.72],
    ],
    0.28,
  )
  addPair(g, part(headGeo, 'head', a, painted, coat), headGeo)

  const muzzleGeo = extrude(
    [
      [0.98, 0.8],
      [1.08, 0.9],
      [1.22, 0.84],
      [1.2, 0.74],
      [1.06, 0.7],
    ],
    0.2,
  )
  addPair(g, part(muzzleGeo, 'muzzle', a, painted), muzzleGeo)

  for (const [name, z] of [
    ['earL', 0.12],
    ['earR', -0.12],
  ] as const) {
    const earGeo = extrude(
      [
        [0.78, 1.1],
        [0.76, 1.24],
        [0.88, 1.22],
        [0.88, 1.1],
      ],
      0.04,
    )
    const ear = part(earGeo, name, a, painted)
    ear.position.z = z
    g.add(ear)
  }

  const legs: THREE.Group[] = []
  const spec: [string, number, number, number][] = [
    ['legFL', 0.46, 0.13, 0.08],
    ['legFR', 0.5, -0.13, -0.03],
    ['legBL', -0.42, 0.13, -0.05],
    ['legBR', -0.36, -0.13, 0.1],
  ]
  for (const [name, x, z, kick] of spec) {
    const hip = new THREE.Group()
    hip.position.set(x, 0.44, z)
    const geo = tube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(kick * 0.3, -0.2, 0), new THREE.Vector3(kick, -0.42, 0)],
      0.058,
    )
    hip.add(part(geo, name, a, painted), outline(geo, 1.08))
    const paw = mesh(new THREE.SphereGeometry(0.065, 8, 6), colorOf(a, name, painted))
    paw.scale.set(1.2, 0.5, 1)
    paw.position.set(kick, -0.44, 0)
    hip.add(paw)
    g.add(hip)
    legs.push(hip)
  }

  const tailGeo = tube(
    [
      new THREE.Vector3(-0.68, 0.72, 0),
      new THREE.Vector3(-0.9, 0.88, 0.04),
      new THREE.Vector3(-1.08, 0.7, 0),
    ],
    0.035,
  )
  addPair(g, part(tailGeo, 'tail', a, painted), tailGeo)
  const tuftGeo = extrude(
    [
      [-1.02, 0.62],
      [-1.12, 0.72],
      [-1.2, 0.64],
      [-1.1, 0.54],
    ],
    0.08,
  )
  addPair(g, part(tuftGeo, 'tuft', a, painted), tuftGeo)

  addFace(g, 0.92, 0.98, 0.14)
  g.userData.legs = legs
  return g
}

function addFace(g: THREE.Group, x: number, y: number, zSpread: number): void {
  const white = new THREE.MeshLambertMaterial({ color: '#fff8ee' })
  const ink = new THREE.MeshLambertMaterial({ color: '#1a120c' })
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), white)
    w.position.set(x, y, s * zSpread)
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), ink)
    p.position.set(x + 0.03, y, s * zSpread)
    g.add(w, p)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), ink)
  nose.position.set(x + 0.16, y - 0.08, 0)
  g.add(nose)
}

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const mix = (c: number) =>
    Math.max(0, Math.round(c * (1 - amount)))
      .toString(16)
      .padStart(2, '0')
  return `#${mix(parseInt(n.slice(0, 2), 16))}${mix(parseInt(n.slice(2, 4), 16))}${mix(parseInt(n.slice(4, 6), 16))}`
}

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  const legs = group.userData.legs as THREE.Group[] | undefined
  if (!legs) return
  const amp = moving ? 0.38 : 0.06
  legs.forEach((leg, i) => {
    const dir = i % 2 === 0 ? 1 : -1
    leg.rotation.z = Math.sin(t * 6 + i) * amp * dir
  })
  group.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.03 : 0
}
