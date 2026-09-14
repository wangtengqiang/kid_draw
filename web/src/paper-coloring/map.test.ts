import { beforeEach, describe, expect, it } from 'vitest'
import { createRoom, getRoom } from '../sync/rooms.ts'
import { detectMarks, homography } from './map.ts'
import { sendColoredAnimal } from './send-to-world.ts'
import { MARK, TEMPLATE_H, TEMPLATE_W, markCenters } from './template.ts'

function creamSheet(): ImageData {
  const data = new Uint8ClampedArray(TEMPLATE_W * TEMPLATE_H * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255
    data[i + 1] = 250
    data[i + 2] = 241
    data[i + 3] = 255
  }
  const ink = (x: number, y: number) => {
    const i = (y * TEMPLATE_W + x) * 4
    data[i] = 26
    data[i + 1] = 18
    data[i + 2] = 12
  }
  const stamp = (cx: number, cy: number) => {
    const r = Math.floor(MARK / 2)
    for (let y = cy - r; y < cy + r; y++) {
      for (let x = cx - r; x < cx + r; x++) ink(x, y)
    }
  }
  const m = markCenters()
  stamp(Math.round(m.tl.x), Math.round(m.tl.y))
  stamp(Math.round(m.tr.x), Math.round(m.tr.y))
  stamp(Math.round(m.bl.x), Math.round(m.bl.y))
  stamp(Math.round(m.br.x), Math.round(m.br.y))
  return { data, width: TEMPLATE_W, height: TEMPLATE_H } as ImageData
}

describe('paper alignment marks', () => {
  it('finds the four official corners', () => {
    const marks = detectMarks(creamSheet())
    expect(marks).toBeTruthy()
    const expected = markCenters()
    expect(Math.abs(marks!.tl.x - expected.tl.x)).toBeLessThan(8)
    expect(Math.abs(marks!.br.y - expected.br.y)).toBeLessThan(8)
  })

  it('builds an identity warp from matching corners', () => {
    const m = markCenters()
    const pts = [m.tl, m.tr, m.bl, m.br]
    const H = homography(pts, pts)
    expect(H).toBeTruthy()
    expect(H![0]).toBeCloseTo(1, 4)
    expect(H![4]).toBeCloseTo(1, 4)
    expect(H![2]).toBeCloseTo(0, 4)
    expect(H![5]).toBeCloseTo(0, 4)
  })
})

describe('paper send uses the same room path', () => {
  beforeEach(() => localStorage.clear())

  it('places the animal in the host room', async () => {
    createRoom('5678')
    const result = await sendColoredAnimal({
      roomId: '5678',
      animalId: 'tiger',
      thumb: 'data:image/png;base64,aa',
      regionColors: { body: '#e24b4b' },
    })
    expect(result.ok).toBe(true)
    expect(getRoom('5678')?.animals).toHaveLength(1)
    expect(getRoom('5678')?.animals[0]?.animalId).toBe('tiger')
  })
})
