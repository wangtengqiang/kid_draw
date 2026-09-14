/**
 * 同一套卡通幼崽 / Gobkit glTF 的正面快照。
 * 选动物卡片、画廊缩略图、小游戏 2D 都用这里，避免再画椭圆。
 * 运行时仍是 Three.js GLTFLoader；不打阴影。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { ANIMAL_IDS } from '../types'
import { loadAnimalTemplates } from './gltf-kit'
import { createAnimalModel, tickWalk } from './models'

const CLEAR = '#e8f2d2'
const cache = new Map<string, string>()
let gl: THREE.WebGLRenderer | null = null
let canvas: HTMLCanvasElement | null = null
let queue: Promise<unknown> = Promise.resolve()

function renderer(w: number, h: number): { gl: THREE.WebGLRenderer; canvas: HTMLCanvasElement } {
  if (!canvas || !gl) {
    canvas = document.createElement('canvas')
    gl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
      powerPreference: 'low-power',
    })
    gl.setPixelRatio(1)
    gl.setClearColor(CLEAR, 1)
  }
  gl.setSize(w, h, false)
  return { gl, canvas }
}

function litScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(CLEAR)
  scene.add(new THREE.AmbientLight('#ffe9c8', 0.9))
  scene.add(new THREE.HemisphereLight('#fff6e8', '#7a9a58', 1.05))
  const key = new THREE.DirectionalLight('#fff4d8', 1.05)
  key.position.set(-4, 5, 2)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#fff8ee', 0.45)
  fill.position.set(3, 2, 4)
  scene.add(fill)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 28),
    new THREE.MeshLambertMaterial({ color: '#c5b89a' }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)
  return scene
}

function frontCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 40)
  camera.position.set(-3.15, 1.55, 0.55)
  camera.lookAt(0.1, 0.95, 0)
  return camera
}

export function snapshotSrc(animal: AnimalId): string {
  return `/models/snapshots/${animal}.png`
}

export async function snapshotPet(
  animal: AnimalId,
  colors: Record<string, string> = { body: '#ffffff' },
  w = 360,
  h = 360,
): Promise<string> {
  const key = `${animal}:${colors.body || ''}:${colors.mane || ''}:${w}x${h}`
  const hit = cache.get(key)
  if (hit) return hit
  const run = queue.then(async () => {
    await loadAnimalTemplates()
    const { gl: gpu, canvas: target } = renderer(w, h)
    const scene = litScene()
    const camera = frontCamera(w / Math.max(h, 1))
    const model = createAnimalModel(animal, colors)
    scene.add(model)
    tickWalk(model, 0.35, false)
    gpu.render(scene, camera)
    const url = target.toDataURL('image/png')
    cache.set(key, url)
    scene.remove(model)
    return url
  })
  queue = run.catch(() => undefined)
  return run
}

export function mountPetImage(
  img: HTMLImageElement,
  animal: AnimalId,
  colors?: Record<string, string>,
): void {
  img.alt = img.alt || ''
  img.classList.add('pet-shot')
  const baked = snapshotSrc(animal)
  const tinted = colors && Object.values(colors).some((c) => c && c !== '#ffffff')
  if (!tinted) {
    img.src = baked
    img.onerror = () => {
      void snapshotPet(animal, { body: '#ffffff' }).then((url) => {
        img.src = url
      })
    }
    return
  }
  void snapshotPet(animal, colors).then((url) => {
    img.src = url
  }).catch(() => {
    img.src = baked
  })
}

export async function bakeAllDefaultSnapshots(
  size = 512,
): Promise<Record<AnimalId, string>> {
  const out = {} as Record<AnimalId, string>
  for (const id of ANIMAL_IDS) {
    out[id] = await snapshotPet(id, { body: '#ffffff' }, size, size)
  }
  return out
}
