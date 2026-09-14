/**
 * 观展动物：仓库内原创卡通 glTF（大亮眼、鬃毛网格、蹄爪），不是运行时胶囊/球拼装。
 * 孩子分区色铺在 UV 皮毛上；眼、鬃毛、斑点保持雕塑色。
 */
import * as THREE from 'three'
import type { AnimalId, WorldAction } from '../types'
import { ANIMAL_META } from '../types'
import { type Ring } from '../silhouettes'
import { instanceAnimal } from './gltf-kit'

export { loadAnimalTemplates, setAnimalModelProvider, animalTemplatesReady } from './gltf-kit'

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
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
  return instanceAnimal(animal, painted)
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

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  tickAction(group, 'walk', moving ? t : 0)
}

function resetPose(group: THREE.Group): void {
  group.rotation.x = 0
  group.rotation.z = 0
  const legs = group.userData.legs as THREE.Object3D[] | undefined
  legs?.forEach((leg) => {
    leg.rotation.x = 0
    leg.rotation.z = 0
    const knee = leg.userData.knee as THREE.Object3D | undefined
    if (knee) knee.rotation.z = 0
  })
  const flippers = group.userData.flippers as THREE.Object3D[] | undefined
  flippers?.forEach((f) => {
    f.rotation.x = 0
    f.rotation.z = 0
  })
}

/** 陆地走路/坐下/喝水/休息；海里游泳。陆地动物不会漂起来。 */
export function tickAction(group: THREE.Group, action: WorldAction, t: number): void {
  resetPose(group)
  const marine = Boolean(group.userData.marine)
  const legs = (group.userData.legs as THREE.Object3D[] | undefined) || []
  const flippers = (group.userData.flippers as THREE.Object3D[] | undefined) || []
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
      const knee = leg.userData.knee as THREE.Object3D | undefined
      if (knee) knee.rotation.z = Math.abs(swing) * 0.4
    })
    return
  }
  if (action === 'sit') {
    if (legs[2]) {
      legs[2].rotation.z = 0.9
      if (legs[2].userData.knee) (legs[2].userData.knee as THREE.Object3D).rotation.z = 0.85
    }
    if (legs[3]) {
      legs[3].rotation.z = 0.9
      if (legs[3].userData.knee) (legs[3].userData.knee as THREE.Object3D).rotation.z = 0.85
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
