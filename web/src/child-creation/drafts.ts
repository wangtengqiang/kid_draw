/**
 * 涂色草稿：最多 10 格。本机 kid-draw-cloudmock-drafts，不接付费、不写云密钥。
 */
import type { AnimalId } from '../types'

export const DRAFT_KEY = 'kid-draw-cloudmock-drafts'
export const LEGACY_DRAFT_KEY = 'kid-draw-paint-drafts-v1'
export const MAX_DRAFTS = 10

export interface PaintDraft {
  id: string
  roomId: string
  animalId: AnimalId
  colorPng: string
  thumb: string
  savedAt: number
}

export interface DraftSaveInput {
  id?: string
  roomId: string
  animalId: AnimalId
  colorPng: string
  thumb: string
}

export type DraftSaveResult =
  | { ok: true; draft: PaintDraft; count: number }
  | { ok: false; reason: 'full'; drafts: PaintDraft[] }

export type DraftListResult =
  | { ok: true; drafts: PaintDraft[] }
  | { ok: false; reason: 'corrupt' }

function newId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function migrateLegacy(): PaintDraft[] {
  try {
    const raw = localStorage.getItem(LEGACY_DRAFT_KEY)
    if (!raw) return []
    const old = JSON.parse(raw) as Array<{
      roomId?: string
      animalId?: AnimalId
      colorPng?: string
      savedAt?: number
    }>
    if (!Array.isArray(old)) return []
    return old
      .filter((d) => d.animalId && d.colorPng)
      .slice(0, MAX_DRAFTS)
      .map((d) => ({
        id: newId(),
        roomId: d.roomId || '1001',
        animalId: d.animalId as AnimalId,
        colorPng: d.colorPng as string,
        thumb: d.colorPng as string,
        savedAt: d.savedAt || Date.now(),
      }))
  } catch {
    return []
  }
}

function readRaw(): PaintDraft[] | 'corrupt' {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (raw === null) {
    const migrated = migrateLegacy()
    if (migrated.length) {
      writeAll(migrated)
      localStorage.removeItem(LEGACY_DRAFT_KEY)
    }
    return migrated
  }
  try {
    const parsed = JSON.parse(raw) as PaintDraft[]
    if (!Array.isArray(parsed)) return 'corrupt'
    return parsed.filter((d) => d && d.id && d.animalId && d.colorPng).slice(0, MAX_DRAFTS)
  } catch {
    return 'corrupt'
  }
}

function writeAll(list: PaintDraft[]): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(list.slice(0, MAX_DRAFTS)))
}

export function listDrafts(): DraftListResult {
  const data = readRaw()
  if (data === 'corrupt') return { ok: false, reason: 'corrupt' }
  return { ok: true, drafts: [...data].sort((a, b) => b.savedAt - a.savedAt) }
}

export function getDraft(id: string): PaintDraft | null {
  const data = readRaw()
  if (data === 'corrupt') return null
  return data.find((d) => d.id === id) ?? null
}

export function saveDraft(input: DraftSaveInput): DraftSaveResult {
  const data = readRaw()
  const current = data === 'corrupt' ? [] : data
  if (input.id) {
    const existing = current.find((d) => d.id === input.id)
    if (existing) {
      const draft: PaintDraft = {
        ...existing,
        roomId: input.roomId,
        animalId: input.animalId,
        colorPng: input.colorPng,
        thumb: input.thumb,
        savedAt: Date.now(),
      }
      writeAll([draft, ...current.filter((d) => d.id !== input.id)])
      return { ok: true, draft, count: Math.min(current.length, MAX_DRAFTS) }
    }
  }
  if (current.length >= MAX_DRAFTS) {
    return { ok: false, reason: 'full', drafts: [...current].sort((a, b) => b.savedAt - a.savedAt) }
  }
  const draft: PaintDraft = {
    id: input.id || newId(),
    roomId: input.roomId,
    animalId: input.animalId,
    colorPng: input.colorPng,
    thumb: input.thumb,
    savedAt: Date.now(),
  }
  writeAll([draft, ...current])
  return { ok: true, draft, count: current.length + 1 }
}

export function replaceDraft(id: string, input: DraftSaveInput): PaintDraft | null {
  const data = readRaw()
  if (data === 'corrupt') return null
  if (!data.some((d) => d.id === id)) return null
  const draft: PaintDraft = {
    id,
    roomId: input.roomId,
    animalId: input.animalId,
    colorPng: input.colorPng,
    thumb: input.thumb,
    savedAt: Date.now(),
  }
  writeAll([draft, ...data.filter((d) => d.id !== id)])
  return draft
}

export function emptySlotCount(drafts: PaintDraft[]): number {
  return Math.max(0, MAX_DRAFTS - drafts.length)
}
