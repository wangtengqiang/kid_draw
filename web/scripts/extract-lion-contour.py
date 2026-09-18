#!/usr/bin/env python3
"""Trace the approved lion cartoon into a closed XY ring for a connected volume."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/models/cutouts/lion-three-quarter.png"
OUT = ROOT / "src/world-exhibition/lion-contour.ts"


def saturate(r: int, g: int, b: int) -> float:
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx == 0:
        return 0
    return (mx - mn) / mx


def mask_of(im: Image.Image) -> list[list[int]]:
    px = im.load()
    w, h = im.size
    m = [[0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            # drop the gray ground shadow under the paws
            if y > h * 0.86 and saturate(r, g, b) < 0.18:
                continue
            m[y][x] = 1
    return m


def largest_component(m: list[list[int]]) -> list[list[int]]:
    h, w = len(m), len(m[0])
    seen = [[False] * w for _ in range(h)]
    best: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if not m[y][x] or seen[y][x]:
                continue
            stack = [(x, y)]
            seen[y][x] = True
            cells: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and m[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if len(cells) > len(best):
                best = cells
    out = [[0] * w for _ in range(h)]
    for x, y in best:
        out[y][x] = 1
    return out


def marching_contour(m: list[list[int]]) -> list[tuple[float, float]]:
    h, w = len(m), len(m[0])

    def solid(x: int, y: int) -> bool:
        return 0 <= x < w and 0 <= y < h and m[y][x] == 1

    start = None
    for y in range(h):
        for x in range(w):
            if solid(x, y) and not solid(x, y - 1):
                start = (x, y)
                break
        if start:
            break
    if not start:
        raise SystemExit("no contour")

    # walk the outer edge clockwise, pixel-center
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    x, y = start
    incoming = 0
    ring: list[tuple[float, float]] = []
    seen: set[tuple[int, int, int]] = set()
    for _ in range(w * h):
        key = (x, y, incoming)
        if key in seen:
            break
        seen.add(key)
        ring.append((x + 0.5, y + 0.5))
        found = None
        for k in range(8):
            di = (incoming + 6 + k) % 8  # turn left-ish first to hug the outside
            nx, ny = x + dirs[di][0], y + dirs[di][1]
            if solid(nx, ny):
                found = (nx, ny, di)
                break
        if not found:
            break
        x, y, incoming = found
        if (x, y) == start and len(ring) > 16:
            break
    return ring


def rdp(pts: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(pts) < 3:
        return pts

    def dist(p, a, b):
        x, y = p
        x1, y1 = a
        x2, y2 = b
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0:
            return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        return ((x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2) ** 0.5

    def rec(s, e):
        a, b = pts[s], pts[e]
        idx, best = s, -1.0
        for i in range(s + 1, e):
            d = dist(pts[i], a, b)
            if d > best:
                best, idx = d, i
        if best > eps:
            return rec(s, idx)[:-1] + rec(idx, e)
        return [pts[s], pts[e]]

    out = rec(0, len(pts) - 1)
    if out[0] == out[-1] and len(out) > 1:
        out = out[:-1]
    return out


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    m = largest_component(mask_of(im))
    raw = marching_contour(m)
    simple = rdp(raw, 1.6)
    # world: feet at y=0, height = 1, x centered
    ys = [p[1] for p in simple]
    min_py, max_py = min(ys), max(ys)
    span = max_py - min_py or 1
    pts = []
    for px, py in simple:
        x = ((px / w) - 0.5) * (w / h)
        y = (max_py - py) / span
        u = px / w
        v = 1 - py / h
        pts.append([round(x, 5), round(y, 5), round(u, 5), round(v, 5)])
    OUT.write_text(
        "/** Auto-generated from lion-three-quarter.png. Connected silhouette ring. */\n"
        "export type LionVert = [number, number, number, number]\n"
        f"export const LION_CONTOUR: LionVert[] = {json.dumps(pts)}\n"
        f"export const LION_CONTOUR_ASPECT = {w / h:.6f}\n"
    )
    print(f"wrote {len(pts)} verts -> {OUT}")


if __name__ == "__main__":
    main()
