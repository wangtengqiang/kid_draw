import * as THREE from 'three'
import type { AnimalId } from './types'
import { ANIMAL_META } from './types'

function mesh(geo: THREE.BufferGeometry, color: string): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ color })
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function colorOf(
  animal: AnimalId,
  region: string,
  painted: Record<string, string>,
): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

export function createAnimalModel(
  animal: AnimalId,
  painted: Record<string, string>,
): THREE.Group {
  if (animal === 'deer') return deer(painted)
  if (animal === 'tiger') return tiger(painted)
  return lion(painted)
}

function apply(group: THREE.Group, painted: Record<string, string>, animal: AnimalId): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.region) {
      const mat = obj.material
      if (mat instanceof THREE.MeshLambertMaterial) {
        mat.color.set(colorOf(animal, obj.userData.region, painted))
      }
    }
  })
}

export function recolorAnimal(
  group: THREE.Group,
  animal: AnimalId,
  painted: Record<string, string>,
): void {
  apply(group, painted, animal)
}

function part(
  geo: THREE.BufferGeometry,
  region: string,
  animal: AnimalId,
  painted: Record<string, string>,
): THREE.Mesh {
  const m = mesh(geo, colorOf(animal, region, painted))
  m.userData.region = region
  return m
}

function deer(painted: Record<string, string>): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'deer'
  const body = part(new THREE.SphereGeometry(0.42, 16, 12), 'body', a, painted)
  body.scale.set(1.35, 0.95, 0.85)
  body.position.y = 0.72
  g.add(body)
  const belly = part(new THREE.SphereGeometry(0.28, 12, 10), 'belly', a, painted)
  belly.scale.set(1.2, 0.85, 0.9)
  belly.position.set(0, 0.58, 0.22)
  g.add(belly)
  const neck = part(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 10), 'neck', a, painted)
  neck.position.set(0, 1.08, 0.08)
  neck.rotation.x = 0.25
  g.add(neck)
  const head = part(new THREE.SphereGeometry(0.22, 14, 12), 'head', a, painted)
  head.position.set(0, 1.38, 0.18)
  g.add(head)
  for (const [name, x] of [
    ['earL', -0.16],
    ['earR', 0.16],
  ] as const) {
    const ear = part(new THREE.ConeGeometry(0.07, 0.16, 8), name, a, painted)
    ear.position.set(x, 1.55, 0.12)
    ear.rotation.z = x > 0 ? -0.4 : 0.4
    g.add(ear)
  }
  for (const [name, x] of [
    ['antlerL', -0.1],
    ['antlerR', 0.1],
  ] as const) {
    const ant = new THREE.Group()
    const main = part(new THREE.CylinderGeometry(0.025, 0.03, 0.38, 6), name, a, painted)
    main.position.y = 0.18
    const branch = part(new THREE.CylinderGeometry(0.018, 0.022, 0.18, 6), name, a, painted)
    branch.position.set(x > 0 ? 0.08 : -0.08, 0.22, 0)
    branch.rotation.z = x > 0 ? -0.8 : 0.8
    ant.add(main, branch)
    ant.position.set(x, 1.54, 0.08)
    g.add(ant)
  }
  const legs = [
    ['legFL', -0.22, 0.22],
    ['legFR', 0.22, 0.22],
    ['legBL', -0.22, -0.18],
    ['legBR', 0.22, -0.18],
  ] as const
  const legMeshes: THREE.Mesh[] = []
  for (const [name, x, z] of legs) {
    const leg = part(new THREE.CylinderGeometry(0.055, 0.045, 0.62, 8), name, a, painted)
    leg.position.set(x, 0.32, z)
    g.add(leg)
    legMeshes.push(leg)
  }
  const tail = part(new THREE.SphereGeometry(0.08, 8, 8), 'tail', a, painted)
  tail.position.set(0, 0.78, -0.38)
  g.add(tail)
  for (const [name, x, y, z] of [
    ['spot1', -0.16, 0.82, 0.28],
    ['spot2', 0.18, 0.88, 0.2],
    ['spot3', 0.04, 0.7, 0.32],
  ] as const) {
    const s = part(new THREE.SphereGeometry(0.055, 8, 8), name, a, painted)
    s.position.set(x, y, z)
    g.add(s)
  }
  addEyes(g, 1.4, 0.34, 0.1)
  g.userData.legs = legMeshes
  g.userData.kind = a
  return g
}

