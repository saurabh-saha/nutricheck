import { useState, useEffect } from "react";
import { calculatePersonalizedIntake } from "../utils/nutritionHistory";
import Layout from '../components/Layout'
import { useIntake } from "../context/ProfileContext";

export default function Profile() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState(1.2);
  const [goal, setGoal] = useState("maintain"); // lose / gain / maintain
  const [savedMsg, setSavedMsg] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      const data = JSON.parse(savedProfile);
      setAge(data.age || "");
      setSex(data.sex || "male");
      setHeight(data.height || "");
      setWeight(data.weight || "");
      setActivityLevel(data.activityLevel || 1.2);
      setGoal(data.goal || "maintain");
    }
  }, []);

  const calculateBMI = () => {
    if (!height || !weight) return null;
    const hMeters = height / 100;
    return (weight / (hMeters * hMeters)).toFixed(1);
  };

  const bmi = calculateBMI();

  const getBMICategory = () => {
    if (!bmi) return "";
    if (bmi < 18.5) return "Underweight";
    if (bmi < 24.9) return "Normal weight";
    if (bmi < 29.9) return "Overweight";
    return "Obese";
  };

  const personalizedIntake = calculatePersonalizedIntake({
    age,
    sex,
    height,
    weight,
    activityLevel,
    goal
  });  

  const { setRecommendedIntake } = useIntake();

  const handleSave = () => {
    const profileData = { age, sex, height, weight, activityLevel, goal };
    localStorage.setItem("userProfile", JSON.stringify(profileData));
    
    if (personalizedIntake) {
        setRecommendedIntake(personalizedIntake);
    }

    setSavedMsg("Profile saved!");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  return (
    <Layout>
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>

        {/* Age */}
        <label className="block mb-2">
            Age:
            <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
        </label>

        {/* Sex */}
        <label className="block mb-2">
            Sex:
            <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
            <option value="male">Male</option>
            <option value="female">Female</option>
            </select>
        </label>

        {/* Height */}
        <label className="block mb-2">
            Height (cm):
            <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
        </label>

        {/* Weight */}
        <label className="block mb-4">
            Weight (kg):
            <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
        </label>

        {/* Activity Level */}
        <label className="block mb-4">
            Activity Level:
            <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(parseFloat(e.target.value))}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
            <option value="1.2">Sedentary</option>
            <option value="1.375">Lightly active</option>
            <option value="1.55">Moderately active</option>
            <option value="1.725">Very active</option>
            <option value="1.9">Extra active</option>
            </select>
        </label>

        {/* Goal */}
        <label className="block mb-4">
            Goal:
            <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
            <option value="lose">Lose weight</option>
            <option value="maintain">Maintain weight</option>
            <option value="gain">Gain weight</option>
            </select>
        </label>

        {/* BMI Display */}
        {bmi && (
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <p className="font-semibold">BMI: {bmi}</p>
            <p className="text-sm">{getBMICategory()}</p>
            </div>
        )}

        {/* Personalized Intake */}
        {personalizedIntake && (
            <div className="mt-4">
            <h3 className="font-bold mb-2">Personalized Daily Intake</h3>
            <ul className="space-y-1 text-sm">
                {Object.entries(personalizedIntake).map(([key, value]) => (
                <li key={key}>
                    <span className="capitalize">{key}</span>: {value}{" "}
                    {key === "calories" ? "kcal" : "g"}
                </li>
                ))}
            </ul>
            </div>
        )}

        {/* Save Button */}
        <button
            onClick={handleSave}
            className="mt-6 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
            Save Profile
        </button>
        {savedMsg && <p className="mt-2 text-green-500 text-sm">{savedMsg}</p>}
        </div>
    </Layout>

  );
}
