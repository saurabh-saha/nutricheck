// "Send me a test reminder" from Settings.
// - Requires a logged-in Firebase user with a verified email.
// - Only ever emails that user's own address, max 3 per user per day.
// - If the caller is the admin (email == GMAIL_USER), also returns a dry run:
//   who would get the morning/evening reminders right now (counts only).
import { checkOrigin, verifyFirebaseToken, consumeDaily } from '../lib/guard.mjs';
import { getDb, makeSender, isAdminEmail } from '../lib/services.mjs';
import { BUCKETS, runReminders } from '../lib/reminders.mjs';

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
    const bucket = BUCKETS.evening;
    await send(claims.email, `[Test] ${bucket.subject}`, bucket.html);

    let dryRun;
    if (isAdminEmail(claims.email)) {
      const db = getDb();
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
