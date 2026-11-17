// Gemini is called through the Netlify Function in netlify/functions/gemini.mjs.
// The API key stays on the server; nothing secret is bundled into the browser.
export { extractJsonFromText } from './extractJson.js';
import { auth } from './firebaseConfig';

const GEMINI_ENDPOINT = '/.netlify/functions/gemini';
const CLIENT_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 2500]; // before attempt 2 and 3 (plus jitter)
const MAX_IMAGE_SIDE = 1024;

// Downscale and re-encode the photo so the upload stays small (function body limit is 6 MB).
const imageToBase64Jpeg = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { data: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
};

const callGemini = async (payload) => {
  // Logged-in users get a higher daily limit; the server verifies this token.
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Gemini function failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data.result;
};

// Worth retrying: the AI was busy/slow or the network blipped. Not: bad input or limits.
const isTransient = (err) =>
  err.name === 'TimeoutError' || err.name === 'TypeError' || !err.status || err.status >= 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry transient failures with exponential backoff (+ jitter).
// onAttempt(n, max) is called before each try so the UI can say "try 2 of 3".
async function withRetries(fn, onAttempt) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onAttempt?.(attempt, MAX_ATTEMPTS);
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === MAX_ATTEMPTS) break;
      await sleep(BACKOFF_MS[attempt - 1] + Math.random() * 400);
    }
  }
  throw lastErr;
}

export const getNutritionFromGemini = async (dish, quantity = 1, unit = 'bowl') => {
  try {
    return await callGemini({ kind: 'nutrition', dish, quantity, unit });
  } catch (err) {
    console.error('Gemini error:', err);
    return null;
  }
};

// Throws an Error with a user-facing message and `transient` (true = AI busy / network).
// `photos`: up to 3 File objects of the same meal (or a single File, or null).
export const getDishSuggestionsFromGemini = async (dish, quantity, unit, photos, { onAttempt } = {}) => {
  const files = (Array.isArray(photos) ? photos : photos ? [photos] : []).slice(0, 3);
  const images = await Promise.all(files.map(imageToBase64Jpeg));
  try {
    const result = await withRetries(() => callGemini({ kind: 'suggestions', dish, quantity, unit, images }), onAttempt);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.error('Gemini error:', err);
    const transient = isTransient(err);
    const out = new Error(transient ? 'The AI is busy right now. Please try again in a moment.' : err.message);
    out.transient = transient;
    out.status = err.status;
    throw out;
  }
};
