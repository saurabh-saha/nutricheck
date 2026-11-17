// The user's body details and goals: Firestore when signed in, this device otherwise.
import { auth } from "./firebaseConfig";
import { saveProfileToFirestore, loadProfileFromFirestore } from "./firebaseLogin";

const KEY = "userProfile";

const fromDevice = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
};

export async function loadProfile() {
  if (auth.currentUser) {
    const data = await loadProfileFromFirestore().catch(() => null);
    if (data?.profile) {
      localStorage.setItem(KEY, JSON.stringify(data.profile));
      return data.profile;
    }
  }
  return fromDevice();
}

export async function saveProfile(profile, intake) {
  localStorage.setItem(KEY, JSON.stringify(profile));
  if (auth.currentUser) await saveProfileToFirestore(profile, intake);
}
