/**
 * 观展动物：可认出的行走侧影体积（有胸宽、四肢、鹿角 / 虎纹 / 狮鬣），
 * 不是圆球圆锥，也不是薄片。孩子分区色铺在 UV 皮毛上。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'
import { coatTexture } from './coat'
import {
  DEER_ANTLER_L_BEAM,
  DEER_ANTLER_R_BEAM,
  DEER_BELLY,
  DEER_BODY,
  DEER_EAR_L,
  DEER_EAR_R,
  DEER_TAIL,
  LION_BELLY,
  LION_BODY,
  LION_EAR_L,
  LION_EAR_R,
  LION_HEAD,
  LION_MANE,
  LION_MUZZLE,
  LION_TUFT,
  TIGER_BELLY,
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

function toon(color: string, map?: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    map: map ?? null,
    side: THREE.DoubleSide,
  })
}

function mesh(geo: THREE.BufferGeometry, color: string, map?: THREE.Texture): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color, map))
  m.castShadow = true
  m.receiveShadow = true
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

function smoothRing(pts: Ring, count = 56): THREE.Vector2[] {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'catmullrom',
    0.12,
  )
  return curve.getSpacedPoints(count).map((p) => new THREE.Vector2(p.x, p.y))
}

/**
 * 侧影挤成有厚度的身子：侧面是真轮廓，侧面切片往中心收，正面能看见胸宽，不是薄板。
 */
export function profileVolume(
  pts: Ring,
  halfW: number,
  widthAt: (x: number, y: number) => number = () => 1,
  slices = 8,
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
    const pull = 0.2 * (1 - round)
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
    indices.push(a, b, c)
    indices.push(back + a, back + c, back + b)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function tube(pts: THREE.Vector3[], radius: number, tubular = 12): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), tubular, radius, 8, false)
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
  const bodyGeo = profileVolume(DEER_BODY, 0.2, (x, y) => {
    if (x > 0.95) return 0.42
    if (x > 0.7 && y > 1.05) return 0.5
    if (x > 0.48 && y > 1.05) return 0.62
    return 1
  })
  addBody(g, part(bodyGeo, 'body', a, painted, coat))
  addInk(g, DEER_BODY, 0.012)

  addBody(g, part(profileVolume(DEER_BELLY, 0.12), 'belly', a, painted))
  addBody(g, part(profileVolume(DEER_EAR_L, 0.03), 'earL', a, painted))
  addBody(g, part(profileVolume(DEER_EAR_R, 0.03), 'earR', a, painted))
  addBody(g, part(profileVolume(DEER_TAIL, 0.04), 'tail', a, painted))

  const antlerPts = (rings: Ring[], zSign: number): THREE.Vector3[][] =>
    rings.map((ring) => ring.map(([x, y]) => new THREE.Vector3(x, y, zSign * 0.06)))
  for (const chain of antlerPts(DEER_ANTLER_L_BEAM, 1)) {
    g.add(part(tube(chain, 0.016, 14), 'antlerL', a, painted))
  }
  for (const chain of antlerPts(DEER_ANTLER_R_BEAM, -1)) {
    g.add(part(tube(chain, 0.016, 14), 'antlerR', a, painted))
  }

  const legs = placeLegs(g, a, painted, [
    ['legFL', 0.42, 0.09, 0.58, 0.024, [0.08, -0.28, 0.16]],
    ['legFR', 0.46, -0.09, 0.58, 0.024, [0.02, -0.26, 0.08]],
    ['legBL', -0.4, 0.1, 0.6, 0.03, [-0.06, -0.22, -0.16, 0.06]],
    ['legBR', -0.34, -0.1, 0.6, 0.03, [0.04, -0.2, -0.1, 0.12]],
  ])
  addSideEyes(g, 1.02, 1.38, 0.1)
  g.userData.legs = legs
  return g
}

function tiger(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  const bodyGeo = profileVolume(TIGER_BODY, 0.28, (x) => (x < -0.5 ? 0.85 : 1))
  addBody(g, part(bodyGeo, 'body', a, painted, coat))
  addInk(g, TIGER_BODY, 0.014)
  addBody(g, part(profileVolume(TIGER_BELLY, 0.18), 'belly', a, painted))

  const headGeo = profileVolume(TIGER_HEAD, 0.22, (x) => (x > 1.05 ? 0.7 : 1))
  addBody(g, part(headGeo, 'head', a, painted, coat))
  addInk(g, TIGER_HEAD, 0.01)
  addBody(g, part(profileVolume(TIGER_MUZZLE, 0.14), 'muzzle', a, painted))
  addBody(g, part(profileVolume(TIGER_EAR_L, 0.04), 'earL', a, painted))
  addBody(g, part(profileVolume(TIGER_EAR_R, 0.04), 'earR', a, painted))
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
      new THREE.Vector3(-1.0, 0.92, 0.06),
      new THREE.Vector3(-1.22, 0.7, 0),
      new THREE.Vector3(-1.28, 0.42, -0.04),
    ],
    0.042,
    16,
  )
  g.add(part(tailGeo, 'tail', a, painted))

  const legs = placeLegs(g, a, painted, [
    ['legFL', 0.5, 0.14, 0.44, 0.05, [0.1, -0.22, 0.12]],
    ['legFR', 0.54, -0.14, 0.44, 0.05, [0.02, -0.2, 0.06]],
    ['legBL', -0.5, 0.14, 0.48, 0.055, [-0.04, -0.18, -0.08, 0.08]],
    ['legBR', -0.44, -0.14, 0.48, 0.055, [0.06, -0.16, -0.04, 0.12]],
  ])
  addSideEyes(g, 1.02, 0.98, 0.18)
  g.userData.legs = legs
  return g
}

