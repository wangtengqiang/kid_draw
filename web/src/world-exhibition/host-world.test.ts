import { describe, expect, it } from 'vitest'
import { GROUND_RADIUS, OCEAN, SHORE_DRINK, TREE_INSTANCE_CAP, WATER_RING, offsetRing, pointInRing, smoothCoast } from './host-world'

describe('organic coast', () => {
  it('is a wavy polygon, not a rectangle', () => {
    expect(WATER_RING.length).toBeGreaterThan(12)
    const xs = new Set(WATER_RING.map((p) => p[0].toFixed(1)))
    const zs = new Set(WATER_RING.map((p) => p[1].toFixed(1)))
    expect(xs.size).toBeGreaterThan(8)
    expect(zs.size).toBeGreaterThan(8)
    const xSpan = Math.max(...WATER_RING.map((p) => p[0])) - Math.min(...WATER_RING.map((p) => p[0]))
    const zSpan = Math.max(...WATER_RING.map((p) => p[1])) - Math.min(...WATER_RING.map((p) => p[1]))
    expect(Math.abs(xSpan - zSpan)).toBeGreaterThan(1)
  })

  it('keeps the swim loop inside the bay', () => {
    const coast = smoothCoast()
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      const x = OCEAN.x + Math.cos(a) * Math.min(OCEAN.rx, 1.45)
      const z = OCEAN.z + Math.sin(a) * Math.min(OCEAN.rz, 1.45) * 0.82
      expect(pointInRing(x, z, coast)).toBe(true)
    }
  })

  it('puts the drink stand on the sand, not in the water', () => {
    expect(pointInRing(SHORE_DRINK.x, SHORE_DRINK.z, smoothCoast())).toBe(false)
  })

  it('offsets the beach outward from the water', () => {
    const coast = smoothCoast()
    const sand = offsetRing(coast, 0.95)
    const cx = coast.reduce((s, p) => s + p[0], 0) / coast.length
    const sx = sand.reduce((s, p) => s + p[0], 0) / sand.length
    expect(Math.abs(sx - cx)).toBeLessThan(0.4)
    expect(sand.length).toBe(coast.length)
  })

  it('opens a large world with a coastline that goes into the distance', () => {
    expect(GROUND_RADIUS).toBeGreaterThan(40)
    expect(Math.max(...WATER_RING.map((p) => p[0]))).toBeGreaterThan(30)
    expect(TREE_INSTANCE_CAP).toBeLessThanOrEqual(96)
  })
})
