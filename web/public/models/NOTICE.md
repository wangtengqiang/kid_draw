# 3D models — licenses

Default **lion / deer / tiger** are original in-repo standing cartoon
quadrupeds (neck ruff, elongated body, big eyes), authored with Three.js
`GLTFExporter`. Kid paintboard pixels stay the coat UV. Not Kenney cubes,
not fox/wolf, not sunflower-petal cubs, not 千图网 textures.

## Standing quads — lion, deer, tiger (original, this repo)

- Built by `web/scripts/author-cartoon-cubs.mjs`
- Style target: `gen-lion-turnaround.png` + `gen-land-animals-sheet.png`
  (front / 3q / side / back standing lion; deer and tiger in the same
  language). Neck mane is a 3D ruff with Z depth that hangs down the chest,
  not petals in the face plane. No stock PNG was baked into the mesh.
- Files: `lion.glb`, `deer.glb`, `tiger.glb`
- Clips: `walk`, `idle`, `eat`, `static`
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
petal-head cubs (rejected), Zsky petal-mane lion (no walk), Sketchfab/Poly
Pizza (login / API key), marching-cubes clay, 千图网 watermarks.

## Not in this folder

- No 千图网 / stock-art pixels as textures
- No marching-cubes / cube-pet / sunflower-cub land defaults
