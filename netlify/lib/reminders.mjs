// Reminder rules and email templates. Pure logic: Firestore and the mailer
// are passed in, so this can be tested without real services.

export const TIME_ZONE = 'Asia/Kolkata';
export const DEFAULT_CALORIES = 2000;
export const LOW_INTAKE_RATIO = 0.6;
const APP_URL = process.env.URL || 'https://nutrichecks.netlify.app';

// YYYY-MM-DD and hour in the reminder time zone.
export const zonedParts = (date, timeZone = TIME_ZONE) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
};

const page = (body) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #0f172a; color: #f1f5f9; padding: 20px; border-radius: 12px;">
  <header style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 2.5rem;">🥗</span>
    <h1 style="font-size: 1.8rem; font-weight: bold; margin: 0; color: #ffffff;">NutriCheck</h1>
  </header>
  ${body}
  <div style="text-align: center; margin-top: 20px;">
    <a href="${APP_URL}/track" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open NutriCheck</a>
  </div>
  <footer style="margin-top: 30px; font-size: 0.85rem; color: #64748b; text-align: center;">
    Don't want these emails? <a href="${APP_URL}/settings" style="color: #94a3b8;">Turn off reminders in Settings</a>.<br/>
    NutriCheck gives estimates, not medical advice.
  </footer>
</div>`;

export const BUCKETS = {
  morning: {
    hour: 10,
    subject: 'Time to log your nutrition',
    html: page(`<p style="font-size: 1rem;">Good morning! ☀️ Looks like you didn't log anything yesterday. Let's start today fresh and keep your health on track!</p>
      <p style="font-style: italic; color: #94a3b8;">Consistency is key for your nutrition goals.</p>`),
    // Nothing logged yesterday.
    shouldSend: ({ entries }) => entries.length === 0,
    dayOffset: -1,
  },
  evening: {
    hour: 20,
    subject: "You're running low on fuel 🔋",
    html: page(`<p style="font-size: 1rem;">Hey there! You've logged less than you need today. Add what you've eaten, or fuel up and keep going strong! 💪</p>
      <p style="font-style: italic; color: #94a3b8;">Tracking your nutrition helps you stay energized and healthy.</p>`),
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

/**
 * @param db      Firestore (firebase-admin) instance
 * @param send    async (to, subject, html) => void
 * @param now     Date
 * @param bucket  optional override ('morning' | 'evening'), e.g. for a manual run
 * @param dryRun  work out recipients without sending
 */
export async function runReminders({ db, send, now = new Date(), bucket: forced = null, dryRun = false }) {
  const { day: today, hour } = zonedParts(now);
  const bucketName = forced || bucketForHour(hour);
  if (!bucketName) return { skipped: `No reminders at ${hour}:00 ${TIME_ZONE}` };

  const bucket = BUCKETS[bucketName];
  const day = shiftDay(today, bucket.dayOffset);
  const users = await db.collection('users').get();

  const recipients = [];
  for (const userDoc of users.docs) {
    try {
      const user = userDoc.data() || {};
      const email = user.authInfo?.email;
      if (!email || user.reminders?.email === false) continue;
      const snap = await db.collection('users').doc(userDoc.id)
        .collection('intakeHistory').where('date', '==', day).get();
      const entries = snap.docs.map((d) => d.data());
      if (bucket.shouldSend({ entries, targetCalories: user.recommendedIntake?.calories })) recipients.push(email);
    } catch (err) {
      console.error(`Reminder check failed for ${userDoc.id}:`, err.message);
    }
  }

  let sent = 0;
  if (!dryRun) {
    for (const to of recipients) {
      try {
        await send(to, bucket.subject, bucket.html);
        sent++;
      } catch (err) {
        console.error('Reminder email failed:', err.message);
      }
    }
  }
  return { bucket: bucketName, day, users: users.size, eligible: recipients.length, sent, dryRun };
}
