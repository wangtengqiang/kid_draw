/**
 * 儿童创作用例界面：选一只 → 大蜡笔涂色 → 送进世界。
 * 不换主题、不进主机森林、不打开 3D 预览。
 */
const { fillBtn, hit, lead, title } = require('../draw.js')
const { ANIMAL_IDS, ANIMAL_NAMES, PALETTE } = require('../types.js')
const { drawAnimal } = require('./lineart.js')
const { PaintSurface } = require('./paint.js')
const { sendToWorld } = require('./send-to-world.js')

function ChildCreation(api) {
  this.api = api
  this.paint = null
  this.msg = ''
  this.sending = false
}

ChildCreation.prototype.dispose = function () {
  this.paint = null
  this.sending = false
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
  const stage = { x: 16, y: 76, w: W - 32, h: H * 0.5 }
  ctx.fillStyle = '#fff'
  ctx.fillRect(stage.x, stage.y, stage.w, stage.h)
  drawAnimal(ctx, animalId, this.paint.painted, stage)
  const crayons = []
  const cw = Math.min(44, (W - 32) / PALETTE.length - 4)
  PALETTE.forEach((c, i) => {
    const b = {
      id: 'crayon',
      hex: c.hex,
      x: 16 + i * (cw + 4),
      y: stage.y + stage.h + 12,
      w: cw,
      h: 56,
    }
    ctx.fillStyle = c.hex
    ctx.fillRect(b.x, b.y, b.w, b.h)
    if (this.paint.colorHex === c.hex) {
      ctx.strokeStyle = '#1a120c'
      ctx.lineWidth = 4
      ctx.strokeRect(b.x, b.y, b.w, b.h)
    }
    crayons.push(b)
  })
  const send = { id: 'send', x: 20, y: H - 108, w: W - 40, h: 84, roomId: roomId, animalId: animalId }
  fillBtn(ctx, send, this.sending ? '#c98989' : '#e24b4b', this.sending ? '正在送…' : '送进世界', 34)
  ctx.fillStyle = '#1a120c'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(this.msg, W / 2, H - 120)
  return [back].concat(crayons, [send], [{ id: 'stage', x: stage.x, y: stage.y, w: stage.w, h: stage.h, animalId: animalId }])
}

ChildCreation.prototype.success = function (ctx, roomId, placed) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '送到啦', W / 2, 80, 44)
  lead(ctx, (ANIMAL_NAMES[placed.animalId] || '') + '走进主机世界了。', W / 2, 120)
  drawAnimal(ctx, placed.animalId, placed.regionColors, { x: 40, y: 140, w: W - 80, h: H * 0.42 })
  const again = { id: 'pick', x: 28, y: H - 120, w: W - 56, h: 76, roomId: roomId }
  fillBtn(ctx, again, '#2f9e5f', '再画一只', 30)
  return [again]
}

ChildCreation.prototype.touch = function (screen, btn, x, y) {
  const go = this.api.go
  if (!btn) return
  if (btn.id === 'home') go({ name: 'home' })
  else if (btn.id === 'pick') go({ name: 'pick', roomId: btn.roomId || screen.roomId })
  else if (btn.id.indexOf('animal:') === 0) go({ name: 'paint', roomId: btn.roomId, animalId: btn.animalId })
  else if (btn.id === 'crayon' && this.paint) this.paint.colorHex = btn.hex
  else if (btn.id === 'stage' && this.paint) {
    const name = drawAnimal(
      this.api.ctx,
      btn.animalId,
      this.paint.painted,
      btn,
      { x: x, y: y },
    )
    this.paint.fillRegion(name)
  } else if (btn.id === 'send') this.send(btn.roomId, btn.animalId)
}

ChildCreation.prototype.send = function (roomId, animalId) {
  if (!this.paint || this.sending) return
  const self = this
  this.sending = true
  this.msg = '正在送…'
  sendToWorld({ roomId: roomId, animalId: animalId, paint: this.paint }).then(function (result) {
    self.sending = false
    if (!result.ok) {
      const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
      self.msg = reasons[result.reason] || '等一等再送'
      return
    }
    self.api.go({ name: 'success', roomId: roomId, placed: result.placed, thumb: result.item.thumb })
  })
}

ChildCreation.prototype.hit = hit

module.exports = { ChildCreation }
