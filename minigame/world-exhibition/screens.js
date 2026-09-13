/**
 * 世界观展用例界面：主机世界、画廊缩略图、只读预览。
 * 不包含选动物 / 涂色 / 送进世界。
 */
const { fillBtn, lead, title } = require('../draw.js')
const { ANIMAL_NAMES, ROOM_CAP, THEME_IDS, THEME_NAMES } = require('../types.js')
const { storage } = require('../storage/index.js')
const sync = require('../sync/index.js')
const { getWork, listWorks } = require('./gallery.js')
const { HostWorld } = require('./host-world.js')
const { PreviewStage } = require('./preview.js')
const { drawAnimal } = require('../child-creation/lineart.js')

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

WorldExhibition.prototype.renderHost = function (ctx, roomId) {
  const W = this.api.W
  const H = this.api.H
  const room = sync.getRoom(roomId) || sync.createRoom(roomId)
  sync.touchHost(roomId)
  if (!this.world) this.world = new HostWorld()
  this.world.applyTheme(room.theme)
  this.world.syncAnimals(room.animals)
  const worldBox = { x: 0, y: 0, w: W, h: H * 0.52 }
  this.world.render(ctx, worldBox, Date.now())
  if (!room.animals.length) {
    ctx.fillStyle = 'rgba(255,246,232,0.92)'
    ctx.fillRect(16, worldBox.h - 64, W - 32, 48)
    ctx.fillStyle = '#1a120c'
    ctx.font = '22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('等小朋友把动物送进来', W / 2, worldBox.h - 34)
  }
  const buttons = []
  const back = { id: 'home', x: 16, y: worldBox.h + 8, w: 100, h: 44 }
  fillBtn(ctx, back, '#efe4d2', '返回', 20)
  buttons.push(back)
  title(ctx, roomId, W / 2, worldBox.h + 48, 48)
  lead(ctx, `${room.animals.length}/${ROOM_CAP} 只小动物`, W / 2, worldBox.h + 78)
  THEME_IDS.forEach((id, i) => {
    const b = { id: 'theme', theme: id, roomId: roomId, x: 16 + i * ((W - 32) / 3), y: worldBox.h + 96, w: (W - 40) / 3, h: 56 }
    fillBtn(ctx, b, room.theme === id ? '#f2c14e' : '#fff', THEME_NAMES[id], 20)
    buttons.push(b)
  })
  const y = H - 70
  const w = (W - 48) / 3
  const pause = { id: 'pause', roomId: roomId, x: 16, y: y, w: w, h: 52 }
  const clear = { id: 'clear', roomId: roomId, x: 24 + w, y: y, w: w, h: 52 }
  const end = { id: 'end', roomId: roomId, x: 32 + w * 2, y: y, w: w, h: 52 }
  fillBtn(ctx, pause, '#efe4d2', room.paused ? '继续收画' : '暂停收画', 18)
  fillBtn(ctx, clear, '#efe4d2', '清场', 18)
  fillBtn(ctx, end, '#efe4d2', '结束', 18)
  buttons.push(pause, clear, end)
  return buttons
}

WorldExhibition.prototype.renderGallery = function (ctx) {
  const W = this.api.W
  const items = listWorks()
  const buttons = [{ id: 'home', x: 16, y: 20, w: 120, h: 48 }]
  fillBtn(ctx, buttons[0], '#efe4d2', '← 首页', 20)
  title(ctx, '我的画', W / 2, 100, 40)
  if (!items.length) {
    lead(ctx, '还没有画。回首页，点「开始画画」。', W / 2, 160)
    return buttons
  }
  const col = 2
  const gap = 12
  const cw = (W - 32 - gap) / col
  items.forEach((item, i) => {
    const x = 16 + (i % col) * (cw + gap)
    const y = 130 + Math.floor(i / col) * (cw + 24)
    const b = { id: 'work', itemId: item.id, x: x, y: y, w: cw, h: cw }
    ctx.fillStyle = '#fff'
    ctx.fillRect(b.x, b.y, b.w, b.h)
    let painted = item.regionColors
    if (!painted && item.thumb && item.thumb[0] === '{') {
      try {
        painted = JSON.parse(item.thumb).painted
      } catch (e) {
        painted = item.regionColors
      }
    }
    drawAnimal(ctx, item.animalId, painted, b)
    ctx.fillStyle = '#1a120c'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(ANIMAL_NAMES[item.animalId] || '', b.x + b.w / 2, b.y + b.h + 16)
    buttons.push(b)
  })
  return buttons
}

WorldExhibition.prototype.renderPreview = function (ctx, item) {
  const W = this.api.W
  const H = this.api.H
  if (!this.preview) this.preview = new PreviewStage()
  const back = { id: 'gallery', x: 16, y: 20, w: 140, h: 48 }
  fillBtn(ctx, back, '#efe4d2', '← 作品夹', 20)
  title(ctx, ANIMAL_NAMES[item.animalId] || '', W / 2, 100, 36)
  lead(ctx, '这是你的小舞台，不是主机那片森林。', W / 2, 132)
  this.preview.render(ctx, item, { x: 24, y: 150, w: W - 48, h: H - 190 })
  return [back]
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

module.exports = { WorldExhibition }
