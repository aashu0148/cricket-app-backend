import MatchSchema from "./matchSchema.js";
import { createError, createResponse } from "#utils/util.js";
import {
  calculatePlayerFantasyPoints,
  getPlayersMatchStatsFromMatchData,
} from "#app/scoringSystems/scoringSystemServices.js";
import TournamentSchema from "#app/tournaments/tournamentSchema.js";
import ScoringSystemSchema from "#app/scoringSystems/scoringSystemSchema.js";

const getPopulatedMatchDetails = async (matchId) => {
  const match = await MatchSchema.findById(matchId)
    .populate("innings.inningBatsmen.player", "-stats")
    .populate("innings.inningBowlers.player", "-stats")
    .populate("innings.inningBowlers.detailedWickets.player", "-stats")
    .populate("innings.fieldings.fielder", "-stats")
    .populate("innings.fieldings.batsman", "-stats")
    .populate("innings.fieldings.bowler", "-stats");

  return match;
};

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

/**
 *
 * @param {string} matchId
 * @returns {{success:boolean,error:string}}
 */
const calculateAndStoreMatchPlayerPoints = async (matchId) => {
  try {
    const match = await getPopulatedMatchDetails(matchId);
    if (!match)
      return { success: false, error: `Match not found with id:${matchId}` };

    const tournament = await TournamentSchema.findById(match.tournament).select(
      "scoringSystem"
    );
    const scoringSystem = await ScoringSystemSchema.findById(
      tournament.scoringSystem
    );
    if (!scoringSystem)
      return {
        success: false,
        error: `Scoring system not found with id:${tournament.scoringSystem}`,
      };

    const allPLayersStats = getPlayersMatchStatsFromMatchData(match);

    const playerPoints = {};
    for (let playerId in allPLayersStats) {
      const stats = allPLayersStats[playerId];

      const points = calculatePlayerFantasyPoints(scoringSystem, stats);

      playerPoints[playerId] = {
        player: stats.player,
        points,
      };
    }

    const playerPointsArray = Object.keys(playerPoints).map((k) => ({
      player: k,
      points: playerPoints[k].points,
    }));

    await MatchSchema.updateOne(
      { _id: match._id },
      { playerPoints: playerPointsArray }
    );

    console.log(
      `🔢 Player points computed and stored for match: ${match.slug}`
    );
    return { success: true };
  } catch (error) {
    console.error("Error calculating points", error);
    return {
      success: false,
      error: error?.message || "Error calculating and storing points",
    };
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
    const match = await getPopulatedMatchDetails(matchId);

    if (!match) {
      return createError(res, "Match not found", 404);
    }

    return createResponse(res, match, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

export {
  insertMatchIntoDB,
  getMatchesForTournament,
  getMatchDetails,
  calculateAndStoreMatchPlayerPoints,
};
