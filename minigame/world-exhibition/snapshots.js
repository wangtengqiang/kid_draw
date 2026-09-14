/**
 * 小游戏用的 Kenney glTF 正面快照。
 * PNG 由网页 Three.js 同一套 GLTFLoader 烘出来，不是椭圆。
 */
const SNAPS = {}
const SRC = {
  deer: 'models/snapshots/deer.png',
  tiger: 'models/snapshots/tiger.png',
  lion: 'models/snapshots/lion.png',
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

function preloadSnapshots() {
  return Promise.all(
    Object.keys(SRC).map((id) =>
      loadImage(SRC[id]).then((img) => {
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

module.exports = { preloadSnapshots, drawSnapshot, SNAPS }
