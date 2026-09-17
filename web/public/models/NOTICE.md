# 3D models — licenses

Default **lion / deer / tiger** are one cartoon mesh with a real skeleton
(`cartoon-rig.ts`). The coat is this project's generated character art
(`gen-land-animals-sheet.png` / `gen-lion-turnaround.png`). Walk, sit, drink,
and sleep deform the same body. Kid crayon **multiplies** onto the coat;
eyes/nose stay authored. Not flipbook stickers, Kenney cubes, fox/wolf,
sphere cubs, sunflower-petal heads, or 千图网.

## Cartoon rig — lion, deer, tiger (this repo)

- Coat PNGs from `web/scripts/extract-art-cutouts.py`
- Files: `cutouts/{lion,deer,tiger}.png`
- Runtime pack: `cartoon-rig` (`web/src/world-exhibition/cartoon-rig.ts`)
- Clips: `walk` / `sit` / `drink` / `sleep` / `idle` (skinned bones)
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
rejected — balloons, not the generated art), Zsky petal-mane lion (no walk),
Sketchfab/Poly Pizza (login / API key), marching-cubes clay, 千图网 watermarks.

Leftover `lion.glb` / `deer.glb` / `tiger.glb` are the rejected sphere cubs
and are **not loaded**.

## Not in this folder

- No 千图网 / stock-art pixels as textures
- No marching-cubes / cube-pet / sunflower-cub / sphere-cub land defaults
