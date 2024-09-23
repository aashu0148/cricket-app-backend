import ScoringSystemSchema from "./scoringSystemSchema.js";
import { createError, createResponse } from "#utils/util.js";
import { playerDismissalTypeEnum } from "#utils/enums.js";

// Create a new scoring system
const createScoringSystem = async (req, res) => {
  try {
    const scoringSystem = new ScoringSystemSchema(req.body);
    await scoringSystem
      .save()
      .then((s) => createResponse(res, s, 201))
      .catch((err) => createError(res, err?.message, 500, err));
  } catch (error) {
    createError(
      res,
      error?.message || "Failed to create scoring system",
      500,
      error
    );
  }
};

// Get all scoring systems
const getAllScoringSystems = async (req, res) => {
  try {
    const result = await ScoringSystemSchema.find().sort({ createdAt: -1 });

    createResponse(res, result, 200);
  } catch (error) {
    createError(res, error?.message || "Server error", 500, error);
  }
};

// Get scoring system by ID
const getScoringSystemById = async (req, res) => {
  const { id } = req.params;
  try {
    const scoringSystem = await ScoringSystemSchema.findById(id);
    if (!scoringSystem) {
      return createError(res, "Scoring system not found", 404);
    }

    createResponse(res, scoringSystem, 200);
  } catch (error) {
    createError(res, error?.message || "Server error", 500, error);
  }
};

// Update scoring system by ID
const updateScoringSystem = async (req, res) => {
  try {
    const updatedScoringSystem = await ScoringSystemSchema.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedScoringSystem) {
      return createError(res, "Scoring system not found", 404);
    }

    createResponse(res, updatedScoringSystem, 200);
  } catch (error) {
    createError(
      res,
      error?.message || "Failed to update scoring system",
      500,
      error
    );
  }
};

// Delete scoring system by ID
const deleteScoringSystem = async (req, res) => {
  try {
    const deletedScoringSystem = await ScoringSystemSchema.findOneAndDelete({
      id: req.params.id,
    });

    if (!deletedScoringSystem) {
      return createError(res, "Scoring system not found", 404);
    }

    createResponse(res, "Scoring system deleted successfully", 200);
  } catch (error) {
    createError(
      res,
      error?.message || "Failed to delete scoring system",
      500,
      error
    );
  }
};

function getPlayersMatchStatsFromMatchData(matchData) {
  const playerStats = {};

  // Helper function to initialize player stats
  const initializeStats = (playerId, player = {}) => {
    if (!playerStats[playerId]) {
      playerStats[playerId] = {
        player: {
          name: player.name,
          fullName: player.fullName,
          _id: player._id,
        },
        team: {},
        opponentTeam: {},
        batting: {},
        bowling: {},
        fielding: {
          [playerDismissalTypeEnum.caught]: 0,
          [playerDismissalTypeEnum.stumped]: 0,
          [playerDismissalTypeEnum.runOut]: 0,
        },
      };
    }
  };

  // Parse batting stats (only one per player)
  for (let i = 0; i < matchData.innings.length; ++i) {
    const inning = matchData.innings[i];
    const otherInning = matchData.innings[i === 0 ? 1 : 0];

    inning.inningBatsmen.forEach((batsman) => {
      const {
        player,
        position,
        runs,
        balls,
        minutes,
        sixes,
        fours,
        strikerate,
        isOut,
        battedType,
      } = batsman;
      const playerId = player._id;
      initializeStats(playerId, player);

      // update team for this player
      playerStats[playerId].team = {
        runs: inning.runs,
        balls: inning.balls,
      };

      // update opponent for this player
      playerStats[playerId].opponentTeam = {
        runs: otherInning.runs,
        balls: otherInning.balls,
      };

      // Only one batting entry per player, so we assign directly
      playerStats[playerId].batting = {
        position,
        runs,
        balls,
        minutes,
        sixes,
        fours,
        strikerate,
        isOut,
        battedType,
      };
    });
  }

  // Parse bowling stats (only one per player)
  matchData.innings.forEach((inning) => {
    inning.inningBowlers.forEach((bowler) => {
      const {
        balls,
        player,
        overs,
        maidens,
        conceded,
        wickets,
        detailedWickets,
        economy,
        dots,
        fours,
        sixes,
        noballs,
        wides,
        runsPerBall,
      } = bowler;
      const playerId = player._id;
      initializeStats(playerId, player);

      // Only one bowling entry per player, so we assign directly
      playerStats[playerId].bowling = {
        overs,
        balls,
        maidens,
        conceded,
        wickets,
        economy,
        dots,
        fours,
        sixes,
        noballs,
        wides,
        runsPerBall,
        wicketPlayerDetails: detailedWickets.map((item) => ({
          runs: item.runs,
          balls: item.balls,
          position: item.position,
        })),
      };
    });
  });

  // Parse fielding stats (sum multiple contributions)
  matchData.innings.forEach((inning) => {
    inning.fieldings.forEach((dismissal) => {
      const { dismissalType, fielder } = dismissal;
      const fielderId = fielder._id;

      // Initialize stats for the fielder if not already initialized
      initializeStats(fielderId, fielder);

      // Update fielding stats based on the dismissal type
      if (dismissalType === playerDismissalTypeEnum.caught) {
        playerStats[fielderId].fielding[playerDismissalTypeEnum.caught] += 1;
      } else if (dismissalType === playerDismissalTypeEnum.stumped) {
        playerStats[fielderId].fielding[playerDismissalTypeEnum.stumped] += 1;
      } else if (dismissalType === playerDismissalTypeEnum.runOut) {
        playerStats[fielderId].fielding[playerDismissalTypeEnum.runOut] += 1;
      }
    });
  });

  return playerStats;
}

