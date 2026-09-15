/**
 * 陆地角色透明剪纸、立体树。站在地面上画。
 * 世界里默认用原画颜色，小朋友涂的再叠上去。
 * 微信从仓库根扫字面量，路径必须写在源码里。
 */
const CUTOUTS = {}
const WHITE = {}
const TREES = {}
const SRC = {
  deer: [
    'models/cutouts/deer.png',
    'minigame/models/cutouts/deer.png',
    'public/models/cutouts/deer.png',
  ],
  tiger: [
    'models/cutouts/tiger.png',
    'minigame/models/cutouts/tiger.png',
    'public/models/cutouts/tiger.png',
  ],
  lion: [
    'models/cutouts/lion.png',
    'minigame/models/cutouts/lion.png',
    'public/models/cutouts/lion.png',
  ],
}
const TREE_SRC = {
  oak: ['models/trees/oak.png', 'minigame/models/trees/oak.png'],
  pine: ['models/trees/pine.png', 'minigame/models/trees/pine.png'],
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

function makeCanvas(w, h) {
  if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
    try {
      return wx.createOffscreenCanvas({ type: '2d', width: w, height: h })
    } catch (e) {
      /* fall through */
    }
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  return null
}

function whitenCutout(img) {
  if (!img || !img.width) return img
  const canvas = makeCanvas(img.width, img.height)
  if (!canvas) return img
  const ctx = canvas.getContext('2d')
  if (!ctx) return img
  ctx.clearRect(0, 0, img.width, img.height)
  ctx.drawImage(img, 0, 0)
  try {
    const data = ctx.getImageData(0, 0, img.width, img.height)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 10) continue
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const a = px[i + 3]
      const row = Math.floor(i / 4 / img.width) / img.height
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      if (row > 0.84 && a < 220 && sat < 36) {
        px[i + 3] = 0
        continue
      }
      if (a >= 40) px[i + 3] = 255
      const eye = b > 95 && b > r + 12 && b > g * 0.82
      const ink = luma < 22
      if (eye || ink) continue
      px[i] = 255
      px[i + 1] = 253
      px[i + 2] = 247
    }
    ctx.putImageData(data, 0, 0)
  } catch (e) {
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = '#fffdf7'
    ctx.fillRect(0, 0, img.width, img.height)
    ctx.globalCompositeOperation = 'source-over'
  }
  return canvas
}

function preloadCutouts() {
  return Promise.all(
    Object.keys(SRC)
      .map((id) =>
        loadFirst(SRC[id]).then((img) => {
          if (!img) return
          CUTOUTS[id] = img
          WHITE[id] = whitenCutout(img)
        }),
      )
      .concat(
        Object.keys(TREE_SRC).map((id) =>
          loadFirst(TREE_SRC[id]).then((img) => {
            if (img && img.width) TREES[id] = img
          }),
        ),
      ),
  )
}

function cutoutAspect(animalId) {
  const img = CUTOUTS[animalId]
  if (img && img.width && img.height) return img.width / img.height
  if (animalId === 'deer') return 356 / 616
  if (animalId === 'tiger') return 481 / 532
  return 511 / 584
}

function cutoutImage(animalId, opts) {
  if (opts && opts.blank) return WHITE[animalId] || CUTOUTS[animalId]
  return CUTOUTS[animalId] || WHITE[animalId]
}

function treeImage(kind) {
  return TREES[kind] || TREES.oak || TREES.pine
}

function treeAspect(kind) {
  const img = treeImage(kind)
  if (img && img.width && img.height) return img.width / img.height
  return kind === 'pine' ? 760 / 1069 : 824 / 1072
}

/**
 * 脚底对齐 (feetX, feetY)，向上长 height。
 * 返回角色占用的屏幕盒，失败返回 null。
 */
function drawStandingCutout(ctx, animalId, feetX, feetY, height, opts) {
  const img = cutoutImage(animalId, opts)
  if (!img || !img.width) return null
  const h = height
  const w = h * (img.width / img.height)
  ctx.save()
  ctx.translate(feetX, feetY)
  if (opts && opts.flip) ctx.scale(-1, 1)
  ctx.drawImage(img, -w / 2, -h, w, h)
  ctx.restore()
  return { x: feetX - w / 2, y: feetY - h, w: w, h: h }
}

module.exports = {
  CUTOUTS,
  SRC,
  TREES,
  WHITE,
  makeCanvas,
  preloadCutouts,
  cutoutAspect,
  cutoutImage,
  drawStandingCutout,
  treeAspect,
  treeImage,
}
