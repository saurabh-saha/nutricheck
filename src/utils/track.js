// Product events for Firebase Analytics, tagged with the campaign that first
// brought this device in (e.g. first_source=instagram, first_content=d3).
import { noteVisit, campaignParams } from "./attribution";

const storage = typeof window !== "undefined" ? window.localStorage : null;

// Firebase is loaded lazily so importing this never blocks or breaks the app.
const analytics = () =>
  import("./firebaseConfig").then((m) => m.analyticsPromise).catch(() => null);

export function track(name, params = {}) {
  if (!storage) return;
  const all = { ...campaignParams(storage), ...params };
  Promise.all([analytics(), import("firebase/analytics")])
    .then(([a, { logEvent }]) => a && logEvent(a, name, all))
    .catch(() => {});
}

// Once per app load: remember the campaign and report a return visit on a new day.
export function trackVisit() {
  if (!storage) return;
  const { returnVisit } = noteVisit(window.location.search, storage);
  if (returnVisit) track("return_visit", returnVisit);
}

export function trackPageView(path) {
  track("page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
}

const FIRST_FOOD_KEY = "firstFoodTracked";

// Every logged food; the first one on this device also sends first_food_added.
export function trackFoodAdded(params) {
  track("food_added", params);
  try {
    if (!storage.getItem(FIRST_FOOD_KEY)) {
      storage.setItem(FIRST_FOOD_KEY, "1");
      track("first_food_added", params);
    }
  } catch { /* private mode */ }
}
