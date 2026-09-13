/**
 * 世界观展 · rooms
 * 房间元数据：房号、主题、暂停、结束。不存角色走路坐标。
 * action: create | get | patch | listAnimals | clearAnimals
 * 环境由运行时注入，不要写密钥。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { action, code, theme, paused, ended, cap } = event || {}
  try {
    const db = cloud.database()
    const rooms = db.collection('rooms')
    const animals = db.collection('room_animals')

    if (action === 'create') {
      const doc = {
        code,
        theme: theme || 'forest',
        paused: false,
        ended: false,
        hostAliveAt: Date.now(),
        cap: cap || 8,
      }
      await rooms.add({ data: doc })
      return { ok: true, room: doc }
    }

    if (action === 'get') {
      const res = await rooms.where({ code }).limit(1).get()
      const room = res.data && res.data[0]
      return { ok: true, room: room || null }
    }

    if (action === 'patch') {
      const res = await rooms.where({ code }).limit(1).get()
      const room = res.data && res.data[0]
      if (!room) return { ok: false, reason: 'missing' }
      const patch = { hostAliveAt: Date.now() }
      if (theme) patch.theme = theme
      if (typeof paused === 'boolean') patch.paused = paused
      if (typeof ended === 'boolean') patch.ended = ended
      await rooms.doc(room._id).update({ data: patch })
      return { ok: true }
    }

    if (action === 'listAnimals') {
      const res = await animals.where({ roomCode: code }).get()
      return { ok: true, animals: res.data || [] }
    }

    if (action === 'clearAnimals') {
      const res = await animals.where({ roomCode: code }).get()
      for (const row of res.data || []) {
        await animals.doc(row._id).remove()
      }
      return { ok: true }
    }

    return { ok: false, reason: 'unknown-action' }
  } catch (err) {
    return {
      ok: false,
      reason: 'not-wired',
      hint: '在云开发控制台建 rooms / room_animals 后再试',
      message: String(err && err.message ? err.message : err),
    }
  }
}
