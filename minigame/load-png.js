/**
 * 微信开发者工具对缺失字面量 PNG 会 ENOENT，甚至不走 onerror。
 * 必须 try/catch + 超时，loadFirst 才能落到下一份路径。
 */
function loadPng(src) {
  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      done(null)
    }, 1500)
    function done(img) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(img && img.width ? img : null)
    }
    try {
      var img = typeof wx !== 'undefined' && wx.createImage ? wx.createImage() : new Image()
      img.onload = function () {
        done(img)
      }
      img.onerror = function () {
        done(null)
      }
      img.src = src
    } catch (e) {
      done(null)
    }
  })
}

function loadFirstPng(srcs) {
  return (srcs || []).reduce(
    function (p, src) {
      return p.then(function (img) {
        if (img && img.width) return img
        return loadPng(src)
      })
    },
    Promise.resolve(null),
  )
}

module.exports = { loadFirstPng, loadPng }
