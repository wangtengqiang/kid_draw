/**
 * 小游戏用的 2.5D 剪纸正面快照。
 * PNG 由网页 Three.js 同一套剪纸烘出来，不是椭圆。
 *
 * 微信开发者工具从仓库根导入（project.config.json / game.js）。
 * 静态扫描字符串字面量时按「仓库根」解析，所以第一份必须是
 * models/snapshots/*.png，不能只写 minigame/models/snapshots/。
 */
const SNAPS = {}
const SRC = {
  deer: ['models/snapshots/deer.png', 'minigame/models/snapshots/deer.png', 'public/models/snapshots/deer.png'],
  tiger: ['models/snapshots/tiger.png', 'minigame/models/snapshots/tiger.png', 'public/models/snapshots/tiger.png'],
  lion: ['models/snapshots/lion.png', 'minigame/models/snapshots/lion.png', 'public/models/snapshots/lion.png'],
  fish: ['models/snapshots/fish.png', 'minigame/models/snapshots/fish.png', 'public/models/snapshots/fish.png'],
  dolphin: [
    'models/snapshots/dolphin.png',
    'minigame/models/snapshots/dolphin.png',
    'public/models/snapshots/dolphin.png',
  ],
  turtle: ['models/snapshots/turtle.png', 'minigame/models/snapshots/turtle.png', 'public/models/snapshots/turtle.png'],
}

const { loadFirstPng } = require('../load-png.js')

function preloadSnapshots() {
  return Promise.all(
    Object.keys(SRC).map((id) =>
      loadFirstPng(SRC[id]).then((img) => {
        if (img) SNAPS[id] = img
      }),
    ),
  )
}

function drawSnapshot(ctx, animalId, painted, box) {
  const img = SNAPS[animalId]
  if (!img || !img.width) return false
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.drawImage(img, box.x, box.y, box.w, box.h)
  const body = painted && (painted.body || painted.head || painted.mane)
  if (body && body !== '#ffffff' && body !== '#fffdf7') {
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = 0.42
    ctx.fillStyle = body
    ctx.fillRect(box.x, box.y, box.w, box.h)
  }
  ctx.restore()
  return true
}

module.exports = { preloadSnapshots, drawSnapshot, SNAPS, SRC }
