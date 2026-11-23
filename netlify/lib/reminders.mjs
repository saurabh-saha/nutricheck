// Reminder rules and the personalised email. Firestore, the mailer and the AI
// are passed in, so the email can be built and tested without them.
import { criticalMisses } from '../../src/utils/misses.js';
import { ideasInput, usualDishes, eatenOf } from '../../src/utils/mealPlan.js';
import { unitInfo, isMeasure } from '../../src/utils/units.js';

export const TIME_ZONE = 'Asia/Kolkata';
export const DEFAULT_CALORIES = 2000;
export const LOW_INTAKE_RATIO = 0.6;
const DEFAULT_INTAKE = { calories: 2000, protein: 50, fat: 70, carbs: 260, fiber: 30 };
const APP_URL = process.env.URL || 'https://nutrichecks.netlify.app';
const AI_BUDGET_MS = 18000; // scheduled functions stop at 30 s; later emails go out without AI extras
const CONCURRENCY = 4;

// YYYY-MM-DD and hour in the reminder time zone.
export const zonedParts = (date, timeZone = TIME_ZONE) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
};

export const BUCKETS = {
  morning: {
    hour: 10,
    // Nothing logged yesterday.
    shouldSend: ({ entries }) => entries.length === 0,
    dayOffset: -1,
  },
  evening: {
    hour: 20,
    // Today's total is under 60% of the person's calorie goal (or nothing logged).
    shouldSend: ({ entries, targetCalories }) => {
      const total = entries.reduce((sum, e) => sum + (Number(e?.nutrition?.calories) || 0), 0);
      return total < (Number(targetCalories) || DEFAULT_CALORIES) * LOW_INTAKE_RATIO;
    },
    dayOffset: 0,
  },
};

export const bucketForHour = (hour) =>
  Object.entries(BUCKETS).find(([, b]) => b.hour === hour)?.[0] || null;

const shiftDay = (day, offset) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ---------- email content ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = (n) => Math.round(Number(n) || 0);
const fmt = (n) => round(n).toLocaleString('en-IN');
const amount = (q, unit) => (isMeasure(unit) ? `${q} ${unit}` : `${q} ${(unitInfo(unit)?.label ?? unit).toLowerCase()}${q > 1 ? 's' : ''}`);
const MEAL_LABEL = { breakfast: 'breakfast', lunch: 'lunch', snack: 'a snack', dinner: 'dinner' };
const CAP = { protein: 'Protein', fiber: 'Fiber', calories: 'Calories' };

const link = (bucket, content, params = {}) => {
  const q = new URLSearchParams({ ...params, utm_source: 'email', utm_medium: 'reminder', utm_campaign: bucket, utm_content: content });
  return `${APP_URL}/?${q}`;
};

// Today's biggest shortfall among protein and fiber (under 60% of the goal).
const todayGap = (eaten, intake) => ['protein', 'fiber']
  .map((key) => ({ key, have: round(eaten[key]), target: round(intake[key]), pct: intake[key] ? eaten[key] / intake[key] : 1 }))
  .filter((g) => g.target > 0 && g.pct < 0.6)
  .sort((a, b) => a.pct - b.pct)[0] || null;

// Used when the AI couldn't write a tip.
export function fallbackTip({ gap, misses, meal }) {
  const when = meal ? `at ${meal === 'snack' ? 'snack time' : meal}` : 'tomorrow';
  const key = gap?.key || misses.find((m) => m.kind === 'low')?.key;
  if (key === 'protein') return `Add a bowl of curd or a katori of chana ${when}: about +10 g protein.`;
  if (key === 'fiber') return `Add a cucumber-carrot salad ${when}: about +4 g fiber for under 50 kcal.`;
  if (misses.some((m) => m.kind === 'high')) return 'Swap one roti for a bowl of salad: saves about 100 kcal without leaving you hungry.';
  return 'Log right after you eat. It takes 10 seconds and the day adds up on its own.';
}

const bar = (label, have, target, unit, color) => {
  const pct = target > 0 ? Math.min(100, Math.round((have / target) * 100)) : 0;
  return `
    <tr><td style="padding:6px 0 2px;font-size:13px;color:#334155;">${label}</td>
        <td style="padding:6px 0 2px;font-size:13px;color:#334155;text-align:right;"><b>${fmt(have)}</b> / ${fmt(target)} ${unit}</td></tr>
    <tr><td colspan="2" style="padding:0 0 4px;">
      <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
        <div style="height:8px;width:${pct}%;background:${color};border-radius:99px;"></div>
      </div></td></tr>`;
};

