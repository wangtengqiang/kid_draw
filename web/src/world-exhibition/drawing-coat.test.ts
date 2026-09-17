import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyDrawingCoat, isBitmapCoat, projectBoxUVs } from './drawing-coat'

function stripeTexture(): THREE.DataTexture {
  const data = new Uint8Array([
    204, 34, 68, 255, 204, 34, 68, 255,
    34, 102, 204, 255, 34, 102, 204, 255,
  ])
  const tex = new THREE.DataTexture(data, 2, 2)
  tex.needsUpdate = true
  return tex
}

describe('drawing coat is the raw bitmap', () => {
  it('recognizes image data URLs and rejects JSON thumbs', () => {
    expect(isBitmapCoat('data:image/png;base64,aa')).toBe(true)
    expect(isBitmapCoat('{"strokes":[]}')).toBe(false)
  })

  it('stamps messy stripes onto the body map without averaging them', () => {
    const root = new THREE.Group()
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.4, 0.8),
      new THREE.MeshLambertMaterial({ color: '#e24b4b' }),
    )
    mesh.name = 'body'
    root.add(mesh)
    const paper = stripeTexture()
    applyDrawingCoat(root, paper)
    const mat = mesh.material as THREE.MeshLambertMaterial
    expect(mat.color.getHexString()).toBe('ffffff')
    expect(mat.map).toBe(root.userData.drawing)
    const img = mat.map!.image as { data?: Uint8Array }
    const pix = img.data || (mat.map as THREE.DataTexture).image.data
    const colors = new Set<string>()
    for (let i = 0; i < pix.length; i += 4) {
      colors.add(`${pix[i]},${pix[i + 1]},${pix[i + 2]}`)
    }
    expect(colors.has('204,34,68')).toBe(true)
    expect(colors.has('34,102,204')).toBe(true)
    expect(colors.size).toBe(2)
  })

  it('multiplies kid paint onto a land-gltf coat instead of replacing the mesh', () => {
    const root = new THREE.Group()
    root.userData.pack = 'land-gltf'
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#f0b54a'
      ctx.fillRect(0, 0, 4, 4)
    }
    const sprite = new THREE.CanvasTexture(canvas)
    sprite.needsUpdate = true
    root.userData.spriteMap = sprite
    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshLambertMaterial({ map: sprite, color: '#ffffff' }),
    )
    mesh.name = 'body'
    mesh.userData.rigged = true
    root.add(mesh)
    applyDrawingCoat(root, stripeTexture())
    expect(mesh.geometry).not.toBeInstanceOf(THREE.PlaneGeometry)
    if (root.userData.drawing) {
      expect((mesh.material as THREE.MeshLambertMaterial).map).toBe(root.userData.drawing)
      expect((mesh.material as THREE.MeshLambertMaterial).map).not.toBe(stripeTexture())
    } else {
      expect((mesh.material as THREE.MeshLambertMaterial).map).toBe(sprite)
    }
  })

  it('writes box UVs so the drawing covers the mesh', () => {
    const root = new THREE.Group()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial())
    mesh.name = 'body'
    root.add(mesh)
    projectBoxUVs(root)
    const uv = mesh.geometry.getAttribute('uv')
    expect(uv.count).toBeGreaterThan(8)
    let minU = 1
    let maxU = 0
    let minV = 1
    let maxV = 0
    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i))
      maxU = Math.max(maxU, uv.getX(i))
      minV = Math.min(minV, uv.getY(i))
      maxV = Math.max(maxV, uv.getY(i))
    }
    expect(maxU - minU).toBeGreaterThan(0.5)
    expect(maxV - minV).toBeGreaterThan(0.5)
  })
})
