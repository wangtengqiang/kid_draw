/**
 * NOT the land default. Kept only as a rejected CSG experiment.
 * Default lion/deer/tiger are 2.5D art cutouts (`extract-art-cutouts.py`).
 *
 * Author standing cartoon quads: lion / deer / tiger.
 * Style target: gen-lion-turnaround.png + gen-land-animals-sheet.png
 * Neck mane is a 3D ruff (depth in Z, hangs down the chest). Not sunflower petals
 * in the face plane. Not Kenney cubes, clay, fox/wolf, or 千图网.
 *
 * Faces +Z so gltf-kit orient.rotation.y = -π/2 still walks correctly.
 * Kid paintboard stays the coat UV — do not bake crayon splatters.
 *
 * Run: node scripts/author-cartoon-cubs.mjs
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
const { window } = dom
globalThis.window = window
globalThis.document = window.document
globalThis.HTMLElement = window.HTMLElement
globalThis.HTMLCanvasElement = window.HTMLCanvasElement
globalThis.Image = window.Image
globalThis.FileReader = window.FileReader
globalThis.Blob = window.Blob
globalThis.URL = window.URL
globalThis.Event = window.Event
globalThis.Node = window.Node

const SEG = 16
const Q = new THREE.Quaternion()
const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)

function ball(rx, ry, rz, seg = SEG) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(10, Math.round(seg * 0.75)))
  g.scale(rx, ry, rz)
  return g
}

function lambert(hex, name = '') {
  const m = new THREE.MeshLambertMaterial({
    color: hex,
    vertexColors: false,
    transparent: false,
    opacity: 1,
    side: THREE.FrontSide,
  })
  m.name = name
  return m
}

function part(name, geo, hex, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, lambert(hex, name))
  mesh.name = name
  mesh.position.set(x, y, z)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function quatAxis(axis, angle) {
  Q.setFromAxisAngle(axis, angle)
  return [Q.x, Q.y, Q.z, Q.w]
}

function flatten(keys) {
  return keys.flat()
}

function mergeGroup(name, hex, builders) {
  const geos = []
  for (const build of builders) {
    const mesh = build()
    mesh.updateMatrix()
    const g = mesh.geometry.clone()
    g.applyMatrix4(mesh.matrix)
    geos.push(g)
    mesh.geometry.dispose()
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  const mesh = new THREE.Mesh(merged, lambert(hex, name))
  mesh.name = name
  return mesh
}

function addEyes(head, { y = 0.05, z = 0.18, spread = 0.1, white = 0.085, iris = 0.048 }) {
  const make = (side, sx) => {
    const eye = part(side === 'L' ? 'eyeL' : 'eyeR', ball(white, white * 1.12, white * 0.7), '#fffdf7', sx, y, z)
    const irisM = part(side === 'L' ? 'irisL' : 'irisR', ball(iris, iris * 1.05, iris * 0.52), '#3c9ee0', 0, -0.008, white * 0.52)
    const pupil = part(side === 'L' ? 'pupilL' : 'pupilR', ball(iris * 0.48, iris * 0.52, iris * 0.26), '#1a120c', 0, -0.004, iris * 0.42)
    const shine = part(side === 'L' ? 'shineL' : 'shineR', ball(iris * 0.22, iris * 0.22, iris * 0.12), '#ffffff', -iris * 0.22, iris * 0.28, iris * 0.18)
    irisM.add(pupil, shine)
    eye.add(irisM)
    head.add(eye)
  }
  make('L', -spread)
  make('R', spread)
}

function addFace(head, z = 0.24) {
  head.add(part('nose', ball(0.03, 0.024, 0.026), '#c45c4a', 0, -0.04, z + 0.04))
}

function thickLeg(name, x, z, length = 0.44, r = 0.08, hex = '#e8b56a', pawHex = '#d9a066') {
  const leg = new THREE.Group()
  leg.name = name
  const cyl = new THREE.CylinderGeometry(r * 0.88, r * 1.08, length, 12)
  const shaft = part(`${name}-shaft`, cyl, hex, 0, -length / 2, 0)
  const paw = part(`${name}-paw`, ball(r * 1.35, r * 0.55, r * 1.45, 12), pawHex, 0, -length, 0.03)
  leg.add(shaft, paw)
  leg.position.set(x, length + 0.02, z)
  return leg
}

function tintLegs(root, shaft, paw) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.material?.color) return
    if (obj.name.endsWith('-shaft')) obj.material.color.set(shaft)
    if (obj.name.endsWith('-paw')) obj.material.color.set(paw)
  })
}

/** Neck ruff as overlapping volumes: depth in Z, hangs down the chest. Not face-plane petals. */
function lionMane() {
  const MANE = '#d47828'
  const DARK = '#c26518'
  return mergeGroup('mane', MANE, [
    () => part('maneCore', ball(0.42, 0.38, 0.34), MANE, 0, 0.0, -0.08),
    () => part('maneBack', ball(0.36, 0.32, 0.28), DARK, 0, 0.04, -0.3),
    () => part('maneBib', ball(0.28, 0.36, 0.2), MANE, 0, -0.3, 0.16),
    () => part('maneChest', ball(0.22, 0.26, 0.16), DARK, 0, -0.4, 0.04),
    () => part('maneL', ball(0.22, 0.3, 0.22), MANE, -0.3, -0.04, -0.04),
    () => part('maneR', ball(0.22, 0.3, 0.22), MANE, 0.3, -0.04, -0.04),
    () => part('maneCrown', ball(0.24, 0.16, 0.2), MANE, 0, 0.28, -0.12),
    () => part('maneLowerL', ball(0.16, 0.24, 0.16), DARK, -0.18, -0.24, 0.08),
    () => part('maneLowerR', ball(0.16, 0.24, 0.16), DARK, 0.18, -0.24, 0.08),
  ])
}

