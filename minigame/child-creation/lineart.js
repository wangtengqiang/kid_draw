/**
 * 儿童创作：线稿样子。不是主机世界。
 * 分区表只用来从自由涂色里采样皮毛色，不再用椭圆点选填色。
 */
const { DEFAULTS } = require('../types.js')
const { drawAnimal } = require('../world-exhibition/models.js')

function regionsOf(animalId) {
  if (animalId === 'deer') return ['antler', 'head', 'body', 'belly', 'leg']
  if (animalId === 'tiger') return ['head', 'body', 'belly', 'leg']
  return ['mane', 'head', 'body', 'belly', 'leg']
}

function colorsOf(animalId, painted) {
  const base = DEFAULTS[animalId] || {}
  const out = {}
  regionsOf(animalId).forEach((k) => {
    out[k] = (painted && painted[k]) || base[k] || '#e7d3b0'
  })
  return out
}

function drawLineGuide(ctx, animalId, box) {
  drawAnimal(ctx, animalId, null, box, { outlineOnly: true })
}

module.exports = { drawAnimal, drawLineGuide, regionsOf, colorsOf }
