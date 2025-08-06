import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,  
  signOut, 
  getRedirectResult, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const provider = new GoogleAuthProvider();

let setWelcomeState = null;

export function registerWelcomeHandler(fn) {
  setWelcomeState = fn;
}

export async function loginWithGoogle() {
  try {
    if (window.innerWidth < 768) {
      // Mobile → redirect
      return signInWithRedirect(auth, provider);
    } else {
      // Desktop → popup
      const result = await signInWithPopup(auth, provider);
      await createUserIfNew(result.user);

      if (setWelcomeState) {
        setWelcomeState({
          show: true,
          name: result.user.displayName || result.user.email
        });
      }
    }
  } catch (error) {
    console.error("Google login error:", error);
  }
}

async function createUserIfNew(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { createdAt: serverTimestamp() });
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    console.log("Redirect result:", result);

    if (result?.user) {
      await createUserIfNew(result.user);

      if (setWelcomeState) {
        setWelcomeState({
          show: true,
          name: result.user.displayName || result.user.email
        });
      }
    }
  } catch (error) {
    console.error("Google redirect login error:", error);
  }
}

export function initAuthRedirectHandler() {
  onAuthStateChanged(auth, (user) => {
    // On mobile redirect, this fires after auth restores the user
    if (!sessionStorage.getItem("redirectHandled") && user) {
      sessionStorage.setItem("redirectHandled", "true");
      handleRedirectResult();
    }
  });
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
      recommendedIntake: intake,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function loadProfileFromFirestore() {
  if (!auth.currentUser) return null;

  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  return snap.exists() ? snap.data() : null;
}