const section = (title, body, { bg = '#ffffff', border = '#e2e8f0' } = {}) => `
  <div style="margin-top:16px;background:${bg};border:1px solid ${border};border-radius:16px;padding:16px;">
    <div style="font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">${title}</div>
    ${body}
  </div>`;

/**
 * Builds { subject, html } for one person.
 * history: all their logged entries; ideas / fixes / tip: AI extras (optional).
 */
export function buildEmail({ bucket, name, today, hour, history, intake: rawIntake, ideas = [], fixes = [], tip = null }) {
  const intake = { ...DEFAULT_INTAKE, ...(rawIntake || {}) };
  const todayEntries = history.filter((e) => e.date === today);
  const eaten = eatenOf(todayEntries);
  const misses = criticalMisses(history, intake, new Date(`${today}T12:00:00`));
  const meal = ideasInput({ history, day: today, hour, intake })?.meal ?? null;
  const mealLabel = MEAL_LABEL[meal] || 'your next meal';
  const logged = todayEntries.length > 0;
  const gap = bucket === 'evening' && logged ? todayGap(eaten, intake) : null;
  const first = String(name || '').trim().split(/\s+/)[0];
  const hi = first ? `Hi ${esc(first)},` : 'Hi there,';
  const last7 = new Set(history.map((e) => e.date).filter((d) => d < today && d >= shiftDay(today, -7))).size;

  // ---- subject + opening line ----
  let subject; let intro;
  if (bucket === 'evening' && logged) {
    const left = Math.max(0, round(intake.calories - eaten.calories));
    subject = gap
      ? `You're ${fmt(gap.target - gap.have)} g short on ${gap.key} today: ${ideas.length ? `ideas for ${mealLabel}` : 'an easy fix inside'}`
      : `${fmt(eaten.calories)} of ${fmt(intake.calories)} kcal so far${ideas.length ? `: ideas for ${mealLabel}` : ''}`;
    intro = `You've logged <b>${fmt(eaten.calories)} kcal</b> today, with <b>${fmt(left)} kcal</b> still to go. Here's how the day looks and what would round it off.`;
  } else if (bucket === 'evening') {
    subject = ideas.length ? `Nothing logged today? ${ideas.length} easy ideas for ${mealLabel}` : 'Nothing logged today yet';
    intro = 'Nothing\'s logged for today yet. Add what you ate in a few seconds (just type it, like "2 rotis and dal"), or pick an idea below.';
  } else {
    subject = misses[0]
      ? `${misses[0].kind === 'low' ? `${CAP[misses[0].key]} has been low` : "You've been running over"} this week: an easy fix inside`
      : `Fresh start today: ${ideas.length ? `ideas for ${mealLabel}` : 'log your first meal'}`;
    intro = last7
      ? `Yesterday slipped by without a log. No worries: you've logged <b>${last7} of the last 7 days</b>, and today's a fresh start.`
      : 'Yesterday slipped by without a log. Today\'s a fresh start: just type what you eat, like "2 rotis and dal".';
  }

  const parts = [`<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#0f172a;">${hi}</p>
    <p style="margin:0;font-size:15px;line-height:1.5;color:#334155;">${intro}</p>`];

  // ---- today so far ----
  if (bucket === 'evening' && logged) {
    parts.push(section('Today so far', `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${bar('Calories', eaten.calories, intake.calories, 'kcal', '#3b82f6')}
      ${bar('Protein', eaten.protein, intake.protein, 'g', '#10b981')}
      ${bar('Fiber', eaten.fiber, intake.fiber, 'g', '#f59e0b')}
    </table>`));
  }

  // ---- what's missing (today's gap + what the app's "Needs attention" card shows) ----
  const missingLines = [];
  if (gap) missingLines.push(`<b>${CAP[gap.key]} today:</b> ${gap.have} of ${gap.target} g`);
  for (const m of misses) {
    if (gap && m.key === gap.key) continue;
    missingLines.push(m.kind === 'low'
      ? `<b>${CAP[m.key]} lately:</b> about ${m.avg} g a day vs your ${m.target} g goal`
      : `<b>Calories lately:</b> about ${fmt(m.avg)} kcal a day vs your ${fmt(m.target)} goal`);
  }
  if (missingLines.length) {
    const fixList = fixes.slice(0, 2).map((f) => `<li style="margin:4px 0;">${esc(amount(f.quantity, f.unit))} ${esc(f.name.charAt(0).toLowerCase() + f.name.slice(1))} at ${esc(f.meal)}${f.why ? ` <span style="color:#047857;">(${esc(f.why)})</span>` : ''}</li>`).join('');
    parts.push(section("What's missing",
      `${missingLines.map((l) => `<p style="margin:0 0 6px;font-size:14px;color:#334155;">${l}</p>`).join('')}
       ${fixList ? `<p style="margin:10px 0 2px;font-size:13px;font-weight:bold;color:#92400e;">Easy fixes</p><ul style="margin:0;padding-left:18px;font-size:14px;color:#334155;">${fixList}</ul>` : ''}`,
      { bg: '#fffbeb', border: '#fde68a' }));
  }

  // ---- ideas: the same ones the app's home page shows ----
  if (ideas.length) {
    const cards = ideas.map((idea, i) => `
      <a href="${esc(link(bucket, `idea${i + 1}`, { q: idea.name, qty: idea.quantity, unit: idea.unit }))}" style="display:block;text-decoration:none;margin-top:8px;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td style="font-size:15px;font-weight:bold;color:#0f172a;">${esc(idea.name)}</td>
          <td style="text-align:right;font-size:13px;font-weight:bold;color:#2563eb;white-space:nowrap;">Add &rarr;</td></tr></table>
        <div style="font-size:13px;color:#64748b;margin-top:2px;">${esc(amount(idea.quantity, idea.unit))} &middot; ${fmt(idea.nutrition?.calories)} kcal &middot; ${fmt(idea.nutrition?.protein)} g protein</div>
        ${idea.why ? `<div style="font-size:13px;color:#047857;margin-top:4px;">${esc(idea.why)}</div>` : ''}
      </a>`).join('');
    parts.push(section(`Ideas for ${mealLabel}`, `<p style="margin:0;font-size:13px;color:#64748b;">Picked from your day and what you usually eat. Tap one to add it.</p>${cards}`, { bg: '#f8fafc' }));
  }

  // ---- tip ----
  const tipText = tip || fallbackTip({ gap, misses, meal });
  parts.push(section('💡 Tip for you', `<p style="margin:0;font-size:15px;line-height:1.5;color:#065f46;">${esc(tipText)}</p>`, { bg: '#ecfdf5', border: '#a7f3d0' }));

  const html = `
<div style="background:#f1f5f9;padding:16px 8px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:20px;">
    <div style="font-size:16px;font-weight:bold;color:#0f172a;margin-bottom:16px;">🥗 NutriCheck</div>
    ${parts.join('\n')}
    <div style="text-align:center;margin-top:20px;">
      <a href="${esc(link(bucket, 'button'))}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">${bucket === 'evening' && logged ? 'Log the rest of today' : 'Open NutriCheck'}</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
      Don't want these? <a href="${APP_URL}/settings" style="color:#64748b;">Turn off reminders in Settings</a>.<br/>
      NutriCheck gives estimates, not medical advice.
    </p>
  </div>
</div>`;
  return { subject, html };
}

