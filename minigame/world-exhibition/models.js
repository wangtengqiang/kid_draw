/**
 * 世界观展：把孩子的颜色叠在官方角色正面快照上。
 * 不是叠椭圆雪人，也不是兔子耳朵鹿。网页 3D 在 web/src/world-exhibition/art-cutout.ts。
 */
const { DEFAULTS } = require('../types.js')
const { drawSnapshot } = require('./snapshots.js')

function colorsOf(animalId, painted) {
  const base = DEFAULTS[animalId] || {}
  const out = {}
  Object.keys(base).forEach((k) => {
    out[k] = (painted && painted[k]) || base[k]
  })
  return out
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function paintShape(ctx, outlineOnly, fill, draw) {
  draw()
  if (!outlineOnly && fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.strokeStyle = '#1a120c'
  ctx.stroke()
}

function drawFace(ctx, outlineOnly) {
  if (outlineOnly) return
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.arc(-0.07, -0.2, 0.032, 0, Math.PI * 2)
  ctx.arc(0.07, -0.2, 0.032, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fffaf1'
  ctx.beginPath()
  ctx.arc(-0.058, -0.212, 0.01, 0, Math.PI * 2)
  ctx.arc(0.082, -0.212, 0.01, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 0.026
  ctx.beginPath()
  ctx.arc(0, -0.1, 0.09, 0.18 * Math.PI, 0.82 * Math.PI)
  ctx.stroke()
}

function drawLegs(ctx, outlineOnly, fill) {
  ;[
    [-0.2, 0.22, 0.1, 0.2],
    [0.1, 0.22, 0.1, 0.2],
    [-0.28, 0.2, 0.09, 0.18],
    [0.19, 0.2, 0.09, 0.18],
  ].forEach((p) => {
    paintShape(ctx, outlineOnly, fill, function () {
      rr(ctx, p[0], p[1], p[2], p[3], 0.04)
    })
  })
}

function drawCubeBody(ctx, outlineOnly, body, belly) {
  paintShape(ctx, outlineOnly, body, function () {
    rr(ctx, -0.28, -0.06, 0.56, 0.4, 0.08)
  })
  paintShape(ctx, outlineOnly, belly || body, function () {
    rr(ctx, -0.16, 0.08, 0.32, 0.18, 0.08)
  })
}

function drawCubeHead(ctx, outlineOnly, head) {
  paintShape(ctx, outlineOnly, head, function () {
    rr(ctx, -0.2, -0.44, 0.4, 0.36, 0.08)
  })
}

function drawDeer(ctx, outlineOnly, c) {
  drawLegs(ctx, outlineOnly, c.leg || c.body)
  drawCubeBody(ctx, outlineOnly, c.body, c.belly)
  ctx.strokeStyle = c.antler || '#8b6914'
  ctx.lineWidth = outlineOnly ? 0.03 : 0.045
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-0.1, -0.44)
  ctx.lineTo(-0.16, -0.7)
  ctx.moveTo(-0.14, -0.6)
  ctx.lineTo(-0.28, -0.66)
  ctx.moveTo(0.1, -0.44)
  ctx.lineTo(0.16, -0.7)
  ctx.moveTo(0.14, -0.6)
  ctx.lineTo(0.28, -0.66)
  ctx.stroke()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 0.028
  paintShape(ctx, outlineOnly, c.head || c.body, function () {
    ctx.beginPath()
    ctx.moveTo(-0.18, -0.42)
    ctx.lineTo(-0.26, -0.54)
    ctx.lineTo(-0.08, -0.46)
    ctx.closePath()
  })
  paintShape(ctx, outlineOnly, c.head || c.body, function () {
    ctx.beginPath()
    ctx.moveTo(0.18, -0.42)
    ctx.lineTo(0.26, -0.54)
    ctx.lineTo(0.08, -0.46)
    ctx.closePath()
  })
  drawCubeHead(ctx, outlineOnly, c.head || c.body)
  drawFace(ctx, outlineOnly)
}

function drawTiger(ctx, outlineOnly, c) {
  drawLegs(ctx, outlineOnly, c.leg || c.body)
  drawCubeBody(ctx, outlineOnly, c.body, c.belly)
  paintShape(ctx, outlineOnly, c.head || c.body, function () {
    ctx.beginPath()
    ctx.moveTo(-0.16, -0.4)
    ctx.lineTo(-0.24, -0.56)
    ctx.lineTo(-0.04, -0.46)
    ctx.closePath()
  })
  paintShape(ctx, outlineOnly, c.head || c.body, function () {
    ctx.beginPath()
    ctx.moveTo(0.16, -0.4)
    ctx.lineTo(0.24, -0.56)
    ctx.lineTo(0.04, -0.46)
    ctx.closePath()
  })
  drawCubeHead(ctx, outlineOnly, c.head || c.body)
  if (!outlineOnly) {
    ctx.strokeStyle = '#1a120c'
    ctx.lineWidth = 0.03
    ctx.lineCap = 'round'
    ;[-0.14, -0.02, 0.1].forEach(function (x) {
      ctx.beginPath()
      ctx.moveTo(x, -0.02)
      ctx.lineTo(x + 0.04, 0.22)
      ctx.stroke()
    })
    ctx.beginPath()
    ctx.moveTo(-0.12, -0.28)
    ctx.lineTo(-0.04, -0.16)
    ctx.moveTo(0.12, -0.28)
    ctx.lineTo(0.04, -0.16)
    ctx.stroke()
  }
  drawFace(ctx, outlineOnly)
}

function drawLion(ctx, outlineOnly, c) {
  drawLegs(ctx, outlineOnly, c.leg || c.body)
  drawCubeBody(ctx, outlineOnly, c.body, c.belly)
  const mane = c.mane || '#d4922a'
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    paintShape(ctx, outlineOnly, mane, function () {
      rr(ctx, Math.cos(a) * 0.28 - 0.09, Math.sin(a) * 0.28 - 0.28, 0.18, 0.18, 0.06)
    })
  }
  drawCubeHead(ctx, outlineOnly, c.head || c.body)
  drawFace(ctx, outlineOnly)
}

function coatText(thumb) {
  if (!thumb) return ''
  if (typeof thumb === 'string') return thumb
  if (typeof thumb.url === 'string') return thumb.url
  if (typeof thumb.thumb === 'string') return thumb.thumb
  return ''
}

function drawCoat(ctx, thumb, box) {
  const raw = coatText(thumb)
  if (!raw || raw.charAt(0) !== '{') return
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return
  }
  const strokes = data.strokes || []
  if (!strokes.length) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  const s = Math.min(box.w, box.h)
  const scale = s / 360
  strokes.forEach((stroke) => {
    if (stroke.points && stroke.points.length) {
      ctx.strokeStyle = stroke.hex
      ctx.fillStyle = stroke.hex
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = Math.max(1, (stroke.width || 8) * scale)
      ctx.beginPath()
      stroke.points.forEach((pt, i) => {
        const px = box.x + pt.x * box.w
        const py = box.y + pt.y * box.h
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      if (stroke.points.length === 1) {
        const pt = stroke.points[0]
        ctx.beginPath()
        ctx.arc(box.x + pt.x * box.w, box.y + pt.y * box.h, ctx.lineWidth / 2, 0, Math.PI * 2)
        ctx.fill()
      } else ctx.stroke()
      return
    }
    if (stroke.x == null) return
    ctx.fillStyle = stroke.hex
    ctx.beginPath()
    ctx.arc(
      box.x + stroke.x * box.w,
      box.y + stroke.y * box.h,
      Math.max(1, (stroke.r || 0.02) * s),
      0,
      Math.PI * 2,
    )
    ctx.fill()
  })
  ctx.restore()
}

/**
 * 在矩形里画一只能认出的方块宠物。
 * opts.outlineOnly 只描线，给涂色纸当样子，不锁分区。
 * opts.coat 是小朋友画板上的原始笔迹，原样叠上去，不拉直。
 */
function drawAnimal(ctx, animalId, painted, box, opts) {
  const outlineOnly = opts && opts.outlineOnly
  const coat = opts && opts.coat
  const stand = opts && opts.stand
  if (!outlineOnly && !stand && drawSnapshot(ctx, animalId, coat ? { body: '#ffffff' } : painted, box)) {
    if (coat) drawCoat(ctx, coat, box)
    return
  }
  const c = colorsOf(animalId, painted)
  const s = Math.min(box.w, box.h) * 0.9
  const x = box.x + box.w / 2
  const y = box.y + box.h * 0.56
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.028
  if (animalId === 'deer') drawDeer(ctx, outlineOnly, c)
  else if (animalId === 'tiger') drawTiger(ctx, outlineOnly, c)
  else drawLion(ctx, outlineOnly, c)
  ctx.restore()
  if (!outlineOnly && coat) drawCoat(ctx, coat, box)
}

module.exports = { drawAnimal, colorsOf, drawCoat, coatText }
