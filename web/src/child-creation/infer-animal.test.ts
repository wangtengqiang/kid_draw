import { describe, expect, it } from 'vitest'
import { inferAnimalId, needsAnimalPicker } from './infer-animal'

describe('inferAnimalId', () => {
  it('uses the template the kid started with, even if the paint is a scribble', () => {
    const r = inferAnimalId({ startedAs: 'deer', averageHex: '#e24b4b' })
    expect(r).toEqual({ animalId: 'deer', source: 'template' })
    expect(needsAnimalPicker(r)).toBe(false)
  })

  it('does not need a belly-oval flood to keep the picked tiger', () => {
    expect(inferAnimalId({ startedAs: 'tiger', averageHex: null }).animalId).toBe('tiger')
  })

  it('guesses from paint color when there is no template', () => {
    expect(inferAnimalId({ averageHex: '#e89a2d' }).animalId).toBe('tiger')
    expect(inferAnimalId({ averageHex: '#f0d48a' }).animalId).toBe('lion')
    expect(inferAnimalId({ averageHex: '#e24b4b' }).animalId).toBe('deer')
    expect(inferAnimalId({ averageHex: '#3b82f6' }).animalId).toBe('fish')
    expect(inferAnimalId({ averageHex: '#2bb673' }).animalId).toBe('turtle')
    expect(inferAnimalId({ averageHex: '#64748b' }).animalId).toBe('dolphin')
  })

  it('falls back to a picker when the page is blank paper', () => {
    const r = inferAnimalId({})
    expect(r.source).toBe('picker')
    expect(needsAnimalPicker(r)).toBe(true)
  })
})