// ---------- per-person data + AI extras ----------
export const loadHistory = async (db, uid) =>
  (await db.collection('users').doc(uid).collection('intakeHistory').get()).docs.map((d) => d.data());

/**
 * The email for one person. With `advice` ({ mealIdeas, missFixes, personalTip }
 * from netlify/lib/advice.mjs) it adds meal ideas, fixes and an AI tip.
 */
export async function emailFor({ user, history, bucket, today, hour, advice = null }) {
  const intake = { ...DEFAULT_INTAKE, ...(user.recommendedIntake || {}) };
  const base = { bucket, name: user.authInfo?.displayName, today, hour, history, intake: user.recommendedIntake };
  if (!advice) return buildEmail(base);

  // Same inputs as the app's MealIdeas / MissesCard, so the answers are shared from the cache.
  const input = ideasInput({ history, day: today, hour, intake: user.recommendedIntake || DEFAULT_INTAKE });
  const misses = criticalMisses(history, intake, new Date(`${today}T12:00:00`));
  const todayEntries = history.filter((e) => e.date === today);
  const [ideas, fixes, tip] = await Promise.all([
    input ? advice.mealIdeas(input).then((r) => r.result || []).catch(() => []) : [],
    misses.length ? advice.missFixes({ misses, usual: usualDishes(history) }).then((r) => r.result || []).catch(() => []) : [],
    advice.personalTip({
      meal: input?.meal ?? null, eaten: eatenOf(todayEntries), targets: intake, misses,
      usual: usualDishes(history, input?.meal), loggedToday: todayEntries.length > 0,
    }).catch(() => null),
  ]);
  return buildEmail({ ...base, ideas, fixes, tip });
}

