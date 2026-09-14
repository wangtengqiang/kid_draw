/**
 * Author original kid-cartoon animals as glTF (metaball clay + baked accessories).
 * Not runtime capsules/spheres. No stock / 千图网 images.
 * Run from web/: node scripts/author-animals.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../public/models')
fs.mkdirSync(OUT, { recursive: true })

const RES = 36
const MAX_TRIS = 40000

function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function extract(geo) {
  geo.computeVertexNormals()
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const uv = geo.getAttribute('uv')
  const index = geo.getIndex()
  const positions = new Float32Array(pos.array)
  const normals = new Float32Array(nrm.array)
  const uvs = uv ? new Float32Array(uv.array) : new Float32Array(pos.count * 2)
  const indices = index ? Uint32Array.from(index.array) : Uint32Array.from({ length: pos.count }, (_, i) => i)
  const verts = pos.count
  geo.dispose()
  return { positions, normals, uvs, indices, verts }
}

function fuse(balls, resolution = RES) {
  if (!balls.length) throw new Error('no balls')
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const b of balls) {
    minX = Math.min(minX, b.x - b.r)
    minY = Math.min(minY, b.y - b.r)
    minZ = Math.min(minZ, b.z - b.r)
    maxX = Math.max(maxX, b.x + b.r)
    maxY = Math.max(maxY, b.y + b.r)
    maxZ = Math.max(maxZ, b.z + b.r)
  }
  const pad = 0.16
  minX -= pad
  minY -= pad
  minZ -= pad
  maxX += pad
  maxY += pad
  maxZ += pad
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.2)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const cubeMin = [cx - extent / 2, cy - extent / 2, cz - extent / 2]

  const dummy = new THREE.MeshBasicMaterial()
  const mc = new MarchingCubes(resolution, dummy, true, false, MAX_TRIS)
  mc.isolation = 80
  mc.reset()
  const subtract = 12
  for (const b of balls) {
    const fx = (b.x - cubeMin[0]) / extent
    const fy = (b.y - cubeMin[1]) / extent
    const fz = (b.z - cubeMin[2]) / extent
    const r01 = Math.max(b.r / extent, 0.03)
    const strength = (80 + subtract) * r01 * r01 * (b.boost || 1.35)
    mc.addBall(fx, fy, fz, strength, subtract)
  }
  mc.update()
  const vcount = mc.count
  if (vcount < 9) throw new Error(`metaball produced ${vcount} verts`)
  const pos = mc.positionArray.slice(0, vcount * 3)
  const nrm = mc.normalArray.slice(0, vcount * 3)
  for (let i = 0; i < vcount; i++) {
    pos[i * 3] = cubeMin[0] + ((pos[i * 3] + 1) * 0.5) * extent
    pos[i * 3 + 1] = cubeMin[1] + ((pos[i * 3 + 1] + 1) * 0.5) * extent
    pos[i * 3 + 2] = cubeMin[2] + ((pos[i * 3 + 2] + 1) * 0.5) * extent
  }
  dummy.dispose()
  const welded = weld(pos, nrm, vcount)
  smooth(welded.positions, welded.indices, 3)
  recomputeNormals(welded.positions, welded.normals, welded.indices)
  const uvs = planarUv(welded.positions, welded.verts)
  return {
    positions: welded.positions,
    normals: welded.normals,
    uvs,
    indices: welded.indices,
    verts: welded.verts,
  }
}

function fuseAt(balls, origin, resolution = RES) {
  return fuse(
    balls.map((b) => ({ ...b, x: b.x - origin[0], y: b.y - origin[1], z: b.z - origin[2] })),
    resolution,
  )
}

function planarUv(positions, verts) {
  const uvs = new Float32Array(verts * 2)
  let umin = Infinity
  let umax = -Infinity
  let vmin = Infinity
  let vmax = -Infinity
  for (let i = 0; i < verts; i++) {
    umin = Math.min(umin, positions[i * 3])
    umax = Math.max(umax, positions[i * 3])
    vmin = Math.min(vmin, positions[i * 3 + 1])
    vmax = Math.max(vmax, positions[i * 3 + 1])
  }
  const du = umax - umin || 1
  const dv = vmax - vmin || 1
  for (let i = 0; i < verts; i++) {
    uvs[i * 2] = (positions[i * 3] - umin) / du
    uvs[i * 2 + 1] = (positions[i * 3 + 1] - vmin) / dv
  }
  return uvs
}

function weld(pos, nrm, vcount) {
  const map = new Map()
  const positions = []
  const normals = []
  const remap = new Uint32Array(vcount)
  for (let i = 0; i < vcount; i++) {
    const k = `${pos[i * 3].toFixed(3)},${pos[i * 3 + 1].toFixed(3)},${pos[i * 3 + 2].toFixed(3)}`
    let id = map.get(k)
    if (id === undefined) {
      id = positions.length / 3
      map.set(k, id)
      positions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      normals.push(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2])
    }
    remap[i] = id
  }
  const tris = []
  for (let i = 0; i < vcount; i += 3) {
    const a = remap[i]
    const b = remap[i + 1]
    const c = remap[i + 2]
    if (a === b || b === c || c === a) continue
    tris.push(a, b, c)
  }
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(tris),
    verts: positions.length / 3,
  }
}

function smooth(pos, indices, rounds) {
  const vcount = pos.length / 3
  const adj = Array.from({ length: vcount }, () => new Set())
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]
    const b = indices[t + 1]
    const c = indices[t + 2]
    adj[a].add(b)
    adj[a].add(c)
    adj[b].add(a)
    adj[b].add(c)
    adj[c].add(a)
    adj[c].add(b)
  }
  const next = new Float32Array(pos.length)
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < vcount; i++) {
      const n = adj[i]
      if (!n.size) {
        next[i * 3] = pos[i * 3]
        next[i * 3 + 1] = pos[i * 3 + 1]
        next[i * 3 + 2] = pos[i * 3 + 2]
        continue
      }
      let x = pos[i * 3]
      let y = pos[i * 3 + 1]
      let z = pos[i * 3 + 2]
      for (const j of n) {
        x += pos[j * 3]
        y += pos[j * 3 + 1]
        z += pos[j * 3 + 2]
      }
      const d = n.size + 1
      next[i * 3] = x / d
      next[i * 3 + 1] = y / d
      next[i * 3 + 2] = z / d
    }
    pos.set(next)
  }
}

function recomputeNormals(pos, nrm, indices) {
  const vcount = pos.length / 3
  nrm.fill(0)
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t]
    const i1 = indices[t + 1]
    const i2 = indices[t + 2]
    const ax = pos[i0 * 3]
    const ay = pos[i0 * 3 + 1]
    const az = pos[i0 * 3 + 2]
    const bx = pos[i1 * 3]
    const by = pos[i1 * 3 + 1]
    const bz = pos[i1 * 3 + 2]
    const cx = pos[i2 * 3]
    const cy = pos[i2 * 3 + 1]
    const cz = pos[i2 * 3 + 2]
    const ux = bx - ax
    const uy = by - ay
    const uz = bz - az
    const vx = cx - ax
    const vy = cy - ay
    const vz = cz - az
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const i of [i0, i1, i2]) {
      nrm[i * 3] += nx
      nrm[i * 3 + 1] += ny
      nrm[i * 3 + 2] += nz
    }
  }
  for (let i = 0; i < vcount; i++) {
    const x = nrm[i * 3]
    const y = nrm[i * 3 + 1]
    const z = nrm[i * 3 + 2]
    const l = Math.hypot(x, y, z) || 1
    nrm[i * 3] = x / l
    nrm[i * 3 + 1] = y / l
    nrm[i * 3 + 2] = z / l
  }
}

function ico(radius, detail = 1) {
  return extract(new THREE.IcosahedronGeometry(radius, detail))
}

function translate(mesh, dx, dy, dz) {
  for (let i = 0; i < mesh.positions.length; i += 3) {
    mesh.positions[i] += dx
    mesh.positions[i + 1] += dy
    mesh.positions[i + 2] += dz
  }
}

function scaleMesh(mesh, sx, sy, sz) {
  for (let i = 0; i < mesh.positions.length; i += 3) {
    mesh.positions[i] *= sx
    mesh.positions[i + 1] *= sy
    mesh.positions[i + 2] *= sz
  }
}

function flower(scale) {
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
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false, steps: 1, curveSegments: 3 })
  g.center()
  g.scale(scale, scale, scale)
  return extract(g)
}

function tube(points, radius, tubular = 10, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))
  return extract(new THREE.TubeGeometry(curve, tubular, radius, radial, false))
}

function hexToRgba(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, 1]
}

function align4(n) {
  return (n + 3) & ~3
}

function packIndex(indices) {
  let max = 0
  for (let i = 0; i < indices.length; i++) max = Math.max(max, indices[i])
  if (max < 65535) return { data: Uint16Array.from(indices), componentType: 5123 }
  return { data: indices instanceof Uint32Array ? indices : Uint32Array.from(indices), componentType: 5125 }
}

function writeGlb(parts, outFile) {
  const json = {
    asset: { version: '2.0', generator: 'kid-draw-original-cartoon' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  }
  const chunks = []
  let offset = 0

  const matIndex = new Map()
  function material(name, color, useCoat) {
    const key = `${name}:${color}:${useCoat}`
    if (matIndex.has(key)) return matIndex.get(key)
    const i = json.materials.length
    json.materials.push({
      name,
      extras: { coat: Boolean(useCoat), region: name },
      pbrMetallicRoughness: {
        baseColorFactor: hexToRgba(color),
        metallicFactor: 0,
        roughnessFactor: 0.62,
      },
      doubleSided: false,
    })
    matIndex.set(key, i)
    return i
  }

  function addAccessor(data, type, componentType, min, max) {
    const bytes = data.byteLength
    const view = json.bufferViews.length
    json.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: bytes,
      target: componentType === 5126 ? 34962 : 34963,
    })
    const acc = json.accessors.length
    const comps = type === 'SCALAR' ? 1 : type === 'VEC3' ? 3 : 2
    const accessor = {
      bufferView: view,
      componentType,
      count: data.length / comps,
      type,
    }
    if (min) accessor.min = min
    if (max) accessor.max = max
    json.accessors.push(accessor)
    chunks.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
    offset += bytes
    const pad = align4(offset) - offset
    if (pad) {
      chunks.push(Buffer.alloc(pad))
      offset += pad
    }
    return acc
  }

  function addMesh(part) {
    const pos = part.mesh.positions
    const nrm = part.mesh.normals
    const uv = part.mesh.uvs
    const packed = packIndex(part.mesh.indices)
    let min = [Infinity, Infinity, Infinity]
    let max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < pos.length; i += 3) {
      min[0] = Math.min(min[0], pos[i])
      min[1] = Math.min(min[1], pos[i + 1])
      min[2] = Math.min(min[2], pos[i + 2])
      max[0] = Math.max(max[0], pos[i])
      max[1] = Math.max(max[1], pos[i + 1])
      max[2] = Math.max(max[2], pos[i + 2])
    }
    const posAcc = addAccessor(pos, 'VEC3', 5126, min, max)
    const nrmAcc = addAccessor(nrm, 'VEC3', 5126)
    const uvAcc = addAccessor(uv, 'VEC2', 5126)
    const idxAcc = addAccessor(packed.data, 'SCALAR', packed.componentType)
    const meshIndex = json.meshes.length
    json.meshes.push({
      extras: { region: part.region, coat: Boolean(part.coat) },
      primitives: [
        {
          attributes: { POSITION: posAcc, NORMAL: nrmAcc, TEXCOORD_0: uvAcc },
          indices: idxAcc,
          material: material(part.region, part.color, part.coat),
        },
      ],
    })
    const nodeIndex = json.nodes.length
    json.nodes.push({
      name: part.name,
      mesh: meshIndex,
      extras: { region: part.region, role: part.role || part.region, coat: Boolean(part.coat) },
    })
    return nodeIndex
  }

  const rootChildren = []
  const groups = new Map()
  function group(name, translation, extras) {
    if (groups.has(name)) return groups.get(name)
    const i = json.nodes.length
    json.nodes.push({
      name,
      translation: translation || [0, 0, 0],
      children: [],
      extras: extras || { role: name },
    })
    groups.set(name, i)
    rootChildren.push(i)
    return i
  }

  for (const part of parts) {
    const node = addMesh(part)
    if (part.parent) {
      const g = group(part.parent, part.parentTranslation, { role: part.parent })
      json.nodes[g].children = json.nodes[g].children || []
      json.nodes[g].children.push(node)
    } else {
      rootChildren.push(node)
    }
  }

  json.scenes[0].nodes = [...new Set(rootChildren)]
  json.buffers[0].byteLength = offset
  const jsonBuf = Buffer.from(JSON.stringify(json))
  const jsonPad = align4(jsonBuf.length) - jsonBuf.length
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)])
  const bin = Buffer.concat(chunks)
  const binPad = align4(bin.length) - bin.length
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)])
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  let o = 12
  out.writeUInt32LE(jsonChunk.length, o)
  out.writeUInt32LE(0x4e4f534a, o + 4)
  jsonChunk.copy(out, o + 8)
  o += 8 + jsonChunk.length
  out.writeUInt32LE(binChunk.length, o)
  out.writeUInt32LE(0x004e4942, o + 4)
  binChunk.copy(out, o + 8)
  fs.writeFileSync(outFile, out)
  return { bytes: total, nodes: json.nodes.length, verts: parts.reduce((s, p) => s + p.mesh.verts, 0) }
}

function landLegs(kind, hips) {
  const parts = []
  for (const hip of hips) {
    const r = hip.r
    const origin = [hip.x, hip.hipY, hip.z]
    const local = [
      { x: hip.x, y: hip.hipY - r * 0.15, z: hip.z, r: r * 1.18, boost: 1.5 },
      { x: hip.x + 0.02, y: hip.hipY - r * 1.15, z: hip.z, r: r * 0.95, boost: 1.3 },
      { x: hip.x + 0.02, y: hip.hipY - r * 2.05, z: hip.z, r: r * 0.84, boost: 1.3 },
      { x: hip.x + 0.03, y: hip.hipY - r * 2.85, z: hip.z, r: r * 0.8, boost: 1.25 },
    ]
    if (kind === 'paw') {
      local.push(
        { x: hip.x + 0.09, y: 0.055, z: hip.z, r: r * 1.2, boost: 1.55 },
        { x: hip.x + 0.17, y: 0.045, z: hip.z + 0.07, r: r * 0.48, boost: 1.25 },
        { x: hip.x + 0.17, y: 0.045, z: hip.z, r: r * 0.48, boost: 1.25 },
        { x: hip.x + 0.17, y: 0.045, z: hip.z - 0.07, r: r * 0.48, boost: 1.25 },
      )
    } else {
      local.push(
        { x: hip.x + 0.07, y: 0.05, z: hip.z + 0.045, r: r * 0.58, boost: 1.35 },
        { x: hip.x + 0.07, y: 0.05, z: hip.z - 0.045, r: r * 0.58, boost: 1.35 },
        { x: hip.x + 0.06, y: 0.035, z: hip.z, r: r * 0.5, boost: 1.2 },
      )
    }
    parts.push({
      name: `${hip.name}Mesh`,
      region: hip.name,
      role: hip.name,
      color: hip.color,
      coat: false,
      mesh: fuseAt(local, origin, 32),
      parent: hip.name,
      parentTranslation: origin,
    })
  }
  return parts
}

function cartoonEyes(face, colorIris) {
  const parts = []
  for (const s of [-1, 1]) {
    const parent = s > 0 ? 'eyeL' : 'eyeR'
    const origin = [face.x, face.y, s * face.z]
    const white = ico(0.165, 2)
    scaleMesh(white, 1.05, 1.18, 0.92)
    parts.push({
      name: `${parent}White`,
      region: 'eye',
      role: 'eye',
      color: '#fff8ee',
      coat: false,
      mesh: white,
      parent,
      parentTranslation: origin,
    })
    const iris = ico(0.1, 2)
    translate(iris, 0.05, -0.01, 0)
    parts.push({
      name: `${parent}Iris`,
      region: 'eye',
      color: colorIris,
      coat: false,
      mesh: iris,
      parent,
      parentTranslation: origin,
    })
    const pupil = ico(0.052, 1)
    translate(pupil, 0.075, -0.012, 0)
    parts.push({
      name: `${parent}Pupil`,
      region: 'eye',
      color: '#1a120c',
      coat: false,
      mesh: pupil,
      parent,
      parentTranslation: origin,
    })
    const hi = ico(0.038, 1)
    translate(hi, 0.055, 0.055, 0.028)
    parts.push({
      name: `${parent}Shine`,
      region: 'eye',
      color: '#ffffff',
      coat: false,
      mesh: hi,
      parent,
      parentTranslation: origin,
    })
  }
  const nose = ico(0.042, 1)
  scaleMesh(nose, 1.35, 0.9, 1.05)
  translate(nose, face.x + 0.22, face.y - 0.17, 0)
  parts.push({ name: 'nose', region: 'nose', color: '#1a120c', coat: false, mesh: nose })
  return parts
}

function lionParts() {
  const bodyBalls = [
    { x: 0.0, y: 0.58, z: 0, r: 0.38 },
    { x: -0.18, y: 0.56, z: 0, r: 0.33 },
    { x: 0.18, y: 0.56, z: 0, r: 0.32 },
    { x: 0.04, y: 0.4, z: 0, r: 0.26 },
    { x: 0.5, y: 0.98, z: 0, r: 0.32 },
    { x: 0.68, y: 0.94, z: 0, r: 0.26 },
    { x: 0.88, y: 0.84, z: 0, r: 0.16 },
    { x: 0.82, y: 0.86, z: 0.12, r: 0.12 },
    { x: 0.82, y: 0.86, z: -0.12, r: 0.12 },
    { x: 0.54, y: 1.28, z: 0.16, r: 0.08 },
    { x: 0.54, y: 1.28, z: -0.16, r: 0.08 },
  ]
  const mane = []
  const hx = 0.5
  const hy = 0.98
  for (let i = 0; i < 34; i++) {
    const golden = Math.PI * (3 - Math.sqrt(5))
    const y = 1 - (i / 33) * 2
    const rr = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    const dx = Math.cos(theta) * rr
    const dy = y
    const dz = Math.sin(theta) * rr
    if (dx > 0.2) continue
    const rad = 0.4 + 0.08 * hash(i)
    mane.push({
      x: hx + dx * rad,
      y: hy + dy * rad * 0.9,
      z: dz * rad,
      r: 0.155 + 0.04 * hash(i + 3),
      boost: 1.22,
    })
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    if (Math.cos(a) > 0.55) continue
    mane.push({ x: 0.42 + Math.cos(a) * 0.08, y: 0.74, z: Math.sin(a) * 0.4, r: 0.15, boost: 1.18 })
  }
  const tailOrigin = [-0.42, 0.62, 0]
  const tailBalls = [
    { x: -0.42, y: 0.62, z: 0, r: 0.055 },
    { x: -0.62, y: 0.66, z: 0, r: 0.05 },
    { x: -0.82, y: 0.58, z: 0, r: 0.048 },
    { x: -1.0, y: 0.48, z: 0, r: 0.12, boost: 1.4 },
    { x: -1.08, y: 0.44, z: 0.04, r: 0.08 },
    { x: -1.08, y: 0.44, z: -0.04, r: 0.08 },
  ]
  const hips = [
    { name: 'legFL', x: 0.28, z: 0.24, hipY: 0.44, r: 0.12, color: '#d4b05a' },
    { name: 'legFR', x: 0.28, z: -0.24, hipY: 0.44, r: 0.12, color: '#d4b05a' },
    { name: 'legBL', x: -0.26, z: 0.26, hipY: 0.46, r: 0.13, color: '#d4b05a' },
    { name: 'legBR', x: -0.26, z: -0.26, hipY: 0.46, r: 0.13, color: '#d4b05a' },
  ]
  return [
    { name: 'body', region: 'body', color: '#e6c36a', coat: true, mesh: fuse(bodyBalls) },
    { name: 'mane', region: 'mane', color: '#e39a2a', coat: false, mesh: fuse(mane, 44) },
    {
      name: 'tailMesh',
      region: 'tail',
      color: '#d4b05a',
      coat: false,
      mesh: fuseAt(tailBalls, tailOrigin, 32),
      parent: 'tail',
      parentTranslation: tailOrigin,
    },
    ...landLegs('paw', hips),
    ...cartoonEyes({ x: 0.8, y: 1.02, z: 0.175 }, '#8a4a16'),
  ]
}

function deerParts() {
  const bodyBalls = [
    { x: 0.02, y: 0.68, z: 0, r: 0.34 },
    { x: -0.22, y: 0.66, z: 0, r: 0.3 },
    { x: 0.22, y: 0.64, z: 0, r: 0.28 },
    { x: 0.06, y: 0.5, z: 0, r: 0.24 },
    { x: 0.42, y: 0.92, z: 0, r: 0.16 },
    { x: 0.72, y: 1.16, z: 0, r: 0.26 },
    { x: 0.92, y: 1.08, z: 0, r: 0.16 },
    { x: 1.08, y: 1.02, z: 0, r: 0.12 },
    { x: 0.62, y: 1.42, z: 0.14, r: 0.08 },
    { x: 0.62, y: 1.42, z: -0.14, r: 0.08 },
    { x: -0.52, y: 0.84, z: 0, r: 0.1 },
  ]
  const spots = []
  const flowers = [
    [0.16, 0.78, 0.28, 0.11],
    [-0.1, 0.84, 0.26, 0.1],
    [0.04, 0.62, 0.24, 0.09],
    [-0.26, 0.68, 0.22, 0.085],
    [0.3, 0.64, 0.22, 0.08],
    [-0.06, 0.54, 0.2, 0.075],
  ]
  flowers.forEach((p, i) => {
    for (const side of [1, -1]) {
      const mesh = flower(p[3])
      translate(mesh, p[0], p[1], side * p[2])
      spots.push({
        name: `spot${i}${side > 0 ? 'L' : 'R'}`,
        region: `spot${(i % 3) + 1}`,
        color: '#fff6e0',
        coat: false,
        mesh,
      })
    }
  })
  const antler = (side) => [
    tube(
      [
        [0.68, 1.46, side * 0.1],
        [0.62, 1.74, side * 0.15],
        [0.54, 2.04, side * 0.13],
      ],
      0.028,
    ),
    tube(
      [
        [0.6, 1.76, side * 0.15],
        [0.42, 1.94, side * 0.24],
      ],
      0.022,
      8,
      5,
    ),
    tube(
      [
        [0.58, 1.88, side * 0.13],
        [0.74, 2.12, side * 0.08],
      ],
      0.022,
      8,
      5,
    ),
  ]
  const antlerParts = []
  for (const side of [1, -1]) {
    const region = side > 0 ? 'antlerL' : 'antlerR'
    antler(side).forEach((mesh, i) => {
      antlerParts.push({ name: `${region}${i}`, region, color: '#8b6914', coat: false, mesh })
    })
  }
  const hips = [
    { name: 'legFL', x: 0.32, z: 0.22, hipY: 0.5, r: 0.09, color: '#c48a48' },
    { name: 'legFR', x: 0.32, z: -0.22, hipY: 0.5, r: 0.09, color: '#c48a48' },
    { name: 'legBL', x: -0.28, z: 0.24, hipY: 0.52, r: 0.1, color: '#c48a48' },
    { name: 'legBR', x: -0.28, z: -0.24, hipY: 0.52, r: 0.1, color: '#c48a48' },
  ]
  return [
    { name: 'body', region: 'body', color: '#c9965a', coat: true, mesh: fuse(bodyBalls) },
    ...antlerParts,
    ...spots,
    ...landLegs('hoof', hips),
    ...cartoonEyes({ x: 0.9, y: 1.18, z: 0.16 }, '#5b3318'),
  ]
}

function tigerParts() {
  const bodyBalls = [
    { x: 0.02, y: 0.6, z: 0, r: 0.36 },
    { x: -0.2, y: 0.58, z: 0, r: 0.32 },
    { x: 0.22, y: 0.58, z: 0, r: 0.3 },
    { x: 0.06, y: 0.42, z: 0, r: 0.26 },
    { x: 0.62, y: 1.02, z: 0, r: 0.3 },
    { x: 0.78, y: 0.96, z: 0, r: 0.22 },
    { x: 0.96, y: 0.86, z: 0, r: 0.16 },
    { x: 0.88, y: 0.86, z: 0.12, r: 0.12 },
    { x: 0.88, y: 0.86, z: -0.12, r: 0.12 },
    { x: 0.52, y: 1.3, z: 0.18, r: 0.085 },
    { x: 0.52, y: 1.3, z: -0.18, r: 0.085 },
  ]
  const muzzle = fuse(
    [
      { x: 1.08, y: 0.86, z: 0, r: 0.14 },
      { x: 1.02, y: 0.86, z: 0.1, r: 0.08 },
      { x: 1.02, y: 0.86, z: -0.1, r: 0.08 },
    ],
    28,
  )
  const stripes = []
  ;[
    [0.28, 0.74, 0.29, 0.16],
    [0.08, 0.78, 0.29, 0.17],
    [-0.12, 0.76, 0.28, 0.15],
    [-0.32, 0.7, 0.27, 0.14],
    [0.72, 1.1, 0.26, 0.12],
    [0.86, 1.2, 0.1, 0.1],
  ].forEach((p, i) => {
    for (const side of [1, -1]) {
      const mesh = ico(p[3], 1)
      scaleMesh(mesh, 0.45, 1.15, 0.35)
      translate(mesh, p[0], p[1], side * p[2])
      stripes.push({ name: `stripe${i}${side > 0 ? 'L' : 'R'}`, region: 'stripe', color: '#3a2210', coat: false, mesh })
    }
  })
  const tailOrigin = [-0.48, 0.62, 0]
  const tailBalls = [
    { x: -0.48, y: 0.62, z: 0, r: 0.06 },
    { x: -0.72, y: 0.7, z: 0, r: 0.055 },
    { x: -0.96, y: 0.62, z: 0, r: 0.05 },
    { x: -1.16, y: 0.5, z: 0, r: 0.055 },
  ]
  const hips = [
    { name: 'legFL', x: 0.32, z: 0.24, hipY: 0.46, r: 0.11, color: '#d88920' },
    { name: 'legFR', x: 0.32, z: -0.24, hipY: 0.46, r: 0.11, color: '#d88920' },
    { name: 'legBL', x: -0.28, z: 0.26, hipY: 0.48, r: 0.12, color: '#d88920' },
    { name: 'legBR', x: -0.28, z: -0.26, hipY: 0.48, r: 0.12, color: '#d88920' },
  ]
  return [
    { name: 'body', region: 'body', color: '#e89a2d', coat: true, mesh: fuse(bodyBalls) },
    { name: 'muzzle', region: 'muzzle', color: '#fff3d6', coat: false, mesh: muzzle },
    ...stripes,
    {
      name: 'tailMesh',
      region: 'tail',
      color: '#e89a2d',
      coat: false,
      mesh: fuseAt(tailBalls, tailOrigin, 32),
      parent: 'tail',
      parentTranslation: tailOrigin,
    },
    ...landLegs('paw', hips),
    ...cartoonEyes({ x: 0.84, y: 1.04, z: 0.18 }, '#7a3b12'),
  ]
}

function fishParts() {
  const body = [
    { x: 0.1, y: 0.52, z: 0, r: 0.36 },
    { x: 0.4, y: 0.52, z: 0, r: 0.28 },
    { x: 0.62, y: 0.52, z: 0, r: 0.2 },
    { x: 0.12, y: 0.36, z: 0, r: 0.22 },
  ]
  const tailOrigin = [-0.38, 0.52, 0]
  const tail = [
    { x: -0.42, y: 0.52, z: 0, r: 0.1 },
    { x: -0.62, y: 0.62, z: 0, r: 0.12 },
    { x: -0.62, y: 0.42, z: 0, r: 0.12 },
  ]
  const fin = [
    { x: 0.08, y: 0.88, z: 0, r: 0.12 },
    { x: 0.08, y: 1.0, z: 0, r: 0.08 },
  ]
  return [
    { name: 'body', region: 'body', color: '#3b82f6', coat: true, mesh: fuse(body) },
    {
      name: 'tailMesh',
      region: 'tail',
      color: '#2563eb',
      coat: false,
      mesh: fuseAt(tail, tailOrigin, 32),
      parent: 'tail',
      parentTranslation: tailOrigin,
    },
    { name: 'fin', region: 'fin', color: '#22d3ee', coat: false, mesh: fuse(fin, 28) },
    ...cartoonEyes({ x: 0.72, y: 0.56, z: 0.13 }, '#1e3a8a'),
  ]
}

function turtleParts() {
  const shell = [
    { x: -0.04, y: 0.52, z: 0, r: 0.38 },
    { x: -0.04, y: 0.68, z: 0, r: 0.28 },
    { x: 0.16, y: 0.5, z: 0.16, r: 0.2 },
    { x: 0.16, y: 0.5, z: -0.16, r: 0.2 },
    { x: -0.24, y: 0.5, z: 0.16, r: 0.2 },
    { x: -0.24, y: 0.5, z: -0.16, r: 0.2 },
  ]
  const head = [
    { x: 0.62, y: 0.48, z: 0, r: 0.14 },
    { x: 0.78, y: 0.48, z: 0, r: 0.12 },
  ]
  const parts = [
    { name: 'body', region: 'shell', color: '#2bb673', coat: true, mesh: fuse(shell) },
    { name: 'head', region: 'head', color: '#8fdd74', coat: false, mesh: fuse(head, 28) },
    ...cartoonEyes({ x: 0.84, y: 0.52, z: 0.11 }, '#1a3a16'),
  ]
  for (const spec of [
    { name: 'flipperFR', x: 0.32, z: 0.32 },
    { name: 'flipperFL', x: 0.32, z: -0.32 },
    { name: 'flipperBR', x: -0.4, z: 0.3 },
    { name: 'flipperBL', x: -0.4, z: -0.3 },
  ]) {
    const origin = [spec.x, 0.3, spec.z]
    const mesh = fuseAt(
      [
        { x: spec.x, y: 0.3, z: spec.z, r: 0.12 },
        { x: spec.x + 0.1, y: 0.3, z: spec.z + (spec.z > 0 ? 0.1 : -0.1), r: 0.11 },
      ],
      origin,
      28,
    )
    parts.push({
      name: `${spec.name}Mesh`,
      region: spec.name,
      color: '#3d8f44',
      coat: false,
      mesh,
      parent: spec.name,
      parentTranslation: origin,
    })
  }
  return parts
}

function dolphinParts() {
  const body = [
    { x: 0.1, y: 0.48, z: 0, r: 0.32 },
    { x: 0.45, y: 0.46, z: 0, r: 0.24 },
    { x: 0.8, y: 0.44, z: 0, r: 0.14 },
    { x: 1.05, y: 0.44, z: 0, r: 0.08 },
    { x: -0.25, y: 0.46, z: 0, r: 0.22 },
    { x: 0.12, y: 0.34, z: 0, r: 0.18 },
    { x: 0.05, y: 0.82, z: 0, r: 0.1 },
  ]
  const tailOrigin = [-0.5, 0.44, 0]
  const tail = [
    { x: -0.55, y: 0.44, z: 0, r: 0.08 },
    { x: -0.72, y: 0.42, z: 0.12, r: 0.09 },
    { x: -0.72, y: 0.42, z: -0.12, r: 0.09 },
  ]
  return [
    { name: 'body', region: 'body', color: '#64748b', coat: true, mesh: fuse(body) },
    {
      name: 'tailMesh',
      region: 'tail',
      color: '#334155',
      coat: false,
      mesh: fuseAt(tail, tailOrigin, 32),
      parent: 'tail',
      parentTranslation: tailOrigin,
    },
    ...cartoonEyes({ x: 0.72, y: 0.54, z: 0.13 }, '#1e293b'),
  ]
}

const recipes = {
  lion: lionParts,
  deer: deerParts,
  tiger: tigerParts,
  fish: fishParts,
  turtle: turtleParts,
  dolphin: dolphinParts,
}

for (const [id, fn] of Object.entries(recipes)) {
  console.log('authoring', id)
  const parts = fn()
  const dest = path.join(OUT, `${id}.glb`)
  const info = writeGlb(parts, dest)
  console.log(`  ${id}.glb  ${info.bytes} bytes  ${info.verts} verts  ${info.nodes} nodes`)
}
console.log('done', OUT)
