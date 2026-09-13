# 彩绘动物进森林

一台主机打开共享世界；小朋友只涂色、把画送进去。创作的人**不进入**主机那片森林 / 雪原 / 海底。MVP **免费**，没有内购、虚拟货币或支付入口。

微信 AppID（公开标识，不是密钥）：`wxac4e2e55fc8f4a30`，只写在 `project.config.json`。

## 两个用例目录（先看这里）

网页在 `web/src/`，小游戏在 `minigame/`，**两侧同名**：

| 目录 | 用例 | 里面有什么 | 里面没有什么 |
| --- | --- | --- | --- |
| **`child-creation/`** | 孩子创作 | 选小鹿 / 老虎 / 狮子、大蜡笔涂色、导出贴图、**送进世界** | 主机森林、换主题、二维码、3D 预览 |
| **`world-exhibition/`** | 观展 | 主机主题世界、出示码、画廊大缩略图、**只读** 3D 转台 | 涂色、「送进世界」 |

不要把这两个用例写回同一个 `app` / `ui` 文件，也不要把文件夹命名成 `upload/`。

旁边的技术层：`storage/`（云存储 / 本机 mock）、`sync/`（房号与在场名单，走动不落库）、`cloudfunctions/`（`sendToWorld`、`gallery`、`rooms`，**不进小游戏包**）。

数据怎么走：选动物 → 涂色 → 云函数 `sendToWorld` → `gallery` / `rooms` → 主机世界。详见 [`docs/architecture.md`](docs/architecture.md)。

## 两种玩法

| 角色 | 入口 | 做什么 |
| --- | --- | --- |
| 观展端 / 主机 | 「我是主机」 | 打开 3D 世界，切换 **森林 / 雪原 / 海底**，出示二维码 + 4 位房号。可暂停收画、清场、结束。同场最多 8 只。 |
| 创作端 | 「我是小朋友」或链接 `?join=房号` | 输入 4 位房号或扫码 → 选一只 → 涂色 → **送进世界**。成功后可看立体模型、再画一只、打开全部作品。 |

看自己画过的立体模型：首页点「我的画」（`world-exhibition` 画廊，只读）。纸质拍照是二期，本仓库不做。

## 网页预览（推荐用来演示两端）

需要 Node.js 18+。

```bash
cd web
npm install
npm run dev
```

默认 `http://127.0.0.1:43187`（监听 `0.0.0.0`）。用 **两个浏览器标签**：

1. 标签 A：点「我是主机」，记下 4 位房号。  
2. 标签 B：打开 `http://127.0.0.1:43187/?join=房号`，或点「我是小朋友」后输入房号。  
3. 涂色后按 **送进世界**。回到 A，动物带着你的颜色走进森林。可切换森林 / 雪原 / 海底。B 不会进入那片大地图，可点「看立体模型」。

房间同步：`BroadcastChannel` + `localStorage`。没有云开发环境 ID 时用 `storage/LocalMockStore`。环境 ID 放本机 gitignored 的变量（见 `web/.env.example`），不要把密钥写进源码。

```bash
cd web
npm test
npm run build
```

## 微信开发者工具

1. 安装[微信开发者工具](https://developers.weixin.qq.com/minigame/dev/devtools/download.html)。
2. 导入本仓库**根目录**（含 `game.js`、`game.json`、`project.config.json`）。
3. `compileType` 为 `game`，AppID 为 `wxac4e2e55fc8f4a30`。
4. 小游戏入口是 `game.js` → `minigame/main.js`，同样按 `child-creation/` 与 `world-exhibition/` 分流。完整 3D 观展以网页预览为准；包内是同一套两端 2D 流程。

云函数在控制台单独上传 `cloudfunctions/`，不要打进小游戏包。

## 发布路径（个人主体 · 免版号）

- 个人主体 + 无内购，可走微信休闲类目 **免版号**。这是 intended publish path。
- 本 AppID 已确认为个人主体。不做支付。广告变现以后再说。
- 有多人同场和 UGC 贴图，仍可能被改类目；不要打包票，也不要声称公开试玩必须先有版号。

不要提交 AppSecret、支付密钥、云密钥。
