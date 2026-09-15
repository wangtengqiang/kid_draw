/** 小游戏 2D 画按钮。视觉跟网页 style.css 同一套糖果色、厚阴影。 */

const INK = '#4a3428'
const PAPER = '#fff6df'
const CREAM = '#fffaf0'
const CARD_SHADOW = '#d7c4a4'
const FACE = '"PingFang SC","Hiragino Sans GB","Heiti SC","Noto Sans SC",sans-serif'

function font(size, weight) {
  return (weight || 600) + ' ' + Math.round(size) + 'px ' + FACE
}

const STYLES = {
  '#ffe066': { ink: INK, shadow: '#e8b03a' },
  '#f2c14e': { ink: INK, shadow: '#e8b03a' },
  '#8fdd74': { ink: '#214a1c', shadow: '#5aaa48' },
  '#2f9e5f': { ink: '#214a1c', shadow: '#5aaa48' },
  '#ffb38a': { ink: '#7a3318', shadow: '#e88958' },
  '#8fd8f2': { ink: '#1b5570', shadow: '#5aadc8' },
  '#d4c2ff': { ink: '#4a3480', shadow: '#a992e0' },
  '#efe4d2': { ink: INK, shadow: CARD_SHADOW },
  '#fffaf1': { ink: INK, shadow: CARD_SHADOW },
  '#fff': { ink: INK, shadow: CARD_SHADOW },
  '#fff6e8': { ink: INK, shadow: CARD_SHADOW },
  '#ff8fa3': { ink: '#fffaf0', shadow: '#e06880' },
  '#e24b4b': { ink: '#fffaf0', shadow: '#e06880' },
  '#e89a2d': { ink: INK, shadow: '#c47a18' },
  '#f0b14a': { ink: INK, shadow: '#d49430' },
  '#c9965a': { ink: INK, shadow: '#a07840' },
  '#e6c36a': { ink: INK, shadow: '#c4a048' },
  '#1a120c': { ink: '#fffaf0', shadow: '#3a2a22' },
  '#c98989': { ink: INK, shadow: '#a56a6a' },
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function fillPath(ctx) {
  ctx.fill()
}

function strokePath(ctx) {
  ctx.stroke()
}

function paintPaper(ctx, W, H) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  const sun = ctx.createRadialGradient(W * 0.5, -20, 8, W * 0.5, 40, Math.max(W, 280))
  sun.addColorStop(0, 'rgba(255,233,168,0.95)')
  sun.addColorStop(1, 'rgba(255,233,168,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, W, H)
  const sky = ctx.createRadialGradient(W, H, 4, W, H, W * 0.85)
  sky.addColorStop(0, 'rgba(197,235,255,0.55)')
  sky.addColorStop(1, 'rgba(197,235,255,0)')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  const leaf = ctx.createRadialGradient(0, H, 4, 0, H, W * 0.75)
  leaf.addColorStop(0, 'rgba(216,245,200,0.5)')
  leaf.addColorStop(1, 'rgba(216,245,200,0)')
  ctx.fillStyle = leaf
  ctx.fillRect(0, 0, W, H)
}

function fillBtn(ctx, b, fillColor, text, fontSize) {
  const style = STYLES[fillColor] || { ink: INK, shadow: CARD_SHADOW }
  const lift = Math.max(4, Math.round(Math.min(b.h, 72) * 0.1))
  const radius = Math.min(b.h / 2, 28)
  ctx.fillStyle = style.shadow
  roundRect(ctx, b.x, b.y + lift, b.w, b.h - 2, radius)
  fillPath(ctx)
  ctx.fillStyle = fillColor
  roundRect(ctx, b.x, b.y, b.w, b.h - lift, radius)
  fillPath(ctx)
  ctx.fillStyle = style.ink
  ctx.font = font(fontSize || Math.min(30, b.h * 0.42), 600)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text == null ? '' : String(text), b.x + b.w / 2, b.y + (b.h - lift) / 2)
}

function fillCard(ctx, b, fillColor) {
  const radius = Math.min(28, b.h / 4)
  ctx.fillStyle = CARD_SHADOW
  roundRect(ctx, b.x, b.y + 8, b.w, b.h - 4, radius)
  fillPath(ctx)
  ctx.fillStyle = fillColor || CREAM
  roundRect(ctx, b.x, b.y, b.w, b.h - 8, radius)
  fillPath(ctx)
}

function textLink(ctx, b, text, size) {
  ctx.fillStyle = 'rgba(74,52,40,0.48)'
  ctx.font = font(size || 20, 500)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2)
}

function kicker(ctx, text, x, y) {
  ctx.fillStyle = 'rgba(74,52,40,0.42)'
  ctx.font = font(14, 500)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

function crayonChip(ctx, b, hex, on) {
  const radius = Math.min(16, b.w / 2)
  const y = on ? b.y - 5 : b.y
  ctx.fillStyle = 'rgba(58,36,24,0.16)'
  roundRect(ctx, b.x, y + 6, b.w, b.h - 2, radius)
  fillPath(ctx)
  ctx.fillStyle = hex
  roundRect(ctx, b.x, y, b.w, b.h - 6, radius)
  fillPath(ctx)
  if (on) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    roundRect(ctx, b.x, y, b.w, b.h - 6, radius)
    strokePath(ctx)
  }
}

function hit(buttons, x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i]
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b
  }
  return null
}

function title(ctx, text, x, y, size) {
  ctx.fillStyle = INK
  ctx.font = font(size || 36, 600)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

function lead(ctx, text, x, y) {
  ctx.fillStyle = 'rgba(74,52,40,0.68)'
  ctx.font = font(18, 400)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

function leadWrap(ctx, text, x, y, maxW) {
  ctx.fillStyle = 'rgba(74,52,40,0.68)'
  ctx.font = font(17, 400)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const chars = String(text || '').split('')
  const lines = []
  let row = ''
  chars.forEach((ch) => {
    const next = row + ch
    if (row && ctx.measureText(next).width > maxW) {
      lines.push(row)
      row = ch
    } else row = next
  })
  if (row) lines.push(row)
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * 26))
  return lines.length
}

module.exports = {
  CARD_SHADOW,
  CREAM,
  FACE,
  INK,
  PAPER,
  crayonChip,
  fillBtn,
  fillCard,
  font,
  hit,
  kicker,
  lead,
  leadWrap,
  paintPaper,
  roundRect,
  textLink,
  title,
}
