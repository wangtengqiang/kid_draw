/**
 * 儿童创作用例界面：选一只 → 自由蜡笔涂色 → 送进世界。
 * 送到后可进主机世界。不打开网页 Three.js。
 */
const { fillBtn, hit, lead, title } = require('../draw.js')
const { ANIMAL_IDS, ANIMAL_NAMES, PALETTE } = require('../types.js')
const { drawAnimal, drawLineGuide } = require('./lineart.js')
const { PaintSurface } = require('./paint.js')
const { sendToWorld } = require('./send-to-world.js')

const BRUSH_SIZES = [
  { name: '细', size: 12 },
  { name: '中', size: 28 },
  { name: '粗', size: 56 },
]

function ChildCreation(api) {
  this.api = api
  this.paint = null
  this.sentPaint = null
  this.msg = ''
  this.sending = false
  this.painting = false
  this.stageBox = null
}

ChildCreation.prototype.dispose = function () {
  this.sending = false
  this.painting = false
  this.stageBox = null
}

ChildCreation.prototype.needScan = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '请扫老师的码', W / 2, H * 0.32, 40)
  lead(ctx, '扫完就能画画。不用输入数字。', W / 2, H * 0.4)
  const back = { id: 'home', x: 24, y: 24, w: 120, h: 52 }
  fillBtn(ctx, back, '#efe4d2', '返回', 22)
  return [back]
}

ChildCreation.prototype.ended = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '展览结束啦', W / 2, H * 0.36, 40)
  const ok = { id: 'home', x: 40, y: H * 0.48, w: W - 80, h: 72 }
  fillBtn(ctx, ok, '#2f9e5f', '好', 28)
  return [ok]
}

ChildCreation.prototype.pick = function (ctx, roomId) {
  const W = this.api.W
  const buttons = []
  title(ctx, '选一只', W / 2, 70, 44)
  lead(ctx, '点一张大卡片就开始涂。', W / 2, 108)
  const cardH = (this.api.H - 140) / 3 - 12
  ANIMAL_IDS.forEach((id, i) => {
    const y = 130 + i * (cardH + 12)
    const b = { id: 'animal:' + id, x: 28, y: y, w: W - 56, h: cardH, animalId: id, roomId: roomId }
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.rect(b.x, b.y, b.w, b.h)
    ctx.fill()
    drawAnimal(ctx, id, null, { x: b.x, y: b.y, w: b.w, h: b.h - 36 })
    ctx.fillStyle = '#1a120c'
    ctx.font = '800 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(ANIMAL_NAMES[id], W / 2, b.y + b.h - 14)
    buttons.push(b)
  })
  return buttons
}

ChildCreation.prototype.paintScreen = function (ctx, roomId, animalId) {
  if (!this.paint || this.paint.animalId !== animalId) {
    this.paint = new PaintSurface(animalId)
    this.msg = ''
  }
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'pick', x: 16, y: 16, w: 140, h: 48, roomId: roomId }
  fillBtn(ctx, back, '#efe4d2', '重选动物', 20)
  const stage = { id: 'stage', x: 16, y: 72, w: W - 32, h: H * 0.42, animalId: animalId }
  this.paint.drawOnto(ctx, stage)
  drawLineGuide(ctx, animalId, stage)
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 3
  ctx.strokeRect(stage.x, stage.y, stage.w, stage.h)

  const sizes = []
  const sy = stage.y + stage.h + 10
  BRUSH_SIZES.forEach((item, i) => {
    const b = { id: 'brush-size', size: item.size, x: 16 + i * 78, y: sy, w: 72, h: 48 }
    fillBtn(ctx, b, this.paint.brush === item.size ? '#f2c14e' : '#fff', item.name, 22)
    sizes.push(b)
  })
  const eraser = { id: 'eraser', x: W - 108, y: sy, w: 92, h: 48 }
  fillBtn(ctx, eraser, this.paint.tool === 'eraser' ? '#c98989' : '#efe4d2', '橡皮', 20)

  const crayons = []
  const cw = Math.min(44, (W - 32) / PALETTE.length - 4)
  PALETTE.forEach((c, i) => {
    const b = {
      id: 'crayon',
      hex: c.hex,
      x: 16 + i * (cw + 4),
      y: sy + 56,
      w: cw,
      h: 52,
    }
    ctx.fillStyle = c.hex
    ctx.fillRect(b.x, b.y, b.w, b.h)
    if (this.paint.colorHex === c.hex && this.paint.tool === 'brush') {
      ctx.strokeStyle = '#1a120c'
      ctx.lineWidth = 4
      ctx.strokeRect(b.x, b.y, b.w, b.h)
    }
    crayons.push(b)
  })
  const send = { id: 'send', x: 20, y: H - 100, w: W - 40, h: 78, roomId: roomId, animalId: animalId }
  fillBtn(ctx, send, this.sending ? '#c98989' : '#e24b4b', this.sending ? '正在送…' : '送进世界', 32)
  ctx.fillStyle = '#1a120c'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(this.msg || '拿蜡笔在纸上随便涂。线是样子。', W / 2, H - 112)
  return [back].concat(sizes, [eraser], crayons, [send], [stage])
}

