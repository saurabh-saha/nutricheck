import { describe, expect, test, vi, afterEach } from 'vitest'
import { buildEmail, fallbackTip } from '../netlify/lib/reminders.mjs'
import { ideasInput, usualDishes, nextMeal } from '../src/utils/mealPlan.js'
import { generate } from '../netlify/lib/ai.mjs'

const today = '2026-11-19'
const e = (date, dish, meal, n) => ({ date, dish, meal, nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, ...n } })
const history = [
  e(today, '2 pieces of rotis', 'lunch', { calories: 400, protein: 12, fiber: 6 }),
  e(today, '1 bowl of poha', 'breakfast', { calories: 300, protein: 6, fiber: 3 }),
  e('2026-11-18', '1 bowl of poha', 'breakfast', { calories: 1800, protein: 20, fiber: 5 }),
  e('2026-11-17', '1 bowl of dal', 'dinner', { calories: 1900, protein: 25, fiber: 6 }),
]
const intake = { calories: 2000, protein: 60, carbs: 250, fat: 65, fiber: 30 }
const ideas = [{ name: 'Paneer bhurji <b>', quantity: 1, unit: 'bowl', why: 'Adds 18 g protein', nutrition: { calories: 280, protein: 18 } }]

describe('meal plan (shared by app and email)', () => {
  test('plans the next meal not logged yet', () => {
    expect(nextMeal([{ meal: 'breakfast' }], 9)).toBe('lunch')
    expect(nextMeal([{ meal: 'dinner' }], 20)).toBe(null)
  })
  test('usual dishes are ordered the same whatever the history order', () => {
    expect(usualDishes(history)).toEqual(usualDishes([...history].reverse()))
    expect(usualDishes(history, 'breakfast')[0]).toBe('poha')
  })
  test('ideas input matches what the app sends', () => {
    const input = ideasInput({ history, day: today, hour: 20, intake })
    expect(input).toMatchObject({ meal: 'dinner', eaten: { calories: 700, protein: 18, fiber: 9 }, today: ['poha', 'rotis'] })
  })
})

describe('reminder email', () => {
  test('evening: progress, what is missing, ideas with links, tip', () => {
    const { subject, html } = buildEmail({ bucket: 'evening', name: 'Saurabh Saha', today, hour: 20, history, intake, ideas, tip: 'Add curd to dinner: +8 g protein.' })
    expect(subject).toBe("You're 42 g short on protein today: ideas for dinner")
    expect(html).toContain('Hi Saurabh,')
    expect(html).toContain('Today so far')
    expect(html).toContain("What's missing")
    expect(html).toContain('Fiber lately:')
    expect(html).toContain('Paneer bhurji &lt;b&gt;') // AI text is escaped
    expect(html).toContain('q=Paneer+bhurji')
    expect(html).toContain('utm_source=email')
    expect(html).toContain('Add curd to dinner')
  })
  test('morning without AI still has a useful tip', () => {
    const { subject, html } = buildEmail({ bucket: 'morning', name: '', today, hour: 10, history: history.slice(2), intake })
    expect(subject).toBe('Fiber has been low this week: an easy fix inside')
    expect(html).toContain('2 of the last 7 days')
    expect(html).toContain('fiber')
  })
  test('fallback tip follows the biggest gap', () => {
    expect(fallbackTip({ gap: { key: 'protein' }, misses: [], meal: 'dinner' })).toMatch(/protein/)
    expect(fallbackTip({ gap: null, misses: [], meal: null })).toMatch(/Log right after/)
  })
})

describe('AI fallback', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  test('uses Groq when Gemini is out of quota', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'g'); vi.stubEnv('GROQ_API_KEY', 'q')
    const fetch = vi.fn(async (url) => url.includes('groq')
      ? new Response(JSON.stringify({ choices: [{ message: { content: '{"ok": 1}' } }] }))
      : new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 }))
    vi.stubGlobal('fetch', fetch)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = await generate({ parts: [{ text: 'hi' }], parse: (t) => JSON.parse(t) })
    expect(out).toEqual({ ok: 1 })
    expect(fetch.mock.calls.map(([u]) => (u.includes('groq') ? 'groq' : 'gemini'))).toEqual(['gemini', 'groq'])
  })
  test('without a Groq key it only tries Gemini', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'g'); vi.stubEnv('GROQ_API_KEY', '')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await generate({ parts: [{ text: 'hi' }], parse: (t) => t })).toBe(null)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
