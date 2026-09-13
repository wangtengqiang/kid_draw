/** MVP 本机实现。字段与云数据库对齐。走动不写这里。 */
const { LOCAL_GALLERY_KEY } = require('../sync/keys.js')

function read(key, fallback) {
  try {
    const raw = wx.getStorageSync(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  wx.setStorageSync(key, JSON.stringify(value))
}

function LocalMockStore() {}

LocalMockStore.prototype.putTexture = function (dataUrl, hint) {
  return Promise.resolve({ fileID: `local://${hint}`, url: dataUrl })
}

LocalMockStore.prototype.saveGalleryItem = function (record) {
  const all = read(LOCAL_GALLERY_KEY, [])
  write(LOCAL_GALLERY_KEY, [record].concat(all.filter((g) => g.id !== record.id)).slice(0, 60))
  return Promise.resolve()
}

LocalMockStore.prototype.listGallery = function () {
  return Promise.resolve(read(LOCAL_GALLERY_KEY, []))
}

LocalMockStore.prototype.createRoom = function (meta) {
  return Promise.resolve(meta)
}

LocalMockStore.prototype.updateRoomMeta = function () {
  return Promise.resolve(null)
}

LocalMockStore.prototype.clearRoomAnimals = function () {
  return Promise.resolve()
}

LocalMockStore.prototype.addRoomAnimal = function () {
  return Promise.resolve()
}

module.exports = { LocalMockStore }
