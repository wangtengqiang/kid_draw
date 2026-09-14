/**
 * 观展背景：画出来的密林和草地，靠近照片里的石径树林，不是玩具圆锥。
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
  sky.addColorStop(0, '#e7f0c8')
  sky.addColorStop(0.22, '#c5dd9a')
  sky.addColorStop(0.45, '#7eab55')
  sky.addColorStop(0.72, '#3f6f32')
  sky.addColorStop(1, '#244a22')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w * 0.55, h * 0.28, 20, w * 0.55, h * 0.28, 420)
  glow.addColorStop(0, 'rgba(255,236,170,0.55)')
  glow.addColorStop(1, 'rgba(255,236,170,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 28; i++) {
    const x = (i / 28) * w + Math.sin(i * 1.7) * 30
    paintMass(ctx, x, h * 0.5, 220 + (i % 5) * 40, i)
  }
  for (let i = 0; i < 90; i++) {
    const x = ((i * 97) % w) + Math.sin(i) * 12
    paintTree(ctx, x, h * 0.46 + (i % 6) * 16, 110 + (i % 9) * 22, i)
  }
  for (let i = 0; i < 50; i++) {
    paintTree(ctx, (i / 50) * w + 24, h * 0.58 + (i % 4) * 10, 160 + (i % 6) * 28, i + 40)
  }

  ctx.fillStyle = 'rgba(28, 48, 22, 0.28)'
  ctx.fillRect(0, h * 0.72, w, h * 0.28)

  const mist = ctx.createLinearGradient(0, h * 0.5, 0, h)
  mist.addColorStop(0, 'rgba(210,230,170,0)')
  mist.addColorStop(1, 'rgba(36,70,32,0.4)')
  ctx.fillStyle = mist
  ctx.fillRect(0, 0, w, h)
  return c
}

function paintMass(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const greens = ['#2c5c2c', '#3a7340', '#1f4a24', '#4a7d3a']
  ctx.fillStyle = greens[seed % greens.length]!
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function paintGrassGround(): HTMLCanvasElement {
  const w = 1024
  const h = 1024
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.fillStyle = '#3f6e32'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 1400; i++) {
    const x = (i * 73) % w
    const y = (i * 131) % h
    ctx.fillStyle = i % 4 ? '#4e8540' : '#2f5c28'
    ctx.beginPath()
    ctx.ellipse(x, y, 10 + (i % 7), 5 + (i % 4), (i % 10) * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < 2200; i++) {
    const x = (i * 47) % w
    const y = (i * 89) % h
    ctx.strokeStyle = i % 3 ? 'rgba(90,140,60,0.55)' : 'rgba(40,80,32,0.5)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + ((i % 5) - 2), y - 6 - (i % 8))
    ctx.stroke()
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 ? '#f2e4a4' : '#f7f1df'
    ctx.beginPath()
    ctx.arc((i * 211) % w, (i * 157) % h, 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintTreeSprite(seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 320
  const ctx = c.getContext('2d')
  if (!ctx) return c
  paintCanopy(ctx, 128, 200, 200, seed)
  return c
}

export function paintBushSprite(seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 192
  c.height = 128
  const ctx = c.getContext('2d')
  if (!ctx) return c
  paintCanopy(ctx, 96, 90, 110, seed + 9)
  return c
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const trunkW = size * 0.07
  ctx.fillStyle = seed % 2 ? '#4a3018' : '#5c3c22'
  ctx.fillRect(x - trunkW / 2, y - size * 0.38, trunkW, size * 0.42)
  ctx.strokeStyle = 'rgba(30,18,8,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y - size * 0.08)
  ctx.lineTo(x, y - size * 0.38)
  ctx.stroke()
  paintCanopy(ctx, x, y - size * 0.18, size, seed)
}

function paintCanopy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const greens = ['#1f5a28', '#2f6b32', '#3d8a40', '#245a2a', '#4e9a4a', '#2a7040', '#165022']
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = greens[(seed + i) % greens.length]!
    const ox = Math.sin(seed * 0.7 + i * 1.9) * size * 0.22
    const oy = -size * 0.28 - (i % 5) * size * 0.05
    ctx.beginPath()
    ctx.ellipse(
      x + ox,
      y + oy,
      size * (0.2 - i * 0.008),
      size * (0.14 - i * 0.005),
      (seed + i) * 0.4,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
}
