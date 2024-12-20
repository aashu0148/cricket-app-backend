import mongoose from "mongoose";

import UserSchema from "#app/users/userSchema.js"; // this import is very important as we are here registering the User module which we will user to populate teams.owner in a league later while sending email
import LeagueSchema from "#app/leagues/leagueSchema.js";

import { sendDraftRoundReminderEmail } from "#app/emails/emailServices.js";
import configs from "#utils/configs.js";

await mongoose.connect(configs.MONGO_URI);

async function startDraftRoundReminderCron() {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Find leagues where the draft round hasn't started and starts within the next hour
    const leagues = await LeagueSchema.find({
      "draftRound.completed": false,
      "draftRound.startDate": { $gte: now, $lte: oneHourLater },
    });

    for (const league of leagues) {
      await sendDraftRoundReminderEmail({ leagueId: league._id });
    }
  } catch (error) {
    console.error("Error in sending draft round reminders:", error);
  } finally {
    // Close the database connection after job is done
    mongoose.connection.close();
  }
}

await startDraftRoundReminderCron();
process.exit(0);
