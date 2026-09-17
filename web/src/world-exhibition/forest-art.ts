/**
 * 观展背景画：对着 gen-forest-empty 的石径、圆冠树、蘑菇和小溪。
 * 贴在可走的地上和树上，不当整张天空盒糊弄。
 */

function canvas(w: number, h: number, alpha = false): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { alpha })
  return { c, ctx }
}

export function paintForestPanorama(): HTMLCanvasElement {
  const w = 1024
  const h = 512
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#8ec8f0')
  sky.addColorStop(0.28, '#c8e8ff')
  sky.addColorStop(0.42, '#e7f4c8')
  sky.addColorStop(0.55, '#7eb84a')
  sky.addColorStop(0.78, '#3f8a38')
  sky.addColorStop(1, '#246028')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const sun = ctx.createRadialGradient(w * 0.72, h * 0.18, 8, w * 0.72, h * 0.18, 280)
  sun.addColorStop(0, 'rgba(255,236,160,0.75)')
  sun.addColorStop(1, 'rgba(255,236,160,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(w * 0.22, h * 0.14, 70, 22, 0, 0, Math.PI * 2)
  ctx.ellipse(w * 0.28, h * 0.12, 48, 18, 0, 0, Math.PI * 2)
  ctx.ellipse(w * 0.78, h * 0.1, 54, 16, 0, 0, Math.PI * 2)
  ctx.fill()

  paintSoftHills(ctx, w, h * 0.4, ['#8fbf68', '#6fa052', '#9ec86e'])
  paintSoftHills(ctx, w, h * 0.46, ['#4e8a3c', '#3d7330', '#5a9a44'])

  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * w + Math.sin(i * 1.3) * 18
    paintTree(ctx, x, h * 0.5 + (i % 5) * 8, 70 + (i % 6) * 14, i)
  }
  for (let i = 0; i < 28; i++) {
    paintTree(ctx, ((i * 89) % w) + 10, h * 0.58 + (i % 4) * 10, 110 + (i % 7) * 18, i + 20)
  }
  for (let i = 0; i < 16; i++) {
    paintTree(ctx, (i / 16) * w, h * 0.7 + (i % 3) * 8, 150 + (i % 5) * 22, i + 50)
  }

  const glow = ctx.createLinearGradient(0, h * 0.5, 0, h)
  glow.addColorStop(0, 'rgba(255,220,120,0)')
  glow.addColorStop(1, 'rgba(40,80,28,0.35)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  return c
}

function paintSoftHills(ctx: CanvasRenderingContext2D, w: number, y: number, colors: string[]): void {
  const peaks = [0.06, 0.2, 0.38, 0.55, 0.72, 0.9]
  for (let i = 0; i < peaks.length; i++) {
    const cx = peaks[i]! * w
    const hgt = 48 + (i % 3) * 22
    const half = 120 + (i % 4) * 28
    ctx.fillStyle = colors[i % colors.length]!
    ctx.beginPath()
    ctx.moveTo(cx - half, y + 50)
    ctx.quadraticCurveTo(cx, y - hgt, cx + half, y + 50)
    ctx.closePath()
    ctx.fill()
  }
}

export function paintGrassGround(): HTMLCanvasElement {
  const w = 256
  const h = 256
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c
  ctx.fillStyle = '#4f8a38'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 320; i++) {
    const x = (i * 73) % w
    const y = (i * 131) % h
    ctx.fillStyle = i % 5 ? '#5c9a42' : '#3d732c'
    ctx.beginPath()
    ctx.ellipse(x, y, 12 + (i % 8), 6 + (i % 5), (i % 10) * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < 520; i++) {
    const x = (i * 47) % w
    const y = (i * 89) % h
    ctx.strokeStyle = i % 3 ? 'rgba(120,190,70,0.55)' : 'rgba(40,90,30,0.45)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + ((i % 5) - 2), y - 7 - (i % 9))
    ctx.stroke()
  }
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = ['#f4d96a', '#f08ab0', '#8ec5ff', '#fff8e0'][i % 4]!
    ctx.beginPath()
    ctx.arc((i * 211) % w, (i * 157) % h, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintDirt(): HTMLCanvasElement {
  const w = 256
  const h = 256
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#d8b47a')
  g.addColorStop(0.5, '#c9a066')
  g.addColorStop(1, '#b8894e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(168,120,60,0.28)' : 'rgba(240,210,150,0.22)'
    ctx.beginPath()
    ctx.ellipse((i * 67) % w, (i * 91) % h, 8 + (i % 6), 4 + (i % 4), i * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintFlagstone(): HTMLCanvasElement {
  const w = 128
  const h = 128
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c
  ctx.fillStyle = '#d7c4a0'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#cbb892'
  ctx.beginPath()
  ctx.ellipse(64, 64, 56, 48, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,245,220,0.35)'
  ctx.beginPath()
  ctx.ellipse(48, 50, 22, 14, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(140,120,90,0.35)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(64, 64, 54, 46, 0.2, 0, Math.PI * 2)
  ctx.stroke()
  return c
}

export function paintBark(): HTMLCanvasElement {
  const w = 128
  const h = 256
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c
  ctx.fillStyle = '#8a5a32'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = i % 2 ? 'rgba(60,32,14,0.45)' : 'rgba(140,90,48,0.4)'
    ctx.lineWidth = 3 + (i % 3)
    ctx.beginPath()
    ctx.moveTo(10 + (i * 7) % 110, 0)
    ctx.quadraticCurveTo(20 + i * 4, h * 0.5, 8 + (i * 11) % 110, h)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(70,130,50,0.28)'
  for (let i = 0; i < 10; i++) {
    ctx.beginPath()
    ctx.ellipse((i * 37) % w, (i * 53) % h, 14, 8, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintWater(): HTMLCanvasElement {
  const w = 512
  const h = 512
  const { c, ctx } = canvas(w, h)
  if (!ctx) return c
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#8ed4e8')
  g.addColorStop(0.45, '#4aa8c8')
  g.addColorStop(1, '#2f7fa8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(230,250,255,0.38)'
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

export function paintMushroomCap(): HTMLCanvasElement {
  const w = 128
  const h = 128
  const { c, ctx } = canvas(w, h, true)
  if (!ctx) return c
  ctx.fillStyle = '#e24b3a'
  ctx.beginPath()
  ctx.ellipse(64, 72, 58, 48, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff8ee'
  for (const [x, y, r] of [
    [40, 58, 8],
    [70, 50, 10],
    [92, 70, 7],
    [52, 82, 6],
    [78, 86, 8],
    [30, 78, 5],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.82, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function paintTreeSprite(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(256, 320, true)
  if (!ctx) return c
  paintCanopy(ctx, 128, 200, 200, seed)
  return c
}

export function paintBushSprite(seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas(192, 128, true)
  if (!ctx) return c
  paintCanopy(ctx, 96, 90, 110, seed + 9)
  return c
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const trunkW = size * 0.11
  ctx.fillStyle = seed % 2 ? '#7a4a24' : '#8c5a30'
  ctx.beginPath()
  ctx.moveTo(x - trunkW * 0.7, y)
  ctx.lineTo(x - trunkW * 0.35, y - size * 0.42)
  ctx.lineTo(x + trunkW * 0.35, y - size * 0.42)
  ctx.lineTo(x + trunkW * 0.7, y)
  ctx.closePath()
  ctx.fill()
  paintCanopy(ctx, x, y - size * 0.18, size, seed)
}

function paintCanopy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const greens = ['#2f8a38', '#4aad48', '#1f6a28', '#6bc24e', '#3d9a40', '#247030', '#87d45a']
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = greens[(seed + i) % greens.length]!
    const ox = Math.sin(seed * 0.7 + i * 1.7) * size * 0.24
    const oy = -size * 0.3 - (i % 5) * size * 0.05
    ctx.beginPath()
    ctx.ellipse(
      x + ox,
      y + oy,
      size * (0.22 - i * 0.007),
      size * (0.16 - i * 0.004),
      (seed + i) * 0.35,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
}
