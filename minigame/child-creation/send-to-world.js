/**
 * 儿童创作：「送进世界」。
 * 本机 mock 走 storage；正式改为 wx.cloud.callFunction({ name: 'sendToWorld' })。
 * 本文件不渲染主机森林、不画 3D 预览。
 */
const { storage } = require('../storage/index.js')
const { LOCAL_GALLERY_KEY } = require('../sync/keys.js')
const { animalLabel, creatorId, submitAnimal } = require('../sync/rooms.js')
const { exportTexture } = require('./export-texture.js')

function cacheGallery(item) {
  let all = []
  try {
    const raw = wx.getStorageSync(LOCAL_GALLERY_KEY)
    all = raw ? JSON.parse(raw) : []
  } catch (e) {
    all = []
  }
  wx.setStorageSync(
    LOCAL_GALLERY_KEY,
    JSON.stringify([item].concat(all.filter((g) => g.id !== item.id)).slice(0, 60)),
  )
}

function sendToWorld(input) {
  const exported = exportTexture(input.paint)
  const item = {
    id: `g-${Date.now()}`,
    animalId: input.animalId,
    thumb: exported.thumb,
    regionColors: exported.regionColors,
    roomId: input.roomId,
    createdAt: Date.now(),
  }
  const result = submitAnimal(input.roomId, {
    animalId: input.animalId,
    creatorId: creatorId(),
    label: animalLabel(input.animalId),
    thumb: exported.thumb,
    regionColors: exported.regionColors,
  })
  if (!result.ok) {
    cacheGallery(item)
    return Promise.resolve({ ok: false, reason: result.reason, item: item })
  }
  item.id = result.placed.id
  cacheGallery(item)
  return storage.putTexture(exported.thumb, `${input.animalId}-${item.id}`).then(function (tex) {
    return storage
      .saveGalleryItem({
        id: item.id,
        creatorId: creatorId(),
        animalId: input.animalId,
        texture: tex,
        thumb: tex,
        regionColors: exported.regionColors,
        roomCode: input.roomId,
        createdAt: item.createdAt,
      })
      .then(function () {
        return { ok: true, placed: result.placed, item: item }
      })
  })
}

module.exports = { sendToWorld }
