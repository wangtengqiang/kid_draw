/**
 * 微信小游戏入口：同一 AppID，两种角色。
 * 观展端 2D 世界 + 房号；创作端选动物、大蜡笔、送进世界。
 * 3D 主题世界见网页预览 web/。贴图走 storage 接口，正式环境换微信云开发。
 */
const sys = wx.getSystemInfoSync()
const canvas = wx.createCanvas()
canvas.width = sys.windowWidth
canvas.height = sys.windowHeight
const ctx = canvas.getContext('2d')

const ANIMALS = [
  { id: 'deer', name: '小鹿' },
  { id: 'tiger', name: '老虎' },
  { id: 'lion', name: '狮子' },
]
const CRAYONS = ['#e24b4b', '#f2d14a', '#3b82f6', '#2bb673', '#8d4cf5', '#f08a3a', '#1f1a17', '#fff8e7']

let scene = 'home'
let room = ''
let picked = 0
let crayon = 0
let message = ''

function launch() {
  const opt = wx.getLaunchOptionsSync ? wx.getLaunchOptionsSync() : { query: {} }
  const q = opt.query || {}
  if (q.room || q.join) {
    room = String(q.room || q.join)
    scene = 'pick'
  }
}

function hit(x, y, r) {
  return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h
}

function draw() {
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#fff6e8'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1a120c'
  ctx.textAlign = 'center'
  if (scene === 'home') {
    ctx.font = 'bold 42px sans-serif'
    ctx.fillText('彩绘动物', w / 2, 140)
    ctx.font = '28px sans-serif'
    ctx.fillText('涂好，送进世界。', w / 2, 190)
    round('#f2c14e', w * 0.12, 260, w * 0.76, 88)
    ctx.fillStyle = '#1a120c'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText('打开世界', w / 2, 318)
    round('#2f9e5f', w * 0.12, 380, w * 0.76, 88)
    ctx.fillStyle = '#fff'
    ctx.fillText('开始画画', w / 2, 438)
  } else if (scene === 'host') {
    ctx.fillStyle = '#8ecae6'
    ctx.fillRect(0, 0, w, h * 0.55)
    ctx.fillStyle = '#3d7a3a'
    ctx.fillRect(0, h * 0.4, w, h * 0.15)
    ctx.fillStyle = '#1a120c'
    ctx.font = 'bold 56px sans-serif'
    ctx.fillText(room, w / 2, h * 0.72)
    ctx.font = '24px sans-serif'
    ctx.fillText('让小朋友扫这个号进来画画', w / 2, h * 0.8)
  } else if (scene === 'need-scan') {
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('请扫老师的码', w / 2, h * 0.4)
    ctx.font = '24px sans-serif'
    ctx.fillText('不用输入数字', w / 2, h * 0.48)
  } else if (scene === 'pick') {
    ctx.font = 'bold 40px sans-serif'
    ctx.fillText('选一只', w / 2, 90)
    ANIMALS.forEach((a, i) => {
      const y = 130 + i * 140
      round('#fff', 40, y, w - 80, 120)
      ctx.fillStyle = '#1a120c'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText(a.name, w / 2, y + 74)
    })
  } else if (scene === 'paint') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(20, 20, w - 40, h * 0.55)
    ctx.strokeStyle = '#1a120c'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.32, 90, 110, 0, 0, Math.PI * 2)
    ctx.stroke()
    CRAYONS.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(18 + i * (w - 36) / CRAYONS.length, h * 0.62, (w - 50) / CRAYONS.length, 64)
    })
    round('#e24b4b', 24, h * 0.78, w - 48, 96)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('送进世界', w / 2, h * 0.78 + 62)
    if (message) {
      ctx.fillStyle = '#1a120c'
      ctx.font = '24px sans-serif'
      ctx.fillText(message, w / 2, h * 0.95)
    }
  } else if (scene === 'success') {
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('送到啦', w / 2, 160)
    round('#2f9e5f', w * 0.12, 280, w * 0.76, 88)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText('再画一只', w / 2, 338)
  }
}

function round(color, x, y, w, h) {
  ctx.fillStyle = color
  ctx.beginPath()
  const r = 24
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.fill()
}

wx.onTouchEnd((e) => {
  const t = e.changedTouches[0]
  const x = t.clientX
  const y = t.clientY
  const w = canvas.width
  const h = canvas.height
  if (scene === 'home') {
    if (hit(x, y, { x: w * 0.12, y: 260, w: w * 0.76, h: 88 })) {
      room = String(1000 + Math.floor(Math.random() * 9000))
      scene = 'host'
    } else if (hit(x, y, { x: w * 0.12, y: 380, w: w * 0.76, h: 88 })) {
      scene = room ? 'pick' : 'need-scan'
    }
  } else if (scene === 'pick') {
    ANIMALS.forEach((a, i) => {
      if (hit(x, y, { x: 40, y: 130 + i * 140, w: w - 80, h: 120 })) {
        picked = i
        scene = 'paint'
        message = ''
      }
    })
  } else if (scene === 'paint') {
    if (y > h * 0.62 && y < h * 0.62 + 64) {
      crayon = Math.min(CRAYONS.length - 1, Math.floor(((x - 18) / (w - 36)) * CRAYONS.length))
    }
    if (hit(x, y, { x: 24, y: h * 0.78, w: w - 48, h: 96 })) {
      message = '正在送…'
      scene = 'success'
    }
  } else if (scene === 'success') {
    if (hit(x, y, { x: w * 0.12, y: 280, w: w * 0.76, h: 88 })) scene = 'pick'
  }
  draw()
})

launch()
draw()
