/**
 * 陆地角色透明剪纸。站在地面上画，不要 512 方块快照（那张自带背景，看起来像相框）。
 * 微信从仓库根扫字面量，路径必须写在源码里。
 */
const CUTOUTS = {}
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

function preloadCutouts() {
  return Promise.all(
    Object.keys(SRC).map((id) =>
      loadFirst(SRC[id]).then((img) => {
        if (img) CUTOUTS[id] = img
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

/**
 * 脚底对齐 (feetX, feetY)，向上长 height。
 * 返回角色占用的屏幕盒，失败返回 null。
 */
function drawStandingCutout(ctx, animalId, feetX, feetY, height, opts) {
  const img = CUTOUTS[animalId]
  if (!img || !img.width) return null
  const h = height
  const w = h * (img.width / img.height)
  ctx.save()
  ctx.translate(feetX, feetY)
  if (opts && opts.flip) ctx.scale(-1, 1)
  if (opts && opts.lean) ctx.rotate(opts.lean)
  ctx.drawImage(img, -w / 2, -h, w, h)
  ctx.restore()
  const flip = opts && opts.flip
  return { x: feetX - w / 2, y: feetY - h, w: w, h: h, flip: flip }
}

module.exports = { CUTOUTS, SRC, preloadCutouts, cutoutAspect, drawStandingCutout }
