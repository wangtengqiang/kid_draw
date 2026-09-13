/**
 * 儿童创作：从涂色结果导出贴图记录。到此为止还不联网。
 */
function exportTexture(paint) {
  return {
    thumb: paint.thumb(),
    regionColors: paint.sampleRegions(),
  }
}

module.exports = { exportTexture }