ChildCreation.prototype.success = function (ctx, roomId, placed) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '送到啦', W / 2, 70, 44)
  lead(ctx, (ANIMAL_NAMES[placed.animalId] || '') + '走进主机世界了。', W / 2, 108)
  const box = { x: 36, y: 128, w: W - 72, h: H * 0.38 }
  ctx.fillStyle = '#e8f2d2'
  ctx.fillRect(box.x, box.y, box.w, box.h)
  drawAnimal(ctx, placed.animalId, placed.regionColors, box)
  const world = { id: 'open-world', x: 24, y: H - 196, w: W - 48, h: 88, roomId: roomId }
  fillBtn(ctx, world, '#f2c14e', '去看大世界', 34)
  const again = { id: 'pick', x: 28, y: H - 96, w: W - 56, h: 68, roomId: roomId }
  fillBtn(ctx, again, '#2f9e5f', '再画一只', 28)
  return [world, again]
}

ChildCreation.prototype.touch = function (screen, btn, x, y) {
  const go = this.api.go
  if (!btn) return
  if (btn.id === 'home') go({ name: 'home' })
  else if (btn.id === 'pick') go({ name: 'pick', roomId: btn.roomId || screen.roomId })
  else if (btn.id === 'open-world') go({ name: 'host', roomId: btn.roomId || screen.roomId })
  else if (btn.id.indexOf('animal:') === 0) go({ name: 'paint', roomId: btn.roomId, animalId: btn.animalId })
  else if (btn.id === 'brush-size' && this.paint) {
    this.paint.brush = btn.size
    this.paint.tool = 'brush'
  } else if (btn.id === 'eraser' && this.paint) {
    this.paint.tool = this.paint.tool === 'eraser' ? 'brush' : 'eraser'
  } else if (btn.id === 'crayon' && this.paint) {
    this.paint.colorHex = btn.hex
    this.paint.tool = 'brush'
  } else if (btn.id === 'stage' && this.paint) {
    this.painting = true
    this.stageBox = btn
    this.paint.endStroke()
    this.paint.brushAt((x - btn.x) / btn.w, (y - btn.y) / btn.h)
  } else if (btn.id === 'send') this.send(btn.roomId, btn.animalId)
}

ChildCreation.prototype.paintMove = function (x, y) {
  if (!this.painting || !this.paint || !this.stageBox) return
  const b = this.stageBox
  this.paint.brushAt((x - b.x) / b.w, (y - b.y) / b.h)
}

ChildCreation.prototype.paintEnd = function () {
  this.painting = false
  this.stageBox = null
  if (this.paint) this.paint.endStroke()
}

ChildCreation.prototype.send = function (roomId, animalId) {
  if (!this.paint || this.sending) return
  const self = this
  this.sending = true
  this.msg = '正在送…'
  const started = animalId || this.paint.animalId
  sendToWorld({ roomId: roomId, animalId: started, paint: this.paint }).then(function (result) {
    self.sending = false
    if (!result.ok) {
      const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
      self.msg = reasons[result.reason] || '等一等再送'
      return
    }
    self.sentPaint = self.paint
    self.api.go({ name: 'success', roomId: roomId, placed: result.placed, thumb: result.item.thumb })
  })
}

ChildCreation.prototype.hit = hit

module.exports = { ChildCreation }
