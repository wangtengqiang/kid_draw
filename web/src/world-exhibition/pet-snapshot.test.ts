import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ANIMAL_IDS } from '../types'
import { snapshotSrc } from './pet-snapshot'

const PNG = [137, 80, 78, 71, 13, 10, 26, 10]
const PUBLIC = resolve(process.cwd(), 'public')
const REPO = resolve(process.cwd(), '..')
const LAND = ['deer', 'tiger', 'lion'] as const

function assertPng(abs: string) {
  expect(existsSync(abs), abs).toBe(true)
  const bytes = readFileSync(abs)
  expect([...bytes.subarray(0, 8)]).toEqual(PNG)
}

describe('art-cutout snapshot paths', () => {
  it('points at the baked front stills, not ellipse art', () => {
    expect(snapshotSrc('deer')).toBe('/models/snapshots/deer.png')
    expect(snapshotSrc('lion')).toBe('/models/snapshots/lion.png')
  })

  it('ships every animal snapshot at the WeChat repo-root pack path', () => {
    for (const id of ANIMAL_IDS) {
      assertPng(resolve(PUBLIC, `models/snapshots/${id}.png`))
      assertPng(resolve(REPO, `models/snapshots/${id}.png`))
      assertPng(resolve(REPO, `minigame/models/snapshots/${id}.png`))
    }
  })

  it('ships minigame picks and lineart at both pack paths DevTools scans', () => {
    for (const id of LAND) {
      assertPng(resolve(PUBLIC, `picks/${id}.png`))
      assertPng(resolve(PUBLIC, `lineart/${id}.png`))
      assertPng(resolve(REPO, `picks/${id}.png`))
      assertPng(resolve(REPO, `lineart/${id}.png`))
      assertPng(resolve(REPO, `minigame/picks/${id}.png`))
      assertPng(resolve(REPO, `minigame/lineart/${id}.png`))
    }
  })

  it('ships land cutouts at the WeChat repo-root pack path', () => {
    for (const id of LAND) {
      assertPng(resolve(PUBLIC, `models/cutouts/${id}.png`))
      assertPng(resolve(REPO, `models/cutouts/${id}.png`))
      assertPng(resolve(REPO, `minigame/models/cutouts/${id}.png`))
    }
    assertPng(resolve(REPO, 'models/trees/oak.png'))
    assertPng(resolve(REPO, 'models/trees/pine.png'))
  })

  it('does not leave a missing PNG string in the minigame pack', () => {
    const roots = [resolve(REPO, 'minigame'), resolve(REPO, 'game.js')]
    const files: string[] = []
    function walk(dir: string) {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, name.name)
        if (name.isDirectory()) walk(abs)
        else if (name.name.endsWith('.js')) files.push(abs)
      }
    }
    walk(roots[0])
    files.push(roots[1])
    const missing: string[] = []
    const re = /['"]((?:minigame\/)?(?:models\/(?:snapshots|cutouts|trees)|picks|lineart)\/[a-z]+\.png)['"]/g
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const match of src.matchAll(re)) {
        const rel = match[1]
        if (!existsSync(resolve(REPO, rel))) missing.push(`${rel} (from ${file.slice(REPO.length + 1)})`)
      }
    }
    expect(missing).toEqual([])
  })
})
