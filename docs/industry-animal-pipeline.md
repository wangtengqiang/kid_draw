# 业界怎么做「可爱动物会走路」，以及我们学了什么

孩子涂色之后，动物要在大屏上走起来。业界**不从涂鸦挤出身体**，而是：**先有做好的网格 / 骨骼，再把涂色当皮毛贴图，用现成的走路剪辑播**。

下面先对工具，再对为什么粘土会丑，再举真实案例，最后写我们已经换成哪一套。

## 工具各管什么

| 工具 | 是什么 | 管什么 | 不适合什么 |
| --- | --- | --- | --- |
| **[Blender + glTF](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)** | DCC 建模 / 绑定 / 导出 | 做网格、UV、骨骼、把 Walk/Idle 打成 `.glb` | 运行时用 Marching Cubes 捏身体 |
| **[Three.js GLTFLoader + AnimationMixer](https://threejs.org/manual/en/animation-system.html)** | Web 运行时 | 加载 glTF、克隆蒙皮、播片段、混合 | 用 `CapsuleGeometry` 当角色 |
| **[Unity Animator / Mecanim](https://docs.unity3d.com/Manual/AnimationSection.html)** | 游戏引擎状态机 | Idle ↔ Walk ↔ Eat 过渡、Root Motion | 自己写正弦摆腿当主动画 |
| **[Mixamo](https://www.mixamo.com/)** | Adobe 自动绑骨 + 动作库 | **人形**（T-pose）一键 Walk/Idle | **四足动物**；要 Adobe 登录，本项目不用付费 API |
| **[Spine](https://esotericsoftware.com/)** | 2D 骨骼（Esoteric） | 微信 / Cocos 小游戏里的 2D 宠物：切图、绑 2D 骨、换装 | 3D 森林里的四足网格 |
| **[Kenney](https://kenney.nl/assets) / [Quaternius](https://quaternius.com/)** | CC0 资源包 | 直接下载已经 UV、已经 Walk 的卡通动物 | 当「参考图」再手捏圆球去模仿 |

微信小游戏侧常见的是 **Spine 2D 宠物**（Cocos / Laya 有现成组件），不是运行时生成 3D。微信侧讨论见 [Spine runtimes #2858](https://github.com/EsotericSoftware/spine-runtimes/issues/2858)；Cocos 组件文档：[Spine Skeleton](https://docs.cocos.com/creator/manual/zh/editor/components/spine.html)。

## 为什么粘土 / 胶囊 / 圆球鬃毛会丑

业界角色好看，是因为这四件事是**人做好再导出**的，不是运行时猜的：

1. **轮廓** — 头、耳、吻、腿的比例是建模师定的。胶囊堆、metaball、icosphere 鬃毛只有「圆」，没有物种。
2. **UV** — 涂色纸和 3D 皮毛是同一张展开图。我们以前用几何体拼身体，UV 对不上孩子的色块，颜色会糊在错误的面上。
3. **骨骼** — Walk 是顶点跟着骨头走。正弦摆四根胶囊，看起来像玩具钟摆，不像走路。
4. **材质** — Animal Crossing 一类是 **toon：分层光 + 控制线**，网格本身仍然是干净的卡通形。在丑网格上加墨线、贴纸瞳仁，只会更假。

所以丑不在 Three.js，在管线：用生成几何代替了「下载做好的角色」。

## 五个业界案例

1. **博物馆：涂色纸 → 预绑定 3D → 大屏走**  
   巴黎 Atelier des Enfants：扫带二维码的动物线稿，贴到已经绑好的 3D 上再投影。  
   https://www.modulo-pi.com/showcase/atelierdesenfants-atelierdeslumieres/

2. **同样管线的论文（地中海森林）**  
   孩子涂 2D 模板；3D 的 UV 按色块事先展开；扫描图是模型**唯一**贴图。  
   https://link.springer.com/article/10.1007/s11042-024-18606-0

3. **儿童馆 LED：Sketch a Fish**  
   涂海生模板，扫进灯箱，LED 墙上游。还是「模板 + 现成角色」，不是挤网格。  
   https://www.holtxp.com/portfolio/sketch-a-fish-exhibit-qubein-childrens-museum/

4. **动物森友会式卡通 3D**  
   网格是建模出来的圆滚角色，再套 toon / 描边。不是圆球堆鬃毛。引擎侧 NPR 讨论（Cocos 吉卜力/塞尔达向）：  
   https://mp.weixin.qq.com/s/K_nxqBNvALYtUACSBcrQ3Q

5. **游戏资源包：Kenney / Quaternius**  
   直接给 glTF + Walk/Idle，Three.js / Unity 都能播。这是独立游戏和网页 demo 的默认做法。  
   https://kenney.nl/assets/cube-pets  
   https://quaternius.com/packs/ultimateanimatedanimals.html

（Mixamo 四足：官网动作库是人形，https://www.mixamo.com/ 。四足要用动物资源包或自己在 Blender 里绑，不要硬套 Mixamo。）

## 候选取舍（这一轮又查了一遍）

家长参考是圆滚、画脸的卡通狮/鹿（`world-*-cute.png` 那种）。免费、免登录、真·狮/鹿/虎、还能 Walk 的 glTF，查完只剩 Kenney Cube Pets 同时满足「物种对 + 画脸 + 可下载」。

| 候选 | URL | 结论 |
| --- | --- | --- |
| **Kenney Cube Pets** `animal-lion/deer/tiger.glb` | https://kenney.nl/assets/cube-pets · zip https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip | **采用。** 真狮/真鹿/真虎，画好的笑脸，自带 walk。略方，但比「狼当虎」可爱。 |
| Kenney Animal Pack | https://kenney.nl/assets/animal-pack | **拒绝。** 2015 年 2D PNG，不是 glTF。 |
| Quaternius Ultimate Animated Animals Stag | https://quaternius.com/packs/ultimateanimatedanimals.html · https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/stag.glb | **鹿可用但不用。** 真鹿，可是写实低模，和参考的圆滚幼崽不是同一套语言；三只要统一。 |
| Quaternius Fox / Wolf | 同上 fox.glb / wolf.glb | **拒绝。** 不是狮、不是虎。 |
| Quaternius 2016「5 low poly animals」 | https://opengameart.org/content/5-low-poly-animals | **拒绝。** 无狮/虎。 |
| Zsky Animal Pack Lion / Cat | https://opengameart.org/content/animal-pack · zip https://opengameart.org/sites/default/files/animals_pack.zip · 署名 https://www.patreon.com/Zsky | **拒绝。** 真狮，但鬃毛像花瓣球，无 walk。 |
| Gobkit free animals | https://gobkit.com/api/free | **海生采用**（鲸/海豹）。陆地无狮/鹿/虎。 |
| Sketchfab 可下载卡通狮 | https://sketchfab.com/3d-models/cartoon-lion-1d9cf098cbb844d0ba092d0f8f3be05c 等 | **拒绝。** 搜索 API 401，要登录；许可证不统一。 |
| Poly Pizza 卡通包 | https://poly.pizza/bundle/Animated-Animal-Pack-ILAPXeUYiS | **拒绝。** 403/401，要 API key。 |
| Poly Haven / pmndrs assets | https://polyhaven.com/ · https://github.com/pmndrs/assets | **拒绝。** 没有卡通狮鹿虎（只有 HDRI / suzi / bunny）。 |
| Mixamo | https://www.mixamo.com/ | **拒绝。** 人形库，要 Adobe 登录。 |
| OGA Micket tiger、低模鹿 | https://opengameart.org/content/tiger · https://opengameart.org/content/deer-low-poly-rigged | **拒绝。** CC0 但是 0 A.D. 写实低模，不是幼崽卡通，还是 .blend/.zip。 |
| Unity/CGTrader 卡通虎 | 付费资源店 | **拒绝。** 付费 API / 商店。 |
| 粘土 / 胶囊 / icosphere 鬃毛 | 本仓库 `author-animals.mjs` | **拒绝。** 脚本已 throw。 |

免登录 zip 里**没有**「又圆又像参考图、又是真老虎」的 glTF。虎用 Kenney `animal-tiger`（真虎、画脸），不用狼。

## 当前默认

- 狮 / 鹿 / 虎 / 鱼 ← Kenney Cube Pets（CC0），正面是画脸，walk 在文件里。
- 海豚 / 海龟 ← Gobkit Whale / Seal（CC0）。
- 运行时：`GLTFLoader` + `AnimationMixer`。孩子涂色**乘在皮毛上**，默认白色所以 Kenney 原画脸能看见。
- 完整 3D 只在网页 Vite。微信小游戏仍是 2D，本回合不移植 Three.js。

许可证：`web/public/models/NOTICE.md`。无千图网、无 CloudBase 密钥。
