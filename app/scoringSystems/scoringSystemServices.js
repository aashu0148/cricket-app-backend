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

function getPlayerMatchStatsFromMatchData(matchData) {
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
  matchData.innings.forEach((inning) => {
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
  });

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
function calculatePlayerFantasyPoints(scoringSystem, playerData) {
  let totalPoints = 0;

  // Calculate average scoring rate
  const averageScoringRate = scoringSystem.matchRuns / scoringSystem.matchBalls;
  const avgRate = parseFloat(averageScoringRate.toFixed(2));

  // --- Batting Points Calculation ---
  if (playerData.batting && playerData.batting.battedType === "yes") {
    // 1. Runs scored points
    totalPoints += playerData.batting.runs * scoringSystem.batting.runPoints;

    // 2. Boundary points
    const boundaryRule = scoringSystem.batting.boundaryPoints.find(
      (rule) => avgRate >= rule.minRate && avgRate <= rule.maxRate
    );
    if (boundaryRule) {
      totalPoints += playerData.batting.fours * boundaryRule.four;
      totalPoints += playerData.batting.sixes * boundaryRule.six;
    }

    // 3. Runs scored milestone bonus
    const milestoneRule =
      scoringSystem.batting.runMilestoneBonus.milestones.find(
        (m) => playerData.batting.runs <= m.runsUpto
      );
    if (milestoneRule) {
      if (
        !scoringSystem.batting.runMilestoneBonus.negativeRunsExemptPositions.includes(
          playerData.batting.position
        ) &&
        playerData.batting.runs >= 1 &&
        playerData.batting.balls >= 10 &&
        playerData.batting.isOut
      ) {
        totalPoints += milestoneRule.points;
      }
    }

    // 4. Batting Strike Rate Bonus
    if (
      playerData.batting.balls >=
      scoringSystem.batting.strikeRateBonus.minBallsRequired
    ) {
      const multiplierRule =
        scoringSystem.batting.strikeRateBonus.multiplierRanges.find(
          (rule) =>
            playerData.batting.balls >= rule.minBalls &&
            playerData.batting.balls <= rule.maxBalls &&
            rule.battingPositions.includes(playerData.batting.position)
        );

      if (multiplierRule) {
        const strikeRateBonus =
          multiplierRule.multiplier *
          (playerData.batting.runs - avgRate * playerData.batting.balls);
        totalPoints += Math.round(strikeRateBonus);
      }
    }
  }

  // --- Bowling Points Calculation ---
  if (playerData.bowling) {
    // 1. Wickets points
    playerData.bowling.wickets.forEach((wicket) => {
      const wicketRule = scoringSystem.bowling.wicketPoints.find(
        (rule) =>
          wicket.battingPosition >= rule.minBattingPosition &&
          wicket.battingPosition <= rule.maxBattingPosition
      );
      if (wicketRule) {
        totalPoints += wicketRule.points;
        if (wicket.batterRuns >= wicketRule.runsCapForIncrementingPoints) {
          totalPoints += wicketRule.incrementedPoints;
        }
      }
    });

    // 2. Dot ball points
    const dotBallRule = scoringSystem.bowling.dotBallPoints.find(
      (rule) => avgRate >= rule.minRate && avgRate <= rule.maxRate
    );
    if (dotBallRule) {
      totalPoints += playerData.bowling.dots * dotBallRule.points;
    }

    // 3. Wickets milestone bonus
    const milestoneRule = scoringSystem.bowling.wicketMilestoneBonus.find(
      (rule) =>
        playerData.bowling.wickets >= rule.minWickets &&
        playerData.bowling.wickets <= rule.maxWickets
    );
    if (milestoneRule) {
      totalPoints += milestoneRule.points;
    }

    // 4. Bowling Economy Rate Bonus
    if (
      playerData.bowling.balls >=
      scoringSystem.bowling.economyRateBonus.minBowledBallsRequired
    ) {
      const economyBonusRule =
        scoringSystem.bowling.economyRateBonus.multiplierRanges.find(
          (rule) =>
            playerData.bowling.balls >= rule.minBallsBowled &&
            playerData.bowling.balls <= rule.maxBallsBowled
        );

      if (economyBonusRule) {
        const economyBonus =
          economyBonusRule.multiplier *
          (avgRate * playerData.bowling.balls - playerData.bowling.conceded);
        totalPoints += Math.round(economyBonus);
      }
    }
  }

  // --- Fielding Points Calculation ---
  if (playerData.fielding) {
    totalPoints +=
      playerData.fielding[playerDismissalTypeEnum.caught] *
      scoringSystem.fielding.catchPoints;
    totalPoints +=
      playerData.fielding[playerDismissalTypeEnum.stumped] *
      scoringSystem.fielding.stumpingPoints;
    totalPoints +=
      playerData.fielding[playerDismissalTypeEnum.runOut] *
      scoringSystem.fielding.directHitRunOutPoints;
  }

  // Return the rounded total points
  return Math.round(totalPoints);
}

export {
  createScoringSystem,
  getScoringSystemById,
  updateScoringSystem,
  deleteScoringSystem,
  calculatePlayerFantasyPoints,
  getPlayerMatchStatsFromMatchData,
};
