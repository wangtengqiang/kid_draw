/**
 * 儿童创作：只负责涂。不进主机森林、不写云。
 * 点色块填充分区；蜡笔颜色来自 PALETTE。
 */
const { PALETTE } = require('../types.js')
const { colorsOf } = require('./lineart.js')

function PaintSurface(animalId) {
  this.animalId = animalId
  this.colorHex = PALETTE[3].hex
  this.painted = Object.assign({}, colorsOf(animalId, {}))
}

PaintSurface.prototype.fillRegion = function (name) {
  if (!name) return
  this.painted[name] = this.colorHex
}

PaintSurface.prototype.sampleRegions = function () {
  return Object.assign({}, this.painted)
}

PaintSurface.prototype.thumb = function () {
  return JSON.stringify({ animalId: this.animalId, painted: this.painted })
}

module.exports = { PaintSurface }
