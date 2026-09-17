/**
 * 陆地狮 / 鹿 / 虎：真骨骼带动全身剪纸。可见的是生成角色图（含脚掌），
 * 蒙皮体积只绑骨骼、不画出来，避免第二层身子盖住脸和爪子。
 * 不是圆球 CSG、不是向日葵幼崽、不是 Kenney 方块。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { AnimalId, WorldAction } from '../types'
import { CUTOUT_SRC } from './art-cutout'

export type LandView = 'front' | 'threeQuarter' | 'side' | 'back' | 'drink' | 'sit' | 'sleep'

type LandId = 'lion' | 'deer' | 'tiger'

export const VIEW_SRC: Record<LandId, Record<LandView, string>> = {
  lion: {
    front: '/models/cutouts/lion-front.png',
    threeQuarter: '/models/cutouts/lion-three-quarter.png',
    side: '/models/cutouts/lion-side.png',
    back: '/models/cutouts/lion-back.png',
    drink: '/models/cutouts/lion-drink.png',
    sit: '/models/cutouts/lion-sit.png',
    sleep: '/models/cutouts/lion-sleep.png',
  },
  deer: {
    front: '/models/cutouts/deer.png',
    threeQuarter: '/models/cutouts/deer.png',
    side: '/models/cutouts/deer.png',
    back: '/models/cutouts/deer.png',
    drink: '/models/cutouts/deer-drink.png',
    sit: '/models/cutouts/deer-sit.png',
    sleep: '/models/cutouts/deer-sleep.png',
  },
  tiger: {
    front: '/models/cutouts/tiger.png',
    threeQuarter: '/models/cutouts/tiger.png',
    side: '/models/cutouts/tiger.png',
    back: '/models/cutouts/tiger.png',
    drink: '/models/cutouts/tiger-drink.png',
    sit: '/models/cutouts/tiger-sit.png',
    sleep: '/models/cutouts/tiger-sleep.png',
  },
}

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
  mane: string
  belly: string
  portrait: { w: number; h: number; y: number; z: number }
}

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
}

const BIND: Record<LandId, Bind> = {
  lion: {
    hips: v(0, 0.42, -0.18),
    spine: v(0, 0.5, 0),
    chest: v(0, 0.54, 0.22),
    neck: v(0, 0.7, 0.38),
    head: v(0, 0.9, 0.52),
    tail: v(0, 0.48, -0.5),
    fl: v(-0.16, 0.48, 0.28),
    fr: v(0.16, 0.48, 0.28),
    bl: v(-0.18, 0.44, -0.36),
    br: v(0.18, 0.44, -0.36),
    legLen: 0.44,
    coat: '#f0b54a',
    mane: '#d47828',
    belly: '#ffe6b0',
    portrait: { w: 1.14, h: 1.22, y: 0.19, z: 0.58 },
  },
  deer: {
    hips: v(0, 0.52, -0.16),
    spine: v(0, 0.58, 0.02),
    chest: v(0, 0.62, 0.2),
    neck: v(0, 0.9, 0.36),
    head: v(0, 1.14, 0.5),
    tail: v(0, 0.58, -0.46),
    fl: v(-0.12, 0.54, 0.26),
    fr: v(0.12, 0.54, 0.26),
    bl: v(-0.14, 0.52, -0.32),
    br: v(0.14, 0.52, -0.32),
    legLen: 0.52,
    coat: '#d9a066',
    mane: '#c48a4a',
    belly: '#f6e4c8',
    portrait: { w: 0.78, h: 1.32, y: 0.18, z: 0.56 },
  },
  tiger: {
    hips: v(0, 0.4, -0.2),
    spine: v(0, 0.47, 0),
    chest: v(0, 0.5, 0.24),
    neck: v(0, 0.66, 0.4),
    head: v(0, 0.84, 0.54),
    tail: v(0, 0.46, -0.52),
    fl: v(-0.16, 0.46, 0.3),
    fr: v(0.16, 0.46, 0.3),
    bl: v(-0.18, 0.42, -0.38),
    br: v(0.18, 0.42, -0.38),
    legLen: 0.42,
    coat: '#f08a3a',
    mane: '#e07a30',
    belly: '#ffe0b0',
    portrait: { w: 1.08, h: 1.1, y: 0.16, z: 0.6 },
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

function paintHull(geo: THREE.BufferGeometry, bind: Bind, id: LandId): void {
  const pos = geo.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const coat = new THREE.Color(bind.coat)
  const belly = new THREE.Color(bind.belly)
  const mane = new THREE.Color(bind.mane)
  const stripe = new THREE.Color('#3a2418')
  const tmp = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    const isLeg = Math.abs(tmp.x) > 0.1 && tmp.y < bind.fl.y - 0.02
    const c = coat.clone()
    if (isLeg) {
      if (tmp.y < 0.12) c.lerp(new THREE.Color('#b56b2c'), 0.4)
    } else if (tmp.y < bind.hips.y - 0.05 && tmp.z > bind.hips.z && tmp.z < bind.chest.z + 0.04) {
      c.copy(belly)
    }
    if (id === 'lion' && !isLeg && tmp.z > bind.chest.z - 0.04 && tmp.y > bind.chest.y - 0.08) {
      c.copy(mane).lerp(coat, 0.18)
    }
    if (id === 'tiger' && !isLeg && Math.abs(Math.sin(tmp.z * 9 + tmp.y * 3)) > 0.62 && tmp.y > 0.22) {
      c.copy(stripe)
    }
    if (id === 'deer' && !isLeg && tmp.y > bind.spine.y && ((i * 13) % 17) < 2) {
      c.set('#fff6e0')
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}

function hullFor(id: LandId, bind: Bind): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const thick = id === 'deer' ? 0.82 : 1
  geos.push(
    loft(
      [
        { x: 0, y: bind.hips.y + 0.02, z: bind.tail.z + 0.08, rx: 0.06 * thick, ry: 0.06 * thick },
        { x: 0, y: bind.hips.y, z: bind.hips.z, rx: 0.24 * thick, ry: 0.26 * thick },
        { x: 0, y: bind.spine.y, z: bind.spine.z, rx: 0.26 * thick, ry: 0.28 * thick },
        { x: 0, y: bind.chest.y, z: bind.chest.z, rx: 0.25 * thick, ry: 0.28 * thick },
        { x: 0, y: bind.neck.y - 0.06, z: bind.neck.z - 0.06, rx: 0.12 * thick, ry: 0.13 * thick },
      ],
      16,
    ),
  )

  const legR = id === 'deer' ? 0.045 : 0.062
  for (const p of [bind.fl, bind.fr, bind.bl, bind.br]) {
    geos.push(
      loft(
        [
          { x: p.x, y: p.y, z: p.z, rx: legR * 1.15, ry: legR * 1.15 },
          { x: p.x, y: p.y - bind.legLen * 0.5, z: p.z + 0.01, rx: legR, ry: legR },
          { x: p.x, y: 0.055, z: p.z + 0.03, rx: legR * 1.3, ry: legR * 0.7 },
        ],
        10,
      ),
    )
  }

  geos.push(
    loft(
      [
        { x: 0, y: bind.tail.y, z: bind.tail.z, rx: 0.045, ry: 0.045 },
        { x: 0, y: bind.tail.y + 0.05, z: bind.tail.z - 0.16, rx: 0.04, ry: 0.04 },
        {
          x: 0,
          y: bind.tail.y + 0.08,
          z: bind.tail.z - 0.28,
          rx: id === 'lion' ? 0.07 : 0.05,
          ry: id === 'lion' ? 0.07 : 0.05,
        },
      ],
      8,
    ),
  )

  if (id === 'deer') {
    geos.push(
      loft([
        { x: 0, y: bind.chest.y + 0.04, z: bind.chest.z + 0.04, rx: 0.09, ry: 0.1 },
        { x: 0, y: bind.neck.y, z: bind.neck.z, rx: 0.075, ry: 0.11 },
        { x: 0, y: bind.head.y - 0.12, z: bind.head.z - 0.1, rx: 0.09, ry: 0.09 },
      ]),
    )
  }

  for (const g of geos) {
    g.deleteAttribute('uv')
    if (!g.getAttribute('normal')) g.computeVertexNormals()
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  if (!merged) throw new Error(`无法合并 ${id} 网格`)
  merged.computeVertexNormals()
  paintHull(merged, bind, id)
  return merged
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
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshLambertMaterial({ color: hex }),
  )
  mesh.scale.set(rx, ry, rz)
  mesh.name = name
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function addFace(head: THREE.Bone, id: LandId): void {
  const s = id === 'deer' ? 0.78 : 1
  const eyeL = dummy('eyeL', '#fffdf7', 0.04 * s, 0.042 * s, 0.028 * s)
  const eyeR = dummy('eyeR', '#fffdf7', 0.04 * s, 0.042 * s, 0.028 * s)
  eyeL.position.set(-0.08 * s, 0.03, 0.14 * s)
  eyeR.position.set(0.08 * s, 0.03, 0.14 * s)
  const irisL = dummy('irisL', '#3c9ee0', 0.022 * s, 0.024 * s, 0.014 * s)
  const irisR = dummy('irisR', '#3c9ee0', 0.022 * s, 0.024 * s, 0.014 * s)
  irisL.position.z = 0.02 * s
  irisR.position.z = 0.02 * s
  eyeL.add(irisL)
  eyeR.add(irisR)
  const nose = dummy('nose', '#c45c4a', 0.018 * s, 0.014 * s, 0.016 * s)
  nose.position.set(0, -0.04 * s, 0.18 * s)
  eyeL.visible = false
  eyeR.visible = false
  nose.visible = false
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
      g.visible = false
      return g
    }
    head.add(antler('antler-left', -1), antler('antler-right', 1))
  }
}

function makePortrait(id: LandId, bind: Bind, map: THREE.Texture): THREE.Mesh {
  const p = bind.portrait
  const geo = new THREE.PlaneGeometry(p.w, p.h)
  const mat = new THREE.MeshLambertMaterial({
    map,
    color: '#ffffff',
    alphaTest: 0.38,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  })
  mat.name = 'portrait'
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'portrait'
  mesh.userData.portrait = true
  mesh.userData.cutout = true
  mesh.userData.baseY = p.h * 0.5
  mesh.renderOrder = 2
  mesh.position.set(0, p.h * 0.5, 0)
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.frustumCulled = false
  void id
  return mesh
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
  const indexOf = (name: string) => bones.findIndex((b) => b.name === name)
  const tmp = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    let primary = 'spine'
    if (tmp.y < 0.18) {
      const legs = ['leg-front-left-low', 'leg-front-right-low', 'leg-back-left-low', 'leg-back-right-low']
      primary = legs.reduce((best, name) => {
        const bi = indexOf(name)
        const hi = indexOf(best)
        if (bi < 0) return best
        if (hi < 0) return name
        return tmp.distanceTo(world[bi]!) < tmp.distanceTo(world[hi]!) ? name : best
      }, 'leg-front-left-low')
    } else if (tmp.z < bind.hips.z - 0.16) {
      primary = 'tail'
    } else if (tmp.z < bind.spine.z) {
      primary = tmp.y < bind.hips.y + 0.06 ? 'hips' : 'spine'
    } else if (tmp.z > bind.chest.z + 0.06) {
      primary = tmp.y > bind.neck.y - 0.08 ? 'neck' : 'chest'
    } else {
      primary = 'chest'
    }
    if (tmp.y < bind.fl.y - 0.04 && tmp.z > 0.08) {
      primary = tmp.x < 0 ? 'leg-front-left' : 'leg-front-right'
    }
    if (tmp.y < bind.bl.y - 0.04 && tmp.z < -0.12) {
      primary = tmp.x < 0 ? 'leg-back-left' : 'leg-back-right'
    }
    const a = Math.max(0, indexOf(primary))
    const second = primary.startsWith('leg-') && !primary.endsWith('-low')
      ? indexOf(`${primary}-low`)
      : indexOf('spine')
    const b = second >= 0 && second !== a ? second : a
    skinIndex[i * 4] = a
    skinIndex[i * 4 + 1] = b
    skinWeight[i * 4] = 0.92
    skinWeight[i * 4 + 1] = 0.08
    skinWeight[i * 4 + 2] = 0
    skinWeight[i * 4 + 3] = 0
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function clipsFor(bind: Bind): THREE.AnimationClip[] {
  const walkT = [0, 0.25, 0.5, 0.75, 1]
  const A = [REST, quat(X, 0.48), REST, quat(X, -0.4), REST]
  const B = [REST, quat(X, -0.4), REST, quat(X, 0.48), REST]
  const lowA = [REST, quat(X, 0.18), REST, quat(X, 0.42), REST]
  const lowB = [REST, quat(X, 0.42), REST, quat(X, 0.18), REST]
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
    qtrack('tail', walkT, [REST, quat(Y, 0.32), REST, quat(Y, -0.32), REST]),
    new THREE.VectorKeyframeTrack(
      'hips.position',
      walkT,
      [...hipPos(hy), ...hipPos(hy + 0.03), ...hipPos(hy), ...hipPos(hy + 0.03), ...hipPos(hy)],
    ),
  ])

  const sitT = [0, 0.35, 1.6]
  const sitHold = (name: string, q: number[]) => qtrack(name, sitT, [q, q, q])
  const sit = new THREE.AnimationClip('sit', 1.6, [
    sitHold('hips', quat(X, 0.28)),
    sitHold('spine', quat(X, -0.28)),
    sitHold('chest', quat(X, -0.04)),
    sitHold('neck', quat(X, 0.18)),
    sitHold('head', REST),
    sitHold('leg-back-left', quat(X, 1.15)),
    sitHold('leg-back-right', quat(X, 1.15)),
    sitHold('leg-back-left-low', quat(X, -0.95)),
    sitHold('leg-back-right-low', quat(X, -0.95)),
    sitHold('leg-front-left', quat(X, 0.08)),
    sitHold('leg-front-right', quat(X, 0.08)),
    sitHold('tail', quat(X, 0.25)),
    new THREE.VectorKeyframeTrack('hips.position', sitT, [...hipPos(hy * 0.92), ...hipPos(hy * 0.92), ...hipPos(hy * 0.92)]),
  ])

  const drinkT = [0, 0.3, 1.5]
  const drinkHold = (name: string, q: number[]) => qtrack(name, drinkT, [q, q, q])
  const drink = new THREE.AnimationClip('drink', 1.5, [
    drinkHold('hips', quat(X, 0.38)),
    drinkHold('spine', quat(X, 0.16)),
    drinkHold('neck', quat(X, 0.22)),
    drinkHold('head', quat(X, 0.12)),
    drinkHold('leg-front-left', quat(X, 0.28)),
    drinkHold('leg-front-right', quat(X, 0.28)),
    drinkHold('tail', quat(X, 0.12)),
    new THREE.VectorKeyframeTrack('hips.position', drinkT, [...hipPos(hy * 0.94), ...hipPos(hy * 0.94), ...hipPos(hy * 0.94)]),
  ])

  const sleepT = [0, 0.4, 2]
  const sleepHold = (name: string, q: number[]) => qtrack(name, sleepT, [q, q, q])
  const sleep = new THREE.AnimationClip('sleep', 2, [
    sleepHold('hips', quat(X, 0.16)),
    sleepHold('spine', quat(X, 0.08)),
    sleepHold('chest', quat(X, 0.04)),
    sleepHold('neck', quat(X, -0.1)),
    sleepHold('head', quat(X, 0.02)),
    sleepHold('leg-front-left', quat(X, 0.95)),
    sleepHold('leg-front-right', quat(X, 0.95)),
    sleepHold('leg-back-left', quat(X, 1.05)),
    sleepHold('leg-back-right', quat(X, 1.05)),
    sleepHold('leg-front-left-low', quat(X, -0.9)),
    sleepHold('leg-front-right-low', quat(X, -0.9)),
    sleepHold('leg-back-left-low', quat(X, -0.98)),
    sleepHold('leg-back-right-low', quat(X, -0.98)),
    sleepHold('tail', quat(X, 0.85)),
    new THREE.VectorKeyframeTrack('hips.position', sleepT, [...hipPos(hy * 0.9), ...hipPos(hy * 0.9), ...hipPos(hy * 0.9)]),
  ])

  const idle = new THREE.AnimationClip('idle', 2.2, [
    qtrack('head', [0, 1.1, 2.2], [REST, quat(X, 0.04), REST]),
    qtrack('tail', [0, 1.1, 2.2], [REST, quat(Y, 0.14), REST]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.1, 2.2], [...hipPos(hy), ...hipPos(hy + 0.014), ...hipPos(hy)]),
  ])

  const stat = new THREE.AnimationClip('static', 0.1, [qtrack('head', [0, 0.1], [REST, REST])])

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
  const portrait = makePortrait(kind, bind, map)
  root.add(portrait)
  if (kind === 'lion') {
    const mane = dummy('mane', bind.mane, 0.02, 0.02, 0.02)
    mane.visible = false
    head.add(mane)
  }
  tail.updateWorldMatrix(true, false)

  const bones: THREE.Bone[] = []
  hips.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.push(obj as THREE.Bone)
  })

  const geo = hullFor(kind, bind)
  skin(geo, bones, bind)

  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    vertexColors: true,
  })
  mat.name = 'coat'
  const body = new THREE.SkinnedMesh(geo, mat)
  body.name = 'body'
  body.userData.rigged = true
  body.userData.region = 'body'
  body.userData.ghost = true
  body.visible = false
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
  root.userData.spriteH = bind.portrait.h
  root.userData.rigClips = clipsFor(bind)
  root.userData.pack = CARTOON_RIG_PACK
  return root
}

function loadPngTexture(url: string, fail: string): Promise<THREE.Texture> {
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
      () => reject(new Error(fail)),
    )
  })
}

export async function loadCoatTexture(id: AnimalId): Promise<THREE.Texture> {
  const kind = (id === 'deer' || id === 'tiger' || id === 'lion' ? id : 'lion') as LandId
  const url = VIEW_SRC[kind].threeQuarter || CUTOUT_SRC[kind]
  if (!url) throw new Error(`没有皮毛贴图：${id}`)
  return loadPngTexture(url, `无法加载皮毛 ${id}`)
}

export async function attachViewTextures(root: THREE.Object3D, id: AnimalId): Promise<void> {
  const kind = (id === 'deer' || id === 'tiger' || id === 'lion' ? id : 'lion') as LandId
  const fallback = (root.userData.spriteMap as THREE.Texture | undefined) || null
  const maps: Partial<Record<LandView, THREE.Texture>> = {}
  await Promise.all(
    (Object.keys(VIEW_SRC[kind]) as LandView[]).map(async (view) => {
      const url = VIEW_SRC[kind][view]
      try {
        maps[view] = await loadPngTexture(url, `无法加载 ${url}`)
      } catch {
        if (fallback) maps[view] = fallback
      }
    }),
  )
  if (fallback && !maps.threeQuarter) maps.threeQuarter = fallback
  root.userData.viewMaps = maps
}

export function wrapPi(a: number): number {
  const tau = Math.PI * 2
  let x = ((a % tau) + tau) % tau
  if (x > Math.PI) x -= tau
  return x
}

/** 正面 / 3/4 / 侧面换图，不把正面剪纸在 3D 里拧扁。 */
export function pickLandView(
  action: WorldAction | 'walk',
  heading: number,
  toCamera = 0,
): { view: LandView; flip: boolean } {
  const rel = wrapPi(heading - toCamera)
  const flip = rel < 0
  if (action === 'drink') return { view: 'drink', flip }
  if (action === 'sit') return { view: 'sit', flip }
  if (action === 'rest') return { view: 'sleep', flip }
  const a = Math.abs(rel)
  if (a < 0.5) return { view: 'front', flip }
  if (a < 1.15) return { view: 'threeQuarter', flip }
  return { view: 'side', flip }
}

