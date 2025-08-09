import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const provider = new GoogleAuthProvider();
// Always force account chooser to appear
provider.setCustomParameters({
  prompt: "select_account"
});

let setWelcomeState = null;

export function registerWelcomeHandler(fn) {
  setWelcomeState = fn;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    await createUserIfNew(result.user);

    // Trigger welcome modal if handler is set
    if (setWelcomeState) {
      setWelcomeState({
        show: true,
        name: result.user.displayName || result.user.email  
      });
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

export function logout() {
  return signOut(auth);
}

export async function saveProfileToFirestore(profileData, intake) {
  const user = auth.currentUser;
  if (!user) return;

  const userInfo = {
    uid: user.uid,
    email: user.email || null,
    emailVerified: user.emailVerified || false,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    phoneNumber: user.phoneNumber || user.providerData?.[0]?.phoneNumber || null,
    lastLoginAt: user.metadata?.lastSignInTime || null,
  };


  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    {
      profile: profileData,
      recommendedIntake: intake,
      authInfo: userInfo,
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
