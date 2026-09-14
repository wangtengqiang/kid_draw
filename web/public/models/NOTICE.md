# 3D models — licenses

Default **lion / deer / tiger** are 2.5D alpha cutouts of this project's
generated character art (`gen-land-animals-sheet.png`). They walk on the
path as camera-facing planes. Kid crayon **multiplies** onto the coat;
eyes/nose stay from the art. Not Kenney cubes, fox/wolf, sphere cubs,
sunflower-petal heads, or 千图网.

## Art cutouts — lion, deer, tiger (this repo)

- Built by `web/scripts/extract-art-cutouts.py` (knock out the cream
  background, crop each animal).
- Files: `cutouts/{lion,deer,tiger}.png`
- Runtime pack: `art-cutout` (`web/src/world-exhibition/art-cutout.ts`)
- Clips: `walk` / `idle` / `eat` / `static` (hop / breathe on the plane)
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
