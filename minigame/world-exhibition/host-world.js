/**
 * 主机世界：2.5D。动物在地面 xz 上走，近大远小，远的先画。
 * 不是把照片左右平移，也不是 Three.js（完整 3D 只在网页）。
 */
const { drawAnimal, drawCoat, isNatural } = require('./models.js')
const { cutoutAspect, cutoutImage, drawStandingCutout, makeCanvas } = require('./cutouts.js')
const { drawRiggedCutout } = require('./rig.js')

const X_MIN = -1.28
const X_MAX = 1.28
const Z_MIN = 0.06
const Z_MAX = 0.98
const PACK = 0.42
const SPREAD_GEN = 3

function hash01(s, salt) {
  let h = salt || 7
  String(s || '').split('').forEach((ch) => {
    h = (h * 33 + ch.charCodeAt(0)) >>> 0
  })
  return (h % 10000) / 10000
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function spawnSlot(i, n) {
  const count = Math.max(1, n)
  const rows = count <= 4 ? 2 : 3
  const cols = Math.ceil(count / rows)
  const row = Math.floor(i / cols)
  const col = i % cols
  const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols
  const stagger = (row % 2) * 0.5
  return {
    wx: X_MIN + 0.16 + ((col + 0.5 + stagger) / Math.max(1, inRow + stagger)) * (X_MAX - X_MIN - 0.32),
    wz: Z_MIN + 0.04 + ((row + 0.5) / rows) * (Z_MAX - Z_MIN - 0.08),
  }
}

function pickWander(actor, others) {
  let tx = actor.wx
  let tz = actor.wz
  for (let n = 0; n < 14; n++) {
    tx = X_MIN + 0.08 + Math.random() * (X_MAX - X_MIN - 0.16)
    tz = Z_MIN + 0.04 + Math.random() * (Z_MAX - Z_MIN - 0.08)
    const crowd = (others || []).some(
      (o) => o !== actor && Math.hypot((o.wx || 0) - tx, (o.wz || 0) - tz) < PACK,
    )
    if (!crowd) break
  }
  actor.tx = tx
  actor.tz = tz
  actor.hold = 2.2 + Math.random() * 5.5
}

const TREES = [
  { x: -1.05, z: 0.1, s: 1.15 },
  { x: 1.02, z: 0.12, s: 1.25 },
  { x: -0.86, z: 0.34, s: 0.82 },
  { x: 0.9, z: 0.38, s: 0.9 },
  { x: -0.4, z: 0.06, s: 0.7 },
  { x: 0.36, z: 0.05, s: 0.62 },
  { x: -1.22, z: 0.52, s: 1.05 },
  { x: 1.2, z: 0.58, s: 1.1 },
]

function HostWorld() {
  this.theme = 'forest'
  this.actors = []
  this.t0 = Date.now()
  this.last = this.t0
}

HostWorld.prototype.applyTheme = function (theme) {
  this.theme = theme || 'forest'
}

HostWorld.prototype.syncAnimals = function (list) {
  const seen = {}
  const incoming = list || []
  incoming.forEach((a, i) => {
    seen[a.id] = true
    const exist = this.actors.filter((x) => x.id === a.id)[0]
    const slot = spawnSlot(i, incoming.length)
    if (exist) {
      if (a.thumb) exist.thumb = a.thumb
      if (a.regionColors) exist.regionColors = a.regionColors
      if (exist._spread !== SPREAD_GEN) {
        exist.wx = slot.wx
        exist.wz = slot.wz
        exist._spread = SPREAD_GEN
        pickWander(exist, this.actors)
      }
      return
    }
    this.actors.push({
      id: a.id,
      animalId: a.animalId,
      regionColors: a.regionColors,
      thumb: a.thumb || '',
      wx: slot.wx,
      wz: slot.wz,
      _spread: SPREAD_GEN,
      tx: 0,
      tz: 0,
      hold: 0,
      gait: hash01(a.id, 19) * Math.PI * 2,
      speed: 0.08 + hash01(a.id, 5) * 0.09,
      cadence: 2.0 + hash01(a.id, 23) * 2.2,
      flip: false,
      action: 'walk',
    })
    pickWander(this.actors[this.actors.length - 1], this.actors)
  })
  this.actors = this.actors.filter((a) => seen[a.id])
}

function project(wx, wz, box) {
  const z = Math.max(0.04, Math.min(1, wz))
  const horizon = box.y + box.h * 0.3
  const nearY = box.y + box.h * 0.84
  const spread = 0.7 + 0.32 * z
  return {
    x: box.x + box.w / 2 + wx * box.w * 0.46 * spread,
    y: horizon + z * (nearY - horizon),
    persp: 0.34 + 0.78 * z,
    z: z,
  }
}

function blob(ctx, x, y, rx, ry, fill) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(Math.max(1, rx), Math.max(1, ry))
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawTree(ctx, p, size, theme) {
  const h = 110 * p.persp * size
  const trunkW = Math.max(5, 9 * p.persp * size)
  ctx.fillStyle = theme === 'snow' ? '#6b5344' : '#8b5a2b'
  ctx.fillRect(p.x - trunkW / 2, p.y - h * 0.42, trunkW, h * 0.48)
  const leaf = theme === 'snow' ? '#eef6ff' : theme === 'underwater' ? '#2a8f78' : '#3f7a3a'
  const leaf2 = theme === 'snow' ? '#d7e8f6' : '#2f6a32'
  blob(ctx, p.x, p.y - h * 0.52, 24 * p.persp * size, 28 * p.persp * size, leaf)
  blob(ctx, p.x + 12 * p.persp * size, p.y - h * 0.4, 16 * p.persp * size, 18 * p.persp * size, leaf2)
}

HostWorld.prototype.placeActor = function (actor, dt, others) {
  actor.action = this.theme === 'underwater' ? 'swim' : 'walk'
  if (actor.tx == null || actor.tz == null) pickWander(actor, others)
  if (actor.gait == null) actor.gait = 0
  if (!actor.speed) actor.speed = 0.1
  if (!actor.cadence) actor.cadence = 2.4 + hash01(actor.id, 23) * 2.0
  actor.hold -= dt
  const dx = actor.tx - actor.wx
  const dz = actor.tz - actor.wz
  const dist = Math.hypot(dx, dz)
  if (dist < 0.08 || actor.hold <= 0) pickWander(actor, others)
  const ang = Math.atan2(actor.tz - actor.wz, actor.tx - actor.wx)
  const step = actor.speed * dt
  actor.wx = clamp(actor.wx + Math.cos(ang) * step, X_MIN, X_MAX)
  actor.wz = clamp(actor.wz + Math.sin(ang) * step, Z_MIN, Z_MAX)
  ;(others || []).forEach((o) => {
    if (o === actor) return
    const ox = actor.wx - o.wx
    const oz = actor.wz - o.wz
    const d = Math.hypot(ox, oz)
    if (d > 0.001 && d < PACK) {
      const push = ((PACK - d) / PACK) * 2.4 * dt
      actor.wx = clamp(actor.wx + (ox / d) * push, X_MIN, X_MAX)
      actor.wz = clamp(actor.wz + (oz / d) * push, Z_MIN, Z_MAX)
    }
  })
  if (actor.wx <= X_MIN || actor.wx >= X_MAX || actor.wz <= Z_MIN || actor.wz >= Z_MAX) {
    pickWander(actor, others)
  }
  actor.gait += dt * actor.cadence
  const vx = Math.cos(ang)
  if (vx > 0.12) actor.flip = false
  else if (vx < -0.12) actor.flip = true
}

HostWorld.prototype.drawSet = function (ctx, box) {
  const { x, y, w, h } = box
  const horizon = y + h * 0.36
  if (this.theme === 'snow') {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#cfe6f4')
    g.addColorStop(0.36, '#e7f2fb')
    g.addColorStop(1, '#f4f8ff')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    blob(ctx, x + w * 0.82, y + h * 0.14, 28, 28, '#fffef8')
  } else if (this.theme === 'underwater') {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#0b4f6c')
    g.addColorStop(0.4, '#147a8c')
    g.addColorStop(1, '#c2b280')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    blob(ctx, x + w * 0.2, y + h * 0.22, 12, 18, 'rgba(255,255,255,0.16)')
    blob(ctx, x + w * 0.7, y + h * 0.16, 9, 14, 'rgba(255,255,255,0.12)')
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#b9dff5')
    g.addColorStop(0.34, '#cfe6c4')
    g.addColorStop(1, '#4c8a46')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    blob(ctx, x + w * 0.84, y + h * 0.12, 30, 30, '#ffe066')
    blob(ctx, x + w * 0.22, horizon - 18, w * 0.28, 36, '#7da85a')
    blob(ctx, x + w * 0.7, horizon - 10, w * 0.34, 28, '#6fa35a')
  }
  ctx.fillStyle =
    this.theme === 'snow' ? 'rgba(244,248,255,0.92)' : this.theme === 'underwater' ? '#c2b280' : '#4c8a46'
  ctx.beginPath()
  ctx.moveTo(x, horizon)
  ctx.quadraticCurveTo(x + w * 0.5, horizon - 24, x + w, horizon)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fill()
  blob(
    ctx,
    x + w / 2,
    y + h * 0.76,
    w * 0.52,
    h * 0.14,
    this.theme === 'snow' ? 'rgba(210,226,240,0.55)' : 'rgba(46,96,42,0.28)',
  )
}

HostWorld.prototype.petSheet = function (w, h) {
  const cw = Math.max(32, Math.ceil(w))
  const ch = Math.max(32, Math.ceil(h))
  if (!this._sheet || this._sheet.w < cw || this._sheet.h < ch) {
    let canvas = null
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
      try {
        canvas = wx.createOffscreenCanvas({ type: '2d', width: cw, height: ch })
      } catch (e) {
        canvas = null
      }
    }
    if (!canvas && typeof document !== 'undefined') {
      canvas = document.createElement('canvas')
    }
    if (!canvas) return null
    canvas.width = cw
    canvas.height = ch
    this._sheet = { canvas: canvas, ctx: canvas.getContext('2d'), w: cw, h: ch }
  }
  return this._sheet
}

