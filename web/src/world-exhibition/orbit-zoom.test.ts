import { describe, expect, it } from 'vitest'
import { clampOrbit, HOST_ORBIT, offsetFromSpherical, PREVIEW_ORBIT } from './orbit-zoom.ts'

describe('orbit clamps', () => {
  it('keeps host radius and pitch in the exhibition range', () => {
    expect(clampOrbit(3, 0, HOST_ORBIT).radius).toBe(HOST_ORBIT.minRadius)
    expect(clampOrbit(40, Math.PI, HOST_ORBIT).radius).toBe(HOST_ORBIT.maxRadius)
    expect(clampOrbit(12, 0, HOST_ORBIT).phi).toBe(HOST_ORBIT.minPhi)
    expect(clampOrbit(12, Math.PI, HOST_ORBIT).phi).toBe(HOST_ORBIT.maxPhi)
  })

  it('keeps preview zoom tighter than the host forest', () => {
    expect(PREVIEW_ORBIT.maxRadius).toBeLessThanOrEqual(HOST_ORBIT.minRadius)
    expect(PREVIEW_ORBIT.minRadius).toBeLessThan(HOST_ORBIT.minRadius)
    const far = clampOrbit(20, 1, PREVIEW_ORBIT)
    expect(far.radius).toBe(PREVIEW_ORBIT.maxRadius)
  })

  it('places the default host camera looking slightly down at the clearing', () => {
    const o = offsetFromSpherical(14, 0, 0.98)
    expect(o.z).toBeGreaterThan(10)
    expect(o.y).toBeGreaterThan(6)
    expect(Math.abs(o.x)).toBeLessThan(0.01)
  })
})
