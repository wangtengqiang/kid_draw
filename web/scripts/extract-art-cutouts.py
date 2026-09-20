#!/usr/bin/env python3
"""Knock out backgrounds from generated character art and crop each animal.

Sit/sleep boxes keep legs, paws, and the lion tail. After knockout we strip the
stone dais, fill interior holes (between-leg punch-through), and paint remaining
cream paper in the lower body with nearby coat so a steep camera cannot see a
white belly.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
MEDIA_CANDIDATES = [
    Path("/opt/cursor/project-stores/kid-draw/media"),
    Path(__file__).resolve().parent / "pose-sheets",
    Path("/cursor/stores/bc-bcc09caa-8113-4eda-b2af-41a0a913a597/artifacts/assets"),
]
OUT = ROOT / "web/public/models/cutouts"
MINI = ROOT / "minigame/models/cutouts"

COAT = {
    "lion": (232, 148, 42, 255),
    "deer": (214, 142, 72, 255),
    "tiger": (236, 124, 40, 255),
}


def media_file(name: str) -> Path:
    for folder in MEDIA_CANDIDATES:
        path = folder / name
        if path.exists():
            return path
    raise SystemExit(f"missing {name} (looked in {MEDIA_CANDIDATES})")


def near(c, t, tol):
    return all(abs(int(c[i]) - int(t[i])) <= tol for i in range(3))


def is_coat_rgb(r, g, b) -> bool:
    """Saturated orange / gold fur — not the desaturated tan stone dais."""
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    return sat > 82 and r > 96 and r > g + 14 and r > b + 28 and mx > 88


def is_cream_paper(r, g, b) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    return mn > 198 and mx - mn < 38 and r >= g - 4 >= b - 12


def is_stone_or_shadow(r, g, b) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    tan_tile = 22 <= sat <= 110 and 70 < r < 240 and g < r + 10 and b < g - 1
    gray_tile = sat < 48 and 70 < mn < 222
    pale_disc = sat < 42 and mn > 168 and r >= g >= b - 8
    return tan_tile or gray_tile or pale_disc


def paper_bg(im: Image.Image) -> tuple[int, int, int]:
    """Cream paper lives on the top edge; bottom corners are the stone dais."""
    px = im.load()
    w, h = im.size
    samples = []
    for y in range(1, min(10, h // 8 or 1)):
        for x in (2, max(2, w // 5), max(2, w // 2), max(2, w - 3)):
            r, g, b, a = px[min(x, w - 1), y]
            if a < 8:
                continue
            samples.append((r, g, b))
    if not samples:
        return (254, 246, 227)
    samples.sort()
    return samples[len(samples) // 2]


def knockout(im: Image.Image, tols=(26, 36, 50, 64)) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    bg = paper_bg(im)
    for tol in tols:
        out = im.copy()
        op = out.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = op[x, y]
                if near((r, g, b), bg, tol):
                    op[x, y] = (r, g, b, 0)
        stack = []
        vis = [[False] * w for _ in range(h)]
        for x in range(w):
            stack.append((x, 0))
            stack.append((x, h - 1))
        for y in range(h):
            stack.append((0, y))
            stack.append((w - 1, y))
        while stack:
            x, y = stack.pop()
            if x < 0 or y < 0 or x >= w or y >= h or vis[y][x]:
                continue
            vis[y][x] = True
            r, g, b, a = op[x, y]
            if a == 0 or near((r, g, b), bg, tol + 10) or is_cream_paper(r, g, b):
                op[x, y] = (r, g, b, 0)
                stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        alpha_count = sum(1 for y in range(h) for x in range(w) if op[x, y][3] > 8)
        if alpha_count > (w * h) * 0.04:
            return strip_ground_disc(out)
    return im


def erase_upper_right_scraps(im: Image.Image, xfrac=0.70, yfrac=0.46) -> Image.Image:
    """Lion-sleep crop clips a deer ear/antler in the top-right; wipe that quadrant."""
    px = im.load()
    w, h = im.size
    x0 = int(w * xfrac)
    y1 = int(h * yfrac)
    for y in range(y1):
        for x in range(x0, w):
            px[x, y] = (0, 0, 0, 0)
    return im


def keep_largest_blob(im: Image.Image) -> Image.Image:
    """Drop neighbor scraps (deer head on a lion crop, leftover rump, etc.)."""
    parts = connected_parts(im, 1)
    return parts[0] if parts else im


def strip_ground_disc(im: Image.Image) -> Image.Image:
    """Drop the pale contact-shadow oval under the paws."""
    px = im.load()
    w, h = im.size
    y0 = int(h * 0.62)
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if is_stone_or_shadow(r, g, b) and not is_coat_rgb(r, g, b):
                px[x, y] = (r, g, b, 0)
    return strip_dais(im)


def strip_dais(im: Image.Image) -> Image.Image:
    """Flood from the bottom edge through stone / cream paper. Stop at gold paws."""
    px = im.load()
    w, h = im.size
    vis = [[False] * w for _ in range(h)]
    stack = []
    for x in range(w):
        for y in range(h - 1, max(-1, int(h * 0.90) - 1), -1):
            stack.append((x, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or vis[y][x]:
            continue
        vis[y][x] = True
        r, g, b, a = px[x, y]
        if a < 8:
            stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            continue
        if is_coat_rgb(r, g, b):
            continue
        if not (is_stone_or_shadow(r, g, b) or is_cream_paper(r, g, b)):
            continue
        px[x, y] = (r, g, b, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def bbox(im: Image.Image, pad=8):
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 12:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx <= minx:
        return (0, 0, w, h)
    return (
        max(0, minx - pad),
        max(0, miny - pad),
        min(w, maxx + pad + 1),
        min(h, maxy + pad + 1),
    )


def crop_opaque(im: Image.Image) -> Image.Image:
    return im.crop(bbox(im))


def connected_parts(im: Image.Image, n: int) -> list[Image.Image]:
    """Largest opaque blobs, left-to-right."""
    px = im.load()
    w, h = im.size
    parent = list(range(w * h))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    def idx(x, y):
        return y * w + x

    opaque = [[px[x, y][3] > 12 for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if not opaque[y][x]:
                continue
            i = idx(x, y)
            if x + 1 < w and opaque[y][x + 1]:
                union(i, idx(x + 1, y))
            if y + 1 < h and opaque[y + 1][x]:
                union(i, idx(x, y + 1))
    buckets: dict[int, list[tuple[int, int]]] = {}
    for y in range(h):
        for x in range(w):
            if not opaque[y][x]:
                continue
            buckets.setdefault(find(idx(x, y)), []).append((x, y))
    blobs = sorted(buckets.values(), key=len, reverse=True)[:n]
    blobs.sort(key=lambda pts: sum(p[0] for p in pts) / len(pts))
    parts = []
    for pts in blobs:
        minx = min(p[0] for p in pts)
        miny = min(p[1] for p in pts)
        maxx = max(p[0] for p in pts)
        maxy = max(p[1] for p in pts)
        pad = 8
        box = (
            max(0, minx - pad),
            max(0, miny - pad),
            min(w, maxx + pad + 1),
            min(h, maxy + pad + 1),
        )
        piece = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
        pp = piece.load()
        for x, y in pts:
            pp[x - box[0], y - box[1]] = px[x, y]
        parts.append(piece)
    return parts


def save(im: Image.Image, name: str):
    OUT.mkdir(parents=True, exist_ok=True)
    MINI.mkdir(parents=True, exist_ok=True)
    im = pad_headroom(im, 28)
    path = OUT / f"{name}.png"
    im.save(path, "PNG")
    im.save(MINI / f"{name}.png", "PNG")
    print(f"wrote {path} {im.size}")


def pad_headroom(im: Image.Image, pad=28) -> Image.Image:
    """Keep a transparent margin so mane/ears/nose are not flush with the texture edge."""
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 12:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx <= minx:
        return im
    left = max(0, pad - minx)
    top = max(0, pad - miny)
    right = max(0, pad - (w - 1 - maxx))
    bottom = max(0, pad - (h - 1 - maxy))
    if left == top == right == bottom == 0:
        return im
    out = Image.new("RGBA", (w + left + right, h + top + bottom), (0, 0, 0, 0))
    out.paste(im, (left, top), im)
    return out


# Lion sit box is wide enough for the curling tail (old 430 cut it off).
POSE_BOXES = {
    "sit": {
        "lion": (8, 8, 518, 705),
        "deer": (500, 8, 848, 705),
        "tiger": (860, 8, 1274, 712),
    },
    "drink": {"lion": (10, 40, 450, 700), "deer": (510, 40, 810, 700), "tiger": (910, 40, 1270, 700)},
    "sleep": {
        "lion": (4, 48, 502, 700),
        "deer": (548, 50, 800, 680),
        "tiger": (838, 40, 1276, 712),
    },
}


def flood_clear(im: Image.Image, is_prop) -> Image.Image:
    """Erase a connected prop that touches the crop border (water, stones, neighbor scraps)."""
    px = im.load()
    w, h = im.size
    vis = [[False] * w for _ in range(h)]
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or vis[y][x]:
            continue
        vis[y][x] = True
        r, g, b, a = px[x, y]
        if a < 8:
            stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            continue
        if not is_prop(r, g, b, x, y, w, h):
            continue
        px[x, y] = (r, g, b, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def strip_pose_props(im: Image.Image, kind: str) -> Image.Image:
    def drink_prop(r, g, b, x, y, w, h):
        mx, mn = max(r, g, b), min(r, g, b)
        if y < h * 0.48:
            return False
        water = b >= g - 18 and b > r + 2 and (b + g) / 2 > 80
        wet = mn > 140 and b >= r - 4 and mx - mn < 85
        return water or wet

    def sit_prop(r, g, b, x, y, w, h):
        if y < h * 0.58:
            return False
        if is_coat_rgb(r, g, b):
            return False
        return is_stone_or_shadow(r, g, b) or is_cream_paper(r, g, b)

    def sleep_prop(r, g, b, x, y, w, h):
        if y < h * 0.62:
            return False
        if is_coat_rgb(r, g, b):
            return False
        return is_stone_or_shadow(r, g, b) or is_cream_paper(r, g, b)

    fn = {"drink": drink_prop, "sit": sit_prop, "sleep": sleep_prop}[kind]
    return flood_clear(im, fn)


def sample_coat(im: Image.Image, fallback: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    rs = gs = bs = n = 0
    for y in range(int(h * 0.35), int(h * 0.85), 3):
        for x in range(0, w, 4):
            r, g, b, a = px[x, y]
            if a < 80 or not is_coat_rgb(r, g, b):
                continue
            if is_cream_paper(r, g, b):
                continue
            rs += r
            gs += g
            bs += b
            n += 1
    if n < 12:
        return fallback
    return (rs // n, gs // n, bs // n, 255)


def exterior_transparent(im: Image.Image) -> list[list[bool]]:
    px = im.load()
    w, h = im.size
    vis = [[False] * w for _ in range(h)]
    stack = deque()
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or vis[y][x]:
            continue
        r, g, b, a = px[x, y]
        if a >= 12:
            continue
        vis[y][x] = True
        stack.append((x + 1, y))
        stack.append((x - 1, y))
        stack.append((x, y + 1))
        stack.append((x, y - 1))
    return vis


def fill_interior_holes(im: Image.Image, coat: tuple[int, int, int, int], max_frac=0.06) -> Image.Image:
    """Paint small enclosed transparent islands. Skip huge walk-pose gaps between legs."""
    px = im.load()
    w, h = im.size
    exterior = exterior_transparent(im)
    parent = list(range(w * h))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    def idx(x, y):
        return y * w + x

    opaque_n = 0
    for y in range(h):
        for x in range(w):
            a = px[x, y][3]
            if a >= 12:
                opaque_n += 1
                continue
            if exterior[y][x]:
                continue
            i = idx(x, y)
            if x + 1 < w and px[x + 1, y][3] < 12 and not exterior[y][x + 1]:
                union(i, idx(x + 1, y))
            if y + 1 < h and px[x, y + 1][3] < 12 and not exterior[y + 1][x]:
                union(i, idx(x, y + 1))
    buckets: dict[int, list[tuple[int, int]]] = {}
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= 12 or exterior[y][x]:
                continue
            buckets.setdefault(find(idx(x, y)), []).append((x, y))
    cap = max(80, int(opaque_n * max_frac))
    for pts in buckets.values():
        if len(pts) > cap:
            continue
        for x, y in pts:
            px[x, y] = coat
    return im


def close_lower_silhouette(im: Image.Image, coat: tuple[int, int, int, int], frac=0.52, radius=10) -> Image.Image:
    """Morphological close on the lower body so the U-notch between sitting paws fills."""
    w, h = im.size
    y0 = int(h * (1 - frac))
    lower = im.crop((0, y0, w, h))
    alpha = lower.getchannel("A")
    closed = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1)).filter(ImageFilter.MinFilter(radius * 2 + 1))
    lp = lower.load()
    cp = closed.load()
    lw, lh = lower.size
    for y in range(lh):
        for x in range(lw):
            if lp[x, y][3] >= 12:
                continue
            if cp[x, y] < 80:
                continue
            lp[x, y] = coat
    im.paste(lower, (0, y0))
    return im


def fill_lower_cream(im: Image.Image, coat: tuple[int, int, int, int], frac=0.55) -> Image.Image:
    """Replace leftover cream paper in the belly/leg region with gold coat. Keep muzzle."""
    px = im.load()
    w, h = im.size
    y0 = int(h * (1 - frac))
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            if is_cream_paper(r, g, b) or (is_stone_or_shadow(r, g, b) and not is_coat_rgb(r, g, b)):
                px[x, y] = coat
    return im


def force_opaque(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a >= 20:
                px[x, y] = (r, g, b, 255)
            elif a < 12:
                px[x, y] = (r, g, b, 0)
    return im


def heal_cutout(im: Image.Image, kind: str, pose: str) -> Image.Image:
    im = keep_largest_blob(im)
    coat = sample_coat(im, COAT.get(kind, COAT["lion"]))
    im = strip_ground_disc(im)
    if pose in ("sit", "sleep"):
        im = strip_pose_props(im, pose)
        im = keep_largest_blob(im)
    # Sit U-notch between front paws reads as a white belly from above.
    if pose == "sit":
        im = close_lower_silhouette(im, coat, frac=0.36, radius=6)
        im = fill_lower_cream(im, coat, frac=0.40)
    if pose == "sleep":
        im = fill_lower_cream(im, coat, frac=0.28)
    im = fill_interior_holes(im, coat, max_frac=0.045 if pose == "walk" else 0.08)
    im = force_opaque(im)
    return crop_opaque(im)


def extract_tail(im: Image.Image) -> Image.Image | None:
    """Tufted curling tail in the lower-right, not a neighbor-animal scrap."""
    w, h = im.size
    tail = im.crop((int(w * 0.78), int(h * 0.52), w, int(h * 0.92)))
    tail = keep_largest_blob(tail)
    tail = crop_opaque(tail)
    tw, th = tail.size
    px = tail.load()
    opaque = sum(1 for y in range(th) for x in range(tw) if px[x, y][3] >= 12)
    stone = sum(
        1
        for y in range(th)
        for x in range(tw)
        if px[x, y][3] >= 12 and is_stone_or_shadow(*px[x, y][:3])
    )
    if opaque < 280 or tw < 8 or th < 8:
        return None
    if stone > opaque * 0.12:
        return None
    if tw > th * 2.8:
        return None
    return tail


def append_sleep_tail(sleep: Image.Image, tail: Image.Image) -> Image.Image:
    """Lion sleep sheet has a round haunch and no tuft; glue the sit tail onto the rump."""
    sw, sh = sleep.size
    tw, th = tail.size
    scale = (sh * 0.38) / max(th, 1)
    nw = max(8, int(tw * scale))
    nh = max(8, int(th * scale))
    tail = tail.resize((nw, nh), Image.Resampling.LANCZOS)
    out_w = sw + int(nw * 0.72)
    out = Image.new("RGBA", (out_w, sh + 8), (0, 0, 0, 0))
    out.paste(sleep, (0, 4), sleep)
    px = sleep.load()
    # find rump: rightmost opaque in the lower-mid band
    rx = ry = 0
    for y in range(int(sh * 0.45), int(sh * 0.78)):
        for x in range(sw - 1, int(sw * 0.55), -1):
            if px[x, y][3] >= 12:
                if x > rx:
                    rx, ry = x, y
                break
    dest = (min(out_w - nw - 2, rx - int(nw * 0.12)), max(0, ry - int(nh * 0.42)))
    out.alpha_composite(tail, dest)
    return crop_opaque(out)


def append_side_tail(side: Image.Image, tail: Image.Image) -> Image.Image:
    sw, sh = side.size
    tw, th = tail.size
    scale = (sh * 0.34) / max(th, 1)
    nw = max(8, int(tw * scale))
    nh = max(8, int(th * scale))
    tail = tail.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (sw + int(nw * 0.78), sh), (0, 0, 0, 0))
    out.paste(side, (0, 0), side)
    dest = (sw - int(nw * 0.28), int(sh * 0.42))
    out.alpha_composite(tail, dest)
    return crop_opaque(out)


def extract_pose_sheet(kind: str) -> dict[str, Image.Image]:
    path = media_file(f"gen-poses-{kind}.png")
    sheet = Image.open(path)
    out = {}
    for name, box in POSE_BOXES[kind].items():
        col = sheet.crop(box)
        cut = knockout(col)
        cut = strip_pose_props(cut, kind)
        cut = strip_ground_disc(cut)
        if kind == "sleep" and name == "lion":
            cut = erase_upper_right_scraps(cut, 0.76, 0.30)
        cut = keep_largest_blob(cut)
        out[name] = heal_cutout(crop_opaque(cut), name, kind)
    return out


def heal_named(path: Path, kind: str, pose: str) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return heal_cutout(im, kind, pose)


def main():
    sheet = knockout(Image.open(media_file("gen-land-animals-sheet.png")))
    animals = connected_parts(sheet, 3)
    names = ["lion", "deer", "tiger"]
    walk: dict[str, Image.Image] = {}
    for name, im in zip(names, animals):
        walk[name] = heal_cutout(strip_ground_disc(im), name, "walk")
        save(walk[name], name)

    poses = {kind: extract_pose_sheet(kind) for kind in ("sit", "drink", "sleep")}
    for kind, parts in poses.items():
        for name, im in parts.items():
            save(im, f"{name}-{kind}")


if __name__ == "__main__":
    main()
