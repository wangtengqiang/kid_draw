/**
 * 儿童创作 / 纸上涂色共用：「送进世界」。
 * 本机 mock 走 storage；正式改为 wx.cloud.callFunction({ name: 'sendToWorld' })。
 */
const { storage } = require('../storage/index.js')
const { LOCAL_GALLERY_KEY } = require('../sync/keys.js')
const { animalLabel, creatorId, submitAnimal } = require('../sync/rooms.js')
const { exportTexture } = require('./export-texture.js')

function cacheGallery(item) {
  if (typeof wx === 'undefined' || !wx.setStorageSync) return
  let all = []
  try {
    const raw = wx.getStorageSync(LOCAL_GALLERY_KEY)
    all = raw ? JSON.parse(raw) : []
  } catch (e) {
    all = []
  }
  try {
    wx.setStorageSync(
      LOCAL_GALLERY_KEY,
      JSON.stringify([item].concat(all.filter((g) => g.id !== item.id)).slice(0, 60)),
    )
  } catch (e) {
    /* quota — animal is already in the room */
  }
}

function sendColoredAnimal(input) {
  const item = {
    id: `g-${Date.now()}`,
    animalId: input.animalId,
    thumb: input.thumb,
    regionColors: input.regionColors,
    roomId: input.roomId,
    createdAt: Date.now(),
  }
  var result
  try {
    result = submitAnimal(input.roomId, {
      animalId: input.animalId,
      creatorId: creatorId(),
      label: animalLabel(input.animalId),
      thumb: input.thumb,
      regionColors: input.regionColors,
    })
  } catch (e) {
    return Promise.resolve({ ok: false, reason: 'missing', item: item })
  }
  if (!result.ok) {
    try {
      cacheGallery(item)
    } catch (e) {
      /* keep going */
    }
    return Promise.resolve({ ok: false, reason: result.reason, item: item })
  }
  item.id = result.placed.id
  try {
    cacheGallery(item)
  } catch (e) {
    /* animal already in the room */
  }
  return storage
    .putTexture(input.thumb, `${input.animalId}-${item.id}`)
    .then(function (tex) {
      return storage
        .saveGalleryItem({
          id: item.id,
          creatorId: creatorId(),
          animalId: input.animalId,
          texture: tex,
          thumb: input.thumb,
          regionColors: input.regionColors,
          roomCode: input.roomId,
          createdAt: item.createdAt,
        })
        .then(function () {
          return { ok: true, placed: result.placed, item: item }
        })
    })
    .catch(function () {
      return { ok: true, placed: result.placed, item: item }
    })
}

function sendToWorld(input) {
  const exported = exportTexture(input.paint)
  return sendColoredAnimal({
    roomId: input.roomId,
    animalId: input.animalId,
    thumb: exported.thumb,
    regionColors: exported.regionColors,
  })
}

module.exports = { sendToWorld, sendColoredAnimal }
