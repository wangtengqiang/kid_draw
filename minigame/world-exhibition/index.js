/**
 * 世界观展用例：主机森林、换主题、画廊缩略图、只读预览。
 * 这里没有涂色、没有「送进世界」。
 */
module.exports = {
  WorldExhibition: require('./screens.js').WorldExhibition,
  listWorks: require('./gallery.js').listWorks,
  HostWorld: require('./host-world.js').HostWorld,
}