function makeLion() {
  const GOLD = '#f0b54a'
  const CREAM = '#ffe6b0'
  const root = new THREE.Group()
  root.name = 'animal-lion'

  const body = part('body', ball(0.3, 0.28, 0.52), GOLD, 0, 0.52, -0.08)
  const belly = part('belly', ball(0.22, 0.2, 0.38), CREAM, 0, 0.4, 0.02)
  const chest = part('chest', ball(0.26, 0.24, 0.2), GOLD, 0, 0.54, 0.28)
  root.add(body, belly, chest)

  const neck = part('neck', ball(0.14, 0.14, 0.14), GOLD, 0, 0.72, 0.38)
  root.add(neck)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.86, 0.54)
  head.add(part('face', ball(0.24, 0.22, 0.22), CREAM))
  head.add(part('muzzle', ball(0.13, 0.1, 0.14), CREAM, 0, -0.07, 0.18))
  addEyes(head, { y: 0.03, z: 0.17, spread: 0.1, white: 0.088, iris: 0.05 })
  addFace(head, 0.22)
  head.add(part('browL', ball(0.06, 0.02, 0.03), '#c48a48', -0.1, 0.12, 0.16))
  head.add(part('browR', ball(0.06, 0.02, 0.03), '#c48a48', 0.1, 0.12, 0.16))
  const earL = part('earL', ball(0.07, 0.08, 0.055), GOLD, -0.18, 0.16, -0.04)
  const earR = part('earR', ball(0.07, 0.08, 0.055), GOLD, 0.18, 0.16, -0.04)
  earL.add(part('earInL', ball(0.038, 0.045, 0.02), '#f4b4a0', 0, 0, 0.03))
  earR.add(part('earInR', ball(0.038, 0.045, 0.02), '#f4b4a0', 0, 0, 0.03))
  head.add(earL, earR)

  const mane = lionMane()
  mane.position.set(0, -0.1, -0.2)
  head.add(mane)
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.16, 0.26, 0.46, 0.082, GOLD, '#e0a04a'),
    thickLeg('leg-front-right', 0.16, 0.26, 0.46, 0.082, GOLD, '#e0a04a'),
    thickLeg('leg-back-left', -0.18, -0.38, 0.44, 0.09, GOLD, '#e0a04a'),
    thickLeg('leg-back-right', 0.18, -0.38, 0.44, 0.09, GOLD, '#e0a04a'),
  )

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.56, -0.56)
  tail.add(part('tail-shaft', ball(0.045, 0.045, 0.2), GOLD, 0, 0.04, -0.1))
  tail.add(part('tail-tuft', ball(0.08, 0.08, 0.09), '#d47828', 0, 0.08, -0.28))
  root.add(tail)
  return root
}

