/**
 * 儿童创作用例：选动物、涂色、导出贴图、送进世界。
 * 这里没有主机森林、没有换主题、没有二维码、没有 3D 预览。
 */
module.exports = {
  ChildCreation: require('./screens.js').ChildCreation,
  PaintSurface: require('./paint.js').PaintSurface,
  sendToWorld: require('./send-to-world.js').sendToWorld,
  sendColoredAnimal: require('./send-to-world.js').sendColoredAnimal,
}
