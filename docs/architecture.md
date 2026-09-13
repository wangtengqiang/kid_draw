# 目录怎么拆、数据怎么走

给王腾强：以后改代码先看这两个用例目录，不要把孩子涂色和主机森林写回同一个文件。

**不要**把文件夹命名成 `upload/`。用例名必须写完整：

- `child-creation/` 孩子选动物、涂色、送进世界
- `world-exhibition/` 主机森林、换主题、画廊、只读 3D 预览

网页预览在 `web/src/`，微信小游戏在 `minigame/`，两侧目录同名、同职责。

## 文件夹 → 职责

| 目录 | 谁用 | 做什么 | 不做什么 |
| --- | --- | --- | --- |
| `child-creation/` | 小朋友 | 选小鹿 / 老虎 / 狮子 → 大蜡笔涂色（线稿锁住）→ 导出贴图 → **送进世界** | 不进主机森林、不换主题、不出示二维码、不渲染 3D 预览 |
| `world-exhibition/` | 家长 / 老师 / 看画的人 | 打开主题世界、出示码、换森林 / 雪原 / 海底、大缩略图画廊、点进 **只读** 3D 转台 | 不涂色、没有「送进世界」 |
| `sync/` | 两端 | 房号、主题、在场名单、本机 BroadcastChannel。走动和表情只活在这里 | 不存贴图、不画 3D |
| `storage/` | 两端 | `StorageBackend`：网页用 `LocalMockStore`；正式接 `CloudBaseStore` | 不写密钥、不存走路坐标 |
| `cloudfunctions/` | 服务端 | `sendToWorld`、`gallery`、`rooms` | **不进小游戏包**。无支付、无 AppSecret |
| `web/src/boot.ts` / `minigame/main.js` | 入口 | 首页三个按钮分流：打开世界 / 开始画画 / 我的画 | 不实现涂色或森林 |

首页「开始画画」进入 `child-creation/`。「打开世界」「我的画」进入 `world-exhibition/`。扫码链接只有 `?join=房号`；主机自己的地址是 `?host=1&room=房号`，不要把主机的 `room=` 当成孩子入场。

## 数据流

```
选动物（child-creation）
  → 涂色，线稿锁在上层（child-creation/paint）
  → 导出 PNG + 分区颜色（child-creation/export-texture）
  → sendToWorld
        网页预览：StorageBackend（LocalMockStore）
        正式小游戏：wx.cloud.callFunction({ name: 'sendToWorld' })
  → 云存储：涂色 PNG
  → 云数据库 gallery：作品记录
  → 云数据库 rooms / room_animals：房号、主题、当场动物（不含 x/z）
  → sync 把在场名单广播给主机
  → world-exhibition 主机世界刷出带孩子颜色的鹿 / 虎 / 狮
```

走动、朝向、表情只在主机内存（以及网页预览的 `sync/` 瞬时状态）里，**不写云数据库**。

画廊只读：`world-exhibition` 调 `gallery` 云函数或读本机缓存，点缩略图打开 3D 转台。转台不是那片共享森林。

## 小游戏包不要打进去的

`project.config.json` 的 `packOptions.ignore` 会排除 `web/`、`docs/`、`cloudfunctions/`、`node_modules/`。云函数在微信云开发控制台单独上传。

## 不要写进仓库的

AppSecret、云开发密钥、支付密钥、`.env` 里的环境密钥。AppID `wxac4e2e55fc8f4a30` 是公开标识，只出现在 `project.config.json`。MVP 免费，没有内购。
