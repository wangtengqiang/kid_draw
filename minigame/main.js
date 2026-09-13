/**
 * 微信小游戏入口：我是主机 / 我是小朋友。
 * 2D 可玩切片。完整 3D 在网页预览 web/。
 */
const sys = wx.getSystemInfoSync()
const W = sys.windowWidth
const H = sys.windowHeight
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
canvas.width = W
canvas.height = H

const draw = require('./draw.js')
const types = require('./types.js')
const sync = require('./sync/index.js')
const { storage } = require('./storage/index.js')

let screen = 'home'
let roomId = ''
let joinDigits = ''
let joinError = ''
let pickKind = 'deer'
let paint = null
let toast = ''
let toastUntil = 0
let buttons = []
let lastPoll = 0

function showToast(text) {
  toast = text
  toastUntil = Date.now() + 2200
}

function addBtn(x, y, w, h, label, onTap, fill) {
  buttons.push({ x, y, w, h, label, onTap, fill: fill || '#f2c14e' })
}

function paintBox() {
  const s = Math.min(W - 24, 340)
  return { x: (W - s) / 2, y: 86, s }
}

function makePaint(kind) {
  const size = 320
  const off = wx.createCanvas()
  off.width = size
  off.height = size
  const oc = off.getContext('2d')
  oc.fillStyle = '#fff8ee'
  oc.fillRect(0, 0, size, size)
  return { kind, canvas: off, ctx: oc, size, color: types.PALETTE[3].hex, tool: 'brush', brush: 16, drawing: false }
}

function paintAt(p, x, y) {
  const oc = p.ctx
  oc.globalCompositeOperation = p.tool === 'eraser' ? 'destination-out' : 'source-over'
  oc.fillStyle = p.color
  oc.beginPath()
  oc.arc(x, y, p.brush / 2, 0, Math.PI * 2)
  oc.fill()
  oc.globalCompositeOperation = 'source-over'
}

