/**
 * 儿童创作 · sendToWorld
 * 把涂好的贴图记进 gallery 与当场 room_animals。走动不落库。无支付。
 * 环境由云函数运行时注入，不要在此写密钥。
 *
 * 集合尚未建好时返回 not-wired，网页预览请用 LocalMockStore。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CAP = 8

exports.main = async (event) => {
  const { roomCode, animalId, regionColors, fileID } = event || {}
  if (!roomCode || !animalId) {
    return { ok: false, reason: 'missing', hint: '需要 roomCode 与 animalId' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const db = cloud.database()
    const rooms = await db.collection('rooms').where({ code: roomCode }).limit(1).get()
    const room = rooms.data && rooms.data[0]
    if (!room || room.ended) return { ok: false, reason: 'missing' }
    if (room.paused) return { ok: false, reason: 'paused' }

    const counted = await db.collection('room_animals').where({ roomCode }).count()
    if (counted.total >= CAP) return { ok: false, reason: 'full' }

    const now = Date.now()
    const placedId = `a-${now}`
    await db.collection('gallery').add({
      data: {
        creatorId: wxContext.OPENID,
        animalId,
        texture: fileID || '',
        thumb: fileID || '',
        regionColors: regionColors || {},
        roomCode,
        createdAt: now,
      },
    })
    await db.collection('room_animals').add({
      data: {
        id: placedId,
        roomCode,
        creatorId: wxContext.OPENID,
        animalId,
        texture: fileID || '',
        regionColors: regionColors || {},
        createdAt: now,
      },
    })
    return { ok: true, placedId }
  } catch (err) {
    return {
      ok: false,
      reason: 'not-wired',
      hint: '在云开发控制台建 rooms / gallery / room_animals 后再试',
      message: String(err && err.message ? err.message : err),
    }
  }
}
