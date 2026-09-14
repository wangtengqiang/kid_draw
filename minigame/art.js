/**
 * 官方 2D 图：选一只卡片、涂色线稿、打印线稿。
 * 不是椭圆雪人，也不是 3D 快照。快照在 snapshots.js。
 */
const PICKS = {}
const LINES = {}

const PICK_SRC = {
  deer: ['minigame/picks/deer.png', 'picks/deer.png'],
  tiger: ['minigame/picks/tiger.png', 'picks/tiger.png'],
  lion: ['minigame/picks/lion.png', 'picks/lion.png'],
}
const LINE_SRC = {
  deer: ['minigame/lineart/deer.png', 'lineart/deer.png'],
  tiger: ['minigame/lineart/tiger.png', 'lineart/tiger.png'],
  lion: ['minigame/lineart/lion.png', 'lineart/lion.png'],
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = typeof wx !== 'undefined' && wx.createImage ? wx.createImage() : new Image()
    img.onload = function () {
      resolve(img)
    }
    img.onerror = function () {
      resolve(null)
    }
    img.src = src
  })
}

function loadFirst(srcs) {
  return srcs.reduce(
    (p, src) =>
      p.then((img) => {
        if (img && img.width) return img
        return loadImage(src)
      }),
    Promise.resolve(null),
  )
}

function fillCache(srcMap, cache) {
  return Promise.all(
    Object.keys(srcMap).map((id) =>
      loadFirst(srcMap[id]).then((img) => {
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
