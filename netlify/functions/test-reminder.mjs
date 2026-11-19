// "Send me a test reminder" from Settings.
// - Builds the real, personalised email from the caller's own log (evening
//   version by default; send {"bucket": "morning"} for the other one).
// - Requires a logged-in Firebase user with a verified email.
// - Only ever emails that user's own address, max 3 per user per day.
// - If the caller is the admin (email == GMAIL_USER), also returns a dry run:
//   who would get the morning/evening reminders right now (counts only).
import { checkOrigin, verifyFirebaseToken, consumeDaily } from '../lib/guard.mjs';
import { getDb, makeSender, isAdminEmail } from '../lib/services.mjs';
import { runReminders, emailFor, loadHistory, zonedParts } from '../lib/reminders.mjs';
import * as advice from '../lib/advice.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!checkOrigin(req)) return json(403, { error: 'Forbidden' });

  let claims;
  try {
    claims = await verifyFirebaseToken(req);
  } catch {
    return json(401, { error: 'Your session expired. Please log in again.' });
  }
  if (!claims) return json(401, { error: 'Please log in first.' });
  if (!claims.email || claims.email_verified !== true) {
    return json(400, { error: 'Your account has no verified email address.' });
  }

  try {
    if (!(await consumeDaily(`test-reminder/${claims.sub}`, 3))) {
      return json(429, { error: 'You can send 3 test reminders a day. Try again tomorrow.' });
    }
  } catch (err) {
    console.error('Test reminder quota check failed:', err.message);
  }

  try {
    const send = makeSender();
    const db = getDb();
    const body = await req.json().catch(() => ({}));
    const bucket = body?.bucket === 'morning' ? 'morning' : 'evening';
    const { day: today, hour } = zonedParts(new Date());
    const [userSnap, history] = await Promise.all([db.collection('users').doc(claims.sub).get(), loadHistory(db, claims.sub)]);
    const user = { authInfo: { displayName: claims.name }, ...(userSnap.data() || {}) };
    // The real hour for the evening email decides "ideas for dinner"; the morning one plans breakfast.
    const { subject, html } = await emailFor({ user, history, bucket, today, hour: bucket === 'morning' ? 10 : Math.max(hour, 18), advice });
    await send(claims.email, `[Test] ${subject}`, html);

    let dryRun;
    if (isAdminEmail(claims.email)) {
      const [morning, evening] = await Promise.all([
        runReminders({ db, send, bucket: 'morning', dryRun: true }),
        runReminders({ db, send, bucket: 'evening', dryRun: true }),
      ]);
      dryRun = { morning, evening };
    }
    return json(200, { sentTo: claims.email, dryRun });
  } catch (err) {
    console.error('Test reminder failed:', err.message);
    const hint = /GMAIL|Invalid login|535|auth/i.test(err.message)
      ? 'Email login failed. Check GMAIL_USER and GMAIL_PASS (app password) in Netlify.'
      : /FIREBASE_SERVICE_ACCOUNT|credential|private key/i.test(err.message)
        ? 'Firebase admin setup failed. Check FIREBASE_SERVICE_ACCOUNT in Netlify.'
        : 'Sending failed. Check the function log in Netlify.';
    return json(500, { error: hint });
  }
};
