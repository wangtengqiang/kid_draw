/**
 * 客户端持久化入口。默认 LocalMock。
 * 接云开发时改为 wx.cloud.callFunction，环境 ID 不要写进仓库。
 */
const { LocalMockStore } = require('./local-mock.js')

const storage = new LocalMockStore()

module.exports = { storage }