function aspectOfMap(map: THREE.Texture | null | undefined, fallback = 0.85): number {
  const img = map?.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined
  const w = img?.width || img?.naturalWidth || 0
  const h = img?.height || img?.naturalHeight || 0
  if (w > 2 && h > 2) return w / h
  return fallback
}

const _viewCam = new THREE.Vector3()

/**
 * 2.5D 业界做法：剪纸平面只 Y-billboard（立着、不拧扁），朝向靠换 front/3/4/side。
 * 根节点 rotation.y 保持 0，禁止把一张正面 PNG yaw 成卡片。
 */
export function applyLandView(
  root: THREE.Object3D,
  camera: THREE.Camera,
  action: WorldAction | 'walk',
  heading: number,
): { view: LandView; flip: boolean } {
  const portrait = root.getObjectByName('portrait') as THREE.Mesh | undefined
  root.getWorldPosition(_viewCam)
  const toCamera = Math.atan2(camera.position.x - _viewCam.x, camera.position.z - _viewCam.z)
  const picked = pickLandView(action, heading, toCamera)
  if (!portrait) return picked
  const maps =
    (root.userData.viewMaps as Partial<Record<LandView, THREE.Texture>> | undefined) ||
    (portrait.parent?.userData.viewMaps as Partial<Record<LandView, THREE.Texture>> | undefined)
  const map = maps?.[picked.view] || maps?.threeQuarter || (portrait.material as THREE.MeshLambertMaterial).map
  const mat = portrait.material as THREE.MeshLambertMaterial
  if (map && mat.map !== map) {
    mat.map = map
    mat.needsUpdate = true
  }
  const geo = portrait.geometry as THREE.PlaneGeometry
  const pw = geo.parameters?.width || 1
  const ph = geo.parameters?.height || 1
  const h = (root.userData.spriteH as number | undefined) || ph
  const aspect = aspectOfMap(map, pw / ph)
  portrait.scale.set((picked.flip ? -1 : 1) * ((aspect * h) / pw), h / ph, 1)
  root.getWorldPosition(_viewCam)
  const yaw = Math.atan2(camera.position.x - _viewCam.x, camera.position.z - _viewCam.z)
  portrait.rotation.set(0, yaw, 0)
  root.rotation.y = 0
  root.userData.heading = heading
  root.userData.landAction = action
  root.userData.landView = picked.view
  return picked
}

