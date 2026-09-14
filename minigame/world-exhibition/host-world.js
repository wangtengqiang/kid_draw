/**
 * 世界观展：2D 共享场景（森林 / 雪原 / 海底）。
 * 只展示已经送进来的动物，不涂色、不送画。
 * 完整 3D 在网页 web/src/world-exhibition/。
 */
const { drawAnimal } = require('./models.js')

function HostWorld() {
  this.theme = 'forest'
  this.actors = []
}

HostWorld.prototype.applyTheme = function (theme) {
  this.theme = theme || 'forest'
}

HostWorld.prototype.syncAnimals = function (list) {
  const seen = {}
  ;(list || []).forEach((a, i) => {
    seen[a.id] = true
    if (this.actors.filter((x) => x.id === a.id).length) {
      this.actors.forEach((x) => {
        if (x.id === a.id && a.thumb) x.thumb = a.thumb
      })
      return
    }
    this.actors.push({
      id: a.id,
      animalId: a.animalId,
      regionColors: a.regionColors,
      thumb: a.thumb || '',
      t: i * 0.7,
    })
  })
  this.actors = this.actors.filter((a) => seen[a.id])
}

HostWorld.prototype.render = function (ctx, box, now) {
  const bg = { forest: '#b7d7a8', snow: '#d9ebf7', underwater: '#0b4f6c' }
  ctx.fillStyle = bg[this.theme] || bg.forest
  ctx.fillRect(box.x, box.y, box.w, box.h)
  if (this.theme === 'forest') {
    ctx.fillStyle = '#3f7a3a'
    ctx.fillRect(box.x, box.y + box.h * 0.7, box.w, box.h * 0.3)
  } else if (this.theme === 'snow') {
    ctx.fillStyle = '#f4f8ff'
    ctx.fillRect(box.x, box.y + box.h * 0.7, box.w, box.h * 0.3)
  } else {
    ctx.fillStyle = '#c2b280'
    ctx.fillRect(box.x, box.y + box.h * 0.75, box.w, box.h * 0.25)
  }
  this.actors.forEach((a, i) => {
    a.t += 0.012
    const px = box.x + box.w * (0.2 + 0.6 * ((Math.sin(a.t) + 1) / 2))
    const py = box.y + box.h * (0.45 + 0.15 * Math.sin(a.t * 0.8 + i))
    drawAnimal(ctx, a.animalId, a.regionColors, { x: px - 50, y: py - 60, w: 100, h: 120 }, { coat: a.thumb })
  })
}

HostWorld.prototype.dispose = function () {
  this.actors = []
}

module.exports = { HostWorld }
