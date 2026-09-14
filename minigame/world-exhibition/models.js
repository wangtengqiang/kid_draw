/**
 * 世界观展：把已送出的分区色画成侧视动物。
 * 不读涂色画布。网页 3D 在 web/src/world-exhibition/models.ts。
 */
const { DEFAULTS } = require('../types.js')

function colorsOf(animalId, painted) {
  const base = DEFAULTS[animalId] || {}
  const out = {}
  Object.keys(base).forEach((k) => {
    out[k] = (painted && painted[k]) || base[k]
  })
  return out
}

function poly(ctx, pts, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke || '#1a120c'
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawAnimal(ctx, animalId, painted, box) {
  const c = colorsOf(animalId, painted)
  const x = box.x + box.w / 2
  const y = box.y + box.h * 0.62
  const s = Math.min(box.w, box.h) * 0.38
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)

  if (animalId === 'deer') {
    ctx.strokeStyle = '#1a120c'
    ctx.lineWidth = 0.08
    ctx.lineCap = 'round'
    ;[
      [-0.45, 0.05, -0.5, 0.7],
      [-0.28, 0.05, -0.22, 0.7],
      [0.35, 0.0, 0.42, 0.7],
      [0.5, 0.0, 0.48, 0.7],
    ].forEach((p) => {
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(p[2], p[3])
      ctx.stroke()
    })
    poly(ctx, [[-0.7, -0.05], [-0.55, -0.25], [-0.35, -0.2], [0.15, -0.28], [0.45, -0.15], [0.5, 0.05], [0.35, 0.2], [-0.4, 0.18]], c.body)
    poly(ctx, [[0.35, -0.15], [0.55, -0.45], [0.72, -0.55], [0.62, -0.28], [0.42, -0.08]], c.head || c.body)
    ctx.strokeStyle = c.antler || '#8b6914'
    ctx.lineWidth = 0.07
    ctx.beginPath()
    ctx.moveTo(0.55, -0.5)
    ctx.lineTo(0.48, -0.85)
    ctx.moveTo(0.52, -0.65)
    ctx.lineTo(0.35, -0.82)
    ctx.stroke()
  } else if (animalId === 'tiger') {
    poly(ctx, [[-0.75, 0.05], [-0.55, -0.28], [0.35, -0.3], [0.55, -0.1], [0.5, 0.18], [-0.5, 0.2]], c.body)
    poly(ctx, [[0.4, -0.15], [0.48, -0.48], [0.78, -0.42], [0.85, -0.18], [0.7, 0.02]], c.head || c.body)
    ctx.strokeStyle = '#1a120c'
    ctx.lineWidth = 0.05
    ;[-0.4, -0.15, 0.1].forEach((sx) => {
      ctx.beginPath()
      ctx.moveTo(sx, -0.22)
      ctx.lineTo(sx + 0.08, 0.12)
      ctx.stroke()
    })
  } else {
    poly(ctx, [[-0.65, 0.08], [-0.45, -0.22], [0.3, -0.24], [0.5, 0.0], [0.4, 0.2], [-0.4, 0.22]], c.body)
    ctx.beginPath()
    ctx.arc(0.55, -0.28, 0.42, 0, Math.PI * 2)
    ctx.fillStyle = c.mane || '#d4922a'
    ctx.fill()
    ctx.stroke()
    poly(ctx, [[0.4, -0.18], [0.5, -0.42], [0.75, -0.38], [0.8, -0.15], [0.62, 0.0]], c.head || c.body)
  }
  ctx.restore()
}

module.exports = { drawAnimal }
