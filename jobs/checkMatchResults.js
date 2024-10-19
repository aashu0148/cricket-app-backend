import mongoose from "mongoose";

import TournamentSchema from "#app/tournaments/tournamentSchema.js";

import { insertMatchesResultsToTournamentIfNeeded } from "#app/tournaments/tournamentServices.js";
import configs from "#utils/configs.js";

await mongoose.connect(configs.MONGO_URI);

async function startTournamentMatchDataCron() {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Find all ongoing tournaments or those finished in the last 2 days
    const tournaments = await TournamentSchema.find({
      $or: [
        { endDate: { $gte: twoDaysAgo, $lte: now } }, // Finished within the last 2 days
        { startDate: { $lte: now }, endDate: { $gte: now } }, // Ongoing tournaments
      ],
    }).lean();

    for (const tournament of tournaments) {
      await insertMatchesResultsToTournamentIfNeeded(tournament._id);
    }
  } catch (error) {
    console.error("Error in checking tournament match data:", error);
  } finally {
    // Close the database connection after job is done
    mongoose.connection.close();
  }
}

await startTournamentMatchDataCron();
process.exit(0);
