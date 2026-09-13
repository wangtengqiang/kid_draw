/** 小游戏 2D 画按钮。不是某个用例，两端屏幕都可以用。 */

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

function fillBtn(ctx, b, fill, text, size) {
  ctx.fillStyle = fill
  roundRect(ctx, b.x, b.y, b.w, b.h, 22)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.font = `800 ${size || 28}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2)
}

function hit(buttons, x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i]
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b
  }
  return null
}

function title(ctx, text, x, y, size) {
  ctx.fillStyle = '#1a120c'
  ctx.font = `800 ${size || 40}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

function lead(ctx, text, x, y) {
  ctx.fillStyle = 'rgba(26,18,12,0.75)'
  ctx.font = '22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, x, y)
}

module.exports = { roundRect, fillBtn, hit, title, lead }
