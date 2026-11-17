import { describe, expect, test } from 'vitest'
import { fuzzyFilter } from '../src/utils/fuzzy.js'
import { parseFoodQuery, inferUnit, nutritionFor } from '../src/utils/units.js'

const names = ['paneer', 'Palak Paneer', 'Chicken Biryani', 'Veg Biryani', 'kunafa', 'egg', 'Boiled Eggs', 'rasmalai']

describe('fuzzy dish search', () => {
  test.each([
    ['panner', 'paneer'],
    ['biriyani', 'Chicken Biryani'],
    ['kunafah', 'kunafa'],
    ['egs', 'Boiled Eggs'],
    ['ras malai', 'rasmalai'],
  ])('%s finds %s', (q, expected) => {
    expect(fuzzyFilter(q, names)).toContain(expected)
  })

  test('short words do not match inside other words', () => {
    expect(fuzzyFilter('egg', names)).not.toContain('Veg Biryani')
  })

  test('nonsense matches nothing', () => {
    expect(fuzzyFilter('xyz', names)).toEqual([])
  })
})

describe('amounts from the query', () => {
  test('quantity, unit and food are separated', () => {
    expect(parseFoodQuery('200g paneer')).toEqual({ quantity: 200, unit: 'g', food: 'paneer' })
    expect(parseFoodQuery('2 eggs')).toEqual({ quantity: 2, unit: null, food: 'eggs' })
  })
  test('units are inferred from the food', () => {
    expect(inferUnit('eggs')).toBe('piece')
    expect(inferUnit('masala chai')).toBe('cup')
    expect(inferUnit('biriyani')).toBe('plate')
  })
  test('rescaling uses per-100 g data', () => {
    const egg = { per100g: { calories: 155 }, unitGrams: { piece: 50, bowl: 200 } }
    expect(nutritionFor(egg, 4, 'piece').calories).toBe(310)
    expect(nutritionFor(egg, 100, 'g').calories).toBe(155)
  })
})