function deerAntler(name, sx) {
  const g = new THREE.Group()
  g.name = name
  g.position.set(sx * 0.08, 0.2, -0.02)
  const wood = '#8b5a2b'
  const beamGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.24, 8)
  beamGeo.translate(0, 0.11, 0)
  const beam = part(`${name}-beam`, beamGeo, wood)
  beam.rotation.z = sx * 0.28
  beam.rotation.x = -0.12
  const joint = part(`${name}-joint`, ball(0.022, 0.022, 0.022, 8), wood, 0, 0.22, 0)
  const upGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.14, 8)
  upGeo.translate(0, 0.07, 0)
  const up = part(`${name}-tine-up`, upGeo, wood, 0, 0.22, 0)
  up.rotation.z = sx * -0.15
  up.rotation.x = -0.08
  const outGeo = new THREE.CylinderGeometry(0.009, 0.014, 0.12, 8)
  outGeo.translate(0, 0.06, 0)
  const out = part(`${name}-branch`, outGeo, wood, 0, 0.22, 0)
  out.rotation.z = sx * 0.72
  out.rotation.x = 0.04
  beam.add(joint, up, out)
  g.add(beam)
  return g
}

function makeDeer() {
  const COAT = '#d9a066'
  const CREAM = '#f6e4c8'
  const root = new THREE.Group()
  root.name = 'animal-deer'

  const body = part('body', ball(0.24, 0.26, 0.48), COAT, 0, 0.58, -0.06)
  const belly = part('belly', ball(0.18, 0.2, 0.36), CREAM, 0, 0.46, 0.04)
  root.add(body, belly)
  body.add(
    mergeGroup('spots', '#fff6e0', [
      () => part('s1', ball(0.05, 0.04, 0.035, 8), '#fff6e0', -0.12, 0.06, 0.14),
      () => part('s2', ball(0.045, 0.038, 0.03, 8), '#fff6e0', 0.1, 0.1, 0.02),
      () => part('s3', ball(0.05, 0.04, 0.03, 8), '#fff6e0', -0.04, 0.12, -0.12),
      () => part('s4', ball(0.04, 0.032, 0.028, 8), '#fff6e0', 0.14, 0.0, -0.14),
      () => part('s5', ball(0.035, 0.03, 0.026, 8), '#fff6e0', 0.02, 0.14, 0.18),
      () => part('s6', ball(0.032, 0.028, 0.024, 8), '#fff6e0', -0.14, -0.02, -0.02),
    ]),
  )

  const neck = part('neck', ball(0.09, 0.2, 0.1), COAT, 0, 0.86, 0.32)
  neck.rotation.x = 0.35
  root.add(neck)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 1.08, 0.5)
  head.add(part('face', ball(0.16, 0.16, 0.16), '#e8b98a'))
  head.add(part('muzzle', ball(0.08, 0.07, 0.12), CREAM, 0, -0.06, 0.14))
  addEyes(head, { y: 0.02, z: 0.12, spread: 0.075, white: 0.07, iris: 0.04 })
  addFace(head, 0.16)
  const earL = part('earL', ball(0.045, 0.11, 0.035), COAT, -0.12, 0.16, -0.04)
  const earR = part('earR', ball(0.045, 0.11, 0.035), COAT, 0.12, 0.16, -0.04)
  earL.rotation.z = -0.25
  earR.rotation.z = 0.25
  earL.add(part('earInL', ball(0.022, 0.06, 0.014, 8), '#f4b4a0', 0, 0.01, 0.02))
  earR.add(part('earInR', ball(0.022, 0.06, 0.014, 8), '#f4b4a0', 0, 0.01, 0.02))
  head.add(earL, earR)
  head.add(deerAntler('antler-left', -1), deerAntler('antler-right', 1))
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.12, 0.24, 0.56, 0.055, '#c48a4a', '#b07840'),
    thickLeg('leg-front-right', 0.12, 0.24, 0.56, 0.055, '#c48a4a', '#b07840'),
    thickLeg('leg-back-left', -0.14, -0.34, 0.54, 0.06, '#c48a4a', '#b07840'),
    thickLeg('leg-back-right', 0.14, -0.34, 0.54, 0.06, '#c48a4a', '#b07840'),
  )

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.62, -0.5)
  tail.add(part('tail-tuft', ball(0.07, 0.07, 0.08), CREAM))
  root.add(tail)
  return root
}

