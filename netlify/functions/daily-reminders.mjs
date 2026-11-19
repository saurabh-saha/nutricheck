// Scheduled email reminders (replaces the old Firebase sendDailyReminders,
// which was never scheduled). Runs at 10:00 and 20:00 India time.
import { getDb, makeSender } from '../lib/services.mjs';
import { runReminders } from '../lib/reminders.mjs';
import * as advice from '../lib/advice.mjs';

export default async () => {
  try {
    const result = await runReminders({ db: getDb(), send: makeSender(), advice });
    console.log('Reminders:', JSON.stringify(result));
  } catch (err) {
    console.error('Reminders failed:', err.message);
  }
};

// 04:30 and 14:30 UTC = 10:00 and 20:00 IST
export const config = { schedule: '30 4,14 * * *' };
