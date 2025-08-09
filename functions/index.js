const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function formatDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

async function sendEmail(to, subject, html) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: `"Nutrition Tracker" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send to ${to}:`, err);
  }
}

async function runReminderEmails() {
  const hour = new Date().getHours();
  const yesterday = formatDate(-1);
  const today = formatDate();

  const morningBucket = [];
  const eveningBucket = [];
  const nightBucket = [];

  if (![8, 9, 10, 17, 18, 19, 21, 22, 23].includes(hour)) {
    console.log("⏭ Skipping hour", hour);
    return { message: `Skipping hour ${hour}` };
  }

  const usersSnapshot = await db.collection("users").get();

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      try {
        const user = userDoc.data();
        const uid = userDoc.id;
        const email = user?.authInfo?.email;
        if (!email) return;
        const intakeRef = db.collection("users").doc(uid).collection("intakeHistory");

        if ([8, 9, 10].includes(hour)) {
          const querySnapshot = await intakeRef.where("date", "==", yesterday).get();
          if (querySnapshot.empty) morningBucket.push(email);
        }

        if ([17, 18, 19].includes(hour)) {
          const querySnapshot = await intakeRef.where("date", "==", today).get();

          if (!querySnapshot.empty) {
            let totalCalories = 0;
            querySnapshot.forEach((doc) => {
              totalCalories += Number(doc.data()?.nutrition?.calories) || 0;
            });

            const recommended = Number(user?.recommendedIntake?.calories) || 2000;

            if (totalCalories < recommended * 0.6) {
              eveningBucket.push(email);
            }
          } else {
            eveningBucket.push(email);
          }
        }

        if ([21, 22, 23].includes(hour)) {
          const querySnapshot = await intakeRef.where("date", "==", today).get();
          if (!querySnapshot.empty) {
            nightBucket.push(email);
          }
        }
      } catch (err) {
        console.error(`Error processing user ${userDoc.id}:`, err);
      }
    })
  );

  await Promise.all([
    ...morningBucket.map((email) =>
      sendEmail(
        email,
        "Time to log your nutrition",
        `<p>Good morning! Looks like you didn’t log your intake yesterday. Let’s start today fresh! 🌞</p>`
      )
    ),
    ...eveningBucket.map((email) =>
      sendEmail(
        email,
        "You’re running low on fuel 🔋",
        `<p>You’re running low on calories/nutrients today. Time to fuel up! 💪</p>`
      )
    ),
    ...nightBucket.map((email) =>
      sendEmail(
        email,
        "Another day well served 🎉",
        `<p>Great job today! See you tomorrow for another healthy day. 🥗</p>`
      )
    ),
  ]);

  console.log(
    `📩 Emails sent — Morning: ${morningBucket.length} | Evening: ${eveningBucket.length} | Night: ${nightBucket.length}`
  );

  return {
    morning: morningBucket.length,
    evening: eveningBucket.length,
    night: nightBucket.length,
  };
}

exports.sendDailyReminders = functions.https.onRequest(async (req, res) => {
  try {
    const result = await runReminderEmails();
    res.status(200).send({ success: true, result });
  } catch (err) {
    console.error("Error running reminders:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});
