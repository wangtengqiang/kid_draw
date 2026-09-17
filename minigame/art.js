/**
 * 官方 2D 图：选一只卡片、涂色线稿、打印线稿。
 * 不是椭圆雪人，也不是 3D 快照。快照在 snapshots.js。
 * 微信从仓库根导入：字面量 picks/*.png、lineart/*.png 必须在根目录存在。
 */
const PICKS = {}
const LINES = {}

const PICK_SRC = {
  deer: ['picks/deer.png', 'minigame/picks/deer.png', 'public/picks/deer.png'],
  tiger: ['picks/tiger.png', 'minigame/picks/tiger.png', 'public/picks/tiger.png'],
  lion: ['picks/lion.png', 'minigame/picks/lion.png', 'public/picks/lion.png'],
}
const LINE_SRC = {
  deer: ['lineart/deer.png', 'minigame/lineart/deer.png', 'public/lineart/deer.png'],
  tiger: ['lineart/tiger.png', 'minigame/lineart/tiger.png', 'public/lineart/tiger.png'],
  lion: ['lineart/lion.png', 'minigame/lineart/lion.png', 'public/lineart/lion.png'],
}

const { loadFirstPng } = require('./load-png.js')

function fillCache(srcMap, cache) {
  return Promise.all(
    Object.keys(srcMap).map((id) =>
      loadFirstPng(srcMap[id]).then((img) => {
        if (img && img.width) cache[id] = img
      }),
    ),
  )
}

function preloadArt() {
  return Promise.all([fillCache(PICK_SRC, PICKS), fillCache(LINE_SRC, LINES)])
}

function containDraw(ctx, img, x, y, w, h) {
  if (!img || !img.width) return false
  const pad = Math.min(w, h) * 0.05
  const scale = Math.min((w - pad * 2) / img.width, (h - pad * 2) / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  return true
}

function drawPickCard(ctx, animalId, box) {
  return containDraw(ctx, PICKS[animalId], box.x, box.y, box.w, box.h)
}

function drawLineArt(ctx, animalId, box, opts) {
  const img = LINES[animalId]
  if (!img || !img.width) return false
  ctx.save()
  if (opts && opts.multiply) ctx.globalCompositeOperation = 'multiply'
  const ok = containDraw(ctx, img, box.x, box.y, box.w, box.h)
  ctx.restore()
  return ok
}

module.exports = { preloadArt, drawPickCard, drawLineArt, PICKS, LINES }
