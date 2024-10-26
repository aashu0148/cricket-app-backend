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
 * @param {boolean} onlyCalculate
 * @returns {{success:boolean,error:string}}
 */
const calculateAndStoreMatchPlayerPoints = async (
  matchId,
  onlyCalculate = false
) => {
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
    let amsr = null;
    for (let playerId in allPLayersStats) {
      const stats = allPLayersStats[playerId];

      const pointsRes = calculatePlayerFantasyPoints(scoringSystem, stats);

      if (!amsr) amsr = pointsRes.amsr;

      playerPoints[playerId] = {
        player: stats.player,
        ...pointsRes,
        amsr,
      };

      if (onlyCalculate) playerPoints[playerId].stats = stats;
    }

    if (onlyCalculate) {
      const arr = Object.keys(playerPoints).map((k) => ({
        _id: k,
        ...playerPoints[k],
      }));

      return { success: true, data: arr };
    }

    const playerPointsArray = Object.keys(playerPoints).map((k) => ({
      player: k,
      points: playerPoints[k].points,
      breakdown: playerPoints[k].breakdown,
    }));

    await MatchSchema.updateOne(
      { _id: match._id },
      { playerPoints: playerPointsArray, amsr }
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

const getMatchPointsData = async (req, res) => {
  const { id } = req.params;

  const { data } = await calculateAndStoreMatchPlayerPoints(id, true);

  createResponse(res, data);
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

// Paginated Get All Matches
const getAllMatches = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const matches = await MatchSchema.find({})
      .select("-innings")
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const totalMatches = await MatchSchema.countDocuments();
    const totalPages = Math.ceil(totalMatches / limit);

    return createResponse(res, matches, 200, { total, totalPages });
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

// Delete a Match
const deleteMatch = async (req, res) => {
  const { matchId } = req.params;

  try {
    const deletedMatch = await MatchSchema.findByIdAndDelete(matchId);
    if (!deletedMatch) return createError(res, "Match not found", 404);

    return createResponse(res, { message: "Match deleted successfully" }, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

export {
  insertMatchIntoDB,
  getMatchesForTournament,
  getMatchDetails,
  calculateAndStoreMatchPlayerPoints,
  getMatchPointsData,
  getAllMatches,
  deleteMatch,
};
