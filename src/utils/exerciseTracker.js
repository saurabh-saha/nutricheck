// Logged exercise, stored like food but in its own place so nothing that reads
// the food log (reminders, charts, "what you keep missing") ever sees it.
// - Logged in: Firestore users/{uid}/exercises.
// - Guest: localStorage on this device, copied to the account on login
//   (same ids, so retrying is safe).
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getTodayDate } from "./nutritionTracker";
import { track } from "./track";

const db = getFirestore();
const auth = getAuth();
const GUEST_KEY = "nutricheck-guest-exercises";

const readGuest = () => {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    return Array.isArray(list) ? list.filter((e) => e && e.id) : [];
  } catch {
    return [];
  }
};
const writeGuest = (list) => localStorage.setItem(GUEST_KEY, JSON.stringify(list));

let migration = null;
function migrateGuestExercises(uid) {
  if (!migration) {
    migration = (async () => {
      const guest = readGuest();
      for (const { id, ...data } of guest) await setDoc(doc(db, "users", uid, "exercises", id), data);
      if (guest.length) {
        const copied = new Set(guest.map((e) => e.id));
        writeGuest(readGuest().filter((e) => !copied.has(e.id)));
      }
    })().finally(() => { migration = null; });
  }
  return migration;
}

export const byNewest = (a, b) =>
  (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0);

/** Every logged exercise, newest first. Never throws: no exercise is better than a broken page. */
export async function getExerciseEntries() {
  try {
    const user = auth.currentUser;
    if (!user) return readGuest().sort(byNewest);
    await migrateGuestExercises(user.uid).catch((err) => console.error("Couldn't move guest exercise to your account:", err));
    const snap = await getDocs(collection(db, "users", user.uid, "exercises"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
  } catch (err) {
    console.error("Error loading exercise:", err);
    return [];
  }
}

/**
 * Save one exercise. `entry`: { exerciseId, name, category, kind, amount, calories, date }.
 * `amount` is what the kind counts ({ sets, reps } | { minutes, intensity } | { km } | { steps }).
 */
export async function logExercise({ date, ...entry }) {
  const saved = { ...entry, date: date || getTodayDate(), createdAt: Date.now() };
  const user = auth.currentUser;
  let result;
  if (user) {
    const ref = await addDoc(collection(db, "users", user.uid, "exercises"), saved);
    result = { id: ref.id, ...saved };
  } else {
    result = { id: crypto.randomUUID(), ...saved };
    writeGuest([...readGuest(), result]);
  }
  track("exercise_added", { exercise: entry.exerciseId, category: entry.category, calories: entry.calories, signed_in: Boolean(user) });
  return result;
}

export async function deleteExercise(id) {
  const user = auth.currentUser;
  if (user) {
    await deleteDoc(doc(db, "users", user.uid, "exercises", id));
    return;
  }
  writeGuest(readGuest().filter((e) => e.id !== id));
}
