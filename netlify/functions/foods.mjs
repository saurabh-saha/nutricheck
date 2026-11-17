// GET /.netlify/functions/foods?q=egg
// Dishes the AI has already described (shared catalogue), for the search
// dropdown. Picking one needs no AI call.
import { checkOrigin, catalogSearch } from '../lib/guard.mjs';

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!checkOrigin(req)) return json(403, { error: 'Forbidden' });
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 60);
  if (q.length < 3) return json(200, { items: [] }); // too short to be useful
  try {
    const items = await catalogSearch(q);
    return json(200, { items });
  } catch (err) {
    console.error('Catalogue search failed:', err.message);
    return json(200, { items: [] });
  }
};
