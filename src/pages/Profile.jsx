import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Armchair, Footprints, Bike, Dumbbell, Flame, Scale, Target, RotateCcw, Info } from "lucide-react";
import Layout from "../components/Layout";
import { useIntake } from "../context/ProfileContext";
import { auth } from "../utils/firebaseConfig";
import { loadProfile, saveProfile } from "../utils/profile";
import { safetyFlags } from "../utils/nutritionHistory";
import {
  PACES, planFor, goalWeightRange, recommendedTargets, withCarbs, macroSplit, targetNotes, toIntake, daysSince, bmiOf,
} from "../utils/goals";
import { toast } from "../hooks/use-toast";

const ACTIVITY = [
  { value: 1.2, label: "Desk", sub: "Mostly sitting", Icon: Armchair },
  { value: 1.375, label: "Light", sub: "Walks, 1–3 workouts", Icon: Footprints },
  { value: 1.55, label: "Active", sub: "3–5 workouts", Icon: Bike },
  { value: 1.725, label: "Very", sub: "6–7 workouts", Icon: Dumbbell },
  { value: 1.9, label: "Athlete", sub: "Training daily", Icon: Flame },
];

const COLORS = { protein: "bg-emerald-500", carbs: "bg-amber-400", fat: "bg-rose-400" };

const ago = (iso) => {
  const d = daysSince(iso);
  if (d === null) return "Not updated yet";
  if (d === 0) return "Updated today";
  if (d === 1) return "Updated yesterday";
  return `Updated ${d} days ago`;
};

