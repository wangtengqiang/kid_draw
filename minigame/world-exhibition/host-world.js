/**
 * 主机世界：2.5D。动物在地面 xz 上走，近大远小，远的先画。
 * 不是把照片左右平移，也不是 Three.js（完整 3D 只在网页）。
 */
const { drawAnimal, drawCoat } = require('./models.js')
const { cutoutAspect, cutoutImage, drawStandingCutout } = require('./cutouts.js')

const TREES = [
  { x: -0.92, z: 0.18, s: 1.15 },
  { x: 0.9, z: 0.2, s: 1.25 },
  { x: -0.7, z: 0.42, s: 0.82 },
  { x: 0.72, z: 0.48, s: 0.9 },
  { x: -0.38, z: 0.12, s: 0.7 },
  { x: 0.34, z: 0.1, s: 0.62 },
  { x: -1.05, z: 0.58, s: 1.05 },
  { x: 1.02, z: 0.62, s: 1.1 },
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
  ;(list || []).forEach((a, i) => {
    seen[a.id] = true
    const exist = this.actors.filter((x) => x.id === a.id)[0]
    if (exist) {
      if (a.thumb) exist.thumb = a.thumb
      if (a.regionColors) exist.regionColors = a.regionColors
      return
    }
    this.actors.push({
      id: a.id,
      animalId: a.animalId,
      regionColors: a.regionColors,
      thumb: a.thumb || '',
      angle: (i / Math.max(1, (list || []).length)) * Math.PI * 2 + 0.35,
      radius: 0.62 + (i % 3) * 0.1,
      speed: 0.16 + (i % 4) * 0.03,
      wx: 0,
      wz: 0.45,
      flip: false,
      action: 'walk',
    })
  })
  this.actors = this.actors.filter((a) => seen[a.id])
}

function project(wx, wz, box) {
  const z = Math.max(0.04, Math.min(0.96, wz))
  const horizon = box.y + box.h * 0.36
  const nearY = box.y + box.h * 0.9
  const persp = 0.34 + 0.66 * z
  return {
    x: box.x + box.w / 2 + wx * box.w * 0.46 * persp,
    y: horizon + z * (nearY - horizon),
    persp: persp,
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

HostWorld.prototype.placeActor = function (actor, dt) {
  actor.action = this.theme === 'underwater' ? 'swim' : 'walk'
  actor.angle += actor.speed * dt
  actor.wx = Math.cos(actor.angle) * actor.radius
  actor.wz = 0.3 + (Math.sin(actor.angle) * 0.5 + 0.5) * 0.38
  const vx = -Math.sin(actor.angle)
  if (vx > 0.18) actor.flip = false
  else if (vx < -0.18) actor.flip = true
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
  blob(ctx, x + w / 2, y + h * 0.78, w * 0.48, h * 0.1, this.theme === 'snow' ? 'rgba(210,226,240,0.55)' : 'rgba(46,96,42,0.28)')
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

HostWorld.prototype.drawPet = function (ctx, actor, p) {
  const h = 168 * p.persp
  const aspect = cutoutAspect(actor.animalId)
  const w = h * aspect
  blob(ctx, p.x, p.y + 4, 28 * p.persp, 8 * p.persp, 'rgba(26,18,12,0.18)')
  ctx.save()
  ctx.translate(p.x, p.y)
  if (actor.flip) ctx.scale(-1, 1)
  const img = cutoutImage(actor.animalId)
  const local = { x: -w / 2, y: -h, w: w, h: h }
  if (img && img.width) {
    const sheet = this.petSheet(w, h)
    if (sheet && sheet.ctx) {
      const o = sheet.ctx
      o.globalCompositeOperation = 'source-over'
      o.clearRect(0, 0, sheet.w, sheet.h)
      o.drawImage(img, 0, 0, w, h)
      if (actor.thumb) {
        o.save()
        o.globalCompositeOperation = 'source-atop'
        drawCoat(o, actor.thumb, { x: 0, y: 0, w: w, h: h })
        o.restore()
      }
      ctx.drawImage(sheet.canvas, 0, 0, w, h, -w / 2, -h, w, h)
    } else {
      drawStandingCutout(ctx, actor.animalId, 0, 0, h, null)
      if (actor.thumb) drawCoat(ctx, actor.thumb, local)
    }
  } else {
    drawAnimal(ctx, actor.animalId, {}, local, { coat: actor.thumb, stand: true, blank: true })
  }
  ctx.restore()
}

HostWorld.prototype.render = function (ctx, box) {
  const now = Date.now()
  const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
  this.last = now

  this.drawSet(ctx, box)
  this.actors.forEach((a) => this.placeActor(a, dt))

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
