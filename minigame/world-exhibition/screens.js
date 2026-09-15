/**
 * 世界观展用例界面：主机世界、画廊缩略图、只读预览。
 * 不包含选动物 / 涂色 / 送进世界。
 */
const { fillBtn, fillCard, font, lead, roundRect, title } = require('../draw.js')
const { ANIMAL_NAMES, ROOM_CAP, THEME_IDS, THEME_NAMES } = require('../types.js')
const { storage } = require('../storage/index.js')
const sync = require('../sync/index.js')
const { getWork, listWorks, removeWork } = require('./gallery.js')
const { HostWorld } = require('./host-world.js')
const { PreviewStage } = require('./preview.js')
const { drawPaintedPet } = require('./cutouts.js')

function WorldExhibition(api) {
  this.api = api
  this.world = null
  this.preview = null
}

WorldExhibition.prototype.dispose = function () {
  if (this.world) this.world.dispose()
  this.world = null
  if (this.preview) this.preview.dispose()
  this.preview = null
}

function overlayChip(ctx, text, x, y, w, h) {
  ctx.fillStyle = 'rgba(255,250,240,0.9)'
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = '#4a3428'
  ctx.font = font(15, 500)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2)
}

WorldExhibition.prototype.renderHost = function (ctx, roomId) {
  const W = this.api.W
  const H = this.api.H
  const room = sync.getRoom(roomId) || sync.createRoom(roomId)
  sync.touchHost(roomId)
  if (!this.world) this.world = new HostWorld()
  this.world.applyTheme(room.theme)
  this.world.syncAnimals(sync.hydrateThumbs(room.animals))
  const worldBox = { x: 0, y: 0, w: W, h: H }
  this.world.render(ctx, worldBox)

  const buttons = []
  const back = { id: 'home', x: 12, y: 12, w: 100, h: 44 }
  fillBtn(ctx, back, '#efe4d2', '回首页', 16)
  buttons.push(back)

  const chipW = Math.min(240, W - 140)
  overlayChip(ctx, '房间 ' + roomId + ' · ' + room.animals.length + '/' + ROOM_CAP, (W - chipW) / 2, 16, chipW, 36)

  if (!room.animals.length) {
    ctx.fillStyle = 'rgba(255,250,240,0.88)'
    roundRect(ctx, 28, H * 0.52, W - 56, 52, 18)
    ctx.fill()
    ctx.fillStyle = '#4a3428'
    ctx.font = font(18, 500)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('等小朋友把动物送进来', W / 2, H * 0.52 + 26)
  }

  THEME_IDS.forEach((id, i) => {
    const b = {
      id: 'theme',
      theme: id,
      roomId: roomId,
      x: 16 + i * ((W - 32) / 3),
      y: H - 122,
      w: (W - 40) / 3,
      h: 48,
    }
    fillBtn(ctx, b, room.theme === id ? '#ffe066' : '#fffaf1', THEME_NAMES[id], 16)
    buttons.push(b)
  })
  const y = H - 66
  const bw = (W - 48) / 3
  const pause = { id: 'pause', roomId: roomId, x: 16, y: y, w: bw, h: 50 }
  const clear = { id: 'clear', roomId: roomId, x: 24 + bw, y: y, w: bw, h: 50 }
  const end = { id: 'end', roomId: roomId, x: 32 + bw * 2, y: y, w: bw, h: 50 }
  fillBtn(ctx, pause, '#efe4d2', room.paused ? '继续收画' : '暂停收画', 15)
  fillBtn(ctx, clear, '#efe4d2', '清场', 16)
  fillBtn(ctx, end, '#ffb38a', '结束', 16)
  buttons.push(pause, clear, end)
  return buttons
}

