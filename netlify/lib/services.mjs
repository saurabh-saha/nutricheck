// Server-side Firebase Admin + Gmail sender, configured from Netlify env vars:
//   FIREBASE_SERVICE_ACCOUNT  service account JSON (or base64 of it)
//   GMAIL_USER, GMAIL_PASS    Gmail address + app password
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

export const getDb = () => {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getFirestore();
};

let transporter = null;
export const makeSender = () => {
  const { GMAIL_USER, GMAIL_PASS } = process.env;
  if (!GMAIL_USER || !GMAIL_PASS) throw new Error('GMAIL_USER / GMAIL_PASS are not set');
  transporter ||= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS.replace(/\s+/g, '') },
  });
  return (to, subject, html) => transporter.sendMail({ from: `"🥗 NutriCheck" <${GMAIL_USER}>`, to, subject, html });
};

export const isAdminEmail = (email) =>
  Boolean(email) && email.toLowerCase() === (process.env.GMAIL_USER || '').toLowerCase();
