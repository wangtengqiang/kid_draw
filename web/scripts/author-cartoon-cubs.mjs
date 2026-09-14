/**
 * Author in-repo cartoon cubs: round head, fluffy mane, big eyes.
 * Style target is 王腾强's cute lion drawing (chibi, sunflower mane, cream face).
 * Not Kenney cubes, not marching-cubes clay, not fox/wolf, not 千图网 pixels.
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

const SEG = 18
const Q = new THREE.Quaternion()
const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)

function ball(rx, ry, rz, seg = SEG) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(12, Math.round(seg * 0.75)))
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

function addEyes(head, { y = 0.06, z = 0.22, spread = 0.12, white = 0.13, iris = 0.07 }) {
  const make = (side, sx) => {
    const eye = part(side === 'L' ? 'eyeL' : 'eyeR', ball(white, white * 1.12, white * 0.72), '#fffdf7', sx, y, z)
    const irisM = part(side === 'L' ? 'irisL' : 'irisR', ball(iris, iris * 1.05, iris * 0.55), '#6b3a14', 0, -0.01, white * 0.55)
    const pupil = part(side === 'L' ? 'pupilL' : 'pupilR', ball(iris * 0.48, iris * 0.52, iris * 0.28), '#1a120c', 0, -0.005, iris * 0.45)
    const shine = part(side === 'L' ? 'shineL' : 'shineR', ball(iris * 0.22, iris * 0.22, iris * 0.12), '#ffffff', -iris * 0.22, iris * 0.28, iris * 0.2)
    irisM.add(pupil, shine)
    eye.add(irisM)
    head.add(eye)
  }
  make('L', -spread)
  make('R', spread)
}

function addSmile(head, z = 0.28) {
  const geo = new THREE.TorusGeometry(0.075, 0.012, 8, 18, Math.PI)
  geo.rotateX(Math.PI)
  const smile = part('nose-smile', geo, '#5a3318', 0, -0.1, z)
  smile.rotation.x = 0.15
  head.add(smile)
  head.add(part('nose', ball(0.035, 0.028, 0.03), '#c45c4a', 0, -0.04, z + 0.04))
}

function thickLeg(name, x, z, length = 0.26, r = 0.085) {
  const leg = new THREE.Group()
  leg.name = name
  const cyl = new THREE.CylinderGeometry(r * 0.92, r * 1.05, length, 12)
  const shaft = part(`${name}-shaft`, cyl, '#e8b56a', 0, -length / 2, 0)
  const paw = part(`${name}-paw`, ball(r * 1.15, r * 0.55, r * 1.2), '#d9a066', 0, -length, 0.02)
  leg.add(shaft, paw)
  leg.position.set(x, 0.28, z)
  return leg
}

function makeLion() {
  const root = new THREE.Group()
  root.name = 'animal-lion'

  const body = part('body', ball(0.32, 0.26, 0.38), '#f0c36a', 0, 0.38, -0.06)
  const belly = part('belly', ball(0.24, 0.18, 0.3), '#fff3d6', 0, 0.3, 0.04)
  root.add(body, belly)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.78, 0.22)
  const face = part('face', ball(0.34, 0.33, 0.3), '#ffe7b8')
  head.add(face)
  addEyes(head, { y: 0.05, z: 0.23, spread: 0.13, white: 0.142, iris: 0.076 })
  addSmile(head, 0.27)
  head.add(part('earL', ball(0.09, 0.1, 0.07), '#f0c36a', -0.22, 0.28, -0.02))
  head.add(part('earR', ball(0.09, 0.1, 0.07), '#f0c36a', 0.22, 0.28, -0.02))
  head.add(part('earInL', ball(0.05, 0.055, 0.03), '#f4b4a0', -0.22, 0.28, 0.04))
  head.add(part('earInR', ball(0.05, 0.055, 0.03), '#f4b4a0', 0.22, 0.28, 0.04))

  const mane = mergeGroup('mane', '#e08932', [
    ...Array.from({ length: 14 }, (_, i) => () => {
      const a = (i / 14) * Math.PI * 2 - Math.PI / 2
      const tuft = part(`m${i}`, ball(0.145, 0.23, 0.125), '#e08932', Math.cos(a) * 0.4, Math.sin(a) * 0.37, -0.02)
      tuft.rotation.z = a + Math.PI / 2
      return tuft
    }),
    ...Array.from({ length: 10 }, (_, i) => () => {
      const a = (i / 10) * Math.PI * 2 + 0.18
      const tuft = part(`mb${i}`, ball(0.13, 0.17, 0.12), '#c96e22', Math.cos(a) * 0.32, Math.sin(a) * 0.22, -0.24)
      tuft.rotation.z = a
      return tuft
    }),
    () => part('maneTop', ball(0.18, 0.16, 0.16), '#e08932', 0, 0.42, -0.08),
  ])
  head.add(mane)
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.16, 0.14),
    thickLeg('leg-front-right', 0.16, 0.14),
    thickLeg('leg-back-left', -0.18, -0.22, 0.24, 0.09),
    thickLeg('leg-back-right', 0.18, -0.22, 0.24, 0.09),
  )

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.42, -0.4)
  tail.add(part('tail-shaft', ball(0.05, 0.05, 0.16), '#f0c36a', 0, 0.02, -0.08))
  tail.add(part('tail-tuft', ball(0.09, 0.09, 0.09), '#e08932', 0, 0.04, -0.22))
  root.add(tail)

  tintLegs(root, '#e8b56a', '#d9a066')
  return root
}

function tintLegs(root, shaft, paw) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.material?.color) return
    if (obj.name.endsWith('-shaft')) obj.material.color.set(shaft)
    if (obj.name.endsWith('-paw')) obj.material.color.set(paw)
  })
}

function makeDeer() {
  const root = new THREE.Group()
  root.name = 'animal-deer'
  const body = part('body', ball(0.3, 0.26, 0.4), '#d9a066', 0, 0.4, -0.04)
  const belly = part('belly', ball(0.22, 0.18, 0.3), '#f6e4c8', 0, 0.32, 0.06)
  root.add(body, belly)

  const spots = mergeGroup('spots', '#fff6e0', [
    () => part('s1', ball(0.06, 0.05, 0.04), '#fff6e0', -0.14, 0.08, 0.12),
    () => part('s2', ball(0.05, 0.045, 0.035), '#fff6e0', 0.12, 0.12, 0.02),
    () => part('s3', ball(0.055, 0.045, 0.035), '#fff6e0', -0.06, 0.14, -0.1),
    () => part('s4', ball(0.045, 0.04, 0.03), '#fff6e0', 0.16, 0.02, -0.12),
    () => part('s5', ball(0.04, 0.035, 0.03), '#fff6e0', 0.02, 0.16, 0.16),
  ])
  body.add(spots)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.82, 0.28)
  head.add(part('face', ball(0.26, 0.26, 0.24), '#e8b98a'))
  head.add(part('muzzle', ball(0.12, 0.1, 0.14), '#f6e4c8', 0, -0.08, 0.18))
  addEyes(head, { y: 0.04, z: 0.18, spread: 0.1, white: 0.11, iris: 0.06 })
  addSmile(head, 0.22)
  head.add(part('earL', ball(0.07, 0.14, 0.05), '#d9a066', -0.16, 0.26, -0.04))
  head.add(part('earR', ball(0.07, 0.14, 0.05), '#d9a066', 0.16, 0.26, -0.04))
  head.add(part('earInL', ball(0.035, 0.08, 0.02), '#f4b4a0', -0.16, 0.26, 0.02))
  head.add(part('earInR', ball(0.035, 0.08, 0.02), '#f4b4a0', 0.16, 0.26, 0.02))

  const antler = (name, sx) => {
    const g = new THREE.Group()
    g.name = name
    g.position.set(sx * 0.16, 0.24, -0.02)
    const wood = '#8b5a2b'
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.14, 10)
    beamGeo.translate(0, 0.07, 0)
    const beam = part(`${name}-beam`, beamGeo, wood)
    beam.rotation.z = sx * 0.42
    beam.rotation.x = -0.06
    const joint = part(`${name}-joint`, ball(0.028, 0.028, 0.028), wood, 0, 0.14, 0)
    const upGeo = new THREE.CylinderGeometry(0.013, 0.018, 0.12, 8)
    upGeo.translate(0, 0.06, 0)
    const up = part(`${name}-tine-up`, upGeo, wood, 0, 0.14, 0)
    up.rotation.z = sx * -0.08
    up.rotation.x = -0.04
    const outGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.11, 8)
    outGeo.translate(0, 0.055, 0)
    const out = part(`${name}-branch`, outGeo, wood, 0, 0.14, 0)
    out.rotation.z = sx * 0.78
    out.rotation.x = 0.05
    beam.add(joint, up, out)
    g.add(beam)
    return g
  }
  head.add(antler('antler-left', -1), antler('antler-right', 1))
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.14, 0.16, 0.3, 0.07),
    thickLeg('leg-front-right', 0.14, 0.16, 0.3, 0.07),
    thickLeg('leg-back-left', -0.16, -0.22, 0.28, 0.075),
    thickLeg('leg-back-right', 0.16, -0.22, 0.28, 0.075),
  )
  tintLegs(root, '#c48a4a', '#b07840')

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.42, -0.42)
  tail.add(part('tail-tuft', ball(0.08, 0.08, 0.08), '#f6e4c8'))
  root.add(tail)
  return root
}

function makeTiger() {
  const root = new THREE.Group()
  root.name = 'animal-tiger'
  const body = part('body', ball(0.34, 0.26, 0.42), '#f08a3a', 0, 0.38, -0.04)
  const belly = part('belly', ball(0.24, 0.18, 0.3), '#fff3d6', 0, 0.3, 0.06)
  root.add(body, belly)

  const stripes = mergeGroup('stripes', '#3a2418', [
    () => {
      const s = part('t1', ball(0.36, 0.08, 0.12), '#3a2418', 0, 0.08, 0.02)
      s.rotation.z = 0.15
      return s
    },
    () => {
      const s = part('t2', ball(0.34, 0.07, 0.1), '#3a2418', 0, -0.02, -0.08)
      s.rotation.z = -0.1
      return s
    },
    () => {
      const s = part('t3', ball(0.3, 0.06, 0.09), '#3a2418', 0, 0.14, -0.14)
      s.rotation.z = 0.2
      return s
    },
  ])
  body.add(stripes)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.set(0, 0.76, 0.26)
  head.add(part('face', ball(0.3, 0.28, 0.28), '#f08a3a'))
  head.add(part('muzzle', ball(0.16, 0.12, 0.16), '#ffe0b0', 0, -0.08, 0.18))
  addEyes(head, { y: 0.05, z: 0.2, spread: 0.12, white: 0.125, iris: 0.068 })
  addSmile(head, 0.26)
  const pointedEar = (name, sx) => {
    const geo = new THREE.ConeGeometry(0.06, 0.13, 10)
    geo.translate(0, 0.065, 0)
    const ear = part(name, geo, '#f08a3a', sx * 0.17, 0.24, -0.02)
    ear.rotation.z = sx * 0.16
    ear.rotation.x = 0.08
    const inner = part(name === 'earL' ? 'earInL' : 'earInR', ball(0.026, 0.05, 0.016), '#f4b4a0', 0, 0.04, 0.028)
    ear.add(inner)
    return ear
  }
  head.add(pointedEar('earL', -1), pointedEar('earR', 1))
  head.add(part('cheekL', ball(0.08, 0.05, 0.04), '#3a2418', -0.18, -0.02, 0.16))
  head.add(part('cheekR', ball(0.08, 0.05, 0.04), '#3a2418', 0.18, -0.02, 0.16))
  head.add(part('browStripe', ball(0.04, 0.1, 0.04), '#3a2418', 0, 0.16, 0.18))
  root.add(head)

  root.add(
    thickLeg('leg-front-left', -0.16, 0.16),
    thickLeg('leg-front-right', 0.16, 0.16),
    thickLeg('leg-back-left', -0.18, -0.22, 0.24, 0.09),
    thickLeg('leg-back-right', 0.18, -0.22, 0.24, 0.09),
  )
  tintLegs(root, '#e07a30', '#c96a28')

  const tail = new THREE.Group()
  tail.name = 'tail'
  tail.position.set(0, 0.42, -0.42)
  tail.add(part('tail-shaft', ball(0.045, 0.045, 0.18), '#f08a3a', 0, 0.02, -0.1))
  tail.add(part('tail-tuft', ball(0.07, 0.07, 0.07), '#3a2418', 0, 0.04, -0.26))
  root.add(tail)
  return root
}

function clipsFor(root) {
  const rest = [0, 0, 0, 1]
  const walkTimes = [0, 0.25, 0.5, 0.75, 1]
  const pairA = flatten([rest, quatAxis(X, 0.42), rest, quatAxis(X, -0.42), rest])
  const pairB = flatten([rest, quatAxis(X, -0.42), rest, quatAxis(X, 0.42), rest])
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
      flatten([rest, quatAxis(Y, 0.35), rest, quatAxis(Y, -0.35), rest]),
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

async function writeAnimal(id, builder) {
  const root = builder()
  const clips = clipsFor(root)
  const buf = await exportGlb(root, clips)
  const dest = path.join(OUT, `${id}.glb`)
  fs.writeFileSync(dest, buf)
  console.log('wrote', dest, buf.byteLength)
}

await writeAnimal('lion', makeLion)
await writeAnimal('deer', makeDeer)
await writeAnimal('tiger', makeTiger)
console.log('authored cartoon cubs')
