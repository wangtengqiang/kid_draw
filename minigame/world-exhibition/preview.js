/**
 * 世界观展：单角色转台（2D 占位）。只读，不涂色、不送画。
 * 网页预览才是 Three.js 3D。
 */
const { drawAnimal } = require('./models.js')

function PreviewStage() {
  this.rot = 0
}

PreviewStage.prototype.show = function () {}

PreviewStage.prototype.render = function (ctx, item, box) {
  this.rot += 0.01
  ctx.save()
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2)
  ctx.scale(0.92 + Math.sin(this.rot) * 0.04, 1)
  ctx.translate(-(box.w / 2), -(box.h / 2))
  drawAnimal(ctx, item.animalId, item.regionColors, { x: 0, y: 0, w: box.w, h: box.h })
  ctx.restore()
}

PreviewStage.prototype.dispose = function () {}

module.exports = { PreviewStage }
