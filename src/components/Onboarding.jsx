import { useState } from "react";
import { Cake, Ruler, Weight, CircleAlert, TriangleAlert, TrendingDown, HeartPulse, Dumbbell, Baby, Stethoscope, Wand2 } from "lucide-react";
import { calculatePersonalizedIntake, safetyFlags, bmiOf } from "../utils/nutritionHistory";
import { saveProfileToFirestore } from "../utils/firebaseLogin";
import { auth } from "../utils/firebaseConfig";
import { useIntake } from "../context/ProfileContext";
import CalorieRing from "./CalorieRing";
import { track } from "../utils/track";

export const ONBOARDING_DONE_KEY = "nutricheck-onboarding-done";

const GOALS = [
  { value: "lose", label: "Lose weight", Icon: TrendingDown },
  { value: "maintain", label: "Stay healthy", Icon: HeartPulse },
  { value: "gain", label: "Build muscle / gain", Icon: Dumbbell },
];

// Amber notice for things that change the plan (teen, low BMI).
function Notice({ children }) {
  return (
    <div role="status" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// Why the plan was adjusted, if it was.
function safetyMessage(flags, goal) {
  if (flags.teen) {
    return goal === "lose"
      ? "You're under 18, so we won't set a calorie cut. Your target is for healthy growth instead. Please talk to a parent or doctor before dieting."
      : "You're under 18. These targets are general estimates; check with a parent or doctor for advice that fits you.";
  }
  if (flags.lowBmi) {
    return `Your BMI is about ${flags.bmi.toFixed(1)}, below the healthy range. ${goal === "lose" ? "We won't set a calorie cut. " : ""}Please talk to a doctor about the right target for you.`;
  }
  return "";
}
const ACTIVITY = [
  { value: 1.2, label: "Mostly sitting", hint: "Desk job, little exercise" },
  { value: 1.375, label: "Lightly active", hint: "Walks, exercise 1–3 days/week" },
  { value: 1.55, label: "Active", hint: "Exercise 3–5 days/week" },
  { value: 1.725, label: "Very active", hint: "Hard exercise most days" },
];

// Height typed in metres (1.72) or feet.inches (5.6 = 5 ft 6 in): offer the cm value.
function heightSuggestion(raw) {
  const v = Number(raw);
  if (!Number.isFinite(v) || raw === "") return null;
  if (v >= 1 && v <= 2.5) return { cm: Math.round(v * 100), text: `${v} m` };
  if (v >= 3 && v < 9) {
    const [ftStr, inStr = "0"] = String(raw).split(".");
    const ft = Number(ftStr);
    const inch = Number(inStr.length === 1 && Number(inStr) < 10 ? inStr : inStr.slice(0, 2));
    if (inch <= 11) return { cm: Math.round(ft * 30.48 + inch * 2.54), text: `${ft} ft ${inch} in` };
    return { cm: Math.round(v * 30.48), text: `${v} ft` };
  }
  return null;
}

// Possible but unusual: ask the person to confirm before continuing.
function unusualCheck({ age, height, weight }) {
  const w = Number(weight);
  const bmi = bmiOf(height, weight);
  if (!(Number(age) >= 13) || !bmi) return null;
  if (w < 30) return { key: `w${w}`, low: true, text: `${w} kg is very low for someone aged ${age}.` };
  if (bmi < 15) return { key: `b${bmi.toFixed(1)}`, low: true, text: `That's a BMI of about ${bmi.toFixed(1)}, which is very low.` };
  if (w > 200) return { key: `w${w}`, low: false, text: `Just checking: is ${w} kg right?` };
  if (bmi > 50) return { key: `b${bmi.toFixed(1)}`, low: false, text: `Just checking: that's a BMI of about ${bmi.toFixed(1)}. Are height and weight right?` };
  return null;
}

// Shown under the form when someone is under 13.
function WhyThirteen() {
  return (
    <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
      <p className="flex items-center gap-2 font-semibold"><CircleAlert size={16} /> Why 13+?</p>
      <ul className="list-disc space-y-1 pl-5 text-xs">
        <li><b>The maths is for grown-ups.</b> Kids' energy needs change with growth spurts and puberty, and need different formulas.</li>
        <li><b>Calorie cuts aren't safe for kids.</b> A "lose weight" target could be dangerously low for a growing body.</li>
        <li><b>Privacy rules.</b> Children's data needs a parent's permission (COPPA in the US, the DPDP Act in India).</li>
      </ul>
      <p className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300"><Baby size={14} /> A kid-safe calculator is on the way.</p>
    </div>
  );
}

const choice = (selected) =>
  `w-full text-left px-4 py-3 rounded-lg border transition ${selected
    ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`;
const field = "w-full py-2 pl-8 pr-2 border rounded-lg bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600";

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

  const RANGES = {
    age: { min: 13, max: 100, label: "Age", unit: "years", below: "NutriCheck is for ages 13 and up" },
    height: { min: 100, max: 250, label: "Height", unit: "cm" },
    weight: { min: 20, max: 300, label: "Weight", unit: "kg" },
  };
  const values = { age, height, weight };
  // Message for a field that has a value outside its range (empty fields show no error).
  const fieldError = (key) => {
    const v = values[key];
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(v);
    const { min, max, unit, below } = RANGES[key];
    if (Number.isFinite(n) && n >= min && n <= max) return "";
    if (Number.isFinite(n) && n < min && below) return below;
    return `Enter ${min}–${max} ${unit}`;
  };
  const [triedNext, setTriedNext] = useState(false);
  const [confirmedKey, setConfirmedKey] = useState(null);
  const heightFix = fieldError("height") ? heightSuggestion(height) : null;
  const inRange = Object.keys(RANGES).every((k) => values[k] !== "" && !fieldError(k));
  const unusual = inRange ? unusualCheck(values) : null;
  const needsConfirm = Boolean(unusual) && confirmedKey !== unusual.key;
  const bodyValid = inRange && !needsConfirm;
  const under13 = age !== "" && Number(age) < 13;

  const finish = async () => {
    const profile = { age: Number(age), sex, height: Number(height), weight: Number(weight), activityLevel, goal, weightUpdatedAt: new Date().toISOString() };
    const result = calculatePersonalizedIntake(profile);
    localStorage.setItem("userProfile", JSON.stringify(profile));
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    if (result) setRecommendedIntake(result);
    track("goal_set", { from: "onboarding", goal });
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
                  <span className="flex items-center gap-3"><g.Icon size={18} className="text-blue-600" />{g.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); setTriedNext(true); if (bodyValid) setStep(2); }} className="space-y-3">
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
              {[
                { key: "age", label: "Age", Icon: Cake, value: age, set: setAge, placeholder: "30", mode: "numeric" },
                { key: "height", label: "Height (cm)", Icon: Ruler, value: height, set: setHeight, placeholder: "165", mode: "numeric" },
                { key: "weight", label: "Weight (kg)", Icon: Weight, value: weight, set: setWeight, placeholder: "65", mode: "decimal" },
              ].map((f, i) => {
                const err = (f.key === "height" && heightFix ? "Use cm (see below)" : fieldError(f.key)) || (triedNext && f.value === "" ? "Required" : "");
                return (
                  <label key={f.key} className="text-sm">
                    <span className="mb-1 block">{f.label}</span>
                    <span className="relative block">
                      <f.Icon size={16} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${err ? "text-red-500" : "text-gray-400"}`} />
                      <input
                        className={`${field} ${err ? "border-red-500 ring-1 ring-red-500 dark:border-red-500" : ""}`}
                        type="number" inputMode={f.mode} step="any"
                        placeholder={f.placeholder}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        aria-invalid={Boolean(err)}
                        autoFocus={i === 0}
                      />
                    </span>
                    {err && (
                      <span className="mt-1 flex items-start gap-1 text-xs text-red-500">
                        <CircleAlert size={12} className="mt-0.5 shrink-0" />{err}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {under13 && <WhyThirteen />}

            {heightFix && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
                <Wand2 size={16} className="shrink-0" />
                <span className="flex-1">Looks like {heightFix.text}. Height is in cm.</span>
                <button type="button" onClick={() => setHeight(String(heightFix.cm))}
                  className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Use {heightFix.cm} cm
                </button>
              </div>
            )}

            {unusual && (
              <div className={`space-y-2 rounded-lg border p-3 text-sm ${confirmedKey === unusual.key
                ? "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-200"
                : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"}`}>
                <p className="flex items-start gap-2">
                  {unusual.low ? <Stethoscope size={16} className="mt-0.5 shrink-0" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0" />}
                  <span>
                    {unusual.text}
                    {unusual.low && " We'll set a target without any calorie cut, and we'd suggest checking in with a doctor."}
                  </span>
                </p>
                {confirmedKey === unusual.key ? (
                  <p className="pl-6 text-xs">Thanks for confirming.</p>
                ) : (
                  <div className="flex gap-2 pl-6">
                    <button type="button" onClick={() => setConfirmedKey(unusual.key)}
                      className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Yes, that's right
                    </button>
                    <button type="button" onClick={() => setConfirmedKey(null)}
                      className="rounded-full border border-amber-400 px-3 py-1.5 text-xs font-semibold">
                      Let me fix it
                    </button>
                  </div>
                )}
              </div>
            )}

            {bodyValid && !unusual?.low && safetyMessage(safetyFlags(values), goal) && (
              <Notice>{safetyMessage(safetyFlags(values), goal)}</Notice>
            )}
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="text-sm text-gray-500 hover:underline">Back</button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Next</button>
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
            {safetyMessage(safetyFlags(values), goal) && <Notice>{safetyMessage(safetyFlags(values), goal)}</Notice>}
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
