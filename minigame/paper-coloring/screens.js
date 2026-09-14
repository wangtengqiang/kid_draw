/**
 * 纸上涂色界面：老师下载线稿；孩子选一只、拍照、送进世界。
 */
const { fillBtn, lead, title } = require('../draw.js')
const { ANIMAL_IDS, ANIMAL_NAMES } = require('../types.js')
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
  const buttons = [{ id: 'home', x: 16, y: 16, w: 120, h: 48 }]
  fillBtn(ctx, buttons[0], '#efe4d2', '返回', 20)
  title(ctx, '打印线稿', W / 2, 90, 36)
  lead(ctx, '给老师。打印后让小朋友涂。', W / 2, 124)
  ANIMAL_IDS.forEach((id, i) => {
    const y = 150 + i * ((H - 180) / 3)
    const b = { id: 'save-sheet', animalId: id, x: 28, y: y, w: W - 56, h: (H - 200) / 3 - 10 }
    drawSheet(ctx, id, b, false)
    buttons.push(b)
  })
  return buttons
}

PaperColoring.prototype.needScan = function (ctx) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '请扫老师的码', W / 2, H * 0.32, 40)
  lead(ctx, '扫完就能拍纸上的画。', W / 2, H * 0.4)
  const back = { id: 'home', x: 24, y: 24, w: 120, h: 52 }
  fillBtn(ctx, back, '#efe4d2', '返回', 22)
  return [back]
}

PaperColoring.prototype.pick = function (ctx, roomId) {
  const W = this.api.W
  const buttons = []
  title(ctx, '选一只', W / 2, 70, 44)
  lead(ctx, '纸上也是这三只。', W / 2, 108)
  const cardH = (this.api.H - 140) / 3 - 12
  ANIMAL_IDS.forEach((id, i) => {
    const y = 130 + i * (cardH + 12)
    const b = { id: 'paper-animal', animalId: id, roomId: roomId, x: 28, y: y, w: W - 56, h: cardH }
    ctx.fillStyle = '#fff'
    ctx.fillRect(b.x, b.y, b.w, b.h)
    drawAnimal(ctx, id, null, { x: b.x, y: b.y, w: b.w, h: b.h - 36 })
    ctx.fillStyle = '#1a120c'
    ctx.font = '800 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(ANIMAL_NAMES[id], W / 2, b.y + b.h - 14)
    buttons.push(b)
  })
  return buttons
}

PaperColoring.prototype.camera = function (ctx, roomId, animalId) {
  const W = this.api.W
  const H = this.api.H
  const back = { id: 'paper-pick', roomId: roomId, x: 16, y: 16, w: 140, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '重选动物', 20)
  title(ctx, '拍纸上的画', W / 2, 100, 36)
  lead(ctx, '对准四角黑块。这是' + (ANIMAL_NAMES[animalId] || '') + '。', W / 2, 136)
  if (this.preview) {
    drawAnimal(ctx, animalId, this.preview.regionColors, { x: 40, y: 150, w: W - 80, h: H * 0.32 })
  }
  const cam = { id: 'choose-image', roomId: roomId, animalId: animalId, x: 24, y: H - 200, w: W - 48, h: 88 }
  fillBtn(ctx, cam, '#1a120c', '拍照', 34)
  const buttons = [back, cam]
  if (this.preview) {
    const send = { id: 'paper-send', roomId: roomId, animalId: animalId, x: 24, y: H - 100, w: W - 48, h: 76 }
    fillBtn(ctx, send, '#e24b4b', '送进世界', 30)
    buttons.push(send)
  }
  ctx.fillStyle = '#1a120c'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(this.msg, W / 2, H - 214)
  return buttons
}

PaperColoring.prototype.success = function (ctx, roomId, placed) {
  const W = this.api.W
  const H = this.api.H
  title(ctx, '送到啦', W / 2, 80, 44)
  lead(ctx, (ANIMAL_NAMES[placed.animalId] || '') + '走进主机世界了。', W / 2, 120)
  drawAnimal(ctx, placed.animalId, placed.regionColors, { x: 40, y: 140, w: W - 80, h: H * 0.42 })
  const again = { id: 'paper-pick', roomId: roomId, x: 28, y: H - 120, w: W - 56, h: 76 }
  fillBtn(ctx, again, '#2f9e5f', '再拍一张', 30)
  return [again]
}

PaperColoring.prototype.touch = function (screen, btn) {
  const go = this.api.go
  const self = this
  if (!btn) return
  if (btn.id === 'home') go({ name: 'home' })
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

function saveSheet(animalId) {
  if (typeof wx === 'undefined' || !wx.showToast) return
  wx.showToast({ title: '请到网页预览下载打印线稿', icon: 'none' })
  void animalId
}

module.exports = { PaperColoring }
