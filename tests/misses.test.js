import { describe, expect, test } from 'vitest'
import { criticalMisses } from '../src/utils/misses.js'

const now = new Date('2026-11-18T12:00:00')
const day = (ago) => { const d = new Date(now); d.setDate(d.getDate() - ago); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const entry = (ago, n) => ({ date: day(ago), dish: 'x', nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, vitamins: 0, minerals: 0, ...n } })
const intake = { calories: 2000, protein: 100, fiber: 28 }

describe('critical misses', () => {
  test('flags fiber far below the goal over several days', () => {
    const h = [1, 2, 3].map((a) => entry(a, { calories: 1900, protein: 95, fiber: 8 }))
    const m = criticalMisses(h, intake, now)
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ key: 'fiber', kind: 'low', avg: 8, days: 3 })
  })
  test('needs at least two logged days and ignores today', () => {
    expect(criticalMisses([entry(0, { fiber: 0 }), entry(1, { fiber: 0 })], intake, now)).toEqual([])
  })
  test('flags calories well over the goal', () => {
    const h = [1, 2].map((a) => entry(a, { calories: 2600, protein: 100, fiber: 30 }))
    expect(criticalMisses(h, intake, now)[0]).toMatchObject({ key: 'calories', kind: 'high' })
  })
  test('nothing when on track', () => {
    const h = [1, 2, 3].map((a) => entry(a, { calories: 2000, protein: 90, fiber: 25 }))
    expect(criticalMisses(h, intake, now)).toEqual([])
  })
})