// One email per person, per day, per bucket. `create()` fails if the marker is
// already there, so a second run of the same schedule (Netlify retries a
// scheduled function, a redeploy fires it again) sends nothing. The marker is
// removed if the send itself fails, so the next run can still deliver.
const reminderMark = (db, uid, today, bucketName) =>
  db.collection('users').doc(uid).collection('reminderLog').doc(`${today}-${bucketName}`);

const claimSend = async (db, uid, today, bucketName) => {
  try {
    await reminderMark(db, uid, today, bucketName).create({ sentAt: new Date().toISOString() });
    return true;
  } catch (err) {
    if (err?.code === 6 || /ALREADY_EXISTS|already exists/i.test(err?.message || '')) return false;
    throw err;
  }
};

const releaseSend = (db, uid, today, bucketName) =>
  reminderMark(db, uid, today, bucketName).delete().catch(() => {});

/**
 * @param db      Firestore (firebase-admin) instance
 * @param send    async (to, subject, html) => void
 * @param advice  AI helpers (optional; without them the email skips ideas/fixes and uses a built-in tip)
 * @param now     Date
 * @param bucket  optional override ('morning' | 'evening'), e.g. for a manual run
 * @param dryRun  work out recipients without sending
 */
export async function runReminders({ db, send, advice = null, now = new Date(), bucket: forced = null, dryRun = false }) {
  const { day: today, hour } = zonedParts(now);
  const bucketName = forced || bucketForHour(hour);
  if (!bucketName) return { skipped: `No reminders at ${hour}:00 ${TIME_ZONE}` };

  const bucket = BUCKETS[bucketName];
  const day = shiftDay(today, bucket.dayOffset);
  const users = await db.collection('users').get();

  const recipients = [];
  const seenEmails = new Set();
  for (const userDoc of users.docs) {
    try {
      const user = userDoc.data() || {};
      const email = user.authInfo?.email;
      if (!email || user.reminders?.email === false) continue;
      // Two user docs can share an address (e.g. Google and password sign-in).
      const key = email.trim().toLowerCase();
      if (seenEmails.has(key)) continue;
      const history = await loadHistory(db, userDoc.id);
      const entries = history.filter((e) => e.date === day);
      if (bucket.shouldSend({ entries, targetCalories: user.recommendedIntake?.calories })) {
        seenEmails.add(key);
        recipients.push({ uid: userDoc.id, email, user, history });
      }
    } catch (err) {
      console.error(`Reminder check failed for ${userDoc.id}:`, err.message);
    }
  }

  let sent = 0;
  let skipped = 0;
  if (!dryRun) {
    const aiUntil = Date.now() + AI_BUDGET_MS;
    const queue = [...recipients];
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        let claimed = false;
        try {
          claimed = await claimSend(db, r.uid, today, bucketName);
          if (!claimed) {
            skipped++;
            console.log(`Reminder already sent to ${r.uid} for ${today} ${bucketName}`);
            continue;
          }
          const useAI = advice && Date.now() < aiUntil ? advice : null;
          const { subject, html } = await emailFor({ user: r.user, history: r.history, bucket: bucketName, today, hour, advice: useAI });
          await send(r.email, subject, html);
          sent++;
        } catch (err) {
          if (claimed) await releaseSend(db, r.uid, today, bucketName);
          console.error('Reminder email failed:', err.message);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }
  return { bucket: bucketName, day, users: users.size, eligible: recipients.length, sent, skipped, dryRun };
}