function drawAnimal(c, kind, x, y, s) {
  c.save()
  c.translate(x, y)
  c.strokeStyle = '#1f1a16'
  c.fillStyle = '#fff8ee'
  c.lineWidth = 3
  c.beginPath()
  c.ellipse(s * 0.55, s * 0.55, s * 0.28, s * 0.18, 0, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  c.beginPath()
  c.ellipse(s * 0.28, kind === 'lion' ? s * 0.42 : s * 0.38, s * 0.14, s * 0.12, 0, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  if (kind === 'deer') {
    c.beginPath()
    c.moveTo(s * 0.24, s * 0.26)
    c.lineTo(s * 0.18, s * 0.08)
    c.moveTo(s * 0.32, s * 0.26)
    c.lineTo(s * 0.38, s * 0.08)
    c.stroke()
  }
  c.restore()
}

function layout() {
  buttons = []
  if (screen === 'home') {
    addBtn(24, 240, W - 48, 72, '我是主机', () => {
      roomId = sync.newRoomCode()
      sync.createRoom(roomId)
      screen = 'host'
    }, '#8ee0a0')
    addBtn(24, 326, W - 48, 72, '我是小朋友', () => {
      joinDigits = ''
      joinError = ''
      screen = 'join'
    }, '#ffd29d')
    addBtn(24, 412, W - 48, 52, '我的全部作品', () => {
      screen = 'gallery'
    }, '#fff')
  }
  if (screen === 'join') {
    addBtn(16, 16, 72, 40, '返回', () => (screen = 'home'), '#fff')
    ;['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', 'OK'].forEach((label, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 36 + col * ((W - 72) / 3 + 6)
      const y = 280 + row * 58
      addBtn(x, y, (W - 90) / 3, 50, label, () => {
        if (label === '←') joinDigits = joinDigits.slice(0, -1)
        else if (label === 'OK') {
          if (!/^\d{4}$/.test(joinDigits)) joinError = '请输入 4 位数字'
          else if (!sync.getRoom(joinDigits)) joinError = '找不到这场展览'
          else {
            roomId = joinDigits
            screen = 'pick'
          }
        } else if (joinDigits.length < 4) joinDigits += label
      }, label === 'OK' ? '#8ee0a0' : '#fff')
    })
  }
  if (screen === 'pick') {
    addBtn(16, 16, 72, 40, '返回', () => (screen = 'join'), '#fff')
    types.ANIMAL_IDS.forEach((id, i) => {
      addBtn(24, 120 + i * 88, W - 48, 76, types.ANIMAL_NAMES[id], () => {
        pickKind = id
        paint = makePaint(id)
        screen = 'paint'
      }, '#fff8ee')
    })
  }
  if (screen === 'paint' && paint) {
    addBtn(16, 16, 72, 40, '重选', () => (screen = 'pick'), '#fff')
    addBtn(W - 96, 16, 80, 40, '送画', submit, '#8ee0a0')
    addBtn(16, H - 148, 88, 40, '画笔', () => (paint.tool = 'brush'), paint.tool === 'brush' ? '#ffb703' : '#fff')
    addBtn(112, H - 148, 88, 40, '填色', () => (paint.tool = 'fill'), paint.tool === 'fill' ? '#ffb703' : '#fff')
    addBtn(208, H - 148, 88, 40, '橡皮', () => (paint.tool = 'eraser'), paint.tool === 'eraser' ? '#ffb703' : '#fff')
    types.PALETTE.forEach((c, i) => {
      addBtn(16 + (i % 8) * 42, H - 92, 36, 36, '', () => (paint.color = c.hex), c.hex)
    })
  }
  if (screen === 'host' && roomId) {
    const room = sync.getRoom(roomId)
    addBtn(12, 12, 64, 36, '返回', () => (screen = 'home'), '#fff')
    types.THEME_IDS.forEach((k, i) => {
      addBtn(12, 110 + i * 48, 88, 42, types.THEME_NAMES[k], () => sync.setTheme(roomId, k), room && room.theme === k ? '#ffb703' : '#fff')
    })
    addBtn(W - 108, 110, 96, 40, room && room.paused ? '继续收画' : '暂停收画', () => {
      const cur = sync.getRoom(roomId)
      if (cur) sync.patchRoom(roomId, { paused: !cur.paused })
    }, '#fff')
    addBtn(W - 108, 158, 96, 40, '清场', () => {
      sync.clearAnimals(roomId)
      showToast('场地清好了')
    }, '#ffb4a2')
    addBtn(W - 108, 206, 96, 40, '结束展览', () => {
      sync.endRoom(roomId)
      showToast('展览结束啦')
      screen = 'home'
    }, '#fff')
  }
  if (screen === 'success') {
    addBtn(24, H - 220, W - 48, 48, '看立体模型', () => (screen = 'preview'), '#8ee0a0')
    addBtn(24, H - 162, W - 48, 48, '再画一只', () => (screen = 'pick'), '#fff')
    addBtn(24, H - 104, W - 48, 48, '全部作品', () => (screen = 'gallery'), '#ffd29d')
  }
  if (screen === 'gallery') {
    addBtn(16, 16, 72, 40, '首页', () => (screen = 'home'), '#fff')
  }
  if (screen === 'preview') {
    addBtn(16, 16, 72, 40, '返回', () => (screen = 'gallery'), '#fff')
    addBtn(24, H - 90, W - 48, 48, '回首页', () => (screen = 'home'), '#ffd29d')
  }
}

function submit() {
  if (!paint || !roomId) return
  const latest = sync.getRoom(roomId)
  if (!latest) return showToast('找不到这场展览')
  if (latest.paused) return showToast('主持人暂时停收画了')
  if (latest.animals.length >= types.ROOM_CAP) return showToast('有点挤，等一等或请主持人清场')
  const result = sync.submitAnimal(roomId, {
    animalId: paint.kind,
    creatorId: sync.creatorId(),
    label: sync.animalLabel(paint.kind),
    thumb: '',
    regionColors: types.DEFAULTS[paint.kind] || {},
  })
  if (!result.ok) return showToast('没有送成功')
  void storage.saveGalleryItem({
    id: result.placed.id,
    animalId: paint.kind,
    thumb: '',
    regionColors: result.placed.regionColors,
    roomCode: roomId,
    createdAt: Date.now(),
  })
  screen = 'success'
}

function drawHome() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '彩绘动物进森林', W / 2, 140, 28)
  draw.lead(ctx, '一台主机看世界，小朋友涂色送画', W / 2, 180)
}

function drawJoin() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '输入 4 位房间号', W / 2, 90, 24)
  draw.title(ctx, (joinDigits + '    ').slice(0, 4).split('').join(' '), W / 2, 150, 36)
  draw.lead(ctx, joinError || '也可从分享卡片带 join 进入', W / 2, 200)
}

function drawPick() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '选一只动物', W / 2, 80, 24)
}

function drawPaint() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  const box = paintBox()
  ctx.fillStyle = '#fff'
  draw.roundRect(ctx, box.x, box.y, box.s, box.s, 12)
  ctx.fill()
  if (paint) {
    ctx.drawImage(paint.canvas, box.x, box.y, box.s, box.s)
    drawAnimal(ctx, paint.kind, box.x, box.y, box.s)
  }
}

