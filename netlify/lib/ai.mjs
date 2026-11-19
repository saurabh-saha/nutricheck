// One way to ask the AI for JSON: Gemini first, Groq as the backup when Gemini
// is out of quota, down or slow. Keys live only in Netlify env vars:
//   GEMINI_API_KEY                  required
//   GROQ_API_KEY                    optional backup (https://console.groq.com/keys)
//   GROQ_MODEL, GROQ_VISION_MODEL   optional overrides
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = (hasImages) => hasImages
  ? process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
  : process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export const hasAI = () => Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

// parts: [{ text }, { inlineData: { data, mimeType } }, ...] (Gemini's shape)
async function callGemini(model, parts, timeoutMs) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${model} ${res.status}: ${data?.error?.message || 'request failed'}`);
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
}

async function callGroq(parts, timeoutMs) {
  const images = parts.filter((p) => p.inlineData);
  const text = parts.filter((p) => p.text).map((p) => p.text).join('\n');
  const model = groqModel(images.length > 0);
  const content = images.length
    ? [{ type: 'text', text }, ...images.map(({ inlineData: i }) => ({ type: 'image_url', image_url: { url: `data:${i.mimeType};base64,${i.data}` } }))]
    : text;
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.4,
      max_completion_tokens: 3000,
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`groq ${model} ${res.status}: ${data?.error?.message || 'request failed'}`);
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Tries Gemini, then Groq, then Gemini's other model, until `parse(text)`
 * returns something truthy. Returns that, or null if every provider failed.
 */
export async function generate({ parts, parse, budgetMs = 9000, label = 'ai' }) {
  const deadline = Date.now() + budgetMs;
  const attempts = [];
  if (process.env.GEMINI_API_KEY) attempts.push({ name: GEMINI_MODELS[0], run: (t) => callGemini(GEMINI_MODELS[0], parts, t), cap: 6000 });
  if (process.env.GROQ_API_KEY) attempts.push({ name: 'groq', run: (t) => callGroq(parts, t) });
  if (process.env.GEMINI_API_KEY) attempts.push({ name: GEMINI_MODELS[1], run: (t) => callGemini(GEMINI_MODELS[1], parts, t) });

  const errors = [];
  for (const [i, a] of attempts.entries()) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    // Leave the backup some time if the first try hangs.
    const timeout = a.cap && i < attempts.length - 1 ? Math.min(a.cap, remaining) : remaining;
    try {
      const value = parse(await a.run(timeout));
      if (value) {
        if (i > 0) console.warn(`${label}: answered by ${a.name} after: ${errors.join(' | ')}`);
        return value;
      }
      errors.push(`${a.name}: unusable answer`);
    } catch (err) {
      errors.push(err.name === 'TimeoutError' ? `${a.name}: timed out` : err.message);
    }
  }
  console.error(`${label} failed:`, errors.join(' | ') || 'no AI key configured');
  return null;
}
