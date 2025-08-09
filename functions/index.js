const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { runReminderEmails } = require("./reminders/runReminders");
const firestore = require("./lib/firestore");

admin.initializeApp();

firestore.initFirestore(admin); // initialize Firestore here

exports.sendDailyReminders = functions.https.onRequest(async (req, res) => {
  try {
    const result = await runReminderEmails();
    res.status(200).send({ success: true, result });
  } catch (err) {
    console.error("Error running reminders:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});
