/**
 * 房间同步层：房号、主题、在场名单。
 * 小游戏单机用 wx 存储；真机多端靠 cloudfunctions/rooms。
 * 贴图写入看 child-creation/；列表与预览看 world-exhibition/。
 */
const { rememberCoat } = require('./coats.js')
const { ROOM_CAP } = require('../types.js')

function store() {
  return typeof wx !== 'undefined' && wx.getStorageSync ? wx : null
}

function loadRooms() {
  try {
    const raw = store() ? wx.getStorageSync(LOCAL_ROOMS_KEY) : ''
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

function normalizeRoom(room) {
  return Object.assign({}, room, { animalsGen: room.animalsGen || 0 })
}

function mergeById(a, b) {
  const map = {}
  ;(a || []).forEach((x) => {
    map[x.id] = x
  })
  ;(b || []).forEach((x) => {
    map[x.id] = x
  })
  return Object.keys(map).map((k) => map[k])
}

function mergeRoom(disk, incoming) {
  const a = normalizeRoom(disk)
  const b = normalizeRoom(incoming)
  const animals =
    b.animalsGen > a.animalsGen ? b.animals : a.animalsGen > b.animalsGen ? a.animals : mergeById(a.animals, b.animals)
  const newer = b.hostAliveAt >= a.hostAliveAt ? b : a
  return Object.assign({}, a, newer, {
    id: a.id,
    animals: animals,
    animalsGen: Math.max(a.animalsGen, b.animalsGen),
    emotes: mergeById(a.emotes, b.emotes),
    ended: a.ended || b.ended,
  })
}

function saveRooms(rooms) {
  if (!store()) return
  for (var attempt = 0; attempt < 6; attempt++) {
    var raw = wx.getStorageSync(LOCAL_ROOMS_KEY) || ''
    var disk = {}
    try {
      disk = raw ? JSON.parse(raw) : {}
    } catch (e) {
      disk = {}
    }
    var merged = Object.assign({}, disk)
    Object.keys(rooms).forEach(function (id) {
      merged[id] = disk[id] ? mergeRoom(disk[id], rooms[id]) : normalizeRoom(rooms[id])
    })
    var next = JSON.stringify(merged)
    var now = wx.getStorageSync(LOCAL_ROOMS_KEY) || ''
    if (now !== raw && attempt < 5) continue
    wx.setStorageSync(LOCAL_ROOMS_KEY, next)
    return
  }
}

function creatorId() {
  let id = store() ? wx.getStorageSync(LOCAL_CREATOR_KEY) : ''
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2, 10)}`
    if (store()) wx.setStorageSync(LOCAL_CREATOR_KEY, id)
  }
  return id
}

function newRoomCode() {
  const rooms = loadRooms()
  for (let i = 0; i < 40; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000))
    const existing = rooms[code]
    if (!existing || existing.ended) return code
  }
  return String(1000 + Math.floor(Math.random() * 9000))
}

function createRoom(id) {
  const rooms = loadRooms()
  const room = {
    id,
    theme: 'forest',
    paused: false,
    ended: false,
    hostAliveAt: Date.now(),
    animals: [],
    animalsGen: 0,
    emotes: [],
  }
  rooms[id] = room
  saveRooms(rooms)
  return room
}

function getRoom(id) {
  const room = loadRooms()[id]
  if (!room || room.ended) return null
  return room
}

function patchRoom(id, patch) {
  const rooms = loadRooms()
  const room = rooms[id]
  if (!room || room.ended) return null
  const next = Object.assign({}, room, patch, { id: id })
  rooms[id] = next
  saveRooms(rooms)
  return next
}

function touchHost(id) {
  const rooms = loadRooms()
  if (rooms[id] && !rooms[id].ended) {
    rooms[id].hostAliveAt = Date.now()
    saveRooms(rooms)
  }
}

function setTheme(id, theme) {
  return patchRoom(id, { theme: theme })
}

function endRoom(id) {
  const rooms = loadRooms()
  const room = rooms[id]
  if (!room) return
  room.ended = true
  room.animals = []
  room.emotes = []
  room.animalsGen = (room.animalsGen || 0) + 1
  rooms[id] = room
  saveRooms(rooms)
}

function clearAnimals(id) {
  const rooms = loadRooms()
  const room = rooms[id]
  if (!room || room.ended) return null
  room.animals = []
  room.emotes = []
  room.animalsGen = (room.animalsGen || 0) + 1
  rooms[id] = room
  saveRooms(rooms)
  return room
}

function submitAnimal(roomId, animal) {
  const rooms = loadRooms()
  const room = rooms[roomId]
  if (!room || room.ended) return { ok: false, reason: 'missing' }
  if (room.paused) return { ok: false, reason: 'paused' }
  if (room.animals.length >= ROOM_CAP) return { ok: false, reason: 'full' }
  const placed = Object.assign({}, animal, {
    id: `a-${Date.now().toString(36)}`,
    createdAt: Date.now(),
  })
  rememberCoat(placed.id, placed.thumb)
  room.animals = room.animals.concat([Object.assign({}, placed, { thumb: '' })])
  room.animalsGen = (room.animalsGen || 0) + 1
  rooms[roomId] = room
  saveRooms(rooms)
  return { ok: true, placed: placed }
}

var PREVIEW_ROOM_ID = '1001'

function ensurePreviewRoom() {
  if (getRoom(PREVIEW_ROOM_ID)) touchHost(PREVIEW_ROOM_ID)
  else createRoom(PREVIEW_ROOM_ID)
  return PREVIEW_ROOM_ID
}

function joinQuery() {
  try {
    const q = wx.getLaunchOptionsSync().query || {}
    return q.join || null
  } catch (e) {
    return null
  }
}

function isHostQuery() {
  try {
    const q = wx.getLaunchOptionsSync().query || {}
    return q.host === '1' || q.role === 'host'
  } catch (e) {
    return false
  }
}

function animalLabel(animalId) {
  const names = { deer: '小鹿', tiger: '小老虎', lion: '小狮子' }
  return `小朋友的${names[animalId] || animalId}`
}

module.exports = {
  PREVIEW_ROOM_ID,
  animalLabel,
  clearAnimals,
  createRoom,
  creatorId,
  endRoom,
  ensurePreviewRoom,
  getRoom,
  isHostQuery,
  joinQuery,
  newRoomCode,
  patchRoom,
  setTheme,
  submitAnimal,
  touchHost,
  rememberCoat: require('./coats.js').rememberCoat,
  hydrateThumbs: require('./coats.js').hydrateThumbs,
  coatOf: require('./coats.js').coatOf,
}
