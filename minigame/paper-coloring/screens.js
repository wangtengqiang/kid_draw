/**
 * 纸上涂色界面：老师下载线稿；孩子选一只、拍照、送进世界。
 */
const { fillBtn, fillCard, font, lead, leadWrap, title } = require('../draw.js')
const { ANIMAL_IDS, ANIMAL_NAMES } = require('../types.js')
const { drawPickCard } = require('../art.js')
const { drawAnimal } = require('../world-exhibition/models.js')
const { colorsFromPhoto } = require('./map.js')
const { sendColoredAnimal } = require('./send-to-world.js')
const { drawSheet } = require('./template.js')

function PaperColoring(api) {
  this.api = api
  this.msg = ''
  this.preview = null
}

PaperColoring.prototype.dispose = function () {
  this.preview = null
  this.msg = ''
}

PaperColoring.prototype.print = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 18)
  title(ctx, '打印线稿', W / 2, 90, 32)
  lead(ctx, '给老师。打印后让小朋友涂。', W / 2, 122)
  const buttons = [back]
  ANIMAL_IDS.forEach((id, i) => {
    const y = 142 + i * ((H - 170) / 3)
    const b = { id: 'save-sheet', animalId: id, x: 22, y: y, w: W - 44, h: (H - 190) / 3 - 10 }
    fillCard(ctx, b)
    drawSheet(ctx, id, { x: b.x + 10, y: b.y + 6, w: b.w - 20, h: b.h - 16 })
    buttons.push(b)
  })
  return buttons
}

PaperColoring.prototype.needScan = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 18)
  title(ctx, '扫码进入', W / 2, H * 0.28, 36)
  leadWrap(ctx, '对准老师主机上的二维码。也可以从相册选一张。', W / 2, H * 0.34, W - 56)
  const scan = { id: 'scan-code', x: 24, y: H * 0.5, w: W - 48, h: 84 }
  fillBtn(ctx, scan, '#8fd8f2', '扫一扫 / 选相册', 26)
  return [back, scan]
}

PaperColoring.prototype.pick = function (ctx, roomId) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 18)
  title(ctx, '选一只', W / 2, 86, 36)
  lead(ctx, '纸上也是这三只。', W / 2, 118)
  const buttons = [back]
  const top = 136
  const cardH = (H - top - 24) / 3 - 12
  ANIMAL_IDS.forEach((id, i) => {
    const y = top + i * (cardH + 12)
    const b = { id: 'paper-animal', animalId: id, roomId: roomId, x: 22, y: y, w: W - 44, h: cardH }
    fillCard(ctx, b)
    drawPickCard(ctx, id, { x: b.x + 12, y: b.y + 8, w: b.w - 24, h: b.h - 48 })
    ctx.fillStyle = '#4a3428'
    ctx.font = font(24, 600)
    ctx.textAlign = 'center'
    ctx.fillText(ANIMAL_NAMES[id], W / 2, b.y + b.h - 18)
    buttons.push(b)
  })
  return buttons
}

PaperColoring.prototype.camera = function (ctx, roomId, animalId) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'paper-pick', roomId: roomId, x: 16, y: 14, w: 124, h: 46 }
  const home = { id: 'home', x: 148, y: 14, w: 88, h: 46 }
  fillBtn(ctx, back, '#8fdd74', '重选', 18)
  fillBtn(ctx, home, '#efe4d2', '首页', 18)
  title(ctx, '拍纸上的画', W / 2, 92, 32)
  lead(ctx, '对准四角黑块。这是' + (ANIMAL_NAMES[animalId] || '') + '。', W / 2, 124)
  if (this.preview) {
    const box = { x: 32, y: 142, w: W - 64, h: H * 0.32 }
    fillCard(ctx, box, '#d7e4c4')
    drawAnimal(ctx, animalId, this.preview.regionColors, {
      x: box.x + 10,
      y: box.y + 6,
      w: box.w - 20,
      h: box.h - 16,
    })
  }
  const cam = { id: 'choose-image', roomId: roomId, animalId: animalId, x: 24, y: H - 188, w: W - 48, h: 76 }
  fillBtn(ctx, cam, '#8fd8f2', '拍照', 28)
  const buttons = [back, home, cam]
  if (this.preview) {
    const send = { id: 'paper-send', roomId: roomId, animalId: animalId, x: 24, y: H - 96, w: W - 48, h: 72 }
    fillBtn(ctx, send, '#ff8fa3', '送进世界', 26)
    buttons.push(send)
  }
  ctx.fillStyle = 'rgba(74,52,40,0.62)'
  ctx.font = font(16, 400)
  ctx.textAlign = 'center'
  ctx.fillText(this.msg, W / 2, H - 204)
  return buttons
}