export function isCartoonRig(obj: THREE.Object3D | undefined | null): boolean {
  return Boolean(obj && obj.userData.pack === CARTOON_RIG_PACK)
}

export function facesHostCamera(obj: THREE.Object3D | undefined | null): boolean {
  // 整只动物不跟着镜头转；只有剪纸平面 billboard，用换图表达朝向。
  return obj?.userData.pack === 'art-cutout'
}

/** 坐下/睡觉也不把爪子埋进石径：量网格底边，抬整只动物。 */
export function keepPawsOnPath(root: THREE.Object3D): void {
  if (root.userData.pack === CARTOON_RIG_PACK) {
    const portrait = root.getObjectByName('portrait') as THREE.Mesh | undefined
    if (!portrait || !portrait.visible) return
    if (typeof portrait.userData.baseY !== 'number') portrait.userData.baseY = portrait.position.y
    portrait.position.y = portrait.userData.baseY as number
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(portrait)
    if (!Number.isFinite(box.min.y)) return
    const floor = root.position.y
    const pad = 0.03
    if (box.min.y < floor + pad) portrait.position.y += floor + pad - box.min.y
    root.updateMatrixWorld(true)
    return
  }
  if (root.userData.pack !== 'land-gltf') return
  if (typeof root.userData.pawBaseY !== 'number') root.userData.pawBaseY = root.position.y
  root.position.y = root.userData.pawBaseY as number
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (!Number.isFinite(box.min.y)) return
  const pad = 0.02
  if (box.min.y < pad) root.position.y += pad - box.min.y
  root.updateMatrixWorld(true)
}
