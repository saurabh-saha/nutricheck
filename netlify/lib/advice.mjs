// Meal ideas, fixes for what someone keeps missing, and a one-line tip.
// Shared by the app (via the gemini function) and the reminder emails, with one
// cache: the same question gets the same answer in the email and in the app.
import { extractJsonFromText } from '../../src/utils/extractJson.js';
import { readCache, writeCache } from './guard.mjs';
import { generate } from './ai.mjs';

const clean = (v, max = 100) => String(v ?? '').replace(/["`\\]/g, '').slice(0, max).trim();
const DEFAULT_TARGETS = { calories: 2000, protein: 50, carbs: 260, fat: 70, fiber: 30 };

// ---- "What to eat next": 3 ideas for the coming meal, from the day so far ----
export const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];
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
export const MISS_KEYS = ['fiber', 'protein', 'calories'];
const fixesPrompt = ({ misses, usual }) => `
You are a practical Indian nutrition coach. Over the last few days this person has been:
${misses.map((m) => m.kind === 'low'
    ? `- low on ${m.key}: about ${m.avg} g a day vs a goal of ${m.target} g`
    : `- over on calories: about ${m.avg} kcal a day vs a goal of ${m.target} kcal`).join('\n')}
Dishes they often eat: ${usual.length ? JSON.stringify(usual) : 'unknown'}.
Suggest exactly 3 small, specific, everyday Indian fixes that close these gaps, worst gap first.
- For a nutrient they lack: something easy to ADD to a meal (e.g. a bowl of sprouts chaat at snack, a cucumber-carrot salad at lunch).
- For too many calories: a lighter SWAP for one of their usual dishes.
- Only fix the problems listed above. Every fix must clearly help one of them; no unrelated advice.
- "why" states only what this fix adds (or saves) for that nutrient, e.g. "+8 g fiber". Don't estimate fractions of the gap.
Each fix: "name" (dish only), "quantity" (number), "unit" (one of ${JSON.stringify(IDEA_UNITS)}), "meal" (one of ${JSON.stringify(MEALS)}),
"why" (max 60 characters, with the number, e.g. "+8 g fiber, a third of your gap"), "nutrition" for that amount.
Output strictly JSON: {"fixes": [{"name": "...", "quantity": 1, "unit": "bowl", "meal": "snack", "why": "...", "nutrition": ${JSON.stringify(Object.fromEntries(NUM_KEYS.map((k) => [k, 0])))}}]}
Integers only. JSON only.`;


// Cached answer, or ask the AI. `beforeAI` can veto the call (e.g. a quota): return a reason string.
async function cachedAnswer({ cacheParts, prompt, parse, beforeAI, label }) {
  try {
    const cached = await readCache(cacheParts);
    if (cached) return { result: cached, cached: true };
  } catch (err) {
    console.warn('Cache read failed:', err.message);
  }
  const blocked = beforeAI ? await beforeAI() : null;
  if (blocked) return { blocked };
  const result = await generate({ parts: [{ text: prompt }], parse: (t) => { const v = parse(extractJsonFromText(t)); return v?.length ? v : null; }, label });
  if (result) await writeCache(cacheParts, result).catch((err) => console.warn('Cache write failed:', err.message));
  return { result };
}

export function ideasRequest(raw) {
  const input = { meal: MEALS.includes(raw?.meal) ? raw.meal : 'lunch', eaten: numbers(raw?.eaten), targets: numbers(raw?.targets), usual: names(raw?.usual), today: names(raw?.today) };
  if (!input.targets.calories) input.targets = { ...DEFAULT_TARGETS };
  return input;
}

// 3 ideas for the coming meal. Input: { meal, eaten, targets, usual, today } (see src/utils/mealPlan.js).
export async function mealIdeas(raw, { beforeAI } = {}) {
  const input = ideasRequest(raw);
  // Same situation -> same ideas (round to 50 kcal / 5 g so near-identical days share an answer).
  const r = (n, step) => Math.round(n / step) * step;
  const cacheParts = ['v1', 'ideas', input.meal,
    ...NUM_KEYS.map((k) => r(input.eaten[k], k === 'calories' ? 50 : 5)),
    ...NUM_KEYS.map((k) => r(input.targets[k], k === 'calories' ? 50 : 5)),
    input.usual.join('|'), input.today.join('|')];
  return cachedAnswer({ cacheParts, prompt: ideasPrompt(input), parse: cleanIdeas, beforeAI, label: 'ideas' });
}

export function fixesRequest(raw) {
  const misses = (Array.isArray(raw?.misses) ? raw.misses : []).slice(0, 3)
    .filter((m) => MISS_KEYS.includes(m?.key))
    .map((m) => ({ key: m.key, kind: m.kind === 'high' ? 'high' : 'low', avg: Math.max(0, Math.round(Number(m.avg) || 0)), target: Math.max(1, Math.round(Number(m.target) || 0)) }));
  return { misses, usual: names(raw?.usual) };
}

// 2-3 easy fixes for nutrients missed over several days.
export async function missFixes(raw, { beforeAI } = {}) {
  const { misses, usual } = fixesRequest(raw);
  if (!misses.length) return { result: [] };
  const r = (n) => Math.round(n / 5) * 5;
  const cacheParts = ['v2', 'fixes', ...misses.map((m) => `${m.key}:${m.kind}:${r(m.avg)}:${r(m.target)}`), usual.join('|')];
  const parse = (parsed) => cleanIdeas({ ideas: parsed?.fixes ?? parsed }).map((f) => ({ meal: 'snack', ...f }));
  return cachedAnswer({ cacheParts, prompt: fixesPrompt({ misses, usual }), parse, beforeAI, label: 'fixes' });
}

// ---- one short, personal tip for the reminder email ----
const tipPrompt = ({ meal, eaten, targets, misses, usual, loggedToday }) => `
You are a warm, practical Indian nutrition coach writing ONE tip for a reminder email.
${loggedToday ? `Today so far: ${JSON.stringify(eaten)} of daily targets ${JSON.stringify(targets)} (kcal and grams).` : 'Nothing logged today yet.'}
${misses.length ? `Lately they keep missing: ${misses.map((m) => m.kind === 'low' ? `${m.key} (about ${m.avg} g vs ${m.target} g a day)` : `calories over (about ${m.avg} vs ${m.target} kcal)`).join('; ')}.` : 'No ongoing gaps lately.'}
Dishes they often eat: ${usual.length ? JSON.stringify(usual) : 'unknown'}.
Next meal: ${meal || 'tomorrow'}.
Write one specific, doable tip for ${meal ? `their ${meal}` : 'tomorrow'} that tackles their biggest gap, ideally by tweaking one of their usual dishes
(e.g. "Add a handful of roasted chana to your poha: +6 g protein for ~100 kcal"). Include a number. No greeting, no medical claims, max 130 characters.
Output strictly JSON: {"tip": "..."}`;

export async function personalTip(ctx) {
  const r = (n) => Math.round(n / 10) * 10;
  const cacheParts = ['v1', 'tip', ctx.meal || '-', ctx.loggedToday ? 1 : 0,
    ...['calories', 'protein', 'fiber'].map((k) => `${r(ctx.eaten?.[k] || 0)}/${r(ctx.targets?.[k] || 0)}`),
    ctx.misses.map((m) => `${m.key}:${m.kind}`).join(','), ctx.usual.join('|')];
  const parse = (p) => { const t = clean(p?.tip, 160); return t ? [t] : null; };
  const { result } = await cachedAnswer({ cacheParts, prompt: tipPrompt(ctx), parse, label: 'tip' });
  return result?.[0] ?? null;
}
