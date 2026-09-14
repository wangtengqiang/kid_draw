/**
 * 涂层原图单独存。房间心跳名单只留动物 id。
 */
const { LOCAL_GALLERY_KEY } = require('./keys.js')

const LOCAL_COATS_KEY = 'kid-draw-coats-v1'

function readAll() {
  try {
    const raw = wx.getStorageSync(LOCAL_COATS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

function writeAll(all) {
  const ids = Object.keys(all)
  if (ids.length > 32) {
    ids.slice(0, ids.length - 32).forEach((id) => {
      delete all[id]
    })
  }
  wx.setStorageSync(LOCAL_COATS_KEY, JSON.stringify(all))
}

function rememberCoat(id, dataUrl) {
  if (!id || !dataUrl) return
  try {
    const all = readAll()
    all[id] = dataUrl
    writeAll(all)
  } catch (e) {
    /* quota */
  }
}

function coatOf(id) {
  return readAll()[id] || ''
}

function hydrateThumbs(animals) {
  let gallery = []
  try {
    const raw = wx.getStorageSync(LOCAL_GALLERY_KEY)
    gallery = raw ? JSON.parse(raw) : []
  } catch (e) {
    gallery = []
  }
  return (animals || []).map((a) => {
    if (a.thumb) return a
    const fromCoat = coatOf(a.id)
    if (fromCoat) return Object.assign({}, a, { thumb: fromCoat })
    const hit = gallery.find((g) => g && g.id === a.id)
    if (hit && hit.thumb) return Object.assign({}, a, { thumb: hit.thumb })
    return a
  })
}

module.exports = { LOCAL_COATS_KEY, rememberCoat, coatOf, hydrateThumbs }
