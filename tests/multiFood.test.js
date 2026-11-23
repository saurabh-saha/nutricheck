import { describe, expect, test } from 'vitest'
import { splitFoodQuery, isMultiFood, foodsInQuery, breakdownTotal, amountLabel } from '../src/utils/multiFood.js'

describe('splitting a search into foods', () => {
  test('one dish stays one dish', () => {
    expect(splitFoodQuery('1 bowl of poha')).toEqual(['1 bowl of poha'])
    expect(isMultiFood('masala dosa')).toBe(false)
  })

  test('commas, plus signs and newlines separate foods', () => {
    expect(splitFoodQuery('2 rotis, dal, 1 bowl rice')).toEqual(['2 rotis', 'dal', '1 bowl rice'])
    expect(splitFoodQuery('idli + sambar')).toEqual(['idli', 'sambar'])
    expect(splitFoodQuery('tea\nbiscuits')).toEqual(['tea', 'biscuits'])
  })

  test('"and" separates when a side opens with an amount', () => {
    expect(splitFoodQuery('2 rotis and dal')).toEqual(['2 rotis', 'dal'])
    expect(splitFoodQuery('dal and 1 bowl rice')).toEqual(['dal', '1 bowl rice'])
    expect(splitFoodQuery('2 rotis, dal and a bowl of rice')).toEqual(['2 rotis', 'dal', 'a bowl of rice'])
  })

  test('"and" inside a dish name does not split it', () => {
    expect(splitFoodQuery('sweet and sour chicken')).toEqual(['sweet and sour chicken'])
    expect(isMultiFood('dal and rice')).toBe(false) // no amounts: one dish as far as we can tell
  })

  test('trailing filler and stray punctuation are dropped', () => {
    expect(splitFoodQuery('poha, and ')).toEqual(['poha'])
    expect(splitFoodQuery('poha, tea.')).toEqual(['poha', 'tea'])
    expect(splitFoodQuery('   ')).toEqual([])
  })

  test('each food keeps the amount that was typed', () => {
    expect(foodsInQuery('2 rotis, 1 bowl rice')).toEqual([
      { text: '2 rotis', quantity: 2, unit: null, food: 'rotis' },
      { text: '1 bowl rice', quantity: 1, unit: 'bowl', food: 'rice' },
    ])
  })
})

describe('breakdown totals', () => {
  const roti = { name: 'Roti', per100g: { calories: 300, protein: 9 }, unitGrams: { piece: 40 } }
  const dal = { name: 'Dal', per100g: { calories: 100, protein: 6 }, unitGrams: { bowl: 200 } }

  test('adds up the rows that are still included', () => {
    const rows = [
      { item: roti, quantity: 2, unit: 'piece', removed: false },
      { item: dal, quantity: 1, unit: 'bowl', removed: false },
    ]
    expect(breakdownTotal(rows)).toMatchObject({ calories: 240 + 200, protein: 7 + 12 })
    rows[1].removed = true
    expect(breakdownTotal(rows).calories).toBe(240)
  })

  test('amounts read naturally', () => {
    expect(amountLabel(2, 'piece')).toBe('2 piece')
    expect(amountLabel(150, 'g')).toBe('150 g')
  })
})
