// Where a visitor came from (first touch) and whether they're back on a new day.
// Firebase-free so it can be unit tested; track.js sends the events.

const CAMPAIGN_KEY = "campaign";
const VISITS_KEY = "visits";
const UTM = ["source", "medium", "campaign", "content"];

const today = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// { source, medium, campaign, content } from ?utm_* (null if none).
export function campaignFrom(search) {
  const p = new URLSearchParams(search);
  const out = {};
  for (const k of UTM) {
    const v = (p.get(`utm_${k}`) || "").trim().slice(0, 60);
    if (v) out[k] = v;
  }
  return out.source ? out : null;
}

const read = (storage, key) => {
  try { return JSON.parse(storage.getItem(key)) || null; } catch { return null; }
};
const write = (storage, key, value) => {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

/**
 * Call once per app load. Keeps the first campaign that brought this device in,
 * and reports a return visit the first time the app opens on a new day.
 * Returns { campaign, returnVisit: null | { days_since_first, visit_days } }.
 */
export function noteVisit(search, storage, now = Date.now()) {
  const fresh = campaignFrom(search);
  let campaign = read(storage, CAMPAIGN_KEY);
  if (!campaign && fresh) { campaign = fresh; write(storage, CAMPAIGN_KEY, campaign); }

  const day = today(now);
  const visits = read(storage, VISITS_KEY);
  if (!visits) {
    write(storage, VISITS_KEY, { first: day, last: day, days: 1 });
    return { campaign, returnVisit: null };
  }
  if (visits.last === day) return { campaign, returnVisit: null };
  const next = { ...visits, last: day, days: (visits.days || 1) + 1 };
  write(storage, VISITS_KEY, next);
  const daysSinceFirst = Math.round((new Date(`${day}T00:00:00`) - new Date(`${visits.first}T00:00:00`)) / 86400000);
  return { campaign, returnVisit: { days_since_first: daysSinceFirst, visit_days: next.days } };
}

// Campaign params to attach to every event (first_source, first_content, ...).
export function campaignParams(storage) {
  const c = read(storage, CAMPAIGN_KEY);
  if (!c) return {};
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [`first_${k}`, v]));
}
