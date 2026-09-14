/**
 * 观展背景：画出来的密林，不是玩具圆锥树。
 */
export function paintForestPanorama(): HTMLCanvasElement {
  const w = 2048
  const h = 1024
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return c

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#d7e8c4')
  sky.addColorStop(0.28, '#b7d39a')
  sky.addColorStop(0.55, '#6e9a4e')
  sky.addColorStop(1, '#2f5a2a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#8fb56a'
  ctx.beginPath()
  ctx.ellipse(w * 0.2, h * 0.62, 520, 180, 0, 0, Math.PI * 2)
  ctx.ellipse(w * 0.7, h * 0.6, 640, 200, 0, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 70; i++) {
    const x = (i / 70) * w + Math.sin(i * 2.1) * 18
    const base = h * 0.42 + (i % 5) * 18
    paintTree(ctx, x, base, 90 + (i % 7) * 18, i)
  }
  for (let i = 0; i < 40; i++) {
    const x = (i / 40) * w + 40
    paintTree(ctx, x, h * 0.52 + (i % 3) * 12, 140 + (i % 5) * 24, i + 20)
  }

  const mist = ctx.createLinearGradient(0, h * 0.55, 0, h)
  mist.addColorStop(0, 'rgba(210,230,170,0)')
  mist.addColorStop(1, 'rgba(46,80,40,0.35)')
  ctx.fillStyle = mist
  ctx.fillRect(0, 0, w, h)
  return c
}

export function paintGrassGround(): HTMLCanvasElement {
  const w = 1024
  const h = 1024
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.fillStyle = '#4a7a38'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    ctx.fillStyle = i % 3 ? '#5b8f44' : '#3d6b30'
    ctx.beginPath()
    ctx.ellipse(x, y, 8 + Math.random() * 18, 4 + Math.random() * 10, Math.random(), 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = 'rgba(90,70,40,0.18)'
    ctx.beginPath()
    ctx.ellipse(Math.random() * w, Math.random() * h, 20, 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintTreeSprite(seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 384
  const ctx = c.getContext('2d')
  if (!ctx) return c
  paintTree(ctx, 128, 300, 220, seed)
  return c
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const trunkW = size * 0.08
  ctx.fillStyle = seed % 2 ? '#5a3a22' : '#6b4428'
  ctx.fillRect(x - trunkW / 2, y - size * 0.35, trunkW, size * 0.38)
  const greens = ['#2f6b32', '#3d8a40', '#1f5a28', '#4e9a4a', '#2a7040']
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = greens[(seed + i) % greens.length]!
    const ox = Math.sin(seed + i * 1.7) * size * 0.18
    const oy = -size * 0.42 - i * size * 0.04
    ctx.beginPath()
    ctx.ellipse(x + ox, y + oy, size * (0.22 - i * 0.012), size * (0.16 - i * 0.008), 0.2 * i, 0, Math.PI * 2)
    ctx.fill()
  }
}
