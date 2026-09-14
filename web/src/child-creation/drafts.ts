/**
 * 涂色草稿：本机 localStorage。网页预览不接付费、不写云密钥。
 */
import type { AnimalId } from '../types'

export const DRAFT_KEY = 'kid-draw-paint-drafts-v1'

export interface PaintDraft {
  roomId: string
  animalId: AnimalId
  colorPng: string
  savedAt: number
}

function readAll(): PaintDraft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]') as PaintDraft[]
  } catch {
    return []
  }
}

function writeAll(list: PaintDraft[]): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(list.slice(0, 12)))
}

export function draftId(roomId: string, animalId: AnimalId): string {
  return `${roomId}:${animalId}`
}

export function loadDraft(roomId: string, animalId: AnimalId): PaintDraft | null {
  return readAll().find((d) => d.roomId === roomId && d.animalId === animalId) ?? null
}

export function saveDraft(draft: PaintDraft): PaintDraft {
  const next = [draft, ...readAll().filter((d) => draftId(d.roomId, d.animalId) !== draftId(draft.roomId, draft.animalId))]
  writeAll(next)
  return draft
}

export function clearDraft(roomId: string, animalId: AnimalId): void {
  writeAll(readAll().filter((d) => draftId(d.roomId, d.animalId) !== draftId(roomId, animalId)))
}
