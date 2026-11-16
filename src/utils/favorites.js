// Favourite foods for one-tap logging.
// Logged in: stored as a map on users/{uid}.favorites (merge writes only).
// Guest: stored in localStorage and merged into the account on login.
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

const GUEST_KEY = "nutricheck-guest-favorites";

export const favoriteKey = (dish) =>
  (dish || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";

const readGuest = () => {
  try {
    const map = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}");
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  } catch {
    return {};
  }
};
const writeGuest = (map) => localStorage.setItem(GUEST_KEY, JSON.stringify(map));

const toList = (map) => Object.values(map || {}).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

let migration = null;
async function migrateGuestFavorites(uid) {
  if (!migration) {
    migration = (async () => {
      const guest = readGuest();
      if (Object.keys(guest).length) {
        await setDoc(doc(db, "users", uid), { favorites: guest }, { merge: true });
        writeGuest({});
      }
    })().finally(() => { migration = null; });
  }
  return migration;
}

export async function getFavorites() {
  const user = auth.currentUser;
  if (!user) return toList(readGuest());
  await migrateGuestFavorites(user.uid).catch((err) => console.error("Couldn't move guest favourites:", err));
  const snap = await getDoc(doc(db, "users", user.uid));
  return toList(snap.exists() ? snap.data().favorites : {});
}

export async function addFavorite({ dish, nutrition, imageUrl = null }) {
  const key = favoriteKey(dish);
  const fav = { dish, nutrition, imageUrl, addedAt: Date.now() };
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, "users", user.uid), { favorites: { [key]: fav } }, { merge: true });
  } else {
    writeGuest({ ...readGuest(), [key]: fav });
  }
  return fav;
}

export async function removeFavorite(dish) {
  const key = favoriteKey(dish);
  const user = auth.currentUser;
  if (user) {
    await updateDoc(doc(db, "users", user.uid), { [`favorites.${key}`]: deleteField() });
  } else {
    const map = readGuest();
    delete map[key];
    writeGuest(map);
  }
}