function pointedEar(name, sx, hex) {
  const geo = new THREE.ConeGeometry(0.055, 0.14, 10)
  geo.translate(0, 0.07, 0)
  const ear = part(name, geo, hex, sx * 0.15, 0.18, -0.03)
  ear.rotation.z = sx * 0.18
  ear.rotation.x = 0.1
  ear.add(part(name === 'earL' ? 'earInL' : 'earInR', ball(0.022, 0.045, 0.014, 8), '#f4b4a0', 0, 0.04, 0.026))
  return ear
}

function makeTiger() {
  const ORANGE = '#f08a3a'
  const CREAM = '#ffe0b0'
  const STRIPE = '#3a2418'
  const root = new THREE.Group()
  root.name = 'animal-tiger'

  const body = part('body', ball(0.3, 0.26, 0.5), ORANGE, 0, 0.5, -0.06)
  const belly = part('belly', ball(0.2, 0.18, 0.36), CREAM, 0, 0.38, 0.04)
  root.add(body, belly)
  body.add(
    mergeGroup('stripes', STRIPE, [
      () => {
        const s = part('t1', ball(0.32, 0.055, 0.1, 10), STRIPE, 0, 0.08, 0.04)
        s.rotation.z = 0.12
        return s
      },
      () => {
        const s = part('t2', ball(0.3, 0.05, 0.09, 10), STRIPE, 0, -0.02, -0.1)
        s.rotation.z = -0.08
        return s
      },
      () => {
        const s = part('t3', ball(0.26, 0.045, 0.08, 10), STRIPE, 0, 0.12, -0.18)
        s.rotation.z = 0.16
        return s
      },
    ]),
  )

  const neck = part('neck', ball(0.12, 0.12, 0.12), ORANGE, 0, 0.7, 0.36)
  root.add(neck)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.84, 0.52)
  head.add(part('face', ball(0.22, 0.2, 0.2), ORANGE))
  head.add(part('muzzle', ball(0.14, 0.1, 0.15), CREAM, 0, -0.08, 0.16))
  addEyes(head, { y: 0.03, z: 0.15, spread: 0.095, white: 0.082, iris: 0.046 })
  addFace(head, 0.2)
  head.add(pointedEar('earL', -1, ORANGE), pointedEar('earR', 1, ORANGE))
  head.add(part('cheekL', ball(0.07, 0.045, 0.035, 8), STRIPE, -0.16, -0.02, 0.12))
  head.add(part('cheekR', ball(0.07, 0.045, 0.035, 8), STRIPE, 0.16, -0.02, 0.12))
  head.add(part('browStripe', ball(0.035, 0.08, 0.03, 8), STRIPE, 0, 0.12, 0.14))
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.16, 0.26, 0.46, 0.078, ORANGE, '#e07a30'),
    thickLeg('leg-front-right', 0.16, 0.26, 0.46, 0.078, ORANGE, '#e07a30'),
    thickLeg('leg-back-left', -0.18, -0.36, 0.44, 0.085, ORANGE, '#e07a30'),
    thickLeg('leg-back-right', 0.18, -0.36, 0.44, 0.085, ORANGE, '#e07a30'),
  )

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.54, -0.54)
  tail.add(part('tail-shaft', ball(0.042, 0.042, 0.22), ORANGE, 0, 0.05, -0.12))
  tail.add(part('tail-tuft', ball(0.07, 0.07, 0.08), STRIPE, 0, 0.08, -0.32))
  root.add(tail)
  return root
}

