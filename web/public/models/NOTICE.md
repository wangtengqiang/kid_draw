# 3D animal sources

Shipped models are **downloaded third-party glTF**, not marching-cubes / `author-animals.mjs` clay, and not 千图网 / stock illustrations.

## Lion — Zsky Animal Pack (CC BY 4.0)

- File: `lion.glb` from `Animals_Pack/GLTF/Lion.glb`
- Source: https://opengameart.org/content/animal-pack-0
- Zip: https://opengameart.org/sites/default/files/animals_pack.zip
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — credit **Zsky** (https://www.patreon.com/Zsky)
- See `ZSKY-LICENSE.txt`

Cute low-poly lion with a separate eye mesh. No walk clip in the pack; the host still auto-idles / sits / drinks.

## Deer — Quaternius Ultimate Animated Animals (CC0)

- File: `deer.glb` is Quaternius **Stag** (antlers) converted glb
- Original pack: https://quaternius.com/packs/ultimateanimatedanimals.html
- Vendored glb: https://github.com/danwahl/animasim (CC0 redistribution of the same pack)
- Direct: `assets/generated/glb/stag.glb`
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Author: Quaternius

Includes **Walk / Idle / Eating** clips.

## Tiger — Zsky Cat (CC BY 4.0)

No CC0/CC-BY **tiger** glTF was available without a Poly Pizza API key or Sketchfab login.

- File: `tiger.glb` is Zsky `Cat.glb` from the same Animal Pack as the lion (closest cartoon feline)
- Same license/credit as the lion: **Zsky** https://www.patreon.com/Zsky

Kid paint tints coat materials (and a stripe/spot canvas on UV); eyes stay cute stickers, not the pack's black pits. Host uses toon shading + ink outline on the downloaded meshes.

## Fish / dolphin / turtle — Gobkit (CC0)

- `fish.glb` — Gobkit `Fugu.glb` https://gobkit.com/freebies/animalB/Fugu.glb
- `dolphin.glb` — Gobkit `Whale.glb` https://gobkit.com/freebies/animalB/Whale.glb (closest CC0 marine mammal with a direct `.glb` URL)
- `turtle.glb` — Gobkit `Seal.glb` https://gobkit.com/freebies/animalB/Seal.glb

**Turtle:** Kenney Animal Pack is **2D PNGs only** (https://kenney.nl/assets/animal-pack). Poly Pizza needs an API key (`401`). OpenGameArt Heathal turtle is CC0 but **`.blend` only**; Blender CLI is not installed here. We did **not** keep marching-cubes clay. Seal is the downloaded marine stand-in.

Gobkit license: CC0 1.0 — https://gobkit.com/api/free and https://gobkit.itch.io/gobkit-free-animal-pack

## Tried and not used

- **Kenney Animal Pack** (https://kenney.nl/assets/animal-pack) — 2015 **2D sprites**, no glTF.
- **Kenney Cube Pets** — real glTF but cube bodies (replaced so the world is not cubes or clay).
- **Poly Pizza** Animated Animal Pack / Turtle Character — download API requires a key; not a pay API we can invent.
- **`web/scripts/author-animals.mjs`** — marching cubes. Do not run for world animals.
