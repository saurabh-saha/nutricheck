let db;

function initFirestore(adminInstance) {
  db = adminInstance.firestore();
}

const getUsers = () => db.collection("users").get();

const getUserIntake = (uid, date) =>
  db.collection("users").doc(uid).collection("intakeHistory").where("date", "==", date).get();

module.exports = {
  initFirestore,
  getUsers,
  getUserIntake,
};