PaperColoring.prototype.success = function (ctx, roomId, placed) {
  const W = this.api.W
  const H = this.api.H
  const home = { id: 'home', x: 16, y: 16, w: 110, h: 48 }
  fillBtn(ctx, home, '#efe4d2', '回首页', 18)
  title(ctx, '送到啦', W / 2, 86, 36)
  lead(ctx, (ANIMAL_NAMES[placed.animalId] || '') + '走进主机世界了。', W / 2, 118)
  const box = { x: 28, y: 136, w: W - 56, h: H * 0.34 }
  fillCard(ctx, box, '#d7e4c4')
  drawAnimal(ctx, placed.animalId, placed.regionColors, {
    x: box.x + 12,
    y: box.y + 8,
    w: box.w - 24,
    h: box.h - 20,
  })
  const world = { id: 'open-world', roomId: roomId, x: 24, y: H - 188, w: W - 48, h: 80 }
  fillBtn(ctx, world, '#ffe066', '去看大世界', 28)
  const again = { id: 'paper-pick', roomId: roomId, x: 24, y: H - 96, w: W - 48, h: 68 }
  fillBtn(ctx, again, '#8fdd74', '再拍一张', 24)
  return [home, world, again]
}

PaperColoring.prototype.touch = function (screen, btn) {
  const go = this.api.go
  const self = this
  if (!btn) return
  if (btn.id === 'home') go({ name: 'home' })
  else if (btn.id === 'scan-code') this.scanJoin()
  else if (btn.id === 'open-world') go({ name: 'host', roomId: btn.roomId || screen.roomId })
  else if (btn.id === 'paper-pick') go({ name: 'paper-pick', roomId: btn.roomId || screen.roomId })
  else if (btn.id === 'paper-animal') go({ name: 'paper-camera', roomId: btn.roomId, animalId: btn.animalId })
  else if (btn.id === 'save-sheet') saveSheet(btn.animalId)
  else if (btn.id === 'choose-image') this.choose(btn.roomId, btn.animalId)
  else if (btn.id === 'paper-send' && this.preview) {
    this.msg = '正在送…'
    sendColoredAnimal({
      roomId: btn.roomId,
      animalId: btn.animalId,
      thumb: this.preview.thumb,
      regionColors: this.preview.regionColors,
    }).then(function (result) {
      if (!result.ok) {
        self.msg = result.reason === 'full' ? '有点挤，等一等' : '展览结束啦'
        return
      }
      go({ name: 'paper-success', roomId: btn.roomId, placed: result.placed, thumb: result.item.thumb })
    })
  }
}

PaperColoring.prototype.choose = function (roomId, animalId) {
  const self = this
  if (typeof wx === 'undefined' || !wx.chooseImage) {
    self.preview = {
      thumb: 'paper',
      regionColors: colorsFromPhoto(animalId, null),
    }
    self.msg = '对准啦'
    return
  }
  wx.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: function () {
      self.preview = {
        thumb: 'paper',
        regionColors: colorsFromPhoto(animalId, null),
      }
      self.msg = '对准啦'
    },
  })
  void roomId
}

PaperColoring.prototype.scanJoin = function () {
  const go = this.api.go
  const sync = require('../sync/index.js')
  const open = function (roomId) {
    if (!sync.getRoom(roomId)) sync.createRoom(roomId)
    go({ name: 'paper-pick', roomId: roomId })
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

function saveSheet(animalId) {
  if (typeof wx === 'undefined' || !wx.showToast) return
  wx.showToast({ title: '请到网页预览下载打印线稿', icon: 'none' })
  void animalId
}

module.exports = { PaperColoring }