function tiger(painted: Record<string, string>): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'tiger'
  const body = part(new THREE.SphereGeometry(0.4, 16, 12), 'body', a, painted)
  body.scale.set(1.55, 0.9, 0.85)
  body.position.y = 0.58
  g.add(body)
  const belly = part(new THREE.SphereGeometry(0.26, 12, 10), 'belly', a, painted)
  belly.scale.set(1.35, 0.8, 0.85)
  belly.position.set(0, 0.46, 0.18)
  g.add(belly)
  const head = part(new THREE.SphereGeometry(0.28, 14, 12), 'head', a, painted)
  head.position.set(0, 0.92, 0.38)
  g.add(head)
  const muzzle = part(new THREE.SphereGeometry(0.14, 10, 8), 'muzzle', a, painted)
  muzzle.scale.set(1.1, 0.7, 1)
  muzzle.position.set(0, 0.82, 0.58)
  g.add(muzzle)
  for (const [name, inner, x] of [
    ['earL', 'innerL', -0.16],
    ['earR', 'innerR', 0.16],
  ] as const) {
    const ear = part(new THREE.SphereGeometry(0.1, 8, 8), name, a, painted)
    ear.scale.set(1, 1.15, 0.5)
    ear.position.set(x, 1.14, 0.34)
    g.add(ear)
    const inn = part(new THREE.SphereGeometry(0.05, 8, 8), inner, a, painted)
    inn.position.set(x, 1.12, 0.38)
    g.add(inn)
  }
  const legs = [
    ['legFL', -0.22, 0.28],
    ['legFR', 0.22, 0.28],
    ['legBL', -0.24, -0.22],
    ['legBR', 0.24, -0.22],
  ] as const
  const legMeshes: THREE.Mesh[] = []
  for (const [name, x, z] of legs) {
    const leg = part(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8), name, a, painted)
    leg.position.set(x, 0.26, z)
    g.add(leg)
    legMeshes.push(leg)
  }
  const tail = part(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8), 'tail', a, painted)
  tail.position.set(0.08, 0.7, -0.55)
  tail.rotation.x = 0.9
  tail.rotation.z = -0.3
  g.add(tail)
  addEyes(g, 0.96, 0.56, 0.12)
  g.userData.legs = legMeshes
  g.userData.kind = a
  return g
}

function lion(painted: Record<string, string>): THREE.Group {
  const g = new THREE.Group()
  const a: AnimalId = 'lion'
  const body = part(new THREE.SphereGeometry(0.4, 16, 12), 'body', a, painted)
  body.scale.set(1.4, 0.95, 0.9)
  body.position.y = 0.6
  g.add(body)
  const belly = part(new THREE.SphereGeometry(0.26, 12, 10), 'belly', a, painted)
  belly.scale.set(1.2, 0.8, 0.85)
  belly.position.set(0, 0.48, 0.2)
  g.add(belly)
  const mane = part(new THREE.SphereGeometry(0.42, 12, 10), 'mane', a, painted)
  mane.position.set(0, 0.98, 0.32)
  g.add(mane)
  const head = part(new THREE.SphereGeometry(0.24, 14, 12), 'head', a, painted)
  head.position.set(0, 0.98, 0.42)
  g.add(head)
  const muzzle = part(new THREE.SphereGeometry(0.12, 10, 8), 'muzzle', a, painted)
  muzzle.position.set(0, 0.9, 0.6)
  g.add(muzzle)
  for (const [name, x] of [
    ['earL', -0.14],
    ['earR', 0.14],
  ] as const) {
    const ear = part(new THREE.SphereGeometry(0.07, 8, 8), name, a, painted)
    ear.position.set(x, 1.2, 0.36)
    g.add(ear)
  }
  const legs = [
    ['legFL', -0.2, 0.26],
    ['legFR', 0.2, 0.26],
    ['legBL', -0.22, -0.2],
    ['legBR', 0.22, -0.2],
  ] as const
  const legMeshes: THREE.Mesh[] = []
  for (const [name, x, z] of legs) {
    const leg = part(new THREE.CylinderGeometry(0.07, 0.06, 0.52, 8), name, a, painted)
    leg.position.set(x, 0.26, z)
    g.add(leg)
    legMeshes.push(leg)
  }
  const tail = part(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 8), 'tail', a, painted)
  tail.position.set(0.05, 0.72, -0.48)
  tail.rotation.x = 0.85
  g.add(tail)
  const tuft = part(new THREE.SphereGeometry(0.09, 8, 8), 'tuft', a, painted)
  tuft.position.set(0.12, 0.52, -0.72)
  g.add(tuft)
  addEyes(g, 1.02, 0.58, 0.1)
  g.userData.legs = legMeshes
  g.userData.kind = a
  return g
}

function addEyes(g: THREE.Group, y: number, z: number, spread: number): void {
  const geo = new THREE.SphereGeometry(0.035, 8, 8)
  const mat = new THREE.MeshLambertMaterial({ color: '#1a120c' })
  const l = new THREE.Mesh(geo, mat)
  const r = new THREE.Mesh(geo, mat)
  l.position.set(-spread, y, z)
  r.position.set(spread, y, z)
  g.add(l, r)
}

export function tickWalk(group: THREE.Group, t: number, moving: boolean): void {
  const legs = group.userData.legs as THREE.Mesh[] | undefined
  if (!legs) return
  const amp = moving ? 0.45 : 0.08
  legs.forEach((leg, i) => {
    const dir = i % 2 === 0 ? 1 : -1
    leg.rotation.x = Math.sin(t * 6 + i) * amp * dir
  })
  group.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.04 : 0
}
