// Server-side Gemini proxy. The API key lives only in Netlify (GEMINI_API_KEY)
// and never reaches the browser. Prompts are built here, so this endpoint
// can't be used as a general-purpose Gemini proxy.
import { extractJsonFromText } from '../../src/utils/extractJson.js';
import { checkOrigin, verifyFirebaseUser, consumeQuota, readCache, writeCache } from '../lib/guard.mjs';

const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const DEADLINE_MS = 9000; // stay under Netlify's synchronous function limit
const MAX_IMAGE_BASE64 = 4_000_000; // ~3 MB image; request body limit is 6 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGES = ['badfats.webp', 'calorie.webp', 'carbs.webp', 'fiber.webp', 'goodfats.jpg', 'minerals.jpg', 'protein.webp', 'vitamins.webp'];

// Keep in sync with nutrientMap in src/utils/nutritionTracker.js
const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'vitamins', 'minerals', 'fiber'];
const jsonTemplate = JSON.stringify(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])), null, 2);

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (v, max = 100) => String(v ?? '').replace(/["`\\]/g, '').slice(0, max).trim();

const suggestionsPrompt = (serving) => `
Create exactly 3 dish suggestions based on "${serving || 'the dish in the image'}".
Rules:
1. If a dish name or any food like fruit, egg etc is provided, the FIRST suggestion MUST be EXACTLY the same string as the input.
   Do NOT modify, expand, or reinterpret it.
   Example: input "pomegranate" -> first name "pomegranate" (NOT "pomegranate seeds", NOT "pomegranate juice")
2. If only an image is provided, infer the most likely dish and use it as the first suggestion.
3. The second and third suggestions should be close variants (different styles, toppings, ingredients).

For each suggestion, include:
- name (string)
- image (string): one of these file names ${JSON.stringify(IMAGES)}
- nutrition (object in this format):
${jsonTemplate}

Output: strictly a JSON array of 3 objects: [{"name": "...", "image": "...", "nutrition": {...}}, ...]
All nutrition values must be integers. Use kcal for calories, grams (g) for all other values. JSON only, no extra text.`;

const nutritionPrompt = (serving) => `
Give a nutrition breakdown for the following serving: "${serving}".
Return strictly this JSON format:
${jsonTemplate}
All values must be integers. Use grams (g) for everything and kcal for calories. Do not include any units in the values.
Return only this JSON object, no explanations, no nested structures.`;

const callGemini = async (apiKey, model, parts, timeoutMs) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${model} ${res.status}: ${data?.error?.message || 'request failed'}`);
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
};

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!checkOrigin(req)) return json(403, { error: 'Forbidden' });

  let uid = null;
  try {
    uid = await verifyFirebaseUser(req);
  } catch {
    return json(401, { error: 'Your session expired. Please log in again.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY is not configured' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { kind = 'suggestions', image } = body || {};
  const dish = clean(body?.dish);
  const quantity = clean(body?.quantity, 10) || '1';
  const unit = clean(body?.unit, 20) || 'bowl';

  if (!['suggestions', 'nutrition'].includes(kind)) return json(400, { error: 'Unknown kind' });
  if (!dish && !image) return json(400, { error: 'Provide a dish or an image' });
  if (kind === 'nutrition' && !dish) return json(400, { error: 'Provide a dish' });
  if (image) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType)) return json(400, { error: 'Unsupported image type' });
    if (typeof image.data !== 'string' || image.data.length > MAX_IMAGE_BASE64) return json(413, { error: 'Image too large' });
  }

  const serving = dish ? `${quantity} ${unit} of ${dish}` : '';
  const parts = [{ text: kind === 'nutrition' ? nutritionPrompt(serving) : suggestionsPrompt(serving) }];
  if (image && kind === 'suggestions') parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

  // Same text lookup -> same answer for everyone, and no extra Gemini call.
  const cacheParts = image ? null : [kind, dish, quantity, unit];
  if (cacheParts) {
    try {
      const cached = await readCache(cacheParts);
      if (cached) return json(200, { result: cached, cached: true });
    } catch (err) {
      console.warn('Cache read failed:', err.message);
    }
  }

  let blocked = null;
  try {
    blocked = await consumeQuota({ uid, ip: context?.ip });
  } catch (err) {
    console.error('Quota check failed, allowing request:', err.message);
  }
  if (blocked) return json(429, { error: blocked });

  const deadline = Date.now() + DEADLINE_MS;
  const errors = [];
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      const text = await callGemini(apiKey, model, parts, model === MODELS[0] ? Math.min(6000, remaining) : remaining);
      const parsed = extractJsonFromText(text);
      if (parsed) {
        if (cacheParts) await writeCache(cacheParts, parsed).catch((err) => console.warn('Cache write failed:', err.message));
        return json(200, { result: parsed });
      }
      errors.push(`${model}: unparseable response`);
    } catch (err) {
      errors.push(err.name === 'TimeoutError' ? `${model}: timed out` : err.message);
    }
  }
  console.error('Gemini failed:', errors.join(' | '));
  return json(502, { error: 'AI service unavailable, please try again' });
};