function drawHost() {
  const latest = sync.getRoom(roomId)
  const theme = (latest && latest.theme) || 'forest'
  const skies = { forest: '#8ecae6', snow: '#d9e8f7', underwater: '#0b3d55' }
  const grounds = { forest: '#3d7a3a', snow: '#eef6ff', underwater: '#cbb07a' }
  ctx.fillStyle = skies[theme] || '#8ecae6'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = grounds[theme] || '#3d7a3a'
  ctx.beginPath()
  ctx.ellipse(W / 2, H * 0.62, W * 0.46, H * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  const animals = (latest && latest.animals) || []
  const t = Date.now() / 1000
  animals.forEach((a, i) => {
    const x = W / 2 + Math.cos(t * 0.4 + i) * 70
    const y = H * 0.6 + Math.sin(t * 0.4 + i * 1.3) * 40
    ctx.fillStyle = '#fff8ee'
    ctx.beginPath()
    ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a120c'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(types.ANIMAL_NAMES[a.animalId] || '兽', x, y + 4)
  })
  ctx.fillStyle = 'rgba(255,253,248,0.94)'
  draw.roundRect(ctx, W / 2 - 70, 54, 140, 48, 12)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(roomId, W / 2, 86)
  ctx.font = '13px sans-serif'
  ctx.fillText(`${animals.length}/${types.ROOM_CAP} · ${latest && latest.paused ? '已暂停' : '正在收画'}`, W / 2, H - 24)
  if (!animals.length) draw.lead(ctx, '世界还空着，把房号报给小朋友吧', W / 2, H / 2)
}

function drawSuccess() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '送到啦', W / 2, 120, 32)
  draw.lead(ctx, '你不用走进主机大地图', W / 2, 170)
}

function drawGallery() {
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '我的全部作品', W / 2, 80, 24)
  draw.lead(ctx, '网页预览里可看立体模型', W / 2, 130)
}

function drawPreview() {
  ctx.fillStyle = '#fff3df'
  ctx.fillRect(0, 0, W, H)
  draw.title(ctx, '小舞台（本机预览）', W / 2, 70, 22)
  drawAnimal(ctx, pickKind, W / 2 - 120, H / 2 - 120, 240)
  draw.lead(ctx, '不是主机共享世界', W / 2, H - 130)
}

function loop() {
  if (Date.now() - lastPoll > 400 && screen === 'host' && roomId) {
    lastPoll = Date.now()
    sync.touchHost(roomId)
  }
  layout()
  if (screen === 'home') drawHome()
  else if (screen === 'join') drawJoin()
  else if (screen === 'pick') drawPick()
  else if (screen === 'paint') drawPaint()
  else if (screen === 'host') drawHost()
  else if (screen === 'success') drawSuccess()
  else if (screen === 'gallery') drawGallery()
  else if (screen === 'preview') drawPreview()
  buttons.forEach((b) => draw.fillBtn(ctx, b, b.fill, b.label, 16))
  if (Date.now() < toastUntil) {
    ctx.fillStyle = 'rgba(42,36,28,0.92)'
    draw.roundRect(ctx, 24, H - 70, W - 48, 44, 12)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(toast, W / 2, H - 46)
  }
  requestAnimationFrame(loop)
}

wx.onTouchStart((ev) => {
  const t = ev.touches[0]
  const b = draw.hit(buttons, t.clientX, t.clientY)
  if (b) {
    b.onTap()
    return
  }
  if (screen === 'paint' && paint) {
    const box = paintBox()
    if (t.clientX >= box.x && t.clientX <= box.x + box.s && t.clientY >= box.y && t.clientY <= box.y + box.s) {
      paint.drawing = true
      const px = ((t.clientX - box.x) / box.s) * paint.size
      const py = ((t.clientY - box.y) / box.s) * paint.size
      paintAt(paint, px, py)
    }
  }
})
wx.onTouchMove((ev) => {
  if (screen !== 'paint' || !paint || !paint.drawing) return
  const t = ev.touches[0]
  const box = paintBox()
  const px = ((t.clientX - box.x) / box.s) * paint.size
  const py = ((t.clientY - box.y) / box.s) * paint.size
  paintAt(paint, px, py)
})
wx.onTouchEnd(() => {
  if (paint) paint.drawing = false
})

const launchJoin = sync.joinQuery()
if (launchJoin && sync.getRoom(launchJoin)) {
  roomId = launchJoin
  screen = 'pick'
} else if (sync.isHostQuery()) {
  roomId = sync.newRoomCode()
  sync.createRoom(roomId)
  screen = 'host'
}
requestAnimationFrame(loop)
