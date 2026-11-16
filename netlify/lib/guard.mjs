// Access control for the Gemini function: Firebase login check, per-user /
// per-IP daily limits, a global daily cap, and a shared answer cache.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getStore } from '@netlify/blobs';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'nutricheck-f7e71';
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export const LIMITS = {
  user: Number(process.env.GEMINI_DAILY_LIMIT_USER) || 100,
  anon: Number(process.env.GEMINI_DAILY_LIMIT_ANON) || 15,
  global: Number(process.env.GEMINI_DAILY_LIMIT_GLOBAL) || 3000,
};

const ALLOWED_ORIGINS = [
  'https://nutrichecks.netlify.app',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];

// Netlify deploy previews/branch deploys + local dev
const isAllowedOrigin = (origin) =>
  !origin ||
  ALLOWED_ORIGINS.includes(origin) ||
  /^https:\/\/[a-z0-9-]+--nutrichecks\.netlify\.app$/.test(origin) ||
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

export const checkOrigin = (req) => isAllowedOrigin(req.headers.get('origin'));

// Returns the Firebase uid for a valid ID token, null if no token was sent.
// Throws if a token was sent but is invalid/expired.
export const verifyFirebaseUser = async (req) => {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });
  if (!payload.sub) throw new Error('Token has no subject');
  return payload.sub;
};

// ---- storage (Netlify Blobs, with an in-memory fallback for local tests) ----
const memory = new Map();
const memoryStore = {
  get: async (key, opts) => {
    const v = memory.get(key);
    return v === undefined ? null : opts?.type === 'json' ? JSON.parse(v) : v;
  },
  setJSON: async (key, value) => void memory.set(key, JSON.stringify(value)),
};

const stores = {};
const store = (name) => {
  if (stores[name]) return stores[name];
  try {
    stores[name] = getStore({ name, consistency: 'strong' });
  } catch (err) {
    if (err?.name !== 'MissingBlobsEnvironmentError') throw err;
    console.warn(`Netlify Blobs unavailable (${name}); using in-memory store`);
    stores[name] = memoryStore;
  }
  return stores[name];
};

const today = () => new Date().toISOString().slice(0, 10); // UTC day

const bump = async (key, limit) => {
  const usage = store('gemini-usage');
  const count = (await usage.get(key, { type: 'json' })) || 0;
  if (count >= limit) return false;
  await usage.setJSON(key, count + 1);
  return true;
};

// Counts one Gemini call. Returns null if allowed, or a reason string.
export const consumeQuota = async ({ uid, ip }) => {
  const day = today();
  const who = uid ? `user/${uid}` : `ip/${ip || 'unknown'}`;
  const limit = uid ? LIMITS.user : LIMITS.anon;
  if (!(await bump(`${day}/${who}`, limit))) {
    return uid
      ? `Daily limit of ${limit} AI lookups reached. It resets at midnight UTC.`
      : `Daily limit of ${limit} AI lookups reached. Log in for more.`;
  }
  if (!(await bump(`${day}/global`, LIMITS.global))) {
    return 'The app has reached its AI lookup limit for today. Please try again tomorrow.';
  }
  return null;
};

// ---- shared answer cache (text lookups only) ----
const cacheKey = async (parts) => {
  const data = new TextEncoder().encode(JSON.stringify(parts).toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const readCache = async (parts) => store('gemini-cache').get(await cacheKey(parts), { type: 'json' });
export const writeCache = async (parts, value) => store('gemini-cache').setJSON(await cacheKey(parts), value);
