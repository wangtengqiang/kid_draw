# 3D animal sources

Shipped models are **not** 千图网 / stock illustrations. Do not replace these with watermarked PNGs.

## Kenney Cube Pets 2.0 — lion, deer, tiger, fish

- Files: `lion.glb`, `deer.glb`, `tiger.glb`, `fish.glb` (copied from `Models/GLB format/animal-*.glb`)
- Source: https://kenney.nl/assets/cube-pets
- Download: https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (see `KENNEY-LICENSE.txt`)
- Author: Kenney (www.kenney.nl)

Kid-cartoon cube pets with walk / idle / eat clips. Attribution is not required; crediting Kenney is appreciated.

## Gobkit Free Animal Pack Vol. 2 — dolphin

- File: `dolphin.glb` (Gobkit `Whale.glb` — closest CC0 marine mammal with a direct `.glb` URL)
- Source: https://gobkit.com/freebies and https://gobkit.com/api/free
- Direct: https://gobkit.com/freebies/animalB/Whale.glb
- License: CC0 1.0
- Author: Gobkit

No CC0 cartoon *dolphin* glTF was available without a Poly Pizza API key. This whale is the downloadable stand-in.

## Turtle

Tried: Kenney Cube Pets (no turtle), Gobkit free packs (no turtle), Quaternius / Poly Pizza (Cloudflare / API key), OpenGameArt [Heathal cartoon turtle](https://opengameart.org/content/turtle-0) (CC0, **Blender `.blend` only** — no glTF, Blender CLI not installed here).

`turtle.glb` remains the in-repo stylized mesh from `web/scripts/author-animals.mjs` until a CC0 turtle glTF can be fetched.

## Recreate

```bash
cd web
# Kenney
curl -L -o /tmp/kenney_cube-pets.zip 'https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip'
# Gobkit whale
curl -L -o public/models/dolphin.glb 'https://gobkit.com/freebies/animalB/Whale.glb'
```
