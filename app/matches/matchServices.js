import MatchSchema from "./matchSchema.js";
import { createError, createResponse } from "#utils/util.js";

/**
 *
 * @param {string} tournamentId
 * @param {object} matchData
 * @returns {{success:boolean,error:string,data:object}}
 */
const insertMatchIntoDB = async (tournamentId, matchData) => {
  try {
    // Check if a match with the same slug already exists in the tournament
    const existingMatch = await MatchSchema.findOne({
      tournament: tournamentId,
      matchId: matchData.matchId,
    });
    if (existingMatch) {
      return {
        success: true,
        data: existingMatch,
      };
    }

    // Create a new match document with the provided teams and innings data
    const newMatch = new MatchSchema({
      tournament: tournamentId,
      ...matchData,
    });

    const matchRes = await newMatch.save();
    return { success: true, data: matchRes };
  } catch (error) {
    console.log(`Error inserting match into database:`, error?.message);
    return { success: false, error: error.message || "Error inserting match" };
  }
};

const getMatchesForTournament = async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const matches = await MatchSchema.find({ tournament: tournamentId }).select(
      "-innings"
    );
    // .populate("innings.inningBatsmen.player","-stats")
    // .populate("innings.inningBowlers.player","-stats");

    return createResponse(res, matches, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

const getMatchDetails = async (req, res) => {
  const { matchId } = req.params;

  try {
    const match = await MatchSchema.findById(matchId)
      .populate("innings.inningBatsmen.player", "-stats")
      .populate("innings.inningBowlers.player", "-stats")
      .populate("innings.fieldings.fielder", "-stats")
      .populate("innings.fieldings.batsman", "-stats")
      .populate("innings.fieldings.bowler", "-stats");

    if (!match) {
      return createError(res, "Match not found", 404);
    }

    return createResponse(res, match, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

export { insertMatchIntoDB, getMatchesForTournament, getMatchDetails };
