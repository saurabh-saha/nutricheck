import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  // Keep contact info current (used for email reminders).
  await setDoc(ref, {
    authInfo: {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      lastLoginAt: user.metadata?.lastSignInTime || null,
    },
  }, { merge: true });
}

export async function getReminderSettings() {
  if (!auth.currentUser) return null;
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  return { email: snap.exists() ? snap.data().reminders?.email !== false : true };
}

// Emails a test reminder to the logged-in user's own address.
export async function sendTestReminder() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please log in first.");
  const res = await fetch("/.netlify/functions/test-reminder", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function setEmailReminders(enabled) {
  if (!auth.currentUser) return;
  await setDoc(doc(db, "users", auth.currentUser.uid), { reminders: { email: enabled } }, { merge: true });
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

export async function uploadDishImage(dishImage, dishName) {
  if (!dishImage || !dishName) return null;

  const formData = new FormData();
  formData.append("token", "2ac86a3b88999a94b07f44c2414dab6d");
  formData.append("upload_session", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  formData.append("numfiles", "1");
  formData.append("upload_referer", "https://getsharex.com/");
  formData.append("file", dishImage, `${dishName}-${Date.now()}.jpg`);

  try {
    const response = await fetch("https://postimg.cc/json", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    // Postimages response may contain URL in different formats
    if (data && data.url) {
      return data.url; // public image page URL
    } else if (data && data.status === "OK" && data.url) {
      return data.url; // fallback
    } else {
      console.error("Upload failed", data);
      return null;
    }
  } catch (err) {
    console.error("Error uploading to Postimages", err);
    return null;
  }
}

