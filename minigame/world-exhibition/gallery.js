/**
 * 世界观展：只读作品列表。不涂色、不送画。
 */
const { LOCAL_GALLERY_KEY } = require('../sync/keys.js')

function listWorks() {
  try {
    const raw = wx.getStorageSync(LOCAL_GALLERY_KEY)
    const all = raw ? JSON.parse(raw) : []
    return all.filter((g) => g && g.animalId)
  } catch (e) {
    return []
  }
}

function getWork(id) {
  return listWorks().filter((g) => g.id === id)[0]
}

function removeWork(id) {
  const all = listWorks().filter((g) => g && g.id !== id)
  try {
    wx.setStorageSync(LOCAL_GALLERY_KEY, JSON.stringify(all))
  } catch (e) {
    /* ignore */
  }
  return all
}

module.exports = { listWorks, getWork, removeWork }