function clipsFor(root) {
  const rest = [0, 0, 0, 1]
  const walkTimes = [0, 0.25, 0.5, 0.75, 1]
  const pairA = flatten([rest, quatAxis(X, 0.48), rest, quatAxis(X, -0.48), rest])
  const pairB = flatten([rest, quatAxis(X, -0.48), rest, quatAxis(X, 0.48), rest])
  const walk = new THREE.AnimationClip('walk', 1, [
    new THREE.QuaternionKeyframeTrack('leg-front-left.quaternion', walkTimes, pairA),
    new THREE.QuaternionKeyframeTrack('leg-front-right.quaternion', walkTimes, pairB),
    new THREE.QuaternionKeyframeTrack('leg-back-left.quaternion', walkTimes, pairB),
    new THREE.QuaternionKeyframeTrack('leg-back-right.quaternion', walkTimes, pairA),
    new THREE.QuaternionKeyframeTrack(
      'head.quaternion',
      walkTimes,
      flatten([rest, quatAxis(Y, 0.08), rest, quatAxis(Y, -0.08), rest]),
    ),
    new THREE.QuaternionKeyframeTrack(
      'tail.quaternion',
      walkTimes,
      flatten([rest, quatAxis(Y, 0.38), rest, quatAxis(Y, -0.38), rest]),
    ),
  ])
  const idleTimes = [0, 1.2, 2.4]
  const idle = new THREE.AnimationClip('idle', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'head.quaternion',
      idleTimes,
      flatten([rest, quatAxis(X, 0.06), rest]),
    ),
    new THREE.QuaternionKeyframeTrack(
      'tail.quaternion',
      idleTimes,
      flatten([rest, quatAxis(Y, 0.18), rest]),
    ),
  ])
  const eat = new THREE.AnimationClip('eat', 1.6, [
    new THREE.QuaternionKeyframeTrack(
      'head.quaternion',
      [0, 0.4, 1.2, 1.6],
      flatten([rest, quatAxis(X, 0.55), quatAxis(X, 0.5), rest]),
    ),
  ])
  const stat = new THREE.AnimationClip('static', 0.1, [
    new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.1], flatten([rest, rest])),
  ])
  void root
  return [walk, idle, eat, stat]
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

function assertStanding(root, id) {
  root.updateMatrixWorld(true)
  const body = root.getObjectByName('body')
  if (!body || !body.geometry) throw new Error(`${id} missing body`)
  body.geometry.computeBoundingBox()
  const bs = body.geometry.boundingBox.getSize(new THREE.Vector3())
  if (bs.z <= bs.y) throw new Error(`${id} body is not longer than tall (${bs.z} vs ${bs.y})`)
  if (id === 'lion') {
    const mane = root.getObjectByName('mane')
    if (!mane || !mane.geometry) throw new Error('lion missing mane')
    mane.geometry.computeBoundingBox()
    const ms = mane.geometry.boundingBox.getSize(new THREE.Vector3())
    if (ms.z < 0.45) throw new Error(`lion mane too flat in Z: ${ms.z}`)
  }
}

async function writeAnimal(id, builder) {
  const root = builder()
  assertStanding(root, id)
  const clips = clipsFor(root)
  const buf = await exportGlb(root, clips)
  const dest = path.join(OUT, `${id}.glb`)
  fs.writeFileSync(dest, buf)
  console.log('wrote', dest, buf.byteLength)
}

await writeAnimal('lion', makeLion)
await writeAnimal('deer', makeDeer)
await writeAnimal('tiger', makeTiger)
console.log('authored standing quads')
