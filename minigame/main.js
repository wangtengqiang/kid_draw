/**
 * 小游戏入口：只做首页分流。
 * 儿童创作 → child-creation/
 * 纸上涂色 → paper-coloring/
 * 世界观展 → world-exhibition/
 */
const { fillBtn, hit, lead, title } = require('./draw.js')
const { ChildCreation } = require('./child-creation/index.js')
const { PaperColoring } = require('./paper-coloring/index.js')
const { WorldExhibition } = require('./world-exhibition/index.js')
const { storage } = require('./storage/index.js')
const sync = require('./sync/index.js')
const { ROOM_CAP } = require('./types.js')

const sys = wx.getSystemInfoSync()
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const dpr = sys.pixelRatio || 1
const W = sys.windowWidth
const H = sys.windowHeight
canvas.width = W * dpr
canvas.height = H * dpr
ctx.scale(dpr, dpr)

const api = {
  W: W,
  H: H,
  ctx: ctx,
  go: go,
}

const child = new ChildCreation(api)
const exhibition = new WorldExhibition(api)
const paper = new PaperColoring(api)
let screen = { name: 'home' }
let buttons = []

function go(next) {
  exhibition.dispose()
  child.dispose()
  paper.dispose()
  screen = next
}

function start() {
  const join = sync.joinQuery()
  if (sync.isHostQuery()) {
    const q = wx.getLaunchOptionsSync().query || {}
    const roomId = q.room || sync.newRoomCode()
    if (!sync.getRoom(roomId)) sync.createRoom(roomId)
    go({ name: 'host', roomId: roomId })
    return
  }
  if (join && !sync.getRoom(join)) {
    go({ name: 'ended' })
    return
  }
  go({ name: 'home' })
}

function renderHome() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2f9e5f'
  ctx.beginPath()
  ctx.arc(W / 2, 88, 36, 0, Math.PI * 2)
  ctx.fill()
  title(ctx, '彩绘动物进森林', W / 2, 160, 32)
  lead(ctx, '一台主机打开世界。小朋友只涂色、把画送进去。', W / 2, 196)
  const host = { id: 'open-world', x: 28, y: H * 0.34, w: W - 56, h: 64 }
  const draw = { id: 'start-draw', x: 28, y: H * 0.34 + 76, w: W - 56, h: 64 }
  const cam = { id: 'paper', x: 28, y: H * 0.34 + 152, w: W - 56, h: 80 }
  const gal = { id: 'my-art', x: 28, y: H * 0.34 + 244, w: W - 56, h: 48 }
  const print = { id: 'print', x: 28, y: H * 0.34 + 300, w: W - 56, h: 44 }
  fillBtn(ctx, host, '#f2c14e', '打开世界', 28)
  fillBtn(ctx, draw, '#2f9e5f', '开始画画', 28)
  fillBtn(ctx, cam, '#1a120c', '拍纸上的画', 30)
  fillBtn(ctx, gal, '#efe4d2', '我的画', 22)
  fillBtn(ctx, print, '#fff6e8', '老师打印线稿', 18)
  return [host, draw, cam, gal, print]
}

function render() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  const s = screen
  if (s.name === 'home') buttons = renderHome()
  else if (s.name === 'host') buttons = exhibition.renderHost(ctx, s.roomId)
  else if (s.name === 'gallery') buttons = exhibition.renderGallery(ctx)
  else if (s.name === 'preview') buttons = exhibition.renderPreview(ctx, s.item)
  else if (s.name === 'need-scan') buttons = child.needScan(ctx)
  else if (s.name === 'ended') buttons = child.ended(ctx)
  else if (s.name === 'pick') buttons = child.pick(ctx, s.roomId)
  else if (s.name === 'paint') buttons = child.paintScreen(ctx, s.roomId, s.animalId)
  else if (s.name === 'success') buttons = child.success(ctx, s.roomId, s.placed)
  else if (s.name === 'paper-print') buttons = paper.print(ctx)
  else if (s.name === 'paper-need-scan') buttons = paper.needScan(ctx)
  else if (s.name === 'paper-pick') buttons = paper.pick(ctx, s.roomId)
  else if (s.name === 'paper-camera') buttons = paper.camera(ctx, s.roomId, s.animalId)
  else if (s.name === 'paper-success') buttons = paper.success(ctx, s.roomId, s.placed)
  else buttons = []
  requestAnimationFrame(render)
}

function onHome(btn) {
  if (btn.id === 'open-world') {
    const id = sync.newRoomCode()
    sync.createRoom(id)
    storage.createRoom({
      code: id,
      theme: 'forest',
      paused: false,
      ended: false,
      hostAliveAt: Date.now(),
      cap: ROOM_CAP,
    })
    go({ name: 'host', roomId: id })
  } else if (btn.id === 'start-draw') {
    const join = sync.joinQuery()
    if (join) {
      if (sync.getRoom(join)) go({ name: 'pick', roomId: join })
      else go({ name: 'need-scan' })
      return
    }
    const roomId = sync.ensurePreviewRoom()
    storage.createRoom({
      code: roomId,
      theme: 'forest',
      paused: false,
      ended: false,
      hostAliveAt: Date.now(),
      cap: ROOM_CAP,
    })
    go({ name: 'pick', roomId: roomId })
  } else if (btn.id === 'paper') {
    const join = sync.joinQuery()
    if (join && sync.getRoom(join)) go({ name: 'paper-pick', roomId: join })
    else go({ name: 'paper-need-scan' })
  } else if (btn.id === 'my-art') {
    go({ name: 'gallery' })
  } else if (btn.id === 'print') {
    go({ name: 'paper-print' })
  }
}

wx.onTouchStart(function (ev) {
  const t = ev.touches[0]
  if (!t) return
  const x = t.clientX
  const y = t.clientY
  const btn = hit(buttons, x, y)
  if (screen.name === 'home') {
    if (btn) onHome(btn)
    return
  }
  if (screen.name === 'host' || screen.name === 'gallery' || screen.name === 'preview') {
    exhibition.touch(btn)
    return
  }
  if (String(screen.name).indexOf('paper') === 0) {
    paper.touch(screen, btn)
    return
  }
  child.touch(screen, btn, x, y)
})

wx.onTouchMove(function (ev) {
  if (screen.name !== 'paint') return
  const t = ev.touches[0]
  if (!t) return
  child.paintMove(t.clientX, t.clientY)
})

wx.onTouchEnd(function () {
  child.paintEnd()
})
wx.onTouchCancel(function () {
  child.paintEnd()
})

start()
render()
