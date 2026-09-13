/**
 * 世界观展 · gallery
 * 只读作品列表。不涂色、不送画。
 * 环境由运行时注入，不要写密钥。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  try {
    const wxContext = cloud.getWXContext()
    const db = cloud.database()
    const res = await db
      .collection('gallery')
      .where({ creatorId: wxContext.OPENID })
      .orderBy('createdAt', 'desc')
      .limit(60)
      .get()
    return { ok: true, items: res.data || [] }
  } catch (err) {
    return {
      ok: false,
      reason: 'not-wired',
      items: [],
      hint: '在云开发控制台建 gallery 集合后再试',
      message: String(err && err.message ? err.message : err),
    }
  }
}
