/**
 * 儿童创作：官方线稿样子。不是主机世界，也不是椭圆雪人。
 * 分区表只用来从自由涂色里采样皮毛色。
 */
const { DEFAULTS } = require('../types.js')
const { drawLineArt } = require('../art.js')

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
  drawLineArt(ctx, animalId, box, { multiply: true })
}

module.exports = { drawLineGuide, regionsOf, colorsOf }
