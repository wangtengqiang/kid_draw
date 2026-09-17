/**
 * 陆地狮 / 鹿 / 虎：一张卡通网格 + 真骨骼。
 * 轮廓对着 gen-lion-turnaround / gen-poses；皮毛是生成角色图，不是剪纸四连贴、
 * 不是圆球 CSG、不是向日葵幼崽、不是 Kenney 方块。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { AnimalId } from '../types'
import { CUTOUT_SRC } from './art-cutout'

export const CARTOON_RIG_PACK = 'cartoon-rig'

export const LAND_BONE_NAMES = [
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

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const REST: number[] = [0, 0, 0, 1]

type LandId = 'lion' | 'deer' | 'tiger'

type Bind = {
  hips: THREE.Vector3
  spine: THREE.Vector3
  chest: THREE.Vector3
  neck: THREE.Vector3
  head: THREE.Vector3
  tail: THREE.Vector3
  fl: THREE.Vector3
  fr: THREE.Vector3
  bl: THREE.Vector3
  br: THREE.Vector3
  legLen: number
  coat: string
}

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
}

const BIND: Record<LandId, Bind> = {
  lion: {
    hips: v(0, 0.4, -0.2),
    spine: v(0, 0.47, -0.02),
    chest: v(0, 0.52, 0.22),
    neck: v(0, 0.68, 0.4),
    head: v(0, 0.86, 0.58),
    tail: v(0, 0.46, -0.52),
    fl: v(-0.16, 0.46, 0.28),
    fr: v(0.16, 0.46, 0.28),
    bl: v(-0.18, 0.42, -0.38),
    br: v(0.18, 0.42, -0.38),
    legLen: 0.42,
    coat: '#f0b54a',
  },
  deer: {
    hips: v(0, 0.5, -0.18),
    spine: v(0, 0.56, 0),
    chest: v(0, 0.6, 0.2),
    neck: v(0, 0.86, 0.38),
    head: v(0, 1.1, 0.52),
    tail: v(0, 0.56, -0.48),
    fl: v(-0.12, 0.52, 0.26),
    fr: v(0.12, 0.52, 0.26),
    bl: v(-0.14, 0.5, -0.34),
    br: v(0.14, 0.5, -0.34),
    legLen: 0.5,
    coat: '#d9a066',
  },
  tiger: {
    hips: v(0, 0.38, -0.22),
    spine: v(0, 0.44, -0.02),
    chest: v(0, 0.48, 0.24),
    neck: v(0, 0.64, 0.42),
    head: v(0, 0.8, 0.58),
    tail: v(0, 0.44, -0.54),
    fl: v(-0.16, 0.44, 0.3),
    fr: v(0.16, 0.44, 0.3),
    bl: v(-0.18, 0.4, -0.4),
    br: v(0.18, 0.4, -0.4),
    legLen: 0.4,
    coat: '#f08a3a',
  },
}

function quat(axis: THREE.Vector3, angle: number): number[] {
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  return [q.x, q.y, q.z, q.w]
}

function qtrack(name: string, times: number[], poses: number[][]): THREE.QuaternionKeyframeTrack {
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, poses.flat())
}

function superellipseRing(rx: number, ry: number, segs: number, n = 2.45): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const x = (c < 0 ? -1 : 1) * rx * Math.pow(Math.abs(c), 2 / n)
    const y = (s < 0 ? -1 : 1) * ry * Math.pow(Math.abs(s), 2 / n)
    out.push(new THREE.Vector2(x, y))
  }
  return out
}

function loft(
  sections: { x: number; y: number; z: number; rx: number; ry: number }[],
  segs = 14,
): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const ns = sections.length
  for (const s of sections) {
    for (const p of superellipseRing(s.rx, s.ry, segs)) {
      positions.push(s.x + p.x, s.y + p.y, s.z)
    }
  }
  for (let i = 0; i < ns - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j
      const b = i * segs + ((j + 1) % segs)
      const c = (i + 1) * segs + j
      const d = (i + 1) * segs + ((j + 1) % segs)
      indices.push(a, c, b, b, c, d)
    }
  }
  const cap = (ring: number, flip: boolean) => {
    const s = sections[ring]!
    const center = positions.length / 3
    positions.push(s.x, s.y, s.z)
    for (let j = 0; j < segs; j++) {
      const a = ring * segs + j
      const b = ring * segs + ((j + 1) % segs)
      if (flip) indices.push(center, b, a)
      else indices.push(center, a, b)
    }
  }
  cap(0, true)
  cap(ns - 1, false)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function superellipsoid(rx: number, ry: number, rz: number, n = 2.5): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 14, 11)
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    pos.setXYZ(
      i,
      (x < 0 ? -1 : 1) * rx * Math.pow(Math.abs(x), 2 / n),
      (y < 0 ? -1 : 1) * ry * Math.pow(Math.abs(y), 2 / n),
      (z < 0 ? -1 : 1) * rz * Math.pow(Math.abs(z), 2 / n),
    )
  }
  g.computeVertexNormals()
  return g
}

function placed(geo: THREE.BufferGeometry, x: number, y: number, z: number): THREE.BufferGeometry {
  geo.translate(x, y, z)
  return geo
}

function hullFor(id: LandId, bind: Bind): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const thick = id === 'deer' ? 0.82 : 1
  const body = loft(
    [
      { x: 0, y: bind.hips.y + 0.02, z: bind.tail.z + 0.06, rx: 0.05 * thick, ry: 0.05 * thick },
      { x: 0, y: bind.hips.y, z: bind.hips.z, rx: 0.22 * thick, ry: 0.23 * thick },
      { x: 0, y: bind.spine.y, z: bind.spine.z, rx: 0.25 * thick, ry: 0.27 * thick },
      { x: 0, y: bind.chest.y, z: bind.chest.z, rx: 0.24 * thick, ry: 0.26 * thick },
      { x: 0, y: bind.neck.y - 0.04, z: bind.neck.z - 0.04, rx: 0.13 * thick, ry: 0.14 * thick },
    ],
    16,
  )
  geos.push(body)

  const headR = id === 'deer' ? 0.16 : 0.22
  geos.push(placed(superellipsoid(headR, headR * 0.92, headR * 0.95, 2.35), bind.head.x, bind.head.y, bind.head.z))
  geos.push(
    placed(
      superellipsoid(headR * 0.55, headR * 0.42, headR * 0.62, 2.2),
      bind.head.x,
      bind.head.y - 0.06,
      bind.head.z + headR * 0.7,
    ),
  )

  if (id === 'deer') {
    geos.push(loft([
      { x: 0, y: bind.chest.y + 0.04, z: bind.chest.z + 0.06, rx: 0.09, ry: 0.1 },
      { x: 0, y: bind.neck.y, z: bind.neck.z, rx: 0.08, ry: 0.12 },
      { x: 0, y: bind.head.y - 0.08, z: bind.head.z - 0.08, rx: 0.1, ry: 0.1 },
    ]))
  }

  const legR = id === 'deer' ? 0.055 : 0.08
  for (const p of [bind.fl, bind.fr, bind.bl, bind.br]) {
    geos.push(
      loft([
        { x: p.x, y: p.y, z: p.z, rx: legR * 1.15, ry: legR * 1.15 },
        { x: p.x, y: p.y - bind.legLen * 0.5, z: p.z + 0.01, rx: legR, ry: legR },
        { x: p.x, y: 0.055, z: p.z + 0.03, rx: legR * 1.25, ry: legR * 0.7 },
      ], 10),
    )
  }

  geos.push(
    loft([
      { x: 0, y: bind.tail.y, z: bind.tail.z, rx: 0.045, ry: 0.045 },
      { x: 0, y: bind.tail.y + 0.05, z: bind.tail.z - 0.16, rx: 0.04, ry: 0.04 },
      { x: 0, y: bind.tail.y + 0.08, z: bind.tail.z - 0.28, rx: id === 'lion' ? 0.07 : 0.05, ry: id === 'lion' ? 0.07 : 0.05 },
    ], 8),
  )

  if (id === 'lion') {
    const ruff = new THREE.TorusGeometry(0.24, 0.14, 10, 18)
    ruff.rotateX(Math.PI / 2)
    ruff.scale(1.05, 1.15, 0.95)
    ruff.translate(bind.neck.x, bind.neck.y - 0.04, bind.neck.z - 0.08)
    geos.push(ruff)
    const bib = new THREE.TorusGeometry(0.16, 0.1, 8, 14)
    bib.rotateX(Math.PI / 2.4)
    bib.translate(bind.chest.x, bind.chest.y + 0.06, bind.chest.z + 0.08)
    geos.push(bib)
  }

  for (const g of geos) {
    g.deleteAttribute('uv')
    if (!g.getAttribute('normal')) g.computeVertexNormals()
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  if (!merged) throw new Error(`无法合并 ${id} 网格`)
  merged.computeVertexNormals()
  return merged
}

function projectArtUVs(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position')
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const tmp = new THREE.Vector3()
  const right = new THREE.Vector3(0.82, 0, -0.57).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    const u = tmp.dot(right)
    const v = tmp.dot(up)
    minX = Math.min(minX, u)
    maxX = Math.max(maxX, u)
    minY = Math.min(minY, v)
    maxY = Math.max(maxY, v)
  }
  const uv = new Float32Array(pos.count * 2)
  const dx = maxX - minX || 1
  const dy = maxY - minY || 1
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    uv[i * 2] = THREE.MathUtils.clamp((tmp.dot(right) - minX) / dx, 0, 1)
    uv[i * 2 + 1] = THREE.MathUtils.clamp((tmp.dot(up) - minY) / dy, 0, 1)
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
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
  return b
}

function dummy(name: string, hex: string, rx: number, ry: number, rz: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    superellipsoid(rx, ry, rz, 2.2),
    new THREE.MeshLambertMaterial({ color: hex }),
  )
  mesh.name = name
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function addFace(head: THREE.Bone, id: LandId): void {
  const s = id === 'deer' ? 0.78 : 1
  const eyeL = dummy('eyeL', '#fffdf7', 0.085 * s, 0.09 * s, 0.055 * s)
  const eyeR = dummy('eyeR', '#fffdf7', 0.085 * s, 0.09 * s, 0.055 * s)
  eyeL.position.set(-0.09 * s, 0.04, 0.16 * s)
  eyeR.position.set(0.09 * s, 0.04, 0.16 * s)
  const irisL = dummy('irisL', '#3c9ee0', 0.048 * s, 0.05 * s, 0.03 * s)
  const irisR = dummy('irisR', '#3c9ee0', 0.048 * s, 0.05 * s, 0.03 * s)
  irisL.position.z = 0.038 * s
  irisR.position.z = 0.038 * s
  eyeL.add(irisL)
  eyeR.add(irisR)
  const nose = dummy('nose', '#c45c4a', 0.03 * s, 0.024 * s, 0.028 * s)
  nose.position.set(0, -0.05 * s, 0.22 * s)
  head.add(eyeL, eyeR, nose)
  if (id === 'deer') {
    const wood = '#8b5a2b'
    const antler = (name: string, sx: number) => {
      const g = new THREE.Group()
      g.name = name
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.022, 0.22, 6),
        new THREE.MeshLambertMaterial({ color: wood }),
      )
      beam.name = `${name}-beam`
      beam.position.set(sx * 0.07, 0.2, -0.02)
      beam.rotation.z = sx * 0.28
      beam.rotation.x = -0.12
      const tine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.014, 0.12, 6),
        new THREE.MeshLambertMaterial({ color: wood }),
      )
      tine.position.set(0, 0.1, 0)
      tine.rotation.z = sx * -0.4
      beam.add(tine)
      g.add(beam)
      return g
    }
    head.add(antler('antler-left', -1), antler('antler-right', 1))
  }
}

function skin(geo: THREE.BufferGeometry, bones: THREE.Bone[], bind: Bind): void {
  const pos = geo.getAttribute('position')
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const world: THREE.Vector3[] = bones.map((b) => {
    b.updateWorldMatrix(true, false)
    const p = new THREE.Vector3()
    b.getWorldPosition(p)
    return p
  })
  const tmp = new THREE.Vector3()
  const dist = new Float32Array(bones.length)
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    for (let b = 0; b < bones.length; b++) {
      let d = tmp.distanceTo(world[b]!)
      const name = bones[b]!.name
      if (name.startsWith('leg-') && tmp.y < bind.hips.y - 0.02) d *= 0.45
      if (name === 'head' && tmp.z > bind.neck.z) d *= 0.55
      if (name === 'hips' && tmp.z < bind.spine.z) d *= 0.7
      if (name === 'tail' && tmp.z < bind.hips.z - 0.12) d *= 0.4
      dist[b] = d
    }
    const order = dist.map((_, idx) => idx).sort((a, b) => dist[a]! - dist[b]!)
    let sum = 0
    const picks = [0, 0, 0, 0]
    const wts = [0, 0, 0, 0]
    for (let k = 0; k < 4; k++) {
      const idx = order[k] ?? 0
      picks[k] = idx
      const w = 1 / Math.pow(dist[idx]! + 0.04, 2)
      wts[k] = w
      sum += w
    }
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = picks[k]!
      skinWeight[i * 4 + k] = wts[k]! / (sum || 1)
    }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function clipsFor(bind: Bind): THREE.AnimationClip[] {
  const walkT = [0, 0.25, 0.5, 0.75, 1]
  const A = [REST, quat(X, 0.55), REST, quat(X, -0.48), REST]
  const B = [REST, quat(X, -0.48), REST, quat(X, 0.55), REST]
  const lowA = [REST, quat(X, 0.22), REST, quat(X, 0.55), REST]
  const lowB = [REST, quat(X, 0.55), REST, quat(X, 0.22), REST]
  const hy = bind.hips.y
  const hz = bind.hips.z
  const hipPos = (y: number, z = hz) => [0, y, z]
  const walk = new THREE.AnimationClip('walk', 1, [
    qtrack('leg-front-left', walkT, A),
    qtrack('leg-front-right', walkT, B),
    qtrack('leg-back-left', walkT, B),
    qtrack('leg-back-right', walkT, A),
    qtrack('leg-front-left-low', walkT, lowA),
    qtrack('leg-front-right-low', walkT, lowB),
    qtrack('leg-back-left-low', walkT, lowB),
    qtrack('leg-back-right-low', walkT, lowA),
    qtrack('head', walkT, [REST, quat(Y, 0.08), REST, quat(Y, -0.08), REST]),
    qtrack('tail', walkT, [REST, quat(Y, 0.4), REST, quat(Y, -0.4), REST]),
    qtrack('spine', walkT, [REST, quat(Y, 0.06), REST, quat(Y, -0.06), REST]),
    new THREE.VectorKeyframeTrack(
      'hips.position',
      walkT,
      [...hipPos(hy), ...hipPos(hy + 0.045), ...hipPos(hy), ...hipPos(hy + 0.045), ...hipPos(hy)],
    ),
  ])

  const sitT = [0, 0.35, 1.6]
  const sitHold = (name: string, q: number[]) => qtrack(name, sitT, [q, q, q])
  const sit = new THREE.AnimationClip('sit', 1.6, [
    sitHold('hips', quat(X, 0.42)),
    sitHold('spine', quat(X, -0.78)),
    sitHold('chest', quat(X, -0.12)),
    sitHold('neck', quat(X, -0.08)),
    sitHold('head', quat(X, 0.12)),
    sitHold('leg-back-left', quat(X, 1.22)),
    sitHold('leg-back-right', quat(X, 1.22)),
    sitHold('leg-back-left-low', quat(X, -1.05)),
    sitHold('leg-back-right-low', quat(X, -1.05)),
    sitHold('leg-front-left', quat(X, 0.12)),
    sitHold('leg-front-right', quat(X, 0.12)),
    sitHold('leg-front-left-low', quat(X, 0.18)),
    sitHold('leg-front-right-low', quat(X, 0.18)),
    sitHold('tail', quat(X, 0.35)),
    new THREE.VectorKeyframeTrack('hips.position', sitT, [...hipPos(hy * 0.5), ...hipPos(hy * 0.5), ...hipPos(hy * 0.5)]),
  ])

  const drinkT = [0, 0.3, 1.5]
  const drinkHold = (name: string, q: number[]) => qtrack(name, drinkT, [q, q, q])
  const drink = new THREE.AnimationClip('drink', 1.5, [
    drinkHold('spine', quat(X, 0.42)),
    drinkHold('chest', quat(X, 0.22)),
    drinkHold('neck', quat(X, 0.62)),
    drinkHold('head', quat(X, 0.38)),
    drinkHold('leg-front-left', quat(X, 0.28)),
    drinkHold('leg-front-right', quat(X, 0.28)),
    drinkHold('leg-front-left-low', quat(X, 0.12)),
    drinkHold('leg-front-right-low', quat(X, 0.12)),
    drinkHold('leg-back-left', quat(X, -0.12)),
    drinkHold('leg-back-right', quat(X, -0.12)),
    drinkHold('tail', quat(X, 0.18)),
    new THREE.VectorKeyframeTrack('hips.position', drinkT, [...hipPos(hy * 0.85), ...hipPos(hy * 0.85), ...hipPos(hy * 0.85)]),
  ])

  const sleepT = [0, 0.4, 2]
  const sleepHold = (name: string, q: number[]) => qtrack(name, sleepT, [q, q, q])
  const side = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0, 0.92))
  const sleep = new THREE.AnimationClip('sleep', 2, [
    new THREE.QuaternionKeyframeTrack('hips.quaternion', sleepT, [...side.toArray(), ...side.toArray(), ...side.toArray()]),
    sleepHold('spine', quat(X, 0.22)),
    sleepHold('chest', quat(X, 0.16)),
    sleepHold('neck', quat(X, 0.48)),
    sleepHold('head', quat(X, 0.32)),
    sleepHold('leg-front-left', quat(X, 1.05)),
    sleepHold('leg-front-right', quat(X, 0.95)),
    sleepHold('leg-back-left', quat(X, 1.12)),
    sleepHold('leg-back-right', quat(X, 1.02)),
    sleepHold('leg-front-left-low', quat(X, -1.05)),
    sleepHold('leg-front-right-low', quat(X, -0.95)),
    sleepHold('leg-back-left-low', quat(X, -1.1)),
    sleepHold('leg-back-right-low', quat(X, -1.0)),
    sleepHold('tail', quat(Y, 0.35)),
    new THREE.VectorKeyframeTrack('hips.position', sleepT, [...hipPos(hy * 0.4), ...hipPos(hy * 0.4), ...hipPos(hy * 0.4)]),
  ])

  const idle = new THREE.AnimationClip('idle', 2.2, [
    qtrack('head', [0, 1.1, 2.2], [REST, quat(X, 0.06), REST]),
    qtrack('spine', [0, 1.1, 2.2], [REST, quat(X, -0.03), REST]),
    qtrack('tail', [0, 1.1, 2.2], [REST, quat(Y, 0.16), REST]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.1, 2.2], [...hipPos(hy), ...hipPos(hy + 0.018), ...hipPos(hy)]),
  ])

  const stat = new THREE.AnimationClip('static', 0.1, [
    qtrack('head', [0, 0.1], [REST, REST]),
  ])

  return [walk, idle, sit, drink, sleep, stat]
}

export function buildCartoonRig(id: AnimalId, map: THREE.Texture): THREE.Group {
  const kind = (id === 'deer' || id === 'tiger' || id === 'lion' ? id : 'lion') as LandId
  const bind = BIND[kind]
  const root = new THREE.Group()
  root.name = `animal-${kind}`

  const hips = bone('hips', bind.hips)
  root.add(hips)
  hips.updateWorldMatrix(true, false)
  const spine = bone('spine', bind.spine, hips)
  spine.updateWorldMatrix(true, false)
  const chest = bone('chest', bind.chest, spine)
  chest.updateWorldMatrix(true, false)
  const neck = bone('neck', bind.neck, chest)
  neck.updateWorldMatrix(true, false)
  const head = bone('head', bind.head, neck)
  head.updateWorldMatrix(true, false)
  const tail = bone('tail', bind.tail, hips)
  const fl = bone('leg-front-left', bind.fl, chest)
  fl.updateWorldMatrix(true, false)
  bone('leg-front-left-low', v(bind.fl.x, bind.fl.y - bind.legLen * 0.5, bind.fl.z), fl)
  const fr = bone('leg-front-right', bind.fr, chest)
  fr.updateWorldMatrix(true, false)
  bone('leg-front-right-low', v(bind.fr.x, bind.fr.y - bind.legLen * 0.5, bind.fr.z), fr)
  const bl = bone('leg-back-left', bind.bl, hips)
  bl.updateWorldMatrix(true, false)
  bone('leg-back-left-low', v(bind.bl.x, bind.bl.y - bind.legLen * 0.5, bind.bl.z), bl)
  const br = bone('leg-back-right', bind.br, hips)
  br.updateWorldMatrix(true, false)
  bone('leg-back-right-low', v(bind.br.x, bind.br.y - bind.legLen * 0.5, bind.br.z), br)
  addFace(head, kind)
  if (kind === 'lion') {
    const mane = dummy('mane', '#d47828', 0.02, 0.02, 0.02)
    mane.visible = false
    head.add(mane)
  }
  tail.updateWorldMatrix(true, false)

  const bones: THREE.Bone[] = []
  hips.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.push(obj as THREE.Bone)
  })

  const geo = hullFor(kind, bind)
  projectArtUVs(geo)
  skin(geo, bones, bind)

  const mat = new THREE.MeshLambertMaterial({
    map,
    color: '#ffffff',
  })
  mat.name = 'coat'
  const body = new THREE.SkinnedMesh(geo, mat)
  body.name = 'body'
  body.userData.rigged = true
  body.userData.region = 'body'
  body.castShadow = false
  body.receiveShadow = false
  body.frustumCulled = false
  const skeleton = new THREE.Skeleton(bones)
  body.bind(skeleton)
  body.normalizeSkinWeights()
  root.add(body)

  map.colorSpace = THREE.SRGBColorSpace
  map.needsUpdate = true
  root.userData.spriteMap = map
  root.userData.rigClips = clipsFor(bind)
  root.userData.pack = CARTOON_RIG_PACK
  return root
}

export async function loadCoatTexture(id: AnimalId): Promise<THREE.Texture> {
  const url = CUTOUT_SRC[id as LandId]
  if (!url) throw new Error(`没有皮毛贴图：${id}`)
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
      () => reject(new Error(`无法加载皮毛 ${id}`)),
    )
  })
}

export function isCartoonRig(obj: THREE.Object3D | undefined | null): boolean {
  return Boolean(obj && obj.userData.pack === CARTOON_RIG_PACK)
}

export function facesHostCamera(obj: THREE.Object3D | undefined | null): boolean {
  const pack = obj?.userData.pack
  return pack === CARTOON_RIG_PACK || pack === 'art-cutout'
}
