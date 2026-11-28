import { describe, expect, test } from 'vitest'
import { EXERCISES, CATEGORIES, exerciseById, caloriesBurned, describeAmount, waysToBurn, totalBurned } from '../src/utils/exercises.js'

describe('the library', () => {
  test('ids are unique and every exercise is well formed', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const cats = new Set(CATEGORIES.map((c) => c.key))
    for (const e of EXERCISES) {
      expect(cats.has(e.category), e.id).toBe(true)
      expect(['reps', 'time', 'distance', 'steps']).toContain(e.kind)
      if (e.kind === 'reps') { expect(e.met).toBeGreaterThan(1); expect(e.secPerRep).toBeGreaterThan(0) }
      if (e.kind === 'time') { expect(e.met).toHaveLength(3); expect(e.met[0] <= e.met[1] && e.met[1] <= e.met[2], e.id).toBe(true) }
      if (e.kind === 'distance') { expect(e.met).toBeGreaterThan(1); expect(e.kmh).toBeGreaterThan(0) }
    }
  })
  test('every part of the body has plenty to choose from', () => {
    for (const c of CATEGORIES) expect(EXERCISES.filter((e) => e.category === c.key).length, c.key).toBeGreaterThanOrEqual(6)
    expect(EXERCISES.length).toBeGreaterThan(100)
  })
})

describe('calories burned (70 kg, extra burn only)', () => {
  test('time-based: a 30 minute jog is a few hundred kcal, a stroll much less', () => {
    const jog = caloriesBurned(exerciseById('run'), { minutes: 30, intensity: 'moderate' })
    expect(jog).toBeGreaterThan(280); expect(jog).toBeLessThan(340)
    const walk = caloriesBurned(exerciseById('walk'), { minutes: 30, intensity: 'moderate' })
    expect(walk).toBeGreaterThan(100); expect(walk).toBeLessThan(130)
  })
  test('harder means more', () => {
    const at = (intensity) => caloriesBurned(exerciseById('cycle'), { minutes: 30, intensity })
    expect(at('light')).toBeLessThan(at('moderate'))
    expect(at('moderate')).toBeLessThan(at('hard'))
  })
  test('reps: more sets and reps burn more, but a set of push-ups is small', () => {
    const pushup = exerciseById('pushup')
    const one = caloriesBurned(pushup, { sets: 1, reps: 12 })
    const three = caloriesBurned(pushup, { sets: 3, reps: 12 })
    expect(three).toBeGreaterThan(one * 2.5)
    expect(three).toBeLessThan(15)
    expect(caloriesBurned(pushup, { sets: 3, reps: 0 })).toBe(0)
  })
  test('distance: about 1 kcal per kg per km when running', () => {
    expect(caloriesBurned(exerciseById('run-km'), { km: 5 })).toBeGreaterThan(300)
    expect(caloriesBurned(exerciseById('run-km'), { km: 5 })).toBeLessThan(380)
  })
  test('steps: 8,000 steps is a few hundred', () => {
    const kcal = caloriesBurned(exerciseById('walk-steps'), { steps: 8000 })
    expect(kcal).toBeGreaterThan(180); expect(kcal).toBeLessThan(320)
  })
  test('heavier people burn more; nothing entered burns nothing', () => {
    const run = exerciseById('run')
    expect(caloriesBurned(run, { minutes: 20 }, 90)).toBeGreaterThan(caloriesBurned(run, { minutes: 20 }, 60))
    expect(caloriesBurned(run, { minutes: 0 })).toBe(0)
    expect(caloriesBurned(null, { minutes: 20 })).toBe(0)
    expect(caloriesBurned(run, { minutes: 20 }, 'abc')).toBe(caloriesBurned(run, { minutes: 20 }, 70))
  })
})

describe('describing and balancing', () => {
  test('amounts read naturally', () => {
    expect(describeAmount(exerciseById('squat'), { sets: 3, reps: 15 })).toBe('3 × 15')
    expect(describeAmount(exerciseById('run'), { minutes: 20, intensity: 'hard' })).toBe('20 min · hard')
    expect(describeAmount(exerciseById('run'), { minutes: 20, intensity: 'moderate' })).toBe('20 min')
    expect(describeAmount(exerciseById('run-km'), { km: 5 })).toBe('5 km')
    expect(describeAmount(exerciseById('walk-steps'), { steps: 6000 })).toBe('6,000 steps')
  })
  test('ways to burn 400 kcal each get close, in 5 minute steps', () => {
    const ways = waysToBurn(400)
    expect(ways).toHaveLength(3)
    for (const w of ways) {
      expect(w.minutes % 5).toBe(0)
      expect(Math.abs(w.kcal - 400)).toBeLessThan(60)
    }
    expect(waysToBurn(0)).toEqual([])
  })
  test('totals add up what was logged', () => {
    expect(totalBurned([{ calories: 120 }, { calories: 80 }, {}])).toBe(200)
  })
})
