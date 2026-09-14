Industry pipeline for “kids color a sheet → animal walks on a big screen”: premade rigged mesh, UV the coloring sheet onto the coat, play baked walk/idle. Not marching-cubes, not CapsuleGeometry.
Found: Atelier des Enfants (Modulo Kinetic) maps a scanned template onto a pre-rigged 3D object — https://www.modulo-pi.com/showcase/atelierdesenfants-atelierdeslumieres/
Found: Mediterranean-forest museum paper does the same UV bake — https://link.springer.com/article/10.1007/s11042-024-18606-0
Found: Qubein “Sketch a Fish” LED wall — https://www.holtxp.com/portfolio/sketch-a-fish-exhibit-qubein-childrens-museum/
Found: Hungarian Natural History “color-in dinosaur walks onto the wall” — https://www.zengo.eu/en/project/magyar-termeszettudomanyi-muzeum-dino-fal
Found: Three.js standard is GLTFLoader + AnimationMixer + SkeletonUtils.clone — https://threejs.org/manual/en/animation-system.html
Found: Mixamo is humanoid clips (Adobe login); cute quadrupeds come from CC0 packs. Poly Pizza cartoon bundles returned 401 without an API key.
Adopted: Quaternius Ultimate Animated Animals (CC0) Stag=deer, Wolf=tiger — https://quaternius.com/packs/ultimateanimatedanimals.html
GLBs: https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/stag.glb and wolf.glb
Lion: Zsky Animal Pack Lion.glb (CC BY 4.0) — https://opengameart.org/sites/default/files/animals_pack.zip credit https://www.patreon.com/Zsky
Fish: Kenney Cube Pets (CC0) — https://kenney.nl/assets/cube-pets — zip https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
Marine: Gobkit Whale/Seal (CC0) — https://gobkit.com/api/free
Kid paint → coatTexture on coat UVs only (`flipY=false`); original eye/nose maps stay.
Walk/Idle/Eating via AnimationMixer; drink uses Eating; sit/rest stay mixer Idle + simple pose.
No icosphere mane, no blob-v2 default, no 千图网 pixels.
