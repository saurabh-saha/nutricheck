import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

const provider = new GoogleAuthProvider();

export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export async function saveProfileToFirestore(profileData, intake) {
  if (!auth.currentUser) return;

  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    {
      profile: profileData,
      recommendedIntake: intake
    },
    { merge: true }
  );
}

export async function loadProfileFromFirestore() {
  if (!auth.currentUser) return null;

  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}
