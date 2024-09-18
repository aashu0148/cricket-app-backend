import MatchSchema from "./matchSchema.js";
import { createError, createResponse } from "#utils/util.js";

// Insert match into the database (can be used independently)
const insertMatch = async (tournamentId, matchData) => {
  const { status, statusText, slug, teams, innings } = matchData;

  try {
    // Check if a match with the same slug already exists in the tournament
    const existingMatch = await MatchSchema.findOne({
      tournament: tournamentId,
      slug,
    });
    if (existingMatch) {
      return {
        success: false,
        error: "Match with this slug already exists in the tournament",
      };
    }

    // TODO: find a way to do this
    // Prepare innings data by mapping player references
    const processedInnings = innings.map((inning) => {
      return {
        ...inning,
        inningBatsmen: inning.inningBatsmen.map((batsman) => ({
          player: batsman.player, // Assume player is already a reference ID to player collection
          runs: batsman.runs ?? null,
          balls: batsman.balls ?? null,
          minutes: batsman.minutes ?? null,
          sixes: batsman.sixes ?? null,
          fours: batsman.fours ?? null,
          strikerate: batsman.strikerate ?? null,
          isOut: batsman.isOut ?? null,
          battedType: batsman.battedType ?? null,
        })),
        inningBowlers: inning.inningBowlers.map((bowler) => ({
          player: bowler.player, // Assume player is already a reference ID to player collection
          bowledType: bowler.bowledType ?? null,
          overs: bowler.overs ?? null,
          balls: bowler.balls ?? null,
          maidens: bowler.maidens ?? null,
          conceded: bowler.conceded ?? null,
          wickets: bowler.wickets ?? null,
          economy: bowler.economy ?? null,
          dots: bowler.dots ?? null,
          fours: bowler.fours ?? null,
          sixes: bowler.sixes ?? null,
          noballs: bowler.noballs ?? null,
          wides: bowler.wides ?? null,
          runPerBall: bowler.runPerBall ?? null,
        })),
      };
    });

    // Create a new match document with the provided teams and innings data
    const newMatch = new MatchSchema({
      tournament: tournamentId,
      slug,
      teams,
      status,
      statusText,
      innings: processedInnings,
    });

    await newMatch.save();
    return { success: true, data: newMatch };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
const getMatchesForTournament = async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const matches = await MatchSchema.find({ tournament: tournamentId })
      .populate("innings.inningBatsmen.player")
      .populate("innings.inningBowlers.player");

    return createResponse(res, matches, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

const getMatchDetails = async (req, res) => {
  const { matchId } = req.params;

  try {
    const match = await MatchSchema.findById(matchId)
      .populate("innings.inningBatsmen.player")
      .populate("innings.inningBowlers.player");

    if (!match) {
      return createError(res, "Match not found", 404);
    }

    return createResponse(res, match, 200);
  } catch (error) {
    return createError(res, error.message, 500);
  }
};

export { insertMatch, getMatchesForTournament, getMatchDetails };
