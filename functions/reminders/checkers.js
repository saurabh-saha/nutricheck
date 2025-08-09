const { getUserIntake } = require("../lib/firestore");
const { DEFAULT_RECOMMENDED_CALORIES, CALORIE_THRESHOLD_RATIO } = require("../config/scheduleConfig");

const shouldSendMorning = async (uid, date) => {
  const intakeSnap = await getUserIntake(uid, date);
  return intakeSnap.empty;
};

const shouldSendEvening = async (uid, date, userRecommendedCalories) => {
  const intakeSnap = await getUserIntake(uid, date);
  if (intakeSnap.empty) return true;

  let totalCalories = 0;
  intakeSnap.forEach((doc) => {
    totalCalories += Number(doc.data()?.nutrition?.calories) || 0;
  });

  const recommended = Number(userRecommendedCalories) || DEFAULT_RECOMMENDED_CALORIES;
  return totalCalories < recommended * CALORIE_THRESHOLD_RATIO;
};

module.exports = {
  shouldSendMorning,
  shouldSendEvening,
};
