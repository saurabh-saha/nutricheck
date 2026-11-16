import { useState } from "react";
import { calculatePersonalizedIntake } from "../utils/nutritionHistory";
import { saveProfileToFirestore } from "../utils/firebaseLogin";
import { auth } from "../utils/firebaseConfig";
import { useIntake } from "../context/ProfileContext";
import CalorieRing from "./CalorieRing";

export const ONBOARDING_DONE_KEY = "nutricheck-onboarding-done";

const GOALS = [
  { value: "lose", label: "Lose weight", emoji: "📉" },
  { value: "maintain", label: "Stay healthy", emoji: "⚖️" },
  { value: "gain", label: "Build muscle / gain", emoji: "💪" },
];
const ACTIVITY = [
  { value: 1.2, label: "Mostly sitting", hint: "Desk job, little exercise" },
  { value: 1.375, label: "Lightly active", hint: "Walks, exercise 1–3 days/week" },
  { value: 1.55, label: "Active", hint: "Exercise 3–5 days/week" },
  { value: 1.725, label: "Very active", hint: "Hard exercise most days" },
];

const choice = (selected) =>
  `w-full text-left px-4 py-3 rounded-lg border transition ${selected
    ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`;
const field = "w-full p-2 mt-1 border rounded bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600";

// About 30 seconds: goal -> body -> activity -> your daily target.
export default function Onboarding({ onDone, onLogFirstMeal }) {
  const { setRecommendedIntake } = useIntake();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("maintain");
  const [sex, setSex] = useState("female");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState(1.375);
  const [intake, setIntake] = useState(null);

  const bodyValid = Number(age) >= 13 && Number(age) <= 100 && Number(height) >= 100 && Number(height) <= 250 && Number(weight) >= 30 && Number(weight) <= 300;

  const finish = async () => {
    const profile = { age: Number(age), sex, height: Number(height), weight: Number(weight), activityLevel, goal };
    const result = calculatePersonalizedIntake(profile);
    localStorage.setItem("userProfile", JSON.stringify(profile));
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    if (result) setRecommendedIntake(result);
    if (auth.currentUser) {
      saveProfileToFirestore(profile, result).catch((err) => console.error("Couldn't save profile:", err));
    }
    setIntake(result);
    setStep(3);
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1" aria-label={`Step ${step + 1} of 4`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`} />
            ))}
          </div>
          {step < 3 && (
            <button onClick={skip} className="text-sm text-gray-500 hover:underline">Skip</button>
          )}
        </div>

        {step === 0 && (
          <>
            <h2 className="text-xl font-semibold">What's your goal?</h2>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button key={g.value} className={choice(goal === g.value)} onClick={() => { setGoal(g.value); setStep(1); }}>
                  <span className="mr-2">{g.emoji}</span>{g.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (bodyValid) setStep(2); }} className="space-y-3">
            <h2 className="text-xl font-semibold">A bit about you</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Used only to estimate your daily needs.</p>
            <div className="flex gap-2">
              {["female", "male"].map((s) => (
                <button type="button" key={s} className={choice(sex === s) + " text-center"} onClick={() => setSex(s)}>
                  {s === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">Age
                <input className={field} type="number" inputMode="numeric" min="13" max="100" value={age} onChange={(e) => setAge(e.target.value)} required autoFocus />
              </label>
              <label className="text-sm">Height (cm)
                <input className={field} type="number" inputMode="numeric" min="100" max="250" value={height} onChange={(e) => setHeight(e.target.value)} required />
              </label>
              <label className="text-sm">Weight (kg)
                <input className={field} type="number" inputMode="decimal" min="30" max="300" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              </label>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="text-sm text-gray-500 hover:underline">Back</button>
              <button type="submit" disabled={!bodyValid} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Next</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold">How active are you?</h2>
            <div className="space-y-2">
              {ACTIVITY.map((a) => (
                <button key={a.value} className={choice(activityLevel === a.value)} onClick={() => setActivityLevel(a.value)}>
                  <div className="font-medium">{a.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.hint}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:underline">Back</button>
              <button onClick={finish} className="px-4 py-2 rounded bg-blue-600 text-white">See my plan</button>
            </div>
          </>
        )}

        {step === 3 && intake && (
          <>
            <h2 className="text-xl font-semibold">Your daily target</h2>
            <CalorieRing eaten={0} target={intake.calories} protein={0} proteinTarget={intake.protein} />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              About <b>{intake.calories} kcal</b> a day, with {intake.protein} g protein, {intake.carbs} g carbs and {intake.fat} g fat.
              You can change this any time in your profile.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              An estimate (Mifflin–St Jeor), not medical advice. Check with a doctor if you're pregnant, have a medical condition, or are under 18.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { onDone(); onLogFirstMeal?.(); }} className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
                Log your first meal
              </button>
              <button onClick={onDone} className="text-sm text-gray-500 hover:underline">I'll do it later</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