function Card({ title, Icon, right, children, id }) {
  return (
    <section id={id} className="rounded-3xl bg-gray-50 p-4 dark:bg-gray-800/70">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {Icon && <Icon size={16} />} {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function NumberTile({ label, unit, value, onChange, inputRef, hint, highlight }) {
  return (
    <label className={`block rounded-2xl bg-white p-3 dark:bg-gray-900 ${highlight ? "ring-2 ring-blue-500" : ""}`}>
      <span className="block text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1">
        <input ref={inputRef} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-2xl font-bold text-gray-900 focus:outline-none dark:text-white" />
        <span className="text-sm text-gray-500">{unit}</span>
      </span>
      {hint && <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  );
}

function TargetSlider({ label, value, unit, min, max, step = 1, onChange, sub, accent, dot }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 font-medium">
          {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />} {label}
        </span>
        <span className="text-lg font-bold">{value}<span className="text-sm font-medium text-gray-500"> {unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label} className={`mt-1 h-2 w-full cursor-pointer ${accent}`} />
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

export default function Profile() {
  const { recommendedIntake, setRecommendedIntake } = useIntake();
  const location = useLocation();
  const focusWeight = new URLSearchParams(location.search).get("focus") === "weight";
  const weightRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [savedWeight, setSavedWeight] = useState(null);
  const [weightUpdatedAt, setWeightUpdatedAt] = useState(null);
  const [activityLevel, setActivityLevel] = useState(1.375);
  const [goalWeight, setGoalWeight] = useState("");
  const [pace, setPace] = useState("steady");
  const [targets, setTargets] = useState(null); // { calories, protein, fat, fiber, carbs }
  const [custom, setCustom] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async () => {
      const p = await loadProfile();
      if (p) {
        setAge(p.age ?? ""); setSex(p.sex || "female"); setHeight(p.height ?? ""); setWeight(p.weight ?? "");
        setSavedWeight(p.weight ?? null); setWeightUpdatedAt(p.weightUpdatedAt || null);
        setActivityLevel(Number(p.activityLevel) || 1.375);
        const gw = p.goalWeight ?? (p.goal === "lose" ? Number(p.weight) - 5 : p.goal === "gain" ? Number(p.weight) + 3 : p.weight);
        setGoalWeight(gw ?? "");
        setPace(p.pace || "steady");
        if (p.targets) { setTargets(withCarbs(p.targets)); setCustom(Boolean(p.customTargets)); }
      }
      setLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && focusWeight) {
      weightRef.current?.scrollIntoView({ block: "center" });
      weightRef.current?.focus();
    }
  }, [loaded, focusWeight]);

  const profile = { age: Number(age), sex, height: Number(height), weight: Number(weight), activityLevel };
  const complete = profile.age >= 13 && profile.height >= 100 && profile.weight >= 20;
  const range = complete ? goalWeightRange(profile) : null;
  const gw = range ? Math.min(range.max, Math.max(range.min, Number(goalWeight) || profile.weight)) : null;
  const plan = useMemo(() => (complete ? planFor(profile, gw, pace) : null), [complete, age, sex, height, weight, activityLevel, gw, pace]); // eslint-disable-line react-hooks/exhaustive-deps
  const flags = safetyFlags(profile);
  const bmi = complete ? bmiOf(height, weight) : null;

  // Targets follow the plan unless the user tuned them; tuned targets still follow its calories.
  useEffect(() => {
    if (!plan) return;
    setTargets((t) => (!t || !custom ? recommendedTargets(plan.calories) : withCarbs({ ...t, calories: plan.calories })));
  }, [plan?.calories]); // eslint-disable-line react-hooks/exhaustive-deps

  // The page shows a plan that differs from the saved goal (e.g. an older profile): offer to save it.
  useEffect(() => {
    if (loaded && targets && recommendedIntake && targets.calories !== recommendedIntake.calories) setDirty(true);
  }, [loaded, targets?.calories]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn) => (v) => { fn(v); setDirty(true); };
  const tune = (key) => (v) => { setTargets((t) => withCarbs({ ...t, [key]: v })); setCustom(true); setDirty(true); };
  const resetTargets = () => { if (plan) { setTargets(recommendedTargets(plan.calories)); setCustom(false); setDirty(true); } };

  const split = targets ? macroSplit(targets) : null;
  const notes = targets ? targetNotes(targets, profile.weight) : [];
  const w = profile.weight || 1;

  const handleSave = async () => {
    if (!complete || !targets) return;
    setSaving(true);
    const weightChanged = String(weight) !== String(savedWeight ?? "");
    const updatedAt = weightChanged || !weightUpdatedAt ? new Date().toISOString() : weightUpdatedAt;
    const data = {
      ...profile, goal: plan.goal, goalWeight: gw, pace, weightUpdatedAt: updatedAt,
      targets: { calories: targets.calories, protein: targets.protein, fat: targets.fat, fiber: targets.fiber }, customTargets: custom,
    };
    try {
      const intake = toIntake(targets);
      await saveProfile(data, intake);
      setRecommendedIntake(intake);
      setSavedWeight(weight); setWeightUpdatedAt(updatedAt); setDirty(false);
      toast({ title: "✅ Goals saved", description: `${targets.calories} kcal · ${targets.protein} g protein a day` });
    } catch (err) {
      console.error("Couldn't save profile:", err);
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  const delta = complete ? Math.round((gw - profile.weight) * 10) / 10 : 0;

  return (
    <Layout>
      <div className="mx-auto max-w-md space-y-4 pb-24">
        <h1 className="text-2xl font-bold">Your goals</h1>

        {/* 1. About you */}
        <Card title="You" Icon={Scale}
          right={bmi && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">BMI {bmi.toFixed(1)}</span>}>
          <div className="grid grid-cols-2 gap-2">
            <NumberTile label="Weight" unit="kg" value={weight} onChange={edit(setWeight)} inputRef={weightRef}
              hint={ago(weightUpdatedAt)} highlight={focusWeight} />
            <NumberTile label="Height" unit="cm" value={height} onChange={edit(setHeight)} />
            <NumberTile label="Age" unit="yrs" value={age} onChange={edit(setAge)} />
            <div className="rounded-2xl bg-white p-3 dark:bg-gray-900">
              <span className="block text-xs text-gray-500 dark:text-gray-400">Sex</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                {["female", "male"].map((s) => (
                  <button key={s} type="button" onClick={() => edit(setSex)(s)}
                    className={`rounded-lg py-1.5 text-sm font-medium capitalize ${sex === s ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mb-2 mt-4 text-sm font-medium">How active are you?</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {ACTIVITY.map((a) => {
              const { value, label, sub, Icon } = a;
              const on = Number(activityLevel) === value;
              return (
                <button key={value} type="button" onClick={() => edit(setActivityLevel)(value)} aria-pressed={on}
                  className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition ${on
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-transparent bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300"}`}>
                  <Icon size={20} />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">{sub}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {!complete && loaded && (
          <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">
            Fill in your weight, height and age to see your plan.
          </p>
        )}

        {/* 2. Goal weight */}
        {complete && plan && (
          <Card title="Goal weight" Icon={Target}>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold">{gw}<span className="text-lg font-medium text-gray-500"> kg</span></div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${delta < 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : delta > 0 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
                {delta === 0 ? "Stay here" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} kg`}
              </span>
            </div>
            <input type="range" min={range.min} max={range.max} step={0.5} value={gw}
              onChange={(e) => edit(setGoalWeight)(Number(e.target.value))} aria-label="Goal weight"
              className="mt-3 h-2 w-full cursor-pointer accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-500"><span>{range.min} kg</span><span>now {profile.weight} kg</span><span>{range.max} kg</span></div>

            {plan.goal !== "maintain" && (
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-white p-1 dark:bg-gray-900" role="radiogroup" aria-label="Pace">
                {PACES.map((p) => (
                  <button key={p.key} type="button" role="radio" aria-checked={pace === p.key} onClick={() => edit(setPace)(p.key)}
                    className={`rounded-lg py-2 text-sm ${pace === p.key ? "bg-blue-600 font-semibold text-white" : "text-gray-600 dark:text-gray-300"}`}>
                    {p.label}<span className="block text-[10px] opacity-80">{p.kgPerWeek} kg/week</span>
                  </button>
                ))}
              </div>
            )}

            <p className="mt-3 rounded-2xl bg-white p-3 text-sm dark:bg-gray-900">
              {plan.goal === "maintain"
                ? <>Keep your weight with about <b>{plan.calories} kcal</b> a day.</>
                : <>About <b>{plan.weeks} weeks</b> at <b>{plan.calories} kcal</b> a day <span className="text-gray-500">(you burn ~{plan.maintenance})</span>.</>}
              {plan.floored && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">We kept calories at a safe minimum, so this takes a little longer.</span>}
            </p>
            {flags.blocksLoss && (
              <p className="mt-2 flex gap-2 text-xs text-gray-600 dark:text-gray-300"><Info size={14} className="mt-0.5 shrink-0" />
                {flags.teen ? "Under 18, we don't set weight-loss targets. Your body is still growing." : "With a low BMI, we don't set weight-loss targets."}
              </p>
            )}
          </Card>
        )}

        {/* 3. Daily targets */}
        {complete && targets && (
          <Card title="Daily targets"
            right={custom && (
              <button type="button" onClick={resetTargets} className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                <RotateCcw size={12} /> Recommended
              </button>
            )}>
            <div className="flex h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden>
              <div className={COLORS.protein} style={{ width: `${split.protein}%` }} />
              <div className={COLORS.carbs} style={{ width: `${split.carbs}%` }} />
              <div className={COLORS.fat} style={{ width: `${split.fat}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Protein {split.protein}%</span><span>Carbs {split.carbs}%</span><span>Fat {split.fat}%</span>
            </div>

            <div className="mt-4 space-y-4">
              <TargetSlider label="Calories" unit="kcal" value={targets.calories} min={1200} max={4500} step={10}
                onChange={tune("calories")} accent="accent-blue-600"
                sub={plan && targets.calories !== plan.calories ? `Your plan suggests ${plan.calories} kcal` : "From your goal weight"} />
              <TargetSlider label="Protein" unit="g" value={targets.protein} min={Math.round(w * 0.5)} max={Math.round(w * 2.5)}
                onChange={tune("protein")} accent="accent-emerald-500" dot={COLORS.protein}
                sub={`${(targets.protein / w).toFixed(1)} g per kg of body weight`} />
              <TargetSlider label="Fat" unit="g" value={targets.fat} min={20} max={Math.max(40, Math.round(targets.calories / 18))}
                onChange={tune("fat")} accent="accent-rose-400" dot={COLORS.fat} />
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 font-medium"><span className={`h-2.5 w-2.5 rounded-full ${COLORS.carbs}`} /> Carbs</span>
                <span className="text-right">
                  <span className="text-lg font-bold">{targets.carbs}<span className="text-sm font-medium text-gray-500"> g</span></span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">fills the calories left</span>
                </span>
              </div>
              <TargetSlider label="Fiber" unit="g" value={targets.fiber} min={15} max={60} onChange={tune("fiber")} accent="accent-lime-500" />
            </div>

            {notes.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                {notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </Card>
        )}

        <p className="px-1 text-xs text-gray-500 dark:text-gray-400">
          Estimates for general guidance, not medical advice. Talk to a doctor before big changes to your diet.
        </p>
      </div>

      {/* Save: only when something changed */}
      {dirty && complete && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <button type="button" onClick={handleSave} disabled={saving}
            className="mx-auto block w-full max-w-md rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {saving ? "Saving…" : `Save · ${targets?.calories ?? ""} kcal a day`}
          </button>
        </div>
      )}
    </Layout>
  );
}
