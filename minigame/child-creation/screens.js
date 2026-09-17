/**
 * 儿童创作用例界面：选一只 → 自由蜡笔涂色 → 送进世界。
 * 送到后可进主机世界。不打开网页 Three.js。
 */
const { crayonChip, fillBtn, fillCard, font, hit, lead, leadWrap, roundRect, title } = require('../draw.js')
const { ANIMAL_IDS, ANIMAL_NAMES, DEFAULTS, PALETTE } = require('../types.js')
const { drawPickCard } = require('../art.js')
const { drawLineGuide } = require('./lineart.js')
const { drawAnimal } = require('../world-exhibition/models.js')
const { PaintSurface, BRUSH_SIZES, REF } = require('./paint.js')
const { sendToWorld } = require('./send-to-world.js')
const sync = require('../sync/index.js')

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
  this.paint = null
}

ChildCreation.prototype.needScan = function (ctx, next) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 18)
  title(ctx, '扫码进入', W / 2, H * 0.28, 36)
  leadWrap(ctx, '对准老师主机上的二维码。也可以从相册选一张。', W / 2, H * 0.34, W - 56)
  const scan = { id: 'scan-code', next: next || 'pick', x: 24, y: H * 0.5, w: W - 48, h: 84 }
  fillBtn(ctx, scan, '#8fd8f2', '扫一扫 / 选相册', 26)
  return [back, scan]
}

ChildCreation.prototype.ended = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '展览结束啦', W / 2, H * 0.34, 36)
  lead(ctx, '回首页再进一间新的房间。', W / 2, H * 0.4)
  const ok = { id: 'home', x: 28, y: H * 0.5, w: W - 56, h: 72 }
  fillBtn(ctx, ok, '#8fdd74', '回首页', 28)
  return [ok]
}

ChildCreation.prototype.pick = function (ctx, roomId) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 18)
  title(ctx, '选一只', W / 2, 86, 36)
  lead(ctx, '点一张大卡片就开始涂。', W / 2, 118)
  const buttons = [back]
  const top = 136
  const cardH = (H - top - 24) / 3 - 12
  ANIMAL_IDS.forEach((id, i) => {
    const y = top + i * (cardH + 12)
    const b = { id: 'animal:' + id, x: 22, y: y, w: W - 44, h: cardH, animalId: id, roomId: roomId }
    fillCard(ctx, b)
    drawPickCard(ctx, id, { x: b.x + 12, y: b.y + 8, w: b.w - 24, h: b.h - 48 })
    ctx.fillStyle = '#4a3428'
    ctx.font = font(24, 600)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(ANIMAL_NAMES[id], W / 2, b.y + b.h - 18)
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
  const back = { id: 'pick', x: 16, y: 14, w: 124, h: 46, roomId: roomId }
  const home = { id: 'home', x: 148, y: 14, w: 88, h: 46 }
  fillBtn(ctx, back, '#8fdd74', '重选', 18)
  fillBtn(ctx, home, '#efe4d2', '首页', 18)
  const stage = { id: 'stage', x: 18, y: 70, w: W - 36, h: H * 0.4, animalId: animalId }
  fillCard(ctx, { x: stage.x, y: stage.y, w: stage.w, h: stage.h + 8 }, '#fffaf1')
  ctx.save()
  roundRect(ctx, stage.x + 4, stage.y + 4, stage.w - 8, stage.h - 10, 22)
  ctx.clip()
  this.paint.drawOnto(ctx, stage)
  drawLineGuide(ctx, animalId, stage)
  ctx.restore()

  const sizes = []
  const sy = stage.y + stage.h + 12
  const slot = Math.min(64, (W - 128) / BRUSH_SIZES.length)
  BRUSH_SIZES.forEach((item, i) => {
    const selected = this.paint.brush === item.size && this.paint.tool === 'brush'
    const b = { id: 'brush-size', size: item.size, x: 12 + i * slot, y: sy, w: slot - 6, h: 58 }
    fillBtn(ctx, b, selected ? '#ffe066' : '#fffaf1', '', 13)
    const cx = b.x + b.w / 2
    const cy = b.y + 16
    const radius = Math.max(2, (item.size * Math.min(stage.w, stage.h)) / REF / 2)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = this.paint.colorHex
    ctx.fill()
    ctx.fillStyle = '#4a3428'
    ctx.font = font(13, 500)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(item.name, cx, b.y + b.h - 12)
    sizes.push(b)
  })
  const eraser = { id: 'eraser', x: W - 108, y: sy, w: 96, h: 58 }
  fillBtn(ctx, eraser, this.paint.tool === 'eraser' ? '#ffb38a' : '#efe4d2', '橡皮', 18)

  const crayons = []
  const cw = Math.min(42, (W - 32) / PALETTE.length - 4)
  PALETTE.forEach((c, i) => {
    const b = {
      id: 'crayon',
      hex: c.hex,
      x: 16 + i * (cw + 4),
      y: sy + 66,
      w: cw,
      h: 50,
    }
    crayonChip(ctx, b, c.hex, this.paint.colorHex === c.hex && this.paint.tool === 'brush')
    crayons.push(b)
  })
  const natural = {
    id: 'natural',
    x: 20,
    y: sy + 124,
    w: W - 40,
    h: 52,
  }
  const stdHex = (DEFAULTS[animalId] && DEFAULTS[animalId].body) || '#f0b14a'
  const stdOn = this.paint.tool === 'brush' && this.paint.colorHex === stdHex
  fillBtn(ctx, natural, stdOn ? '#ffe066' : stdHex, '标准色', 20)
  const send = { id: 'send', x: 20, y: H - 96, w: W - 40, h: 76, roomId: roomId, animalId: animalId }
  fillBtn(ctx, send, this.sending ? '#c98989' : '#ff8fa3', this.sending ? '正在送…' : '送进世界', 30)
  ctx.fillStyle = 'rgba(74,52,40,0.62)'
  ctx.font = font(16, 400)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(this.msg || '蜡笔涂。点标准色换回原来的颜色。线还在。', W / 2, send.y - 14)
  return [back, home].concat(sizes, [eraser], crayons, [natural, send], [stage])
}

ChildCreation.prototype.success = function (ctx, roomId, placed) {
  const W = this.api.W
  const H = this.api.H
  const home = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, home, '#efe4d2', '回首页', 18)
  title(ctx, '送到啦', W / 2, 86, 36)
  lead(ctx, (ANIMAL_NAMES[placed.animalId] || '') + '走进主机世界了。', W / 2, 118)
  const box = { x: 28, y: 136, w: W - 56, h: H * 0.36 }
  fillCard(ctx, box, '#d7e4c4')
  drawAnimal(ctx, placed.animalId, placed.regionColors, {
    x: box.x + 12,
    y: box.y + 8,
    w: box.w - 24,
    h: box.h - 20,
  })
  const world = { id: 'open-world', x: 24, y: H - 188, w: W - 48, h: 80, roomId: roomId }
  fillBtn(ctx, world, '#ffe066', '去看大世界', 28)
  const again = { id: 'pick', x: 24, y: H - 96, w: W - 48, h: 68, roomId: roomId }
  fillBtn(ctx, again, '#8fdd74', '再画一只', 24)
  return [home, world, again]
}

