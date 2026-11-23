// Server-side Gemini proxy. The API key lives only in Netlify (GEMINI_API_KEY)
// and never reaches the browser. Prompts are built here, so this endpoint
// can't be used as a general-purpose Gemini proxy.
import { extractJsonFromText } from '../../src/utils/extractJson.js';
import { describeServing, cleanPortionData } from '../../src/utils/units.js';
import { checkOrigin, verifyFirebaseUser, consumeQuota, readCache, writeCache, catalogPut } from '../lib/guard.mjs';
import { generate, hasAI } from '../lib/ai.mjs';
import { mealIdeas, missFixes, fixesRequest } from '../lib/advice.mjs';

const MAX_IMAGES = 3;
const MAX_ITEMS = 8; // foods in one search; longer lists are the AI guessing
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

// One object per food in a search that named several ("2 rotis, dal and rice").
const itemsPrompt = (text, foods) => `
Someone logged this meal: "${text}".
The app's rough guess at the separate foods: ${JSON.stringify(foods)}. It is only a hint: it may have missed a split ("rice and mixed veg" is two foods) or split a single dish.
Rules:
1. Return ONE object per food actually eaten, in the order they were written. A single dish gives a single object.
2. Correct the split if it is wrong: merge parts that are really one dish ("sweet and sour chicken"), and separate any food that was missed. Never invent a food that was not mentioned.
3. "name" is the dish name only, never the amount ("Roti", not "2 rotis").
4. "quantity" and "unit" are the amount eaten. Use what was written; when no amount was given, use the usual single serving in India.
5. "unit" is one of: "piece", "bowl", "plate", "cup", "g", "ml".
6. "nutrition" is for that food at that quantity and unit, not for the whole meal.
7. "per100g" is the same food per 100 g (or 100 ml for drinks).
8. "unitGrams" is the typical weight in grams of ONE bowl (~250 ml katori), ONE piece, ONE plate and ONE cup (~240 ml) of this food, as eaten in India.
9. "defaultUnit" is the most natural way to count this food.

For each food, include:
- name (string)
- quantity (number), unit (string)
- image (string): one of these file names ${JSON.stringify(IMAGES)}
- nutrition and per100g (objects in this format):
${jsonTemplate}
- unitGrams: {"bowl": int, "piece": int, "plate": int, "cup": int}
- defaultUnit: "piece" | "bowl" | "plate" | "cup"

Output: strictly a JSON array, one object per food, at most ${MAX_ITEMS}. All nutrition values must be integers. Use kcal for calories and grams (g) for everything else. JSON only, no extra text.`;

const nutritionPrompt = (serving) => `
Give a nutrition breakdown for the following serving: "${serving}".
Return strictly this JSON format:
${jsonTemplate}
All values must be integers. Use grams (g) for everything and kcal for calories. Do not include any units in the values.
Return only this JSON object, no explanations, no nested structures.`;

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!checkOrigin(req)) return json(403, { error: 'Forbidden' });

  let uid = null;
  try {
    uid = await verifyFirebaseUser(req);
  } catch {
    return json(401, { error: 'Your session expired. Please log in again.' });
  }

  if (!hasAI()) return json(500, { error: 'GEMINI_API_KEY is not configured' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { kind = 'suggestions' } = body || {};
  const beforeAI = () => consumeQuota({ uid, ip: context?.ip }).catch((err) => {
    console.error('Quota check failed, allowing request:', err.message);
    return null;
  });
  if (kind === 'ideas' || kind === 'fixes') {
    if (kind === 'fixes' && !fixesRequest(body).misses.length) return json(400, { error: 'Nothing to fix' });
    const { result, cached, blocked } = await (kind === 'ideas' ? mealIdeas : missFixes)(body, { beforeAI });
    if (blocked) return json(429, { error: blocked });
    return result ? json(200, { result, ...(cached ? { cached } : {}) }) : json(502, { error: 'AI service unavailable, please try again' });
  }
  // Up to 3 photos of the same meal; `image` is the older single-photo field.
  const images = (Array.isArray(body?.images) ? body.images : body?.image ? [body.image] : []).filter(Boolean);
  const dish = clean(body?.dish);
  const quantity = clean(body?.quantity, 10) || '1';
  const unit = clean(body?.unit, 20) || 'bowl';
  // A multi-food search sends the whole sentence plus the app's own split of it.
  const text = clean(body?.text, 300);
  const foods = (Array.isArray(body?.foods) ? body.foods : []).slice(0, MAX_ITEMS).map((f) => clean(f, 80)).filter(Boolean);

  if (!['suggestions', 'nutrition', 'items'].includes(kind)) return json(400, { error: 'Unknown kind' });
  if (kind !== 'items' && !dish && !images.length) return json(400, { error: 'Provide a dish or a photo' });
  if (kind === 'nutrition' && !dish) return json(400, { error: 'Provide a dish' });
  if (kind === 'items' && !text && !foods.length) return json(400, { error: 'Provide the meal text' });
  if (images.length > MAX_IMAGES) return json(400, { error: `Up to ${MAX_IMAGES} photos per search` });
  for (const image of images) {
    if (!ALLOWED_IMAGE_TYPES.includes(image?.mimeType)) return json(400, { error: 'Unsupported image type' });
    if (typeof image.data !== 'string' || image.data.length > MAX_IMAGE_BASE64) return json(413, { error: 'Photo too large' });
  }

  const serving = dish ? describeServing(quantity, unit, dish) : '';
  const prompt = kind === 'items' ? itemsPrompt(text || foods.join(', '), foods)
    : kind === 'nutrition' ? nutritionPrompt(serving)
    : suggestionsPrompt(dish, serving);
  const parts = [{ text: prompt }];
  if (kind === 'suggestions') {
    for (const image of images) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
  }

  // Same text lookup -> same answer for everyone, and no extra Gemini call.
  // Suggestions carry per-100 g data, so they're cached by dish alone and the
  // app rescales them for any amount. Bump the version when prompts change.
  const cacheParts = images.length ? null
    : kind === 'items' ? ['v3', kind, (text || foods.join(', ')).toLowerCase()]
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

  const parsed = await generate({ parts, parse: extractJsonFromText, label: kind });
  if (!parsed) return json(502, { error: 'AI service unavailable, please try again' });
  let result = parsed;
  if (kind === 'items' && Array.isArray(parsed)) {
    // Each food carries its own amount, so it can be logged as its own entry.
    result = parsed.slice(0, MAX_ITEMS).map(({ per100g, unitGrams, defaultUnit, quantity: q, unit: u, ...rest }) => ({
      ...rest,
      baseQuantity: Number(q) > 0 ? Number(q) : 1,
      baseUnit: clean(u, 20) || 'bowl',
      ...cleanPortionData({ per100g, unitGrams, defaultUnit }),
    }));
    await catalogPut(result).catch((err) => console.warn('Catalogue write failed:', err.message));
  }
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
};
