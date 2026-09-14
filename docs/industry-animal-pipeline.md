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

（Mixamo 四足：官网动作库是人形，https://www.mixamo.com/ 。四足要用 Quaternius 这类动物包，或自己在 Blender 里绑，而不是硬套 Mixamo。）

## 我们学到以后改了什么

已下载 **CC0 Quaternius Ultimate Animated Animals**（经 AnimaSim 的 glb，无付费 API、无千图网）：

- 鹿 ← Stag `Walk` / `Idle` / `Eating`  
  https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/stag.glb
- 虎 ← Wolf（包里没有老虎）  
  https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/wolf.glb
- 狮 ← Fox（包里没有狮子；带走路剪辑的橙色四足）  
  https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/fox.glb
- 鱼 ← Kenney Cube Pets；海豚 / 海龟 ← Gobkit Whale / Seal  
  https://gobkit.com/api/free

运行时：`GLTFLoader` + `SkeletonUtils.clone` + `AnimationMixer`。孩子涂色烤成皮毛 UV（`flipY = false`），眼睛 / 鼻子保留原贴图。喝水用 `Eating`；坐下 / 休息用 Idle + 简单姿势。

`author-animals.mjs`（Marching Cubes）已禁用，**不是默认**。Zsky `Lion.glb`（CC BY，https://opengameart.org/sites/default/files/animals_pack.zip ，署名 https://www.patreon.com/Zsky）下载过，鬃毛仍像花瓣球，不当默认。许可证见 `web/public/models/NOTICE.md`。
