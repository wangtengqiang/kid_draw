/**
 * 小游戏入口：只做首页分流。
 * 儿童创作 → child-creation/
 * 世界观展 → world-exhibition/
 */
const { fillBtn, hit, lead, title } = require('./draw.js')
const { ChildCreation } = require('./child-creation/index.js')
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
let screen = { name: 'home' }
let buttons = []

function go(next) {
  exhibition.dispose()
  child.dispose()
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
  if (join && sync.getRoom(join)) {
    go({ name: 'pick', roomId: join })
    return
  }
  if (join) {
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
  ctx.arc(W / 2, 110, 44, 0, Math.PI * 2)
  ctx.fill()
  title(ctx, '彩绘动物进森林', W / 2, 190, 36)
  lead(ctx, '一台主机打开世界。小朋友只涂色、把画送进去。', W / 2, 230)
  const host = { id: 'open-world', x: 28, y: H * 0.42, w: W - 56, h: 76 }
  const draw = { id: 'start-draw', x: 28, y: H * 0.42 + 92, w: W - 56, h: 76 }
  const gal = { id: 'my-art', x: 28, y: H * 0.42 + 184, w: W - 56, h: 56 }
  fillBtn(ctx, host, '#f2c14e', '我是主机', 30)
  fillBtn(ctx, draw, '#2f9e5f', '我是小朋友', 30)
  fillBtn(ctx, gal, '#efe4d2', '我的全部作品', 24)
  return [host, draw, gal]
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
    if (join && sync.getRoom(join)) go({ name: 'pick', roomId: join })
    else go({ name: 'need-scan' })
  } else if (btn.id === 'my-art') {
    go({ name: 'gallery' })
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
  if (
    screen.name === 'host' ||
    screen.name === 'gallery' ||
    screen.name === 'preview'
  ) {
    exhibition.touch(btn)
    return
  }
  child.touch(screen, btn, x, y)
})

start()
render()
