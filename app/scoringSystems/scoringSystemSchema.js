import mongoose from "mongoose";

const scoringSystemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Scoring system name is required."],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long."],
    },

    // Batting Points
    batting: {
      runPoints: {
        type: Number,
        default: 1,
        min: [0, "Run points must be a positive number."],
      },
      boundaryPoints: [
        {
          minRate: {
            type: Number,
            required: [true, "Minimum rate is required for boundary points."],
            min: [0, "Minimum rate must be 0 or higher."],
          },
          maxRate: {
            type: Number,
            required: [true, "Maximum rate is required for boundary points."],
            min: [0, "Maximum rate must be 0 or higher."],
            validate: {
              validator: function (value) {
                return value >= this.minRate;
              },
              message:
                "Maximum rate must be greater than or equal to the minimum rate.",
            },
          },
          four: {
            type: Number,
            default: 0,
            required: [true, "Points for hitting a four are required."],
            min: [0, "Points for hitting a four must be a positive number."],
          },
          six: {
            type: Number,
            default: 0,
            required: [true, "Points for hitting a six are required."],
            min: [0, "Points for hitting a six must be a positive number."],
          },
        },
      ],
      runMilestoneBonus: {
        milestones: [
          {
            runsUpto: {
              type: Number,
              required: [true, "Milestone runs are required."],
              min: [0, "Milestone runs must be a positive number."],
            },
            points: {
              type: Number,
              required: [true, "Points for the milestone are required."],
              min: [0, "Milestone points must be a positive number."],
            },
          },
        ],
        negativeRunsExemptPositions: {
          type: [Number],
          default: [8, 9, 10, 11],
          validate: {
            validator: function (positions) {
              return positions.every(
                (pos) => Number.isInteger(pos) && pos >= 1 && pos <= 11
              );
            },
            message: "Positions must be integers between 1 and 11.",
          },
        },
      },
      strikeRateBonus: {
        multiplierRanges: [
          {
            battingPositions: {
              type: [Number],
              validate: {
                validator: function (positions) {
                  return positions.every(
                    (pos) => Number.isInteger(pos) && pos >= 1 && pos <= 11
                  );
                },
                message: "Batting positions must be integers between 1 and 11.",
              },
            },
            minBalls: {
              type: Number,
              required: [
                true,
                "Minimum balls are required for strike rate bonus.",
              ],
              min: [1, "Minimum balls must be at least 1."],
            },
            maxBalls: {
              type: Number,
              required: [
                true,
                "Maximum balls are required for strike rate bonus.",
              ],
              min: [1, "Maximum balls must be at least 1."],
              validate: {
                validator: function (value) {
                  return value >= this.minBalls;
                },
                message:
                  "Maximum balls must be greater than or equal to minimum balls.",
              },
            },
            multiplier: {
              type: Number,
              required: [true, "Multiplier for strike rate bonus is required."],
              min: [0, "Multiplier must be a positive number."],
            },
          },
        ],
        minBallsRequired: {
          type: Number,
          default: 5,
          min: [1, "Minimum balls required must be at least 1."],
        },
      },
    },

    // Bowling Points
    bowling: {
      wicketPoints: [
        {
          minBattingPosition: {
            type: Number,
            required: [
              true,
              "Minimum batting position is required for wicket points.",
            ],
            min: [1, "Minimum batting position must be at least 1."],
            max: [11, "Minimum batting position cannot exceed 11."],
          },
          maxBattingPosition: {
            type: Number,
            required: [
              true,
              "Maximum batting position is required for wicket points.",
            ],
            min: [1, "Maximum batting position must be at least 1."],
            max: [11, "Maximum batting position cannot exceed 11."],
            validate: {
              validator: function (value) {
                return value >= this.minBattingPosition;
              },
              message:
                "Maximum batting position must be greater than or equal to minimum batting position.",
            },
          },
          points: {
            type: Number,
            required: [true, "Points for the wicket are required."],
            min: [0, "Wicket points must be a positive number."],
          },
          runsCapForIncrementingPoints: {
            type: Number,
            min: [0, "Runs cap must be a positive number."],
          },
          incrementedPoints: {
            type: Number,
            min: [0, "Incremented points must be a positive number."],
          },
        },
      ],
      dotBallPoints: [
        {
          minRate: {
            type: Number,
            required: [true, "Minimum rate is required for dot ball points."],
            min: [0, "Minimum rate must be 0 or higher."],
          },
          maxRate: {
            type: Number,
            required: [true, "Maximum rate is required for dot ball points."],
            min: [0, "Maximum rate must be 0 or higher."],
            validate: {
              validator: function (value) {
                return value >= this.minRate;
              },
              message:
                "Maximum rate must be greater than or equal to the minimum rate.",
            },
          },
          points: {
            type: Number,
            required: [true, "Points for dot balls are required."],
            min: [0, "Dot ball points must be a positive number."],
          },
        },
      ],
      wicketMilestoneBonus: [
        {
          minWickets: {
            type: Number,
            required: [
              true,
              "Minimum wickets are required for milestone bonus.",
            ],
            min: [0, "Minimum wickets must be a positive number."],
          },
          maxWickets: {
            type: Number,
            required: [
              true,
              "Maximum wickets are required for milestone bonus.",
            ],
            min: [0, "Maximum wickets must be a positive number."],
            validate: {
              validator: function (value) {
                return value >= this.minWickets;
              },
              message:
                "Maximum wickets must be greater than or equal to minimum wickets.",
            },
          },
          points: {
            type: Number,
            required: [true, "Points for the milestone bonus are required."],
            min: [0, "Milestone points must be a positive number."],
          },
        },
      ],
      economyRateBonus: {
        multiplierRanges: [
          {
            minBallsBowled: {
              type: Number,
              required: [
                true,
                "Minimum balls bowled are required for economy rate bonus.",
              ],
              min: [1, "Minimum balls bowled must be at least 1."],
            },
            maxBallsBowled: {
              type: Number,
              required: [
                true,
                "Maximum balls bowled are required for economy rate bonus.",
              ],
              min: [1, "Maximum balls bowled must be at least 1."],
              validate: {
                validator: function (value) {
                  return value >= this.minBallsBowled;
                },
                message:
                  "Maximum balls bowled must be greater than or equal to minimum balls bowled.",
              },
            },
            multiplier: {
              type: Number,
              required: [
                true,
                "Multiplier for economy rate bonus is required.",
              ],
              min: [0, "Multiplier must be a positive number."],
            },
          },
        ],
        minBowledBallsRequired: {
          type: Number,
          default: 6,
          min: [1, "Minimum bowled balls required must be at least 1."],
        },
      },
    },

    // Fielding Points
    fielding: {
      catchPoints: {
        type: Number,
        default: 5,
        min: [0, "Catch points must be a positive number."],
      },
      stumpingPoints: {
        type: Number,
        default: 5,
        min: [0, "Stumping points must be a positive number."],
      },
      directHitRunOutPoints: {
        type: Number,
        default: 15,
        min: [0, "Direct hit run-out points must be a positive number."],
      },
    },
  },
  { timestamps: true }
);

const ScoringSystemSchema = mongoose.model(
  "ScoringSystem",
  scoringSystemSchema
);

export default ScoringSystemSchema;
