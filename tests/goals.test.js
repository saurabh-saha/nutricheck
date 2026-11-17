import { describe, expect, test } from 'vitest'
import { planFor, recommendedTargets, withCarbs, goalWeightRange, targetNotes } from '../src/utils/goals.js'

const me = { age: 35, sex: 'male', height: 175, weight: 80, activityLevel: 1.375 }

describe('goal maths', () => {
  test('same weight means maintain at maintenance calories', () => {
    const p = planFor(me, 80)
    expect(p.goal).toBe('maintain')
    expect(p.calories).toBe(p.maintenance)
  })
  test('losing 5 kg at 0.5 kg/week: ~550 kcal under, 10 weeks', () => {
    const p = planFor(me, 75, 'steady')
    expect(p.goal).toBe('lose')
    expect(p.maintenance - p.calories).toBe(550)
    expect(p.weeks).toBe(10)
  })
  test('never goes below a safe floor', () => {
    const small = { age: 30, sex: 'female', height: 155, weight: 55, activityLevel: 1.2 }
    const p = planFor(small, 48, 'fast')
    expect(p.calories).toBeGreaterThanOrEqual(1200)
    expect(p.floored).toBe(true)
  })
  test('teens cannot pick a lower goal weight', () => {
    expect(goalWeightRange({ ...me, age: 15 }).min).toBe(80)
  })
  test('carbs fill the calories left by protein and fat', () => {
    const t = withCarbs({ calories: 2000, protein: 150, fat: 60, fiber: 28 })
    expect(t.carbs).toBe(215)
    expect(recommendedTargets(2000).protein).toBe(100)
  })
  test('flags very low protein', () => {
    expect(targetNotes(withCarbs({ calories: 2000, protein: 40, fat: 67, fiber: 28 }), 80).join(' ')).toMatch(/minimum/)
  })
})
