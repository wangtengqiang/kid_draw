import { describe, expect, it } from 'vitest'
import {
  GROUND_RADIUS,
  LAND_BEATS,
  LAND_CYCLE,
  OCEAN,
  SHORE_DRINK,
  TREE_INSTANCE_CAP,
  WATER_RING,
  actorPhase,
  autoActorAction,
  autoLandAction,
  offsetRing,
  pointInRing,
  smoothCoast,
} from './host-world'

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

describe('auto animal poses', () => {
  it('cycles walk, drink, sit and rest on land', () => {
    const seen = new Set<string>()
    for (let t = 0; t < LAND_CYCLE; t += 0.2) {
      seen.add(autoLandAction(t, 0))
    }
    expect(seen).toEqual(new Set(['walk', 'drink', 'sit', 'rest']))
    expect(LAND_BEATS.some((beat) => beat.action === 'swim')).toBe(false)
  })

  it('staggers so two animals are not always in the same pose', () => {
    expect(autoLandAction(0, actorPhase(0))).not.toBe(autoLandAction(0, actorPhase(1)))
    const firstDrink = (phase: number) => {
      for (let t = 0; t < LAND_CYCLE; t += 0.05) {
        if (autoLandAction(t, phase) === 'drink') return t
      }
      return -1
    }
    expect(Math.abs(firstDrink(actorPhase(0)) - firstDrink(actorPhase(1)))).toBeGreaterThan(2)
  })

  it('never returns swim for land animals', () => {
    for (let i = 0; i < 6; i++) {
      for (let t = 0; t < LAND_CYCLE * 2; t += 0.5) {
        expect(autoLandAction(t, actorPhase(i))).not.toBe('swim')
        expect(autoActorAction(false, t, actorPhase(i))).not.toBe('swim')
      }
    }
  })

  it('keeps marine animals swimming, never walking the path', () => {
    for (let i = 0; i < 4; i++) {
      for (let t = 0; t < LAND_CYCLE; t += 1) {
        expect(autoActorAction(true, t, actorPhase(i))).toBe('swim')
      }
    }
  })
})