WorldExhibition.prototype.renderGallery = function (ctx) {
  const W = this.api.W
  const items = listWorks()
  const buttons = [{ id: 'home', x: 16, y: 16, w: 110, h: 48 }]
  fillBtn(ctx, buttons[0], '#efe4d2', '回首页', 18)
  title(ctx, '我的画', W / 2, 92, 36)
  if (!items.length) {
    lead(ctx, '还没有画。回首页，点「开始画画」。', W / 2, 150)
    return buttons
  }
  const col = 2
  const gap = 14
  const cw = (W - 36 - gap) / col
  items.forEach((item, i) => {
    const x = 18 + (i % col) * (cw + gap)
    const y = 120 + Math.floor(i / col) * (cw + 28)
    const b = { id: 'work', itemId: item.id, x: x, y: y, w: cw, h: cw }
    fillCard(ctx, b)
    ctx.save()
    roundRect(ctx, b.x + 6, b.y + 6, b.w - 12, b.h - 30, 16)
    ctx.clip()
    drawPaintedPet(ctx, item.animalId, item.thumb, { x: b.x + 8, y: b.y + 6, w: b.w - 16, h: b.h - 32 })
    ctx.restore()
    ctx.fillStyle = '#4a3428'
    ctx.font = font(16, 600)
    ctx.textAlign = 'center'
    ctx.fillText(ANIMAL_NAMES[item.animalId] || '', b.x + b.w / 2, b.y + b.h - 12)
    const del = { id: 'delete-work', itemId: item.id, x: b.x + b.w - 46, y: b.y + 8, w: 38, h: 34 }
    fillBtn(ctx, del, '#ffb38a', '删', 14)
    buttons.push(b, del)
  })
  return buttons
}

WorldExhibition.prototype.renderPreview = function (ctx, item) {
  const W = this.api.W
  const H = this.api.H
  if (!this.preview) this.preview = new PreviewStage()
  const back = { id: 'gallery', x: 16, y: 16, w: 130, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '回作品夹', 18)
  const del = { id: 'delete-work', itemId: item.id, x: W - 108, y: 16, w: 90, h: 48 }
  fillBtn(ctx, del, '#ffb38a', '删除', 18)
  title(ctx, ANIMAL_NAMES[item.animalId] || '', W / 2, 92, 32)
  lead(ctx, '这是你涂的花纹。', W / 2, 122)
  const box = { x: 22, y: 142, w: W - 44, h: H - 180 }
  fillCard(ctx, box, '#d7e4c4')
  this.preview.render(ctx, item, { x: box.x + 10, y: box.y + 8, w: box.w - 20, h: box.h - 20 })
  return [back, del]
}

WorldExhibition.prototype.touch = function (btn) {
  if (!btn) return
  const go = this.api.go
  if (btn.id === 'home') {
    go({ name: 'home' })
  } else if (btn.id === 'gallery') {
    go({ name: 'gallery' })
  } else if (btn.id === 'work') {
    const item = getWork(btn.itemId)
    if (item) go({ name: 'preview', item: item })
  } else if (btn.id === 'delete-work') {
    askDeleteWork(btn.itemId, go)
  } else if (btn.id === 'theme') {
    sync.setTheme(btn.roomId, btn.theme)
    storage.updateRoomMeta(btn.roomId, { theme: btn.theme })
  } else if (btn.id === 'pause') {
    const cur = sync.getRoom(btn.roomId)
    if (cur) {
      sync.patchRoom(btn.roomId, { paused: !cur.paused })
      storage.updateRoomMeta(btn.roomId, { paused: !cur.paused })
    }
  } else if (btn.id === 'clear') {
    sync.clearAnimals(btn.roomId)
    storage.clearRoomAnimals(btn.roomId)
    if (this.world) this.world.syncAnimals([])
  } else if (btn.id === 'end') {
    sync.endRoom(btn.roomId)
    storage.updateRoomMeta(btn.roomId, { ended: true })
    go({ name: 'home' })
  }
}

function askDeleteWork(id, go) {
  const drop = function () {
    removeWork(id)
    go({ name: 'gallery' })
  }
  if (typeof wx === 'undefined' || !wx.showModal) {
    drop()
    return
  }
  wx.showModal({
    title: '删掉这张？',
    content: '删了就看不到你涂的花纹了。',
    confirmText: '删除',
    cancelText: '留着',
    success: function (res) {
      if (res.confirm) drop()
    },
  })
}

module.exports = { WorldExhibition }
