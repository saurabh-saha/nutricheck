import { describe, expect, test } from 'vitest'
import { segmentOf, cadenceAllows, buildEmail, runReminders } from '../netlify/lib/reminders.mjs'

const today = '2026-11-27'
const e = (date) => ({ date, dish: 'dal', meal: 'lunch', nutrition: { calories: 400, protein: 10, fiber: 3 } })

describe('segments', () => {
  test('by the last day anything was logged', () => {
    expect(segmentOf({ history: [], today }).segment).toBe('never')
    expect(segmentOf({ history: [e('2026-11-25')], today })).toMatchObject({ segment: 'active', daysSince: 2 })
    expect(segmentOf({ history: [e('2026-11-20')], today })).toMatchObject({ segment: 'lapsed', daysSince: 7 })
    expect(segmentOf({ history: [e('2026-10-01')], today }).segment).toBe('dormant')
  })
})

describe('how often', () => {
  const plan = (o) => cadenceAllows({ today, bucketName: 'morning', lastLog: null, ...o })

  test('active users keep both reminders', () => {
    expect(plan({ segment: 'active', bucketName: 'evening' }).send).toBe(true)
    expect(plan({ segment: 'active', sentDays: ['2026-11-26'] }).send).toBe(true)
  })
  test('everyone else only gets the morning one', () => {
    expect(plan({ segment: 'lapsed', bucketName: 'evening' }).send).toBe(false)
    expect(plan({ segment: 'never', bucketName: 'evening' }).send).toBe(false)
  })
  test('a new sign-up is left alone for a day', () => {
    expect(plan({ segment: 'never', createdDay: today }).send).toBe(false)
    expect(plan({ segment: 'never', createdDay: '2026-11-26' }).send).toBe(true)
  })
  test('each unanswered reminder waits longer: 3, 7, 14 days, then stop', () => {
    expect(plan({ segment: 'never', sentDays: ['2026-11-25'] }).send).toBe(false)           // 2 days after the 1st
    expect(plan({ segment: 'never', sentDays: ['2026-11-24'] }).send).toBe(true)            // 3 days
    expect(plan({ segment: 'never', sentDays: ['2026-11-10', '2026-11-24'] }).send).toBe(false) // 3 days after the 2nd: needs 7
    expect(plan({ segment: 'never', sentDays: ['2026-11-01', '2026-11-10', '2026-11-19'] }).send).toBe(false) // needs 14
    expect(plan({ segment: 'never', sentDays: ['2026-10-01', '2026-10-05', '2026-10-15', '2026-11-01'] })).toMatchObject({ send: false, reason: 'stopped until they log again' })
  })
  test('logging again resets the count', () => {
    const sentDays = ['2026-10-01', '2026-10-05', '2026-10-15', '2026-11-01']
    expect(plan({ segment: 'lapsed', lastLog: '2026-11-15', sentDays }).send).toBe(true)
  })
})

describe('copy for people who are not logging', () => {
  const intake = { calories: 2000, protein: 60, carbs: 250, fat: 65, fiber: 30 }
  test('someone who never logged is welcomed, not told a day slipped by', () => {
    const { subject, html } = buildEmail({ bucket: 'morning', name: 'Asha', today, hour: 10, history: [], intake })
    expect(subject).toBe('Log your first meal in 10 seconds')
    expect(html).toContain('2 rotis and dal')
    expect(html).not.toContain('slipped')
    expect(html).toContain('only send a few of these')
  })
  test('someone who drifted is told how long, with no stale "low this week" claim', () => {
    const { subject, html } = buildEmail({ bucket: 'morning', name: 'Asha', today, hour: 10, history: [e('2026-11-18')], intake })
    expect(subject).toBe("It's been 9 days: pick up with one meal")
    expect(html).not.toContain('lately')
  })
  test('active users keep the original copy and no taper note', () => {
    const { html } = buildEmail({ bucket: 'morning', name: 'Asha', today, hour: 10, history: [e('2026-11-24')], intake })
    expect(html).toContain('Yesterday slipped by')
    expect(html).not.toContain('only send a few of these')
  })
})

// A person who never logs: how many emails do they get over two months of daily runs?
describe('over time', () => {
  test('a never-logger gets a handful of emails, not 120', async () => {
    const marks = new Set()
    const db = {
      collection: () => ({
        get: async () => ({ size: 1, docs: [{ id: 'u1', data: () => ({ authInfo: { email: 'a@example.com' }, createdAt: new Date('2026-10-01T05:00:00Z') }) }] }),
        doc: () => ({
          collection: (sub) => ({
            get: async () => ({ docs: sub === 'reminderLog' ? [...marks].map((m) => ({ id: m, data: () => ({}) })) : [] }),
            doc: (key) => ({ create: async () => { marks.add(key) }, delete: async () => void marks.delete(key) }),
          }),
        }),
      }),
    }
    let sent = 0
    for (let d = 0; d < 60; d++) {
      for (const hourUtc of [4, 14]) {
        const now = new Date(Date.UTC(2026, 9, 2 + d, hourUtc, 30))
        const r = await runReminders({ db, send: async () => {}, now })
        sent += r.sent || 0
      }
    }
    expect(sent).toBe(4)
  })
})