HostWorld.prototype.coatSheet = function (actor, white) {
  if (!actor.thumb || !white) return white
  if (actor._coat && actor._coatThumb === actor.thumb) return actor._coat
  const iw = white.width || 256
  const ih = white.height || 256
  const canvas = makeCanvas(iw, ih)
  if (!canvas) return white
  const c = canvas.getContext('2d')
  if (!c) return white
  c.clearRect(0, 0, iw, ih)
  c.drawImage(white, 0, 0, iw, ih)
  c.save()
  c.globalCompositeOperation = 'source-atop'
  drawCoat(c, actor.thumb, { x: 0, y: 0, w: iw, h: ih })
  c.restore()
  actor._coat = canvas
  actor._coatThumb = actor.thumb
  return canvas
}

HostWorld.prototype.drawPet = function (ctx, actor, p) {
  const h = 168 * p.persp
  const aspect = cutoutAspect(actor.animalId)
  const w = h * aspect
  blob(ctx, p.x, p.y + 4, 28 * p.persp, 8 * p.persp, 'rgba(26,18,12,0.18)')
  ctx.save()
  ctx.translate(p.x, p.y)
  if (actor.flip) ctx.scale(-1, 1)
  const natural = isNatural(actor.thumb)
  const img = cutoutImage(actor.animalId, { natural: natural })
  const local = { x: -w / 2, y: -h, w: w, h: h }
  if (img && img.width) {
    const src = natural ? img : this.coatSheet(actor, img)
    const padX = Math.ceil(w * 0.14)
    const padY = Math.ceil(h * 0.12)
    const sheet = this.petSheet(w + padX * 2, h + padY)
    if (sheet && sheet.ctx) {
      const o = sheet.ctx
      o.globalCompositeOperation = 'source-over'
      o.clearRect(0, 0, sheet.w, sheet.h)
      o.save()
      o.translate(padX, 0)
      if (!drawRiggedCutout(o, src, actor.animalId, w, h, actor.gait || 0)) {
        o.drawImage(src, 0, 0, w, h)
      }
      o.restore()
      ctx.drawImage(sheet.canvas, 0, 0, sheet.w, sheet.h, -w / 2 - padX, -h, sheet.w, sheet.h)
    } else {
      drawStandingCutout(ctx, actor.animalId, 0, 0, h, null)
      if (!natural && actor.thumb) drawCoat(ctx, actor.thumb, local)
    }
  } else {
    drawAnimal(ctx, actor.animalId, {}, local, { coat: actor.thumb, stand: true, blank: !natural })
  }
  ctx.restore()
}

HostWorld.prototype.render = function (ctx, box) {
  const now = Date.now()
  const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
  this.last = now

  this.drawSet(ctx, box)
  this.actors.forEach((a) => this.placeActor(a, dt, this.actors))

  const sprites = TREES.map((tree) => ({
    kind: 'tree',
    tree: tree,
    p: project(tree.x, tree.z, box),
  })).concat(
    this.actors.map((a) => ({
      kind: 'pet',
      actor: a,
      p: project(a.wx, a.wz, box),
    })),
  )
  sprites.sort((a, b) => a.p.z - b.p.z)
  sprites.forEach((s) => {
    if (s.kind === 'tree') drawTree(ctx, s.p, s.tree.s, this.theme)
    else this.drawPet(ctx, s.actor, s.p)
  })
}

HostWorld.prototype.dispose = function () {
  this.actors = []
}

module.exports = { HostWorld, project }
