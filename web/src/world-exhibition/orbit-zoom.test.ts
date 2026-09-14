import { describe, expect, it } from 'vitest'
import { clampOrbit, HOST_ORBIT, offsetFromSpherical, PREVIEW_ORBIT } from './orbit-zoom.ts'

describe('orbit clamps', () => {
  it('keeps host radius and pitch in the exhibition range', () => {
    expect(clampOrbit(3, 0, HOST_ORBIT).radius).toBe(HOST_ORBIT.minRadius)
    expect(clampOrbit(40, Math.PI, HOST_ORBIT).radius).toBe(HOST_ORBIT.maxRadius)
    expect(clampOrbit(12, 0, HOST_ORBIT).phi).toBe(HOST_ORBIT.minPhi)
    expect(clampOrbit(12, Math.PI, HOST_ORBIT).phi).toBe(HOST_ORBIT.maxPhi)
  })

  it('keeps preview zoom for a close look at one animal', () => {
    expect(PREVIEW_ORBIT.minRadius).toBeLessThan(HOST_ORBIT.minRadius)
    const far = clampOrbit(20, 1, PREVIEW_ORBIT)
    expect(far.radius).toBe(PREVIEW_ORBIT.maxRadius)
  })

  it('lets the host camera pull back to see the far forest', () => {
    expect(HOST_ORBIT.maxRadius).toBeGreaterThan(28)
    expect(HOST_ORBIT.minRadius).toBeLessThan(8)
  })
})
