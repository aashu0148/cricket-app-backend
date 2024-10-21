import mongoose from "mongoose";

import TournamentSchema from "#app/tournaments/tournamentSchema.js";
import MatchSchema from "#app/matches/matchSchema.js";

import { sendTournamentResultsEmail } from "#app/emails/emailServices";
import { insertMatchesResultsToTournamentIfNeeded } from "#app/tournaments/tournamentServices.js";
import configs from "#utils/configs.js";

await mongoose.connect(configs.MONGO_URI);

async function startTournamentMatchDataCron() {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Find all ongoing tournaments or those finished in the last 2 days
    const tournaments = await TournamentSchema.find({
      $and: [
        { completed: false }, // Only tournaments where completed is false
        {
          $or: [
            { endDate: { $gte: twoDaysAgo, $lte: now } }, // Finished within the last 2 days
            { startDate: { $lte: now }, endDate: { $gte: now } }, // Ongoing tournaments
          ],
        },
      ],
    }).lean();

    for (const tournament of tournaments) {
      await insertMatchesResultsToTournamentIfNeeded(tournament._id);

      const matchIds = tournament.allMatches.map((e) => e.objectId);
      const totalMatches = matchIds.length;
      const completedMatches = await MatchSchema.find({
        objectId: {
          $in: matchIds,
        },
      })
        .select("-innings")
        .lean();

      if (completedMatches.length === totalMatches) {
        // tournament is completed
        console.log(
          `${tournament.name} is now completed, computing playerPoints and making this one as completed ✅`
        );

        const allPlayerPoints = completedMatches
          .reduce((acc, curr) => [...acc, ...curr.playerPoints], [])
          .reduce((acc, curr) => {
            const player = acc.find(
              (p) => p.player.toString() === curr.player.toString()
            );
            if (player) player.points += curr.points;
            else acc.push({ ...curr }); // important to destructure so that we do not update points in completedMatches

            return acc;
          }, []);

        await TournamentSchema.updateOne(
          { _id: tournament._id },
          { completed: true, playerPoints: allPlayerPoints }
        );

        sendTournamentResultsEmail({ tournamentId: tournament._id });
      }
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
