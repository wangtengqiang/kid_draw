/**
 * 儿童创作：导出画板上的原始笔迹当皮毛。不按分区平均。
 */
function exportTexture(paint) {
  return {
    thumb: paint.thumb(),
    regionColors: paint.sampleRegions(),
  }
}

module.exports = { exportTexture }
