# 3D models — licenses

Default land animals are **downloaded premade glTF**. Kid coloring is a coat
UV albedo (museum/LED stack), not a generated body.

## Quaternius Ultimate Animated Animals — deer, tiger (CC0 1.0)

- Pack: https://quaternius.com/packs/ultimateanimatedanimals.html
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- `deer.glb` ← Stag (clips: `Walk`, `Idle`, `Eating`, …)
- `tiger.glb` ← Wolf (closest CC0 stylized predator with Walk/Idle; pack has no tiger)
- Vendored GLBs: https://github.com/danwahl/animasim/tree/main/assets/generated/glb
  - https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/stag.glb
  - https://media.githubusercontent.com/media/danwahl/animasim/main/assets/generated/glb/wolf.glb

## Zsky Animal Pack — lion (CC BY 4.0)

- https://opengameart.org/content/animal-pack
- Zip: https://opengameart.org/sites/default/files/animals_pack.zip
- Credit: https://www.patreon.com/Zsky
- `lion.glb` ← `Animals_Pack/GLTF/Lion.glb` (real lion mesh + `Eyes_Lion`; no walk clip)
- See `ZSKY-LICENSE.txt`

No sticker eyes, no icosphere mane overlay. Coat UV replaces fur maps only.

## Kenney Cube Pets 2.0 — fish only (CC0 1.0)

- https://kenney.nl/assets/cube-pets
- Zip: https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
- `fish.glb` + `Textures/colormap.png`

## Gobkit CC0 — dolphin, turtle stand-ins

- https://gobkit.com/api/free
- `dolphin.glb` ← Whale.glb · `turtle.glb` ← Seal.glb

## Tried, not used as the land default

- Kenney Cube Pets lion/deer/tiger — real glTF, but cube-pet language; not the museum quadruped look.
- Kenney Animal Pack — 2015 2D PNGs, not glTF.
- Poly Pizza bundles — API key 401. Not used.
- Mixamo — humanoid clips; not a cute animal pack we can fetch without an Adobe login.

## Not in this folder

- No 千图网 / stock-art pixels
- No marching-cubes / icosphere-mane GLBs
- No CapsuleGeometry animals as the default look
