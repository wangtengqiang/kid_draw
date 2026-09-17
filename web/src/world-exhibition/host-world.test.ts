import { describe, expect, it } from 'vitest'
import {
  CREEK_POINTS,
  CREEK_CLEAR,
  FOREST_CAMERA_PULL,
  LAND_WORLD_SCALE,
  GROUND_RADIUS,
  LAND_BEATS,
  LAND_CYCLE,
  MUSHROOM_SPOTS,
  OCEAN,
  PATH_POINTS,
  SHORE_DRINK,
  TREE_INSTANCE_CAP,
  WATER_RING,
  actorPhase,
  autoActorAction,
  autoLandAction,
  distToCreek,
  distToPath,
  drinkStand,
  keepOffCreek,
  landYaw,
  pinLandScale,
  onCreekWater,
  offsetRing,
  pointInRing,
  pointOnPath,
  smoothCoast,
} from './host-world'
import { pickLandView } from './cartoon-rig'

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

describe('illustrated forest path', () => {
  it('runs a long stone path into the woods, not a beige circle', () => {
    expect(PATH_POINTS.length).toBeGreaterThan(5)
    const xs = PATH_POINTS.map((p) => p[0])
    const zs = PATH_POINTS.map((p) => p[1])
    const zSpan = Math.max(...zs) - Math.min(...zs)
    const xSpan = Math.max(...xs) - Math.min(...xs)
    expect(zSpan).toBeGreaterThan(12)
    expect(zSpan).toBeGreaterThan(xSpan * 4)
    const start = pointOnPath(0)
    const mid = pointOnPath(0.5)
    expect(Math.hypot(start.x - mid.x, start.z - mid.z)).toBeGreaterThan(4)
  })

  it('keeps the creek beside the path, not on the stones', () => {
    expect(CREEK_POINTS.length).toBeGreaterThan(3)
    for (const [x, z] of CREEK_POINTS) {
      expect(distToPath(x, z)).toBeGreaterThan(1.4)
    }
  })

  it('pulls the default camera back so animals and trees both read half size', () => {
    expect(FOREST_CAMERA_PULL).toBe(2)
  })

  it('plants mushrooms beside the path entrance', () => {
    expect(MUSHROOM_SPOTS.length).toBeGreaterThanOrEqual(4)
    const near = MUSHROOM_SPOTS.filter((s) => s.z > 4)
    expect(near.length).toBeGreaterThanOrEqual(2)
    expect(near.some((s) => s.x < 0)).toBe(true)
    expect(near.some((s) => s.x > 0)).toBe(true)
  })

  it('puts the drink stand on the creek bank, never on the blue water', () => {
    expect(pointInRing(SHORE_DRINK.x, SHORE_DRINK.z, smoothCoast())).toBe(false)
    expect(onCreekWater(SHORE_DRINK.x, SHORE_DRINK.z)).toBe(false)
    expect(distToCreek(SHORE_DRINK.x, SHORE_DRINK.z)).toBeGreaterThanOrEqual(CREEK_CLEAR)
    expect(distToPath(SHORE_DRINK.x, SHORE_DRINK.z)).toBeLessThan(2.4)
    for (let i = 0; i < 3; i++) {
      const stand = drinkStand(i)
      expect(onCreekWater(stand.x, stand.z)).toBe(false)
      expect(distToCreek(stand.x, stand.z)).toBeGreaterThanOrEqual(CREEK_CLEAR - 1e-6)
    }
  })

  it('keeps walk, sit and sleep feet on the stone path, not in the stream', () => {
    for (const u of [0.08, 0.22, 0.42, 0.6, 0.8]) {
      for (const lane of [-1, 0, 1]) {
        const p = pointOnPath(u, lane)
        const feet = keepOffCreek(p.x, p.z)
        expect(onCreekWater(feet.x, feet.z)).toBe(false)
        expect(distToPath(feet.x, feet.z)).toBeLessThan(1.2)
      }
    }
    const sit = keepOffCreek(...([pointOnPath(0.42, 0.35).x, pointOnPath(0.42, 0.35).z] as const))
    expect(onCreekWater(sit.x, sit.z)).toBe(false)
  })

  it('faces drink toward the creek and walk along the path, not at the camera', () => {
    const walk = landYaw('walk', pointOnPath(0.2, 0).heading, 0)
    const walkL = landYaw('walk', pointOnPath(0.2, 0).heading, -1)
    const drink = drinkStand(0).heading
    const sit = landYaw('sit', pointOnPath(0.4, 0).heading, 0)
    expect(Math.abs(drink - walk)).toBeGreaterThan(0.25)
    expect(Math.abs(sit - drink)).toBeGreaterThan(0.8)
    expect(Math.abs(walkL - walk)).toBeGreaterThan(0.2)
    expect(Math.abs(Math.sin(drink))).toBeGreaterThan(0.45)
    expect(Math.abs(Math.sin(drink))).toBeLessThan(0.9)
    expect(Math.abs(Math.sin(walk))).toBeGreaterThan(0.3)
    expect(Math.abs(Math.sin(walk))).toBeLessThan(0.9)
    expect(CREEK_CLEAR).toBeGreaterThan(1.7)
  })

  it('picks front, three-quarter and side art instead of yawing a card', () => {
    expect(pickLandView('walk', 0).view).toBe('front')
    expect(pickLandView('walk', 0.85).view).toBe('threeQuarter')
    expect(pickLandView('walk', 1.55).view).toBe('side')
    expect(pickLandView('drink', 0.82).view).toBe('drink')
    expect(pickLandView('sit', -0.78).view).not.toBe(pickLandView('walk', 0.85).view)
  })

  it('keeps land pets at a constant world scale so distance shrinks height', () => {
    expect(LAND_WORLD_SCALE).toBe(1.12)
    const stub = { scale: { x: 0, y: 0, z: 0, setScalar(n: number) { this.x = this.y = this.z = n } } }
    pinLandScale(stub as unknown as import('three').Object3D)
    expect(stub.scale.x).toBe(LAND_WORLD_SCALE)
    expect(stub.scale.y).toBe(LAND_WORLD_SCALE)
    const near = pointOnPath(0.05, 0)
    const far = pointOnPath(0.86, 0)
    expect(far.z).toBeLessThan(near.z - 10)
    const nearFeet = keepOffCreek(near.x, near.z)
    const farFeet = keepOffCreek(far.x, far.z)
    expect(onCreekWater(nearFeet.x, nearFeet.z)).toBe(false)
    expect(onCreekWater(farFeet.x, farFeet.z)).toBe(false)
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
