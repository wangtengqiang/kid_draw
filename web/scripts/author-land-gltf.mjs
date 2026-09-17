/**
 * Author lion / deer / tiger glTF quadrupeds for the host forest.
 *
 * Each file is one skinned cartoon mesh with volume (lofted superellipses,
 * not a PNG plate, not Kenney cubes, not SphereGeometry CSG cubs), UV that
 * can take kid paint, quadruped bones including neck, and clips:
 * walk / idle / sit / drink / sleep / turn.
 *
 * Run: node scripts/author-land-gltf.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../public/models')

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { pretendToBeVisual: true })
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement
globalThis.Image = dom.window.Image
globalThis.Blob = dom.window.Blob
globalThis.URL = dom.window.URL
globalThis.FileReader = dom.window.FileReader

const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const REST = [0, 0, 0, 1]

const BIND = {
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
  },
}

function v(x, y, z) {
  return new THREE.Vector3(x, y, z)
}

function quat(axis, angle) {
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  return [q.x, q.y, q.z, q.w]
}

function qtrack(name, times, poses) {
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, poses.flat())
}

function superellipseRing(rx, ry, segs, n = 2.45) {
  const out = []
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

function loft(sections, segs = 14) {
  const positions = []
  const uvs = []
  const indices = []
  const ns = sections.length
  for (let i = 0; i < ns; i++) {
    const s = sections[i]
    const ring = superellipseRing(s.rx, s.ry, segs, s.n || 2.45)
    for (let j = 0; j < segs; j++) {
      const p = ring[j]
      positions.push(s.x + p.x, s.y + p.y, s.z)
      uvs.push(j / segs, i / Math.max(1, ns - 1))
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
  const cap = (ring, flip) => {
    const s = sections[ring]
    const center = positions.length / 3
    positions.push(s.x, s.y, s.z)
    uvs.push(0.5, ring === 0 ? 0 : 1)
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
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function planarFrontUVs(geo) {
  const pos = geo.getAttribute('position')
  geo.computeBoundingBox()
  const box = geo.boundingBox
  const sx = Math.max(1e-4, box.max.x - box.min.x)
  const sy = Math.max(1e-4, box.max.y - box.min.y)
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv[i * 2] = THREE.MathUtils.clamp((x - box.min.x) / sx, 0, 1)
    uv[i * 2 + 1] = THREE.MathUtils.clamp((y - box.min.y) / sy, 0, 1)
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
}

function paintHull(geo, bind, id) {
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
    if (id === 'lion' && !isLeg && tmp.z > bind.chest.z - 0.08 && tmp.y > bind.chest.y - 0.12) {
      c.copy(mane).lerp(coat, 0.12)
    }
    if (id === 'tiger' && !isLeg && Math.abs(Math.sin(tmp.z * 9 + tmp.y * 3)) > 0.62 && tmp.y > 0.22) {
      c.copy(stripe)
    }
    if (id === 'deer' && !isLeg && tmp.y > bind.spine.y && (i * 13) % 17 < 2) {
      c.set('#fff6e0')
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}

function hullFor(id, bind) {
  const geos = []
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

  const headS = id === 'deer' ? 0.78 : 1
  geos.push(
    loft(
      [
        { x: 0, y: bind.head.y + 0.02, z: bind.head.z - 0.12, rx: 0.16 * headS, ry: 0.15 * headS, n: 2.2 },
        { x: 0, y: bind.head.y, z: bind.head.z, rx: 0.2 * headS, ry: 0.18 * headS, n: 2.1 },
        { x: 0, y: bind.head.y - 0.04, z: bind.head.z + 0.14, rx: 0.14 * headS, ry: 0.12 * headS },
        { x: 0, y: bind.head.y - 0.07, z: bind.head.z + 0.26, rx: 0.08 * headS, ry: 0.07 * headS },
      ],
      14,
    ),
  )

  if (id === 'deer') {
    geos.push(
      loft(
        [
          { x: 0, y: bind.chest.y + 0.04, z: bind.chest.z + 0.04, rx: 0.09, ry: 0.1 },
          { x: 0, y: bind.neck.y, z: bind.neck.z, rx: 0.075, ry: 0.11 },
          { x: 0, y: bind.head.y - 0.12, z: bind.head.z - 0.1, rx: 0.09, ry: 0.09 },
        ],
        12,
      ),
    )
  } else {
    geos.push(
      loft(
        [
          { x: 0, y: bind.chest.y + 0.08, z: bind.chest.z + 0.08, rx: 0.12, ry: 0.12 },
          { x: 0, y: bind.neck.y, z: bind.neck.z, rx: 0.11, ry: 0.11 },
          { x: 0, y: bind.head.y - 0.08, z: bind.head.z - 0.08, rx: 0.14, ry: 0.13 },
        ],
        12,
      ),
    )
  }

  if (id === 'lion') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 1.55 - 0.78
      const x = Math.sin(a) * 0.3
      const z = bind.neck.z - 0.16 + Math.cos(a) * 0.16
      geos.push(
        loft(
          [
            { x, y: bind.neck.y + 0.04, z, rx: 0.07, ry: 0.09 },
            { x: x * 1.12, y: bind.neck.y - 0.12, z: z - 0.08, rx: 0.1, ry: 0.13 },
            { x: x * 0.72, y: bind.chest.y - 0.16, z: z + 0.04, rx: 0.07, ry: 0.1 },
          ],
          8,
        ),
      )
    }
    geos.push(
      loft(
        [
          { x: 0, y: bind.head.y + 0.08, z: bind.head.z - 0.16, rx: 0.18, ry: 0.08 },
          { x: 0, y: bind.head.y + 0.02, z: bind.head.z - 0.28, rx: 0.2, ry: 0.1 },
          { x: 0, y: bind.neck.y + 0.04, z: bind.neck.z - 0.22, rx: 0.16, ry: 0.08 },
        ],
        10,
      ),
    )
  }

  if (id === 'deer') {
    for (const sx of [-1, 1]) {
      geos.push(
        loft(
          [
            { x: sx * 0.07, y: bind.head.y + 0.08, z: bind.head.z - 0.02, rx: 0.018, ry: 0.018 },
            { x: sx * 0.12, y: bind.head.y + 0.22, z: bind.head.z - 0.04, rx: 0.014, ry: 0.014 },
            { x: sx * 0.14, y: bind.head.y + 0.32, z: bind.head.z - 0.02, rx: 0.01, ry: 0.01 },
          ],
          8,
        ),
      )
      geos.push(
        loft(
          [
            { x: sx * 0.12, y: bind.head.y + 0.22, z: bind.head.z - 0.04, rx: 0.012, ry: 0.012 },
            { x: sx * 0.2, y: bind.head.y + 0.28, z: bind.head.z, rx: 0.01, ry: 0.01 },
          ],
          6,
        ),
      )
    }
  }

  const earW = id === 'tiger' ? 0.045 : id === 'deer' ? 0.04 : 0.055
  const earH = id === 'tiger' ? 0.08 : id === 'deer' ? 0.09 : 0.07
  for (const sx of [-1, 1]) {
    geos.push(
      loft(
        [
          { x: sx * 0.16 * headS, y: bind.head.y + 0.08, z: bind.head.z - 0.04, rx: earW, ry: earW * 0.7 },
          { x: sx * 0.18 * headS, y: bind.head.y + 0.08 + earH, z: bind.head.z - 0.06, rx: earW * 0.45, ry: earW * 0.35 },
        ],
        8,
      ),
    )
  }

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

  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  if (!merged) throw new Error(`无法合并 ${id} 网格`)
  merged.computeVertexNormals()
  planarFrontUVs(merged)
  paintHull(merged, bind, id)
  return merged
}

function bone(name, world, parent) {
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

function dummy(name, hex, rx, ry, rz) {
  const geo = loft(
    [
      { x: 0, y: 0, z: -rz, rx, ry },
      { x: 0, y: 0, z: 0, rx, ry },
      { x: 0, y: 0, z: rz, rx, ry },
    ],
    8,
  )
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: hex, vertexColors: false }))
  mesh.name = name
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function addFace(head, id) {
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
  head.add(eyeL, eyeR, nose)
  if (id === 'lion') {
    const mane = dummy('mane', '#d47828', 0.02, 0.02, 0.02)
    mane.visible = false
    head.add(mane)
  }
  if (id === 'deer') {
    const marker = dummy('antler-left', '#8b5a2b', 0.01, 0.01, 0.01)
    marker.visible = false
    head.add(marker)
  }
}

function skin(geo, bones, bind) {
  const pos = geo.getAttribute('position')
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const world = bones.map((b) => {
    b.updateWorldMatrix(true, false)
    const p = new THREE.Vector3()
    b.getWorldPosition(p)
    return p
  })
  const indexOf = (name) => bones.findIndex((b) => b.name === name)
  const tmp = new THREE.Vector3()
  const legCols = [
    ['leg-front-left', 'leg-front-left-low', bind.fl],
    ['leg-front-right', 'leg-front-right-low', bind.fr],
    ['leg-back-left', 'leg-back-left-low', bind.bl],
    ['leg-back-right', 'leg-back-right-low', bind.br],
  ]
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    let primary = 'spine'
    let secondary = 'chest'
    const legHit = legCols.find(([, , p]) => Math.hypot(tmp.x - p.x, tmp.z - p.z) < 0.11 && tmp.y < p.y - 0.01)
    if (legHit) {
      primary = tmp.y < pMid(legHit[2], bind) ? legHit[1] : legHit[0]
      secondary = tmp.y < pMid(legHit[2], bind) ? legHit[0] : 'chest'
    } else if (tmp.z < bind.hips.z - 0.16 && Math.abs(tmp.x) < 0.12) {
      primary = 'tail'
      secondary = 'hips'
    } else if (tmp.y > bind.head.y - 0.16 && tmp.z > bind.head.z - 0.18) {
      primary = 'head'
      secondary = 'neck'
    } else if (tmp.z > bind.chest.z + 0.04 && tmp.y > bind.chest.y - 0.04) {
      primary = tmp.y > bind.neck.y - 0.06 ? 'neck' : 'chest'
      secondary = 'spine'
    } else if (tmp.z < bind.spine.z) {
      primary = tmp.y < bind.hips.y + 0.04 ? 'hips' : 'spine'
      secondary = 'spine'
    } else {
      primary = 'chest'
      secondary = 'spine'
    }
    const a = Math.max(0, indexOf(primary))
    const bIdx = indexOf(secondary)
    const b = bIdx >= 0 && bIdx !== a ? bIdx : a
    skinIndex[i * 4] = a
    skinIndex[i * 4 + 1] = b
    skinWeight[i * 4] = b === a ? 1 : 0.78
    skinWeight[i * 4 + 1] = b === a ? 0 : 0.22
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function pMid(p, bind) {
  return p.y - bind.legLen * 0.45
}

function clipsFor(bind) {
  const walkT = [0, 0.25, 0.5, 0.75, 1]
  const A = [REST, quat(X, 0.48), REST, quat(X, -0.4), REST]
  const B = [REST, quat(X, -0.4), REST, quat(X, 0.48), REST]
  const lowA = [REST, quat(X, 0.18), REST, quat(X, 0.42), REST]
  const lowB = [REST, quat(X, 0.42), REST, quat(X, 0.18), REST]
  const hy = bind.hips.y
  const hz = bind.hips.z
  const hipPos = (y, z = hz) => [0, y, z]
  const walk = new THREE.AnimationClip('walk', 1, [
    qtrack('leg-front-left', walkT, A),
    qtrack('leg-front-right', walkT, B),
    qtrack('leg-back-left', walkT, B),
    qtrack('leg-back-right', walkT, A),
    qtrack('leg-front-left-low', walkT, lowA),
    qtrack('leg-front-right-low', walkT, lowB),
    qtrack('leg-back-left-low', walkT, lowB),
    qtrack('leg-back-right-low', walkT, lowA),
    qtrack('neck', walkT, [REST, quat(X, 0.06), REST, quat(X, -0.04), REST]),
    qtrack('tail', walkT, [REST, quat(Y, 0.32), REST, quat(Y, -0.32), REST]),
    new THREE.VectorKeyframeTrack('hips.position', walkT, [
      ...hipPos(hy),
      ...hipPos(hy + 0.03),
      ...hipPos(hy),
      ...hipPos(hy + 0.03),
      ...hipPos(hy),
    ]),
  ])

  const sitT = [0, 0.35, 1.6]
  const sitHold = (name, q) => qtrack(name, sitT, [q, q, q])
  const sit = new THREE.AnimationClip('sit', 1.6, [
    sitHold('hips', quat(X, 0.22)),
    sitHold('spine', quat(X, -0.12)),
    sitHold('chest', quat(X, -0.04)),
    sitHold('neck', quat(X, 0.18)),
    sitHold('head', REST),
    sitHold('leg-back-left', quat(X, 0.85)),
    sitHold('leg-back-right', quat(X, 0.85)),
    sitHold('leg-back-left-low', quat(X, -0.62)),
    sitHold('leg-back-right-low', quat(X, -0.62)),
    sitHold('leg-front-left', quat(X, 0.08)),
    sitHold('leg-front-right', quat(X, 0.08)),
    sitHold('tail', quat(X, 0.18)),
    new THREE.VectorKeyframeTrack('hips.position', sitT, [
      ...hipPos(hy * 0.72),
      ...hipPos(hy * 0.72),
      ...hipPos(hy * 0.72),
    ]),
  ])

  const drinkT = [0, 0.3, 1.5]
  const drinkHold = (name, q) => qtrack(name, drinkT, [q, q, q])
  const drink = new THREE.AnimationClip('drink', 1.5, [
    drinkHold('hips', quat(X, 0.16)),
    drinkHold('spine', quat(X, 0.14)),
    drinkHold('chest', quat(X, 0.08)),
    drinkHold('neck', quat(X, 0.55)),
    drinkHold('head', quat(X, 0.22)),
    drinkHold('leg-front-left', quat(X, 0.18)),
    drinkHold('leg-front-right', quat(X, 0.18)),
    drinkHold('tail', quat(X, 0.08)),
    new THREE.VectorKeyframeTrack('hips.position', drinkT, [
      ...hipPos(hy * 0.9),
      ...hipPos(hy * 0.9),
      ...hipPos(hy * 0.9),
    ]),
  ])

  const sleepT = [0, 0.4, 2]
  const sleepHold = (name, q) => qtrack(name, sleepT, [q, q, q])
  const sleep = new THREE.AnimationClip('sleep', 2, [
    sleepHold('hips', quat(X, 0.32)),
    sleepHold('spine', quat(X, 0.1)),
    sleepHold('chest', quat(X, 0.06)),
    sleepHold('neck', quat(X, -0.12)),
    sleepHold('head', quat(X, 0.16)),
    sleepHold('leg-front-left', quat(X, 0.72)),
    sleepHold('leg-front-right', quat(X, 0.72)),
    sleepHold('leg-back-left', quat(X, 0.78)),
    sleepHold('leg-back-right', quat(X, 0.78)),
    sleepHold('leg-front-left-low', quat(X, -0.55)),
    sleepHold('leg-front-right-low', quat(X, -0.55)),
    sleepHold('leg-back-left-low', quat(X, -0.6)),
    sleepHold('leg-back-right-low', quat(X, -0.6)),
    sleepHold('tail', quat(X, 0.28)),
    new THREE.VectorKeyframeTrack('hips.position', sleepT, [
      ...hipPos(hy * 0.55),
      ...hipPos(hy * 0.55),
      ...hipPos(hy * 0.55),
    ]),
  ])

  const idle = new THREE.AnimationClip('idle', 2.2, [
    qtrack('head', [0, 1.1, 2.2], [REST, quat(X, 0.04), REST]),
    qtrack('neck', [0, 1.1, 2.2], [REST, quat(Y, 0.08), REST]),
    qtrack('tail', [0, 1.1, 2.2], [REST, quat(Y, 0.14), REST]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.1, 2.2], [...hipPos(hy), ...hipPos(hy + 0.014), ...hipPos(hy)]),
  ])

  const turn = new THREE.AnimationClip('turn', 1.1, [
    qtrack('hips', [0, 0.55, 1.1], [REST, quat(Y, 1.15), REST]),
    qtrack('neck', [0, 0.35, 0.75, 1.1], [REST, quat(Y, 0.45), quat(Y, 0.2), REST]),
    qtrack('head', [0, 0.35, 0.75, 1.1], [REST, quat(Y, 0.35), quat(Y, 0.15), REST]),
  ])

  return [walk, idle, sit, drink, sleep, turn]
}

function buildAnimal(id) {
  const bind = BIND[id]
  const root = new THREE.Group()
  root.name = `animal-${id}`

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
  addFace(head, id)
  tail.updateWorldMatrix(true, false)

  const bones = []
  hips.traverse((obj) => {
    if (obj.isBone) bones.push(obj)
  })

  const geo = hullFor(id, bind)
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
  body.castShadow = false
  body.receiveShadow = false
  body.frustumCulled = false
  const skeleton = new THREE.Skeleton(bones)
  body.bind(skeleton)
  body.normalizeSkinWeights()
  root.add(body)
  root.userData.rigClips = clipsFor(bind)
  return root
}

function assertVolume(root, id) {
  root.updateMatrixWorld(true)
  const body = root.getObjectByName('body')
  if (!body?.geometry) throw new Error(`${id} missing body`)
  if (body.geometry.isPlaneGeometry) throw new Error(`${id} is a plane`)
  if (body.geometry.isSphereGeometry) throw new Error(`${id} is a sphere cub`)
  if (body.geometry.isBoxGeometry) throw new Error(`${id} is a cube`)
  body.geometry.computeBoundingBox()
  const bs = body.geometry.boundingBox.getSize(new THREE.Vector3())
  if (bs.z <= bs.y * 0.72) throw new Error(`${id} body is not longer than tall (${bs.z} vs ${bs.y})`)
  if (!body.geometry.getAttribute('uv') || body.geometry.getAttribute('uv').count < 8) {
    throw new Error(`${id} missing UVs`)
  }
  const names = []
  root.traverse((o) => names.push(o.name))
  if (/fox|wolf/i.test(names.join(' '))) throw new Error(`${id} has fox/wolf names`)
  if (!names.includes('neck')) throw new Error(`${id} missing neck`)
  if (id === 'lion' && !names.includes('mane')) throw new Error('lion missing mane marker')
  if (id === 'deer' && !names.includes('antler-left')) throw new Error('deer missing antler marker')
}

async function exportGlb(root, clips) {
  root.updateMatrixWorld(true)
  const exporter = new GLTFExporter()
  const data = await exporter.parseAsync(root, {
    binary: true,
    animations: clips,
    onlyVisible: true,
  })
  if (!(data instanceof ArrayBuffer)) throw new Error('expected GLB ArrayBuffer')
  return Buffer.from(data)
}

async function writeAnimal(id) {
  const root = buildAnimal(id)
  assertVolume(root, id)
  const clips = root.userData.rigClips
  const needed = ['walk', 'idle', 'sit', 'drink', 'sleep', 'turn']
  for (const name of needed) {
    if (!clips.some((c) => c.name === name)) throw new Error(`${id} missing clip ${name}`)
  }
  const buf = await exportGlb(root, clips)
  const dest = path.join(OUT, `${id}.glb`)
  fs.writeFileSync(dest, buf)
  console.log('wrote', dest, buf.byteLength)
}

await writeAnimal('lion')
await writeAnimal('deer')
await writeAnimal('tiger')
console.log('authored land glTF quadrupeds')