// Calculate total points of a player based on the scoring system
function calculatePlayerFantasyPoints(scoringSystem, playerMatchData) {
  let totalPoints = 0;

  // Calculate average scoring rate

  const averageScoringRateOfMatch = parseFloat(
    (
      (playerMatchData.team.runs + playerMatchData.opponentTeam.runs) /
      (playerMatchData.team.balls + playerMatchData.opponentTeam.balls)
    ).toFixed(2)
  );

  // --- Batting Points Calculation ---
  if (playerMatchData.batting && playerMatchData.batting.battedType === "yes") {
    // 1. Runs scored points
    totalPoints +=
      playerMatchData.batting.runs * scoringSystem.batting.runPoints;

    // 2. Boundary points
    const boundaryRule = scoringSystem.batting.boundaryPoints.find(
      (rule) =>
        averageScoringRateOfMatch >= rule.minRate &&
        averageScoringRateOfMatch <= rule.maxRate
    );
    if (boundaryRule) {
      totalPoints += playerMatchData.batting.fours * boundaryRule.four;
      totalPoints += playerMatchData.batting.sixes * boundaryRule.six;
    }

    // 3. Runs scored milestone bonus
    const milestoneRule = scoringSystem.batting.runMilestoneBonus.milestones
      .sort((a, b) => (a.runsUpto < b.runsUpto ? -1 : 1))
      .find((m) => playerMatchData.batting.runs <= m.runsUpto);
    if (milestoneRule) {
      if (
        !scoringSystem.batting.runMilestoneBonus.negativeRunsExemptPositions.includes(
          playerMatchData.batting.position
        ) &&
        playerMatchData.batting.runs >= 1 &&
        playerMatchData.batting.balls >= 10 &&
        playerMatchData.batting.isOut
      ) {
        totalPoints += milestoneRule.points;
      }
    }

    // 4. Batting Strike Rate Bonus
    if (
      playerMatchData.batting.balls >=
      scoringSystem.batting.strikeRateBonus.minBallsRequired
    ) {
      const multiplierRule =
        scoringSystem.batting.strikeRateBonus.multiplierRanges.find(
          (rule) =>
            playerMatchData.batting.balls >= rule.minBalls &&
            playerMatchData.batting.balls <= rule.maxBalls &&
            rule.battingPositions.includes(playerMatchData.batting.position)
        );

      if (multiplierRule) {
        const strikeRateBonus =
          multiplierRule.multiplier *
          (playerMatchData.batting.runs -
            averageScoringRateOfMatch * playerMatchData.batting.balls);
        totalPoints += Math.round(strikeRateBonus);
      }
    }
  }

  // --- Bowling Points Calculation ---
  if (playerMatchData.bowling && playerMatchData.bowling.overs) {
    // 1. Wickets points
    playerMatchData.bowling.wicketPlayerDetails.forEach((p) => {
      const wicketRule = scoringSystem.bowling.wicketPoints.find(
        (rule) =>
          p.position >= rule.minBattingPosition &&
          p.position <= rule.maxBattingPosition
      );

      if (wicketRule) {
        if (p.runs >= wicketRule.runsCapForIncrementingPoints) {
          totalPoints += wicketRule.incrementedPoints;
        } else {
          totalPoints += wicketRule.points;
        }
      }
    });

    // 2. Dot ball points
    const dotBallRule = scoringSystem.bowling.dotBallPoints.find(
      (rule) =>
        averageScoringRateOfMatch >= rule.minRate &&
        averageScoringRateOfMatch <= rule.maxRate
    );
    if (dotBallRule) {
      totalPoints += playerMatchData.bowling.dots * dotBallRule.points;
    }

    // 3. Wickets milestone bonus
    const milestoneRule = scoringSystem.bowling.wicketMilestoneBonus.find(
      (rule) =>
        playerMatchData.bowling.wickets >= rule.minWickets &&
        playerMatchData.bowling.wickets <= rule.maxWickets
    );
    if (milestoneRule) {
      totalPoints += milestoneRule.points;
    }

    // 4. Bowling Economy Rate Bonus
    if (
      playerMatchData.bowling.balls >=
      scoringSystem.bowling.economyRateBonus.minBowledBallsRequired
    ) {
      const economyBonusRule =
        scoringSystem.bowling.economyRateBonus.multiplierRanges.find(
          (rule) =>
            playerMatchData.bowling.balls >= rule.minBallsBowled &&
            playerMatchData.bowling.balls <= rule.maxBallsBowled
        );

      if (economyBonusRule) {
        const economyBonus =
          economyBonusRule.multiplier *
          (averageScoringRateOfMatch * playerMatchData.bowling.balls -
            playerMatchData.bowling.conceded);
        totalPoints += Math.round(economyBonus);
      }
    }
  }

  // --- Fielding Points Calculation ---
  if (playerMatchData.fielding) {
    totalPoints +=
      playerMatchData.fielding[playerDismissalTypeEnum.caught] *
      scoringSystem.fielding.catchPoints;
    totalPoints +=
      playerMatchData.fielding[playerDismissalTypeEnum.stumped] *
      scoringSystem.fielding.stumpingPoints;
    totalPoints +=
      playerMatchData.fielding[playerDismissalTypeEnum.runOut] *
      scoringSystem.fielding.directHitRunOutPoints;
  }

  // Return the rounded total points
  return Math.round(totalPoints);
}

export {
  getAllScoringSystems,
  createScoringSystem,
  getScoringSystemById,
  updateScoringSystem,
  deleteScoringSystem,
  calculatePlayerFantasyPoints,
  getPlayersMatchStatsFromMatchData,
};
