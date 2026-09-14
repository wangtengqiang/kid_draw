/**
 * 纸上涂色：可打印线稿的 2D 占位。四角黑块。完整打印 PNG 在网页 paper-coloring。
 */
const { ANIMAL_NAMES } = require('../types.js')
const { drawAnimal } = require('../world-exhibition/models.js')

function drawSheet(ctx, animalId, box, filled) {
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(box.x, box.y, box.w, box.h)
  const mark = Math.max(16, box.w * 0.08)
  ctx.fillStyle = '#1a120c'
  ctx.fillRect(box.x + 8, box.y + 8, mark, mark)
  ctx.fillRect(box.x + box.w - mark - 8, box.y + 8, mark, mark)
  ctx.fillRect(box.x + 8, box.y + box.h - mark - 8, mark, mark)
  ctx.fillRect(box.x + box.w - mark - 8, box.y + box.h - mark - 8, mark, mark)
  const painted = filled ? { body: '#e24b4b' } : null
  drawAnimal(ctx, animalId, painted, {
    x: box.x + 20,
    y: box.y + 28,
    w: box.w - 40,
    h: box.h - 70,
  })
  ctx.fillStyle = '#1a120c'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(ANIMAL_NAMES[animalId] || '', box.x + box.w / 2, box.y + box.h - 16)
}

module.exports = { drawSheet }
