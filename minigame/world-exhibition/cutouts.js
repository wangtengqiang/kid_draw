/**
 * 陆地角色透明剪纸。站在地面上画，不要 512 方块快照（那张自带背景，看起来像相框）。
 * 没涂的皮毛收成白胚，只留眼睛鼻子等深色。
 * 微信从仓库根扫字面量，路径必须写在源码里。
 */
const CUTOUTS = {}
const WHITE = {}
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
      if (px[i + 3] < 16) continue
      const luma = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
      if (luma > 28) {
        px[i] = 255
        px[i + 1] = 253
        px[i + 2] = 247
      }
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
    Object.keys(SRC).map((id) =>
      loadFirst(SRC[id]).then((img) => {
        if (!img) return
        CUTOUTS[id] = img
        WHITE[id] = whitenCutout(img)
      }),
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

function cutoutImage(animalId) {
  return WHITE[animalId] || CUTOUTS[animalId]
}

/**
 * 脚底对齐 (feetX, feetY)，向上长 height。
 * 返回角色占用的屏幕盒，失败返回 null。
 */
function drawStandingCutout(ctx, animalId, feetX, feetY, height, opts) {
  const img = cutoutImage(animalId)
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
  WHITE,
  preloadCutouts,
  cutoutAspect,
  cutoutImage,
  drawStandingCutout,
}