ChildCreation.prototype.touch = function (screen, btn, x, y) {
  const go = this.api.go
  if (!btn) return
  if (btn.id === 'home') go({ name: 'home' })
  else if (btn.id === 'scan-code') this.scanJoin(btn.next || 'pick')
  else if (btn.id === 'pick') go({ name: 'pick', roomId: btn.roomId || screen.roomId })
  else if (btn.id === 'open-world') go({ name: 'host', roomId: btn.roomId || screen.roomId })
  else if (btn.id.indexOf('animal:') === 0) go({ name: 'paint', roomId: btn.roomId, animalId: btn.animalId })
  else if (btn.id === 'brush-size' && this.paint) {
    this.paint.brush = btn.size
    this.paint.tool = 'brush'
  } else if (btn.id === 'eraser' && this.paint) {
    this.paint.tool = this.paint.tool === 'eraser' ? 'brush' : 'eraser'
  } else if (btn.id === 'natural' && this.paint) {
    this.paint.applyNatural()
  } else if (btn.id === 'crayon' && this.paint) {
    this.paint.colorHex = btn.hex
    this.paint.tool = 'brush'
    this.paint.natural = false
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

ChildCreation.prototype.scanJoin = function (next) {
  const go = this.api.go
  const dest = next || 'pick'
  const open = function (roomId) {
    if (!sync.getRoom(roomId)) sync.createRoom(roomId)
    if (dest === 'paper-pick') go({ name: 'paper-pick', roomId: roomId })
    else go({ name: 'pick', roomId: roomId })
  }
  if (typeof wx === 'undefined' || !wx.scanCode) {
    open(sync.ensurePreviewRoom())
    return
  }
  wx.scanCode({
    onlyFromCamera: false,
    success: function (res) {
      const roomId = sync.parseJoinFromQr(res.result || '')
      if (!roomId) {
        wx.showToast({ title: '没认出房间码', icon: 'none' })
        return
      }
      open(roomId)
    },
    fail: function () {
      wx.showToast({ title: '没有扫到', icon: 'none' })
    },
  })
}

ChildCreation.prototype.send = function (roomId, animalId) {
  if (!this.paint || this.sending) return
  const self = this
  this.sending = true
  this.msg = '正在送…'
  const started = animalId || this.paint.animalId
  const rid = sync.ensureRoomForSend(roomId)
  sendToWorld({ roomId: rid, animalId: started, paint: this.paint })
    .then(function (result) {
      if (!result.ok && (result.reason === 'paused' || result.reason === 'missing')) {
        sync.ensureRoomForSend(rid)
        return sendToWorld({ roomId: rid, animalId: started, paint: self.paint })
      }
      return result
    })
    .then(function (result) {
      if (!result || !result.ok) {
        const reasons = { missing: '展览结束啦', paused: '等一等再送', full: '有点挤，等一等' }
        self.msg = (result && reasons[result.reason]) || '没送上，再点一次'
        return
      }
      self.sentPaint = self.paint
      self.api.go({ name: 'success', roomId: rid, placed: result.placed, thumb: result.item.thumb })
    })
    .catch(function () {
      self.msg = '没送上，再点一次'
    })
    .then(function () {
      self.sending = false
    })
}

ChildCreation.prototype.hit = hit

module.exports = { ChildCreation }
