const { getUsers } = require("../lib/firestore");
const { sendEmail } = require("../lib/email");
const { scheduleConfig } = require("../config/scheduleConfig");
const { shouldSendMorning, shouldSendEvening } = require("./checkers");
const { toZonedTime } = require('date-fns-tz');

const timeZone = 'Asia/Kolkata';

const checkFunctions = {
  shouldSendMorning,
  shouldSendEvening,
};

const runReminderEmails = async () => {
  const now = new Date();
  const istDate = toZonedTime(now, timeZone);
  const hour = istDate.getHours();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  if (!scheduleConfig[hour]) {
    console.log(`⏭ Skipping hour ${hour}`);
    return { message: `Skipping hour ${hour}` };
  }

  const { bucket, checkFnName, subject, html, dateToCheck } = scheduleConfig[hour];
  const targetDate = dateToCheck(todayStr, yesterdayStr);

  const emailsToSend = [];

  const usersSnapshot = await getUsers();

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      try {
        const user = userDoc.data();
        const uid = userDoc.id;
        const email = user?.authInfo?.email;
        if (!email) return;

        const shouldSend = await checkFunctions[checkFnName](
          uid,
          targetDate,
          user?.recommendedIntake?.calories
        );
        if (shouldSend) emailsToSend.push(email);
      } catch (err) {
        console.error(`Error processing user ${userDoc.id}:`, err);
      }
    })
  );

  await Promise.all(emailsToSend.map((email) => sendEmail(email, subject, html)));

  console.log(`📩 Emails sent — ${bucket}: ${emailsToSend.length}`);

  return { [bucket]: emailsToSend.length };
};

module.exports = {
  runReminderEmails,
};
