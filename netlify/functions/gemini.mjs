// Server-side Gemini proxy. The API key lives only in Netlify (GEMINI_API_KEY)
// and never reaches the browser. Prompts are built here, so this endpoint
// can't be used as a general-purpose Gemini proxy.
import { extractJsonFromText } from '../../src/utils/extractJson.js';
import { describeServing, cleanPortionData } from '../../src/utils/units.js';
import { checkOrigin, verifyFirebaseUser, consumeQuota, readCache, writeCache, catalogPut } from '../lib/guard.mjs';

const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const DEADLINE_MS = 9000; // stay under Netlify's synchronous function limit
const MAX_IMAGES = 3;
const MAX_IMAGE_BASE64 = 1_500_000; // per photo (~1.1 MB); body limit is 6 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGES = ['badfats.webp', 'calorie.webp', 'carbs.webp', 'fiber.webp', 'goodfats.jpg', 'minerals.jpg', 'protein.webp', 'vitamins.webp'];

// Keep in sync with nutrientMap in src/utils/nutritionTracker.js
const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'vitamins', 'minerals', 'fiber'];
const jsonTemplate = JSON.stringify(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])), null, 2);

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (v, max = 100) => String(v ?? '').replace(/["`\\]/g, '').slice(0, max).trim();

// `dish` is just the food name ("idli"); `serving` adds the amount for the nutrition.
const suggestionsPrompt = (dish, serving) => `
Create exactly 3 dish suggestions for ${serving ? `this serving: "${serving}"` : 'the meal in the photo(s)'}.
If photos are attached, they show the same meal (possibly from different angles or parts of the plate).
Rules:
1. ${dish
    ? `The FIRST suggestion's name MUST be exactly "${dish}". Do not modify, expand, or reinterpret it.`
    : 'Infer the most likely dish from the photo(s) and use it as the first suggestion.'}
2. The second and third suggestions should be close variants (different styles, toppings, ingredients).
3. Names are dish names only. Never put the quantity or unit in the name (write "Masala dosa", not "1 piece of Masala dosa").
4. "nutrition" is for the FULL serving described above (or what is visible in the image).
5. "per100g" is the same dish per 100 g (or 100 ml for drinks).
6. "unitGrams" is the typical weight in grams of ONE bowl (~250 ml katori), ONE piece, ONE plate and ONE cup (~240 ml) of this dish, as eaten in India. Give your best estimate for every unit, even unusual ones.
7. "defaultUnit" is the most natural way to count this dish: "piece" (eggs, roti, idli, fruit), "bowl" (dal, curry, rice), "plate" (biryani, thali), or "cup" (drinks).

For each suggestion, include:
- name (string)
- image (string): one of these file names ${JSON.stringify(IMAGES)}
- nutrition and per100g (objects in this format):
${jsonTemplate}
- unitGrams: {"bowl": int, "piece": int, "plate": int, "cup": int}
- defaultUnit: "piece" | "bowl" | "plate" | "cup"

Output: strictly a JSON array of 3 objects: [{"name": "...", "image": "...", "nutrition": {...}, "per100g": {...}, "unitGrams": {...}, "defaultUnit": "..."}, ...]
All nutrition values must be integers. Use kcal for calories, grams (g) for all other values. JSON only, no extra text.`;

const nutritionPrompt = (serving) => `
Give a nutrition breakdown for the following serving: "${serving}".
Return strictly this JSON format:
${jsonTemplate}
All values must be integers. Use grams (g) for everything and kcal for calories. Do not include any units in the values.
Return only this JSON object, no explanations, no nested structures.`;

// ---- "What to eat next": 3 ideas for the coming meal, from the day so far ----
const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];
const IDEA_UNITS = ['piece', 'bowl', 'plate', 'cup', 'g', 'ml'];
const NUM_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const numbers = (o) => Object.fromEntries(NUM_KEYS.map((k) => [k, Math.max(0, Math.round(Number(o?.[k]) || 0))]));
const names = (list) => (Array.isArray(list) ? list : []).slice(0, 10).map((n) => clean(n, 40)).filter(Boolean);

const ideasPrompt = ({ meal, eaten, targets, usual, today }) => {
  const left = Object.fromEntries(NUM_KEYS.map((k) => [k, Math.max(0, targets[k] - eaten[k])]));
  return `
You suggest what an Indian home cook should eat next. Be practical: everyday Indian dishes, normal portions.
Coming meal: ${meal}.
Eaten so far today: ${JSON.stringify(eaten)} (kcal and grams). ${today.length ? `Dishes: ${JSON.stringify(today)}.` : 'Nothing logged yet.'}
Daily targets: ${JSON.stringify(targets)}. Still left today: ${JSON.stringify(left)}.
Dishes this person often eats: ${usual.length ? JSON.stringify(usual) : 'unknown'}.
Rules:
1. Suggest exactly 3 dishes for ${meal}. Fit them within what is left today (a ${meal === 'snack' ? 'snack is small, ~150-300 kcal' : 'meal is a fair share of what is left'}).
2. If they have usual dishes, make the FIRST suggestion one of them (or a close, healthier twist) when it fits.
3. Use the others to cover gaps: if protein or fiber is far behind, favour dishes rich in it. ${meal === 'dinner' ? 'This is the last meal: cover what the day is missing.' : ''}
4. Don't repeat what they already ate today.
5. "why" is one short line (max 60 characters) saying what it covers, like "Adds 25 g protein you're short on".
6. "unit" is one of ${JSON.stringify(IDEA_UNITS)}; "quantity" is a number; "nutrition" is for that amount.
Output strictly JSON: {"ideas": [{"name": "...", "quantity": 1, "unit": "bowl", "why": "...", "nutrition": ${JSON.stringify(Object.fromEntries(NUM_KEYS.map((k) => [k, 0])))}}]}
Integers only. Names are dish names only, no amounts. JSON only.`;
};

const cleanIdeas = (parsed) => (Array.isArray(parsed?.ideas) ? parsed.ideas : Array.isArray(parsed) ? parsed : [])
  .filter((i) => i && typeof i.name === 'string' && i.nutrition)
  .slice(0, 3)
  .map((i) => ({
    name: clean(i.name, 60),
    quantity: Math.min(1000, Math.max(0.5, Number(i.quantity) || 1)),
    unit: IDEA_UNITS.includes(i.unit) ? i.unit : 'bowl',
    why: clean(i.why, 80),
    nutrition: numbers(i.nutrition),
    ...(MEALS.includes(i.meal) ? { meal: i.meal } : {}),
  }));

// ---- "Fix what you keep missing": 2-3 easy additions or swaps ----
const MISS_KEYS = ['fiber', 'protein', 'calories'];
const fixesPrompt = ({ misses, usual }) => `
You are a practical Indian nutrition coach. Over the last few days this person has been:
${misses.map((m) => m.kind === 'low'
    ? `- low on ${m.key}: about ${m.avg} g a day vs a goal of ${m.target} g`
    : `- over on calories: about ${m.avg} kcal a day vs a goal of ${m.target} kcal`).join('\n')}
Dishes they often eat: ${usual.length ? JSON.stringify(usual) : 'unknown'}.
Suggest exactly 3 small, specific, everyday Indian fixes that close these gaps, worst gap first.
- For a nutrient they lack: something easy to ADD to a meal (e.g. a bowl of sprouts chaat at snack, a cucumber-carrot salad at lunch).
- For too many calories: a lighter SWAP for one of their usual dishes.
Each fix: "name" (dish only), "quantity" (number), "unit" (one of ${JSON.stringify(IDEA_UNITS)}), "meal" (one of ${JSON.stringify(MEALS)}),
"why" (max 60 characters, with the number, e.g. "+8 g fiber, a third of your gap"), "nutrition" for that amount.
Output strictly JSON: {"fixes": [{"name": "...", "quantity": 1, "unit": "bowl", "meal": "snack", "why": "...", "nutrition": ${JSON.stringify(Object.fromEntries(NUM_KEYS.map((k) => [k, 0])))}}]}
Integers only. JSON only.`;

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

  const { kind = 'suggestions' } = body || {};
  if (kind === 'ideas') return handleIdeas(body, apiKey, uid, context);
  if (kind === 'fixes') return handleFixes(body, apiKey, uid, context);
  // Up to 3 photos of the same meal; `image` is the older single-photo field.
  const images = (Array.isArray(body?.images) ? body.images : body?.image ? [body.image] : []).filter(Boolean);
  const dish = clean(body?.dish);
  const quantity = clean(body?.quantity, 10) || '1';
  const unit = clean(body?.unit, 20) || 'bowl';

  if (!['suggestions', 'nutrition'].includes(kind)) return json(400, { error: 'Unknown kind' });
  if (!dish && !images.length) return json(400, { error: 'Provide a dish or a photo' });
  if (kind === 'nutrition' && !dish) return json(400, { error: 'Provide a dish' });
  if (images.length > MAX_IMAGES) return json(400, { error: `Up to ${MAX_IMAGES} photos per search` });
  for (const image of images) {
    if (!ALLOWED_IMAGE_TYPES.includes(image?.mimeType)) return json(400, { error: 'Unsupported image type' });
    if (typeof image.data !== 'string' || image.data.length > MAX_IMAGE_BASE64) return json(413, { error: 'Photo too large' });
  }

  const serving = dish ? describeServing(quantity, unit, dish) : '';
  const parts = [{ text: kind === 'nutrition' ? nutritionPrompt(serving) : suggestionsPrompt(dish, serving) }];
  if (kind === 'suggestions') {
    for (const image of images) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
  }

  // Same text lookup -> same answer for everyone, and no extra Gemini call.
  // Suggestions carry per-100 g data, so they're cached by dish alone and the
  // app rescales them for any amount. Bump the version when prompts change.
  const cacheParts = images.length ? null
    : kind === 'suggestions' ? ['v3', kind, dish.toLowerCase()]
    : ['v3', kind, dish, quantity, unit];
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
      const text = await callGemini(apiKey, model, parts, model === MODELS[0] ? Math.min(7000, remaining) : remaining);
      const parsed = extractJsonFromText(text);
      if (parsed) {
        let result = parsed;
        if (kind === 'suggestions' && Array.isArray(parsed)) {
          // Record the serving these numbers are for, keep only valid portion data,
          // and add the dishes to the shared catalogue.
          const baseQuantity = Number(quantity) || 1;
          result = parsed.map(({ per100g, unitGrams, defaultUnit, ...rest }) => ({
            ...rest, baseQuantity, baseUnit: unit, ...cleanPortionData({ per100g, unitGrams, defaultUnit }),
          }));
          await catalogPut(result).catch((err) => console.warn('Catalogue write failed:', err.message));
        }
        if (cacheParts) await writeCache(cacheParts, result).catch((err) => console.warn('Cache write failed:', err.message));
        return json(200, { result });
      }
      errors.push(`${model}: unparseable response`);
    } catch (err) {
      errors.push(err.name === 'TimeoutError' ? `${model}: timed out` : err.message);
    }
  }
  console.error('Gemini failed:', errors.join(' | '));
  return json(502, { error: 'AI service unavailable, please try again' });
};

async function handleIdeas(body, apiKey, uid, context) {
  const meal = MEALS.includes(body?.meal) ? body.meal : 'lunch';
  const input = { meal, eaten: numbers(body?.eaten), targets: numbers(body?.targets), usual: names(body?.usual), today: names(body?.today) };
  if (!input.targets.calories) input.targets = { calories: 2000, protein: 50, carbs: 260, fat: 70, fiber: 30 };

  // Same situation -> same ideas (round to 50 kcal / 5 g so near-identical days share an answer).
  const r = (n, step) => Math.round(n / step) * step;
  const cacheParts = ['v1', 'ideas', meal,
    ...NUM_KEYS.map((k) => r(input.eaten[k], k === 'calories' ? 50 : 5)),
    ...NUM_KEYS.map((k) => r(input.targets[k], k === 'calories' ? 50 : 5)),
    input.usual.join('|'), input.today.join('|')];
  try {
    const cached = await readCache(cacheParts);
    if (cached) return json(200, { result: cached, cached: true });
  } catch (err) {
    console.warn('Cache read failed:', err.message);
  }

  let blocked = null;
  try {
    blocked = await consumeQuota({ uid, ip: context?.ip });
  } catch (err) {
    console.error('Quota check failed, allowing request:', err.message);
  }
  if (blocked) return json(429, { error: blocked });

  const parts = [{ text: ideasPrompt(input) }];
  const deadline = Date.now() + DEADLINE_MS;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      const ideas = cleanIdeas(extractJsonFromText(await callGemini(apiKey, model, parts, model === MODELS[0] ? Math.min(7000, remaining) : remaining)));
      if (ideas.length) {
        await writeCache(cacheParts, ideas).catch((err) => console.warn('Cache write failed:', err.message));
        return json(200, { result: ideas });
      }
    } catch (err) {
      console.warn('Ideas failed:', err.message);
    }
  }
  return json(502, { error: 'AI service unavailable, please try again' });
}

async function handleFixes(body, apiKey, uid, context) {
  const misses = (Array.isArray(body?.misses) ? body.misses : []).slice(0, 3)
    .filter((m) => MISS_KEYS.includes(m?.key))
    .map((m) => ({ key: m.key, kind: m.kind === 'high' ? 'high' : 'low', avg: Math.max(0, Math.round(Number(m.avg) || 0)), target: Math.max(1, Math.round(Number(m.target) || 0)) }));
  if (!misses.length) return json(400, { error: 'Nothing to fix' });
  const usual = names(body?.usual);

  const r = (n) => Math.round(n / 5) * 5;
  const cacheParts = ['v1', 'fixes', ...misses.map((m) => `${m.key}:${m.kind}:${r(m.avg)}:${r(m.target)}`), usual.join('|')];
  try {
    const cached = await readCache(cacheParts);
    if (cached) return json(200, { result: cached, cached: true });
  } catch (err) {
    console.warn('Cache read failed:', err.message);
  }
  let blocked = null;
  try {
    blocked = await consumeQuota({ uid, ip: context?.ip });
  } catch (err) {
    console.error('Quota check failed, allowing request:', err.message);
  }
  if (blocked) return json(429, { error: blocked });

  const parts = [{ text: fixesPrompt({ misses, usual }) }];
  const deadline = Date.now() + DEADLINE_MS;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      const parsed = extractJsonFromText(await callGemini(apiKey, model, parts, model === MODELS[0] ? Math.min(7000, remaining) : remaining));
      const fixes = cleanIdeas({ ideas: parsed?.fixes ?? parsed }).map((f) => ({ meal: 'snack', ...f }));
      if (fixes.length) {
        await writeCache(cacheParts, fixes).catch((err) => console.warn('Cache write failed:', err.message));
        return json(200, { result: fixes });
      }
    } catch (err) {
      console.warn('Fixes failed:', err.message);
    }
  }
  return json(502, { error: 'AI service unavailable, please try again' });
}
