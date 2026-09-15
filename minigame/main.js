/**
 * 小游戏入口：只做首页分流。
 * 儿童创作 → child-creation/
 * 纸上涂色 → paper-coloring/
 * 世界观展 → world-exhibition/
 */
const { fillBtn, fillCard, hit, kicker, leadWrap, paintPaper, textLink, title } = require('./draw.js')
const { drawPickCard, preloadArt } = require('./art.js')
const { preloadSnapshots } = require('./world-exhibition/snapshots.js')
const { preloadCutouts } = require('./world-exhibition/cutouts.js')
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
let lastRenderErr = ''

function go(next) {
  exhibition.dispose()
  child.dispose()
  paper.dispose()
  screen = next
}

function start() {
  preloadArt()
  preloadSnapshots()
  preloadCutouts()
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
  const markH = Math.round(Math.min(132, H * 0.155))
  const markW = Math.round(markH * 1.22)
  const mark = { x: W / 2 - markW / 2, y: 16, w: markW, h: markH }
  fillCard(ctx, mark)
  drawPickCard(ctx, 'lion', { x: mark.x + 10, y: mark.y + 6, w: mark.w - 20, h: mark.h - 20 })
  const titleY = mark.y + mark.h + 38
  title(ctx, '彩绘动物进森林', W / 2, titleY, 34)
  leadWrap(ctx, '老师打开世界，小朋友涂色送进去。', W / 2, titleY + 10, W - 56)

  const footerH = 56
  const footerY = H - 24 - footerH
  const blockTop = titleY + 56
  const blockH = Math.max(280, footerY - blockTop)
  const kickerH = 26
  const inner = blockH - kickerH * 2
  const hBtn = Math.min(92, Math.max(60, (inner - 36) / 4))
  const extra = blockH - kickerH * 2 - hBtn * 4
  const gap = Math.max(10, extra / 5)

  let y = blockTop
  kicker(ctx, '老师 · 主机', W / 2, y + 16)
  y += kickerH
  const host = { id: 'open-world', x: 24, y: y, w: W - 48, h: hBtn }
  y += hBtn + gap
  kicker(ctx, '小朋友', W / 2, y + 16)
  y += kickerH
  const draw = { id: 'start-draw', x: 24, y: y, w: W - 48, h: hBtn }
  y += hBtn + gap
  const cam = { id: 'paper', x: 24, y: y, w: W - 48, h: hBtn }
  y += hBtn + gap
  const scan = { id: 'scan', x: 24, y: y, w: W - 48, h: hBtn }
  const gal = { id: 'my-art', x: 28, y: footerY, w: (W - 64) / 2, h: footerH }
  const print = { id: 'print', x: gal.x + gal.w + 8, y: footerY, w: gal.w, h: footerH }
  const type = Math.round(Math.min(30, hBtn * 0.4))
  fillBtn(ctx, host, '#ffe066', '打开世界', type)
  fillBtn(ctx, draw, '#8fdd74', '开始画画', type)
  fillBtn(ctx, cam, '#ffb38a', '拍纸上的画', type)
  fillBtn(ctx, scan, '#8fd8f2', '扫码进入', type)
  textLink(ctx, gal, '我的画', 18)
  textLink(ctx, print, '打印线稿', 18)
  return [host, draw, cam, scan, gal, print]
}

function render() {
  const s = screen
  if (s.name !== 'host') paintPaper(ctx, W, H)
  try {
    if (s.name === 'home') buttons = renderHome()
    else if (s.name === 'host') buttons = exhibition.renderHost(ctx, s.roomId)
    else if (s.name === 'gallery') buttons = exhibition.renderGallery(ctx)
    else if (s.name === 'preview') buttons = exhibition.renderPreview(ctx, s.item)
    else if (s.name === 'need-scan') buttons = child.needScan(ctx, 'pick')
    else if (s.name === 'scan') buttons = child.needScan(ctx, 'pick')
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
  } catch (err) {
    const msg = String((err && err.stack) || err)
    if (msg !== lastRenderErr) {
      lastRenderErr = msg
      console.error(err)
    }
    buttons = []
  }
  requestAnimationFrame(render)
}

function onHome(btn) {
  if (btn.id === 'open-world') {
    const id = sync.ensurePreviewRoom()
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
  } else if (btn.id === 'scan') {
    go({ name: 'scan' })
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
