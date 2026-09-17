# 3D models — licenses

Default **lion / deer / tiger** are authored glTF quadrupeds
(`web/scripts/author-land-gltf.mjs` → `lion.glb` / `deer.glb` / `tiger.glb`).
Each file is one cartoon mesh with volume, UV, a quadruped skeleton
including neck, and clips: walk / idle / sit / drink / sleep / turn.
Kid crayon **multiplies** onto the coat albedo; eyes/nose stay authored.
Not a PNG plate, Kenney cubes, fox/wolf, sphere cubs, sunflower-petal
heads, or 千图网.

A full Blender cartoon rigger was not available this pass. These glTFs
are lofted superellipse quadrupeds (BufferGeometry, not Sphere/Box CSG)
that read as lion (neck ruff), deer (long neck + antlers), and tiger
(stripes, no mane). Missing versus a studio Blender pack: blend shapes,
authored turnaround textures inside the glb, and hand-keyed contact
feet. The running forest still loads **meshes**, not sheared cards.

## Land glTF — lion, deer, tiger (this repo)

- Files: `lion.glb` `deer.glb` `tiger.glb`
- Author: `node scripts/author-land-gltf.mjs`
- Runtime pack: `land-gltf` (`GLTFLoader` + `AnimationMixer`)
- Coat PNGs from `web/scripts/extract-art-cutouts.py` multiply onto UV
- Clips: `walk` / `idle` / `sit` / `drink` / `sleep` / `turn`
- Front snapshots: `snapshots/{lion,deer,tiger}.png`

## Kenney Cube Pets 2.0 — fish only (CC0 1.0)

- Pack: https://kenney.nl/assets/cube-pets
- Zip: https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- File: `fish.glb` ← `animal-fish.glb`
- Atlas: `Textures/colormap.png` (keep so the fish face shows)
- Author: Kenney (www.kenney.nl)

## Gobkit CC0 — dolphin, turtle stand-ins

- https://gobkit.com/api/free
- `dolphin.glb` ← Whale.glb · `turtle.glb` ← Seal.glb

## Tried and not the land default

Kenney Cube Pets (too cubic), Quaternius fox/wolf (wrong species), sunflower
petal-head cubs (rejected), CSG sphere-cub quadrupeds (`author-cartoon-cubs.mjs`,
rejected — balloons, not the generated art), 2.5D cutout yaw (sheared cards
on phone orbit), Zsky petal-mane lion (no walk), Sketchfab/Poly Pizza (login
/ API key), marching-cubes clay, 千图网 watermarks.

## Not in this folder

- No 千图网 / stock-art pixels as textures
- No marching-cubes / cube-pet / sunflower-cub / sphere-cub land defaults
- No Mixamo humanoid retargets
