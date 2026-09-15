/**
 * 纸上涂色：可打印官方线稿。四角黑块。完整打印 PNG 在网页 paper-coloring。
 * 陆地三只用仓库里的涂色本 PNG，不再画椭圆雪人。
 */
const { ANIMAL_NAMES } = require('../types.js')
const { font } = require('../draw.js')
const { drawLineArt } = require('../art.js')

function drawSheet(ctx, animalId, box) {
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(box.x, box.y, box.w, box.h)
  const mark = Math.max(16, box.w * 0.08)
  ctx.fillStyle = '#1a120c'
  ctx.fillRect(box.x + 8, box.y + 8, mark, mark)
  ctx.fillRect(box.x + box.w - mark - 8, box.y + 8, mark, mark)
  ctx.fillRect(box.x + 8, box.y + box.h - mark - 8, mark, mark)
  ctx.fillRect(box.x + box.w - mark - 8, box.y + box.h - mark - 8, mark, mark)
  drawLineArt(ctx, animalId, {
    x: box.x + 20,
    y: box.y + 28,
    w: box.w - 40,
    h: box.h - 70,
  })
  ctx.fillStyle = '#1a120c'
  ctx.font = font(18, 500)
  ctx.textAlign = 'center'
  ctx.fillText(ANIMAL_NAMES[animalId] || '', box.x + box.w / 2, box.y + box.h - 16)
}

module.exports = { drawSheet }