function lion(painted: Record<string, string>, coat: THREE.Texture): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  addBody(g, part(profileVolume(LION_BODY, 0.26), 'body', a, painted, coat))
  addInk(g, LION_BODY, 0.014)
  addBody(g, part(profileVolume(LION_BELLY, 0.16), 'belly', a, painted))

  const manePts: THREE.Vector2[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const ang = t * Math.PI
    const scallop = 1 + 0.1 * Math.sin(t * Math.PI * 9)
    const r = (0.16 + Math.sin(ang) * 0.4) * scallop
    manePts.push(new THREE.Vector2(Math.max(0.1, r), 0.58 + (1 - Math.cos(ang)) * 0.46))
  }
  const maneLathe = new THREE.LatheGeometry(manePts, 28)
  const mane = part(maneLathe, 'mane', a, painted)
  mane.position.x = 0.62
  addBody(g, mane)
  addInk(g, LION_MANE, 0.012)
  addBody(g, part(profileVolume(LION_MANE, 0.16), 'mane', a, painted))

  addBody(g, part(profileVolume(LION_HEAD, 0.18), 'head', a, painted, coat))
  addBody(g, part(profileVolume(LION_MUZZLE, 0.12), 'muzzle', a, painted))
  addBody(g, part(profileVolume(LION_EAR_L, 0.03), 'earL', a, painted))
  addBody(g, part(profileVolume(LION_EAR_R, 0.03), 'earR', a, painted))
  addBody(g, part(profileVolume(LION_TUFT, 0.05), 'tuft', a, painted))

  const tailGeo = tube(
    [
      new THREE.Vector3(-0.68, 0.72, 0),
      new THREE.Vector3(-0.95, 0.9, 0.05),
      new THREE.Vector3(-1.16, 0.68, 0),
    ],
    0.032,
    12,
  )
  g.add(part(tailGeo, 'tail', a, painted))

  const legs = placeLegs(g, a, painted, [
    ['legFL', 0.44, 0.13, 0.46, 0.052, [0.08, -0.22, 0.1]],
    ['legFR', 0.48, -0.13, 0.46, 0.052, [0.02, -0.2, 0.06]],
    ['legBL', -0.44, 0.13, 0.48, 0.056, [-0.04, -0.18, -0.08, 0.08]],
    ['legBR', -0.38, -0.13, 0.48, 0.056, [0.05, -0.16, -0.04, 0.1]],
  ])
  addSideEyes(g, 0.94, 0.98, 0.16)
  g.userData.legs = legs
  return g
}

type LegSpec = [string, number, number, number, number, number[]]

function placeLegs(
  g: THREE.Group,
  animal: AnimalId,
  painted: Record<string, string>,
  specs: LegSpec[],
): THREE.Group[] {
  const legs: THREE.Group[] = []
  for (const [name, x, z, hipY, radius, joints] of specs) {
    const hip = new THREE.Group()
    hip.position.set(x, hipY, z)
    const pts = [new THREE.Vector3(0, 0, 0)]
    let y = 0
    for (let i = 0; i < joints.length; i++) {
      const dx = joints[i]!
      const drop = hipY / joints.length
      y -= drop
      pts.push(new THREE.Vector3(dx, y, 0))
    }
    const last = pts[pts.length - 1]!
    last.y = -hipY + 0.03
    const geo = tube(pts, radius, 10)
    hip.add(part(geo, name, animal, painted))
    const hoof = mesh(
      new THREE.CylinderGeometry(radius * 1.15, radius * 1.25, 0.05, 6),
      '#3a2418',
    )
    hoof.position.set(last.x, last.y - 0.02, 0)
    hip.add(hoof)
    g.add(hip)
    legs.push(hip)
  }
  return legs
}

function addInk(g: THREE.Group, pts: Ring, radius: number): void {
  const contour = smoothRing(pts, 64)
  const curve = new THREE.CatmullRomCurve3(
    contour.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    true,
  )
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 8, true), new THREE.MeshBasicMaterial({ color: '#1a140c' })))
}

function addSideEyes(g: THREE.Group, x: number, y: number, z: number): void {
  const white = new THREE.MeshBasicMaterial({ color: '#fff8ee' })
  const ink = new THREE.MeshBasicMaterial({ color: '#1a120c' })
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.042, 10), white)
    w.position.set(x, y, s * z)
    if (s < 0) w.rotation.y = Math.PI
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), ink)
    p.position.set(x + 0.012, y - 0.004, s * (z + 0.003))
    if (s < 0) p.rotation.y = Math.PI
    g.add(w, p)
  }
  const nose = new THREE.Mesh(new THREE.CircleGeometry(0.028, 8), ink)
  nose.rotation.y = Math.PI / 2
  nose.position.set(x + 0.2, y - 0.1, 0)
  g.add(nose)
}

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  const legs = group.userData.legs as THREE.Group[] | undefined
  if (!legs) return
  const amp = moving ? 0.18 : 0.04
  legs.forEach((leg, i) => {
    const dir = i % 2 === 0 ? 1 : -1
    leg.rotation.z = Math.sin(t * 6 + i) * amp * dir
  })
  group.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.025 : 0
}
