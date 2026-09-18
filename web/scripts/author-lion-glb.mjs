/**
 * Author one standard cartoon lion glTF for the host forest.
 *
 * Connected stuffed volume (merged ellipsoids), not a PNG cookie, not loft
 * shards, not Kenney cubes, not Mixamo. Face uses the approved front crop.
 * Quadruped bones include neck. Clips include walk.
 *
 * Run: node scripts/author-lion-glb.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.resolve(ROOT, 'public/models/lion.glb')

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
const SEG = 22

const GOLD = new THREE.Color('#f0b54a')
const MANE = new THREE.Color('#d47828')
const MANE_DK = new THREE.Color('#c26518')
const BELLY = new THREE.Color('#ffe6b0')
const MUZZLE = new THREE.Color('#f6d7a8')
const PAW = new THREE.Color('#e0a04a')

const BIND = {
  hips: v(0, 0.42, -0.12),
  spine: v(0, 0.5, 0.02),
  chest: v(0, 0.54, 0.22),
  neck: v(0, 0.7, 0.38),
  head: v(0, 0.88, 0.5),
  tail: v(0, 0.5, -0.5),
  fl: v(-0.16, 0.46, 0.26),
  fr: v(0.16, 0.46, 0.26),
  bl: v(-0.18, 0.44, -0.34),
  br: v(0.18, 0.44, -0.34),
  legLen: 0.44,
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

function ellipsoid(rx, ry, rz, hex, matrix) {
  const g = new THREE.SphereGeometry(1, SEG, Math.max(12, Math.round(SEG * 0.75)))
  g.scale(rx, ry, rz)
  if (matrix) g.applyMatrix4(matrix)
  const c = hex instanceof THREE.Color ? hex : new THREE.Color(hex)
  const col = new Float32Array(g.getAttribute('position').count * 3)
  for (let i = 0; i < col.length; i += 3) {
    col[i] = c.r
    col[i + 1] = c.g
    col[i + 2] = c.b
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}

function at(x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4()
  const e = new THREE.Euler(rx, ry, rz)
  m.makeRotationFromEuler(e)
  m.setPosition(x, y, z)
  return m
}

function cylUV(geo) {
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const h = Math.max(1e-5, bb.max.y - bb.min.y)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    uv[i * 2] = Math.atan2(x, z) / (Math.PI * 2) + 0.5
    uv[i * 2 + 1] = (y - bb.min.y) / h
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
}

function planarFrontUV(geo) {
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const sx = Math.max(1e-5, bb.max.x - bb.min.x)
  const sy = Math.max(1e-5, bb.max.y - bb.min.y)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / sx
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / sy
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
}

function volumeParts() {
  const parts = []
  const push = (g) => {
    cylUV(g)
    parts.push(g)
  }

  push(ellipsoid(0.3, 0.26, 0.48, GOLD, at(0, 0.5, -0.04)))
  push(ellipsoid(0.22, 0.2, 0.36, BELLY, at(0, 0.4, 0.02)))
  push(ellipsoid(0.26, 0.24, 0.2, GOLD, at(0, 0.54, 0.26)))
  push(ellipsoid(0.16, 0.16, 0.16, GOLD, at(0, 0.7, 0.38)))
  push(ellipsoid(0.22, 0.2, 0.2, MUZZLE, at(0, 0.86, 0.52)))
  push(ellipsoid(0.12, 0.1, 0.13, MUZZLE, at(0, 0.8, 0.66)))
  push(ellipsoid(0.07, 0.08, 0.055, GOLD, at(-0.16, 1.02, 0.48)))
  push(ellipsoid(0.07, 0.08, 0.055, GOLD, at(0.16, 1.02, 0.48)))

  const legs = [
    [-0.16, 0.46, 0.26],
    [0.16, 0.46, 0.26],
    [-0.18, 0.44, -0.34],
    [0.18, 0.44, -0.34],
  ]
  for (const [x, y, z] of legs) {
    const len = 0.42
    const shaft = new THREE.CylinderGeometry(0.07, 0.09, len, 14)
    shaft.translate(x, y - len / 2, z)
    const c = GOLD
    const col = new Float32Array(shaft.getAttribute('position').count * 3)
    for (let i = 0; i < col.length; i += 3) {
      col[i] = c.r
      col[i + 1] = c.g
      col[i + 2] = c.b
    }
    shaft.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    cylUV(shaft)
    parts.push(shaft)
    push(ellipsoid(0.11, 0.05, 0.12, PAW, at(x, y - len, z + 0.03)))
  }

  push(ellipsoid(0.045, 0.045, 0.2, GOLD, at(0, 0.54, -0.58)))
  push(ellipsoid(0.09, 0.09, 0.1, MANE, at(0, 0.58, -0.76)))

  // Mane ruff: shells behind and beside the head, plus a chest bib.
  // Not a ring in the face plane (that was the sunflower cub).
  const head = BIND.head
  for (const ring of [
    { n: 12, r: 0.3, z: -0.18, y: 0.04, rad: 0.13, color: MANE },
    { n: 10, r: 0.26, z: -0.3, y: 0.06, rad: 0.12, color: MANE_DK },
    { n: 10, r: 0.28, z: -0.08, y: -0.02, rad: 0.11, color: MANE },
  ]) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2
      const x = Math.cos(a) * ring.r
      const y = head.y + Math.sin(a) * ring.r * 0.72 + ring.y
      const z = head.z + ring.z + Math.sin(a) * 0.04
      push(ellipsoid(ring.rad, ring.rad * 0.95, ring.rad * 0.9, ring.color, at(x, y, z)))
    }
  }
  push(ellipsoid(0.26, 0.32, 0.18, MANE, at(0, 0.62, 0.42)))
  push(ellipsoid(0.2, 0.24, 0.14, MANE_DK, at(0, 0.5, 0.34)))
  push(ellipsoid(0.22, 0.16, 0.18, MANE, at(0, 1.08, 0.38)))
  push(ellipsoid(0.16, 0.22, 0.16, MANE, at(-0.28, 0.82, 0.4)))
  push(ellipsoid(0.16, 0.22, 0.16, MANE, at(0.28, 0.82, 0.4)))

  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  merged.computeVertexNormals()
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
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 8),
    new THREE.MeshLambertMaterial({ color: hex }),
  )
  mesh.geometry.scale(rx, ry, rz)
  mesh.name = name
  mesh.userData.keepFace = /eye|iris|pupil|shine|nose/.test(name)
  return mesh
}

function skin(geo, bones) {
  const pos = geo.getAttribute('position')
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  const indexOf = (name) => bones.findIndex((b) => b.name === name)
  const tmp = new THREE.Vector3()
  const legs = [
    ['leg-front-left', 'leg-front-left-low', BIND.fl],
    ['leg-front-right', 'leg-front-right-low', BIND.fr],
    ['leg-back-left', 'leg-back-left-low', BIND.bl],
    ['leg-back-right', 'leg-back-right-low', BIND.br],
  ]
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i)
    let primary = 'spine'
    let secondary = 'chest'
    const legHit = legs.find(([, , p]) => Math.hypot(tmp.x - p.x, tmp.z - p.z) < 0.14 && tmp.y < p.y + 0.02)
    if (legHit) {
      const [, low, p] = legHit
      primary = tmp.y < p.y - BIND.legLen * 0.45 ? low : legHit[0]
      secondary = tmp.y < p.y - BIND.legLen * 0.45 ? legHit[0] : 'chest'
    } else if (tmp.z < BIND.hips.z - 0.2 && Math.abs(tmp.x) < 0.16) {
      primary = 'tail'
      secondary = 'hips'
    } else if (tmp.y > BIND.head.y - 0.18 && tmp.z > BIND.head.z - 0.22) {
      primary = 'head'
      secondary = 'neck'
    } else if (tmp.z > BIND.chest.z && tmp.y > BIND.chest.y - 0.06) {
      primary = tmp.y > BIND.neck.y - 0.05 ? 'neck' : 'chest'
      secondary = 'spine'
    } else if (tmp.z < BIND.spine.z) {
      primary = tmp.y < BIND.hips.y + 0.04 ? 'hips' : 'spine'
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
    skinWeight[i * 4] = b === a ? 1 : 0.8
    skinWeight[i * 4 + 1] = b === a ? 0 : 0.2
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))
}

function clipsFor() {
  const walkT = [0, 0.25, 0.5, 0.75, 1]
  const A = [REST, quat(X, 0.42), REST, quat(X, -0.34), REST]
  const B = [REST, quat(X, -0.34), REST, quat(X, 0.42), REST]
  const lowA = [REST, quat(X, 0.16), REST, quat(X, 0.38), REST]
  const lowB = [REST, quat(X, 0.38), REST, quat(X, 0.16), REST]
  const hy = BIND.hips.y
  const hz = BIND.hips.z
  const hipPos = (y) => [0, y, hz]
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
    qtrack('tail', walkT, [REST, quat(Y, 0.28), REST, quat(Y, -0.28), REST]),
    new THREE.VectorKeyframeTrack('hips.position', walkT, [
      ...hipPos(hy),
      ...hipPos(hy + 0.028),
      ...hipPos(hy),
      ...hipPos(hy + 0.028),
      ...hipPos(hy),
    ]),
  ])
  const idle = new THREE.AnimationClip('idle', 2.2, [
    qtrack('head', [0, 1.1, 2.2], [REST, quat(X, 0.05), REST]),
    qtrack('neck', [0, 1.1, 2.2], [REST, quat(Y, 0.08), REST]),
    qtrack('tail', [0, 1.1, 2.2], [REST, quat(Y, 0.12), REST]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.1, 2.2], [...hipPos(hy), ...hipPos(hy + 0.012), ...hipPos(hy)]),
  ])
  const hold = (name, q, dur = 1.6) => new THREE.AnimationClip(name, dur, [qtrack('head', [0, dur], [q, q])])
  const sit = new THREE.AnimationClip('sit', 1.6, [
    qtrack('hips', [0, 1.6], [quat(X, 0.22), quat(X, 0.22)]),
    qtrack('leg-back-left', [0, 1.6], [quat(X, 0.8), quat(X, 0.8)]),
    qtrack('leg-back-right', [0, 1.6], [quat(X, 0.8), quat(X, 0.8)]),
    qtrack('neck', [0, 1.6], [quat(X, 0.16), quat(X, 0.16)]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 1.6], [...hipPos(hy * 0.72), ...hipPos(hy * 0.72)]),
  ])
  const drink = new THREE.AnimationClip('drink', 1.5, [
    qtrack('neck', [0, 1.5], [quat(X, 0.5), quat(X, 0.5)]),
    qtrack('head', [0, 1.5], [quat(X, 0.2), quat(X, 0.2)]),
    qtrack('spine', [0, 1.5], [quat(X, 0.12), quat(X, 0.12)]),
  ])
  const sleep = new THREE.AnimationClip('sleep', 2, [
    qtrack('hips', [0, 2], [quat(X, 0.3), quat(X, 0.3)]),
    qtrack('neck', [0, 2], [quat(X, -0.1), quat(X, -0.1)]),
    new THREE.VectorKeyframeTrack('hips.position', [0, 2], [...hipPos(hy * 0.55), ...hipPos(hy * 0.55)]),
  ])
  const turn = new THREE.AnimationClip('turn', 1.1, [
    qtrack('hips', [0, 0.55, 1.1], [REST, quat(Y, 1.1), REST]),
    qtrack('neck', [0, 0.35, 0.75, 1.1], [REST, quat(Y, 0.4), quat(Y, 0.18), REST]),
  ])
  void hold
  return [walk, idle, sit, drink, sleep, turn]
}

function addFace(head) {
  const geo = new THREE.SphereGeometry(0.34, 24, 18, 0, Math.PI * 2, 0.15, Math.PI * 0.72)
  geo.scale(1, 1.05, 0.62)
  planarFrontUV(geo)
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    alphaTest: 0.22,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  })
  mat.name = 'face'
  const face = new THREE.Mesh(geo, mat)
  face.name = 'portrait'
  face.userData.keepFace = true
  face.userData.portrait = true
  face.userData.faceMap = 'lion-face'
  face.position.set(0, 0.02, 0.08)
  head.add(face)

  const eyeL = dummy('eyeL', '#fffdf7', 0.01, 0.01, 0.008)
  const eyeR = dummy('eyeR', '#fffdf7', 0.01, 0.01, 0.008)
  eyeL.visible = false
  eyeR.visible = false
  const nose = dummy('nose', '#c45c4a', 0.012, 0.01, 0.012)
  nose.visible = false
  nose.position.set(0, -0.04, 0.2)
  head.add(eyeL, eyeR, nose)
}

function buildLion() {
  const root = new THREE.Group()
  root.name = 'animal-lion'

  const hips = bone('hips', BIND.hips)
  root.add(hips)
  hips.updateWorldMatrix(true, false)
  const spine = bone('spine', BIND.spine, hips)
  spine.updateWorldMatrix(true, false)
  const chest = bone('chest', BIND.chest, spine)
  chest.updateWorldMatrix(true, false)
  const neck = bone('neck', BIND.neck, chest)
  neck.updateWorldMatrix(true, false)
  const head = bone('head', BIND.head, neck)
  head.updateWorldMatrix(true, false)
  bone('tail', BIND.tail, hips)
  const fl = bone('leg-front-left', BIND.fl, chest)
  fl.updateWorldMatrix(true, false)
  bone('leg-front-left-low', v(BIND.fl.x, BIND.fl.y - BIND.legLen * 0.5, BIND.fl.z), fl)
  const fr = bone('leg-front-right', BIND.fr, chest)
  fr.updateWorldMatrix(true, false)
  bone('leg-front-right-low', v(BIND.fr.x, BIND.fr.y - BIND.legLen * 0.5, BIND.fr.z), fr)
  const bl = bone('leg-back-left', BIND.bl, hips)
  bl.updateWorldMatrix(true, false)
  bone('leg-back-left-low', v(BIND.bl.x, BIND.bl.y - BIND.legLen * 0.5, BIND.bl.z), bl)
  const br = bone('leg-back-right', BIND.br, hips)
  br.updateWorldMatrix(true, false)
  bone('leg-back-right-low', v(BIND.br.x, BIND.br.y - BIND.legLen * 0.5, BIND.br.z), br)
  addFace(head)

  const bones = []
  hips.traverse((obj) => {
    if (obj.isBone) bones.push(obj)
  })

  const geo = volumeParts()
  skin(geo, bones)
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    vertexColors: true,
    side: THREE.FrontSide,
  })
  mat.name = 'coat'
  const body = new THREE.SkinnedMesh(geo, mat)
  body.name = 'body'
  body.userData.rigged = true
  body.userData.region = 'body'
  body.castShadow = false
  body.receiveShadow = false
  body.frustumCulled = false
  body.bind(new THREE.Skeleton(bones))
  body.normalizeSkinWeights()
  root.add(body)
  root.userData.rigClips = clipsFor()
  return root
}

function assertLion(root) {
  root.updateMatrixWorld(true)
  const body = root.getObjectByName('body')
  if (!body?.isSkinnedMesh) throw new Error('lion missing skinned body')
  if (body.geometry.isPlaneGeometry) throw new Error('lion is a plane')
  if (body.geometry.isBoxGeometry) throw new Error('lion is a cube')
  body.geometry.computeBoundingBox()
  const bs = body.geometry.boundingBox.getSize(new THREE.Vector3())
  if (bs.z < 0.7) throw new Error(`lion too flat in z: ${bs.z}`)
  if (bs.y < 0.7) throw new Error(`lion too short: ${bs.y}`)
  const names = []
  root.traverse((o) => names.push(o.name))
  for (const need of ['neck', 'head', 'hips', 'leg-front-left', 'portrait']) {
    if (!names.includes(need)) throw new Error(`lion missing ${need}`)
  }
  if (/fox|wolf/i.test(names.join(' '))) throw new Error('fox/wolf names')
}

async function main() {
  const root = buildLion()
  assertLion(root)
  const clips = root.userData.rigClips
  if (!clips.some((c) => c.name === 'walk')) throw new Error('missing walk')
  const exporter = new GLTFExporter()
  const data = await exporter.parseAsync(root, { binary: true, animations: clips, onlyVisible: false })
  if (!(data instanceof ArrayBuffer)) throw new Error('expected GLB')
  fs.writeFileSync(OUT, Buffer.from(data))
  console.log('wrote', OUT, data.byteLength)
}

await main()
