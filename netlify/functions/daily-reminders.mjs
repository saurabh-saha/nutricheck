// Scheduled email reminders (replaces the old Firebase sendDailyReminders,
// which was never scheduled). Runs at 10:00 and 20:00 India time.
//
// Needs these Netlify environment variables (Functions scope):
//   FIREBASE_SERVICE_ACCOUNT  service account JSON (secret)
//   GMAIL_USER, GMAIL_PASS    Gmail address + app password (secret)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { runReminders } from '../lib/reminders.mjs';

const getDb = () => {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getFirestore();
};

const makeSender = () => {
  const { GMAIL_USER, GMAIL_PASS } = process.env;
  if (!GMAIL_USER || !GMAIL_PASS) throw new Error('GMAIL_USER / GMAIL_PASS are not set');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
  return (to, subject, html) => transporter.sendMail({ from: `"🥗 NutriCheck" <${GMAIL_USER}>`, to, subject, html });
};

export default async () => {
  try {
    const result = await runReminders({ db: getDb(), send: makeSender() });
    console.log('Reminders:', JSON.stringify(result));
  } catch (err) {
    console.error('Reminders failed:', err.message);
  }
};

// 04:30 and 14:30 UTC = 10:00 and 20:00 IST
export const config = { schedule: '30 4,14 * * *' };
