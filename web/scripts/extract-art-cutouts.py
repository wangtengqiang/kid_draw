#!/usr/bin/env python3
"""Knock out backgrounds from generated character art and crop each animal."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MEDIA = Path("/opt/cursor/project-stores/kid-draw/media")
OUT = ROOT / "web/public/models/cutouts"
MINI = ROOT / "minigame/models/cutouts"


def near(c, t, tol):
    return all(abs(int(c[i]) - int(t[i])) <= tol for i in range(3))


def knockout(im: Image.Image, tols=(28, 38, 52)) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    for tol in tols:
        out = im.copy()
        op = out.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = op[x, y]
                if near((r, g, b), bg, tol):
                    op[x, y] = (r, g, b, 0)
        # flood from edges so interior cream (muzzle) is kept
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
            if a == 0 or near((r, g, b), bg, tol + 8):
                op[x, y] = (r, g, b, 0)
                stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        alpha_count = sum(1 for y in range(h) for x in range(w) if op[x, y][3] > 8)
        if alpha_count > (w * h) * 0.04:
            return strip_ground_disc(out)
    return im


def strip_ground_disc(im: Image.Image) -> Image.Image:
    """Drop the pale contact-shadow oval under the paws."""
    px = im.load()
    w, h = im.size
    y0 = int(h * 0.86)
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn < 42 and mn > 170 and r >= g >= b - 8:
                px[x, y] = (r, g, b, 0)
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
    box = bbox(im)
    return im.crop(box)


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
    path = OUT / f"{name}.png"
    im.save(path, "PNG")
    im.save(MINI / f"{name}.png", "PNG")
    print(f"wrote {path} {im.size}")


POSE_BOXES = {
    "sit": {"lion": (20, 20, 430, 700), "deer": (430, 20, 850, 700), "tiger": (850, 20, 1260, 700)},
    "drink": {"lion": (10, 40, 450, 700), "deer": (510, 40, 810, 700), "tiger": (910, 40, 1270, 700)},
    "sleep": {"lion": (10, 80, 430, 680), "deer": (545, 90, 775, 660), "tiger": (890, 80, 1270, 680)},
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
        mx, mn = max(r, g, b), min(r, g, b)
        sat = mx - mn
        if y < h * 0.82:
            return False
        tan_tile = 30 <= sat <= 110 and 70 < r < 235 and g < r + 8 and b < g - 2
        gray_tile = sat < 48 and 70 < mn < 215
        return tan_tile or gray_tile

    def sleep_prop(r, g, b, x, y, w, h):
        mx, mn = max(r, g, b), min(r, g, b)
        return mx - mn < 42 and mn > 170 and y > h * 0.8

    fn = {"drink": drink_prop, "sit": sit_prop, "sleep": sleep_prop}[kind]
    return flood_clear(im, fn)


def extract_pose_sheet(kind: str) -> None:
    path = MEDIA / f"gen-poses-{kind}.png"
    if not path.exists():
        raise SystemExit(f"missing {path}")
    sheet = Image.open(path)
    for name, box in POSE_BOXES[kind].items():
        col = sheet.crop(box)
        cut = knockout(col)
        cut = strip_pose_props(cut, kind)
        cut = strip_ground_disc(cut)
        save(crop_opaque(cut), f"{name}-{kind}")


def main():
    sheet = knockout(Image.open(MEDIA / "gen-land-animals-sheet.png"))
    animals = connected_parts(sheet, 3)
    # sheet order: lion, deer, tiger
    names = ["lion", "deer", "tiger"]
    for name, im in zip(names, animals):
        save(strip_ground_disc(im), name)
    for kind in ("sit", "drink", "sleep"):
        extract_pose_sheet(kind)


if __name__ == "__main__":
    main()
