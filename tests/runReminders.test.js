import { describe, expect, test } from 'vitest'
import { runReminders } from '../netlify/lib/reminders.mjs'

// Minimal firebase-admin Firestore stand-in: users, their intakeHistory, and
// the reminderLog markers, with create() failing when the doc already exists.
const makeDb = (users) => {
  const marks = new Set()
  const snap = (docs) => ({ docs, size: docs.length })
  return {
    marks,
    collection: (name) => {
      if (name !== 'users') throw new Error(`unexpected collection ${name}`)
      return {
        get: async () => snap(Object.entries(users).map(([id, u]) => ({ id, data: () => u.doc }))),
        doc: (uid) => ({
          get: async () => ({ data: () => users[uid].doc }),
          collection: (sub) => ({
            get: async () => snap((users[uid].history || []).map((d) => ({ data: () => d }))),
            doc: (key) => ({
              create: async () => {
                const full = `${uid}/${sub}/${key}`
                if (marks.has(full)) {
                  const err = new Error('entity already exists')
                  err.code = 6
                  throw err
                }
                marks.add(full)
              },
              delete: async () => void marks.delete(`${uid}/${sub}/${key}`),
            }),
          }),
        }),
      }
    },
  }
}

const evening = new Date('2026-11-24T14:30:00Z') // 20:00 IST
const user = (email) => ({ doc: { authInfo: { email }, recommendedIntake: { calories: 2000 } }, history: [] })

describe('runReminders delivers once', () => {
  test('a second run of the same schedule sends nothing', async () => {
    const db = makeDb({ u1: user('a@example.com') })
    const sentTo = []
    const send = async (to) => void sentTo.push(to)

    const first = await runReminders({ db, send, now: evening })
    expect(first).toMatchObject({ bucket: 'evening', eligible: 1, sent: 1, skipped: 0 })

    const second = await runReminders({ db, send, now: evening })
    expect(second).toMatchObject({ eligible: 1, sent: 0, skipped: 1 })
    expect(sentTo).toEqual(['a@example.com'])
  })

  test('two user docs with the same address get one email', async () => {
    const db = makeDb({ u1: user('a@example.com'), u2: user('A@Example.com ') })
    const sentTo = []
    await runReminders({ db, send: async (to) => void sentTo.push(to), now: evening })
    expect(sentTo).toEqual(['a@example.com'])
  })

  test('a failed send is not marked as delivered', async () => {
    const db = makeDb({ u1: user('a@example.com') })
    const failing = await runReminders({ db, send: async () => { throw new Error('smtp down') }, now: evening })
    expect(failing).toMatchObject({ sent: 0, skipped: 0 })
    expect(db.marks.size).toBe(0)

    const sentTo = []
    await runReminders({ db, send: async (to) => void sentTo.push(to), now: evening })
    expect(sentTo).toEqual(['a@example.com'])
  })

  test('a dry run claims nothing', async () => {
    const db = makeDb({ u1: user('a@example.com') })
    await runReminders({ db, send: async () => {}, now: evening, dryRun: true })
    expect(db.marks.size).toBe(0)
  })
})
