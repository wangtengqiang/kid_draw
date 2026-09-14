# 3D models — licenses

Default animals in this folder are **downloaded** cartoon glTF, not runtime
primitives, not marching-cubes clay, and not sticker-eye overlays.

## Kenney Cube Pets 2.0 — lion, deer, tiger, fish (CC0 1.0)

- Pack: https://kenney.nl/assets/cube-pets
- Zip: https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Files: `lion.glb`, `deer.glb`, `tiger.glb`, `fish.glb` from
  `Models/GLB format/animal-{lion,deer,tiger,fish}.glb`
- Shared atlas: `Textures/colormap.png` (required; GLBs reference this path)
- Clips in each file: `static`, `idle`, `walk`, `run`, `eat`, `dance`, …
- Author: Kenney (www.kenney.nl)

These are painted kid-cartoon quadrupeds (round bodies, drawn faces, four
named legs). They are **not** cubes when viewed from the front; the previous
“cube rump” shots were a camera/orientation bug.

## Gobkit CC0 — dolphin, turtle stand-ins

- https://gobkit.com/api/free (CC0)
- `dolphin.glb` ← `Whale.glb`
- `turtle.glb` ← `Seal.glb` (closest free cartoon marine quadruped this turn;
  Heathal OGA turtle is `.blend` only and Blender is not installed)

## Tried, not default

- **Kenney Animal Pack** (https://kenney.nl/assets/animal-pack) — 2015 **2D PNG
  sprites**, not glTF. Unusable as 3D models.
- **Quaternius Ultimate Animated Animals** (CC0) — excellent Walk/Idle clips
  (e.g. `stag.glb` via https://github.com/danwahl/animasim) but **no lion or
  tiger**. Kept off the default slot so the three land animals share one look.
- **Zsky Animal Pack** (CC BY 4.0, OpenGameArt,
  https://opengameart.org/content/animal-pack,
  zip https://opengameart.org/sites/default/files/animals_pack.zip,
  credit https://www.patreon.com/Zsky) — real `Lion.glb` / `Cat.glb` meshes.
  Shipped briefly; the petal-sphere mane + added googly eyes looked worse
  than Kenney. **Not the default.** Files are not copied into this folder.
- Poly Pizza cartoon bundles require an API key (401). Not used.

## Not in this folder

- No 千图网 / stock-art pixels
- No self-authored metaball / icosphere-mane GLBs
- No runtime CapsuleGeometry / SphereGeometry animals as the default look
