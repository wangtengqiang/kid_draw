# 目录怎么拆、数据怎么走

给王腾强：以后改代码先看这三个用例目录，不要把孩子涂色、纸上拍照和主机森林写回同一个文件。

**不要**把文件夹命名成 `upload/`。用例名必须写完整：

- `child-creation/` 孩子选动物、屏上涂色、送进世界
- `paper-coloring/` 老师下载官方线稿；孩子拍照 / 选图，对准同一张模板，再送进世界
- `world-exhibition/` 主机森林、换主题、画廊、只读 3D 预览

网页预览在 `web/src/`，微信小游戏在 `minigame/`，两侧目录同名、同职责。

## 文件夹 → 职责

| 目录 | 谁用 | 做什么 | 不做什么 |
| --- | --- | --- | --- |
| `child-creation/` | 小朋友 | 选小鹿 / 老虎 / 狮子 → 大蜡笔涂色（线稿锁住）→ 导出贴图 → **送进世界** | 不进主机森林、不换主题、不拍照、不渲染 3D 预览 |
| `paper-coloring/` | 老师下载；小朋友拍照 | 下载可打印官方线稿（四角对准标记）；选一只（只限这三只）→ 拍照或选图 → 透视对准模板 → 采样分区色 → **同一条 sendToWorld** | 不用 AI 猜未知动物；孩子首页不是下载列表 |
| `world-exhibition/` | 家长 / 老师 / 看画的人 | 打开主题世界、出示码、换森林 / 雪原 / 海底、大缩略图画廊、点进 **只读** 3D 转台 | 不涂色、没有「送进世界」、不拍照 |
| `sync/` | 两端 | 房号、主题、在场名单、本机 BroadcastChannel。走动和表情只活在这里 | 不存贴图、不画 3D |
| `storage/` | 两端 | `StorageBackend`：网页用 `LocalMockStore`；正式接 `CloudBaseStore` | 不写密钥、不存走路坐标 |
| `cloudfunctions/` | 服务端 | `sendToWorld`、`gallery`、`rooms` | **不进小游戏包**。无支付、无 AppSecret |
| `web/src/boot.ts` / `minigame/main.js` | 入口 | 首页分流：打开世界 / 开始画画 / 拍纸上的画 / 我的画；老师打印线稿是弱入口 | 不实现涂色或森林 |

首页「开始画画」进入 `child-creation/`（网页预览会自动进本机演示房，不必扫码）。「拍纸上的画」进入 `paper-coloring/`。「打开世界」「我的画」进入 `world-exhibition/`。「老师打印线稿」才是下载页。扫码链接只有 `?join=房号`；主机自己的地址是 `?host=1&room=房号`。

## 数据流

```
选动物（child-creation 或 paper-coloring，只限鹿 / 虎 / 狮）
  → 屏上涂色（child-creation/paint）
    或 拍照 / 选图 → 四角标记对准官方模板（paper-coloring/map）
  → PNG + 分区颜色
  → sendToWorld / sendColoredAnimal
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

不准对任意儿童画做「这是什么动物」的识别。纸上的画必须是官方三张线稿之一，由用户自己点选。

## 小游戏包不要打进去的

`project.config.json` 的 `packOptions.ignore` 会排除 `web/`、`docs/`、`cloudfunctions/`、`node_modules/`。云函数在微信云开发控制台单独上传。

## 不要写进仓库的

AppSecret、云开发密钥、支付密钥、`.env` 里的环境密钥。AppID `wxac4e2e55fc8f4a30` 是公开标识，只出现在 `project.config.json`。MVP 免费，没有内购。
