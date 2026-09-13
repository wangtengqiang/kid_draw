/** 与网页 types 对齐的常量。无支付相关字段。 */

const ANIMAL_IDS = ['deer', 'tiger', 'lion']
const ANIMAL_NAMES = { deer: '小鹿', tiger: '老虎', lion: '狮子' }
const THEME_IDS = ['forest', 'snow', 'underwater']
const THEME_NAMES = { forest: '森林', snow: '雪原', underwater: '海底' }
const PALETTE = [
  { hex: '#fff8e7', name: '白' },
  { hex: '#f2d14a', name: '黄' },
  { hex: '#f08a3a', name: '橙' },
  { hex: '#e24b4b', name: '红' },
  { hex: '#ec4899', name: '粉' },
  { hex: '#8d4cf5', name: '紫' },
  { hex: '#3b82f6', name: '蓝' },
  { hex: '#22d3ee', name: '青' },
  { hex: '#2bb673', name: '绿' },
  { hex: '#a3e635', name: '柠' },
  { hex: '#8b5a2b', name: '棕' },
  { hex: '#1f1a17', name: '黑' },
]
const DEFAULTS = {
  deer: { antler: '#8b6914', head: '#e2b98a', body: '#c9965a', belly: '#f3e0c2', leg: '#c48a48' },
  tiger: { head: '#f0b14a', body: '#e89a2d', belly: '#fff1cf', leg: '#d88920' },
  lion: { mane: '#d4922a', head: '#f0d48a', body: '#e6c36a', belly: '#f7e7b8', leg: '#d4b05a' },
}
const ROOM_CAP = 8

module.exports = {
  ANIMAL_IDS,
  ANIMAL_NAMES,
  THEME_IDS,
  THEME_NAMES,
  PALETTE,
  DEFAULTS,
  ROOM_CAP,
}
