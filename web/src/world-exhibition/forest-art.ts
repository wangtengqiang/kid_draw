/**
 * 观展背景：画出来的远山、湖水和密林，靠近场地照片里的石径树林。
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
  sky.addColorStop(0, '#f4f7e4')
  sky.addColorStop(0.18, '#d7e9a8')
  sky.addColorStop(0.38, '#8eb86a')
  sky.addColorStop(0.58, '#4e8a48')
  sky.addColorStop(0.78, '#2f5e32')
  sky.addColorStop(1, '#1c3a22')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w * 0.62, h * 0.22, 30, w * 0.62, h * 0.22, 520)
  glow.addColorStop(0, 'rgba(255,236,170,0.62)')
  glow.addColorStop(1, 'rgba(255,236,170,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  paintRange(ctx, w, h * 0.4, 0.55, ['#7a9570', '#8aa57c', '#6d8668'])
  paintRange(ctx, w, h * 0.46, 0.42, ['#5d7a52', '#6e8c5e', '#4e6a48'])

  const lake = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.68)
  lake.addColorStop(0, 'rgba(140, 196, 214, 0.55)')
  lake.addColorStop(1, 'rgba(70, 140, 168, 0.2)')
  ctx.fillStyle = lake
  ctx.beginPath()
  ctx.ellipse(w * 0.28, h * 0.58, w * 0.22, h * 0.06, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(w * 0.72, h * 0.6, w * 0.16, h * 0.045, 0, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 32; i++) {
    const x = (i / 32) * w + Math.sin(i * 1.7) * 30
    paintMass(ctx, x, h * 0.52, 200 + (i % 5) * 36, i)
  }
  for (let i = 0; i < 100; i++) {
    const x = ((i * 97) % w) + Math.sin(i) * 12
    paintTree(ctx, x, h * 0.48 + (i % 6) * 14, 120 + (i % 9) * 22, i)
  }
  for (let i = 0; i < 56; i++) {
    paintTree(ctx, (i / 56) * w + 24, h * 0.6 + (i % 4) * 10, 170 + (i % 6) * 28, i + 40)
  }

  const mist = ctx.createLinearGradient(0, h * 0.48, 0, h)
  mist.addColorStop(0, 'rgba(210,230,170,0)')
  mist.addColorStop(1, 'rgba(28,58,32,0.38)')
  ctx.fillStyle = mist
  ctx.fillRect(0, 0, w, h)
  return c
}

function paintRange(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  amp: number,
  colors: string[],
): void {
  ctx.beginPath()
  ctx.moveTo(0, y + 80)
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * w
    const peak = y - (40 + ((i * 17) % 90) * amp)
    ctx.lineTo(x, peak)
  }
  ctx.lineTo(w, y + 120)
  ctx.closePath()
  ctx.fillStyle = colors[0]!
  ctx.fill()
  ctx.fillStyle = colors[1]!
  ctx.beginPath()
  ctx.moveTo(w * 0.15, y + 40)
  ctx.lineTo(w * 0.28, y - 90 * amp)
  ctx.lineTo(w * 0.42, y + 50)
  ctx.fill()
  ctx.fillStyle = colors[2]!
  ctx.beginPath()
  ctx.moveTo(w * 0.55, y + 50)
  ctx.lineTo(w * 0.7, y - 110 * amp)
  ctx.lineTo(w * 0.88, y + 40)
  ctx.fill()
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

export function paintWater(): HTMLCanvasElement {
  const w = 512
  const h = 512
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#6eb7c8')
  g.addColorStop(0.45, '#3d8fb0')
  g.addColorStop(1, '#2a6f90')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(220,245,255,0.28)'
  ctx.lineWidth = 2
  for (let i = 0; i < 18; i++) {
    ctx.beginPath()
    const y = 24 + i * 28
    ctx.moveTo(0, y)
    ctx.quadraticCurveTo(w * 0.5, y + ((i % 2) * 16 - 8), w, y)
    ctx.stroke()
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
