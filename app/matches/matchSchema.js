import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    teams: [
      {
        name: { type: String, required: true },
        longName: { type: String },
        slug: { type: String },
        objectId: String,
        score: { type: String, default: null },
        image: String,
        country: String,
      },
    ],
    innings: [
      {
        runs: { type: Number, default: null },
        wickets: { type: Number, default: null },
        target: { type: Number, default: null },
        overs: { type: Number, default: null },
        balls: { type: Number, default: null },
        totalOvers: { type: Number, default: null },
        totalBalls: { type: Number, default: null },
        wides: { type: Number, default: null },
        noballs: { type: Number, default: null },
        inningBatsmen: [
          {
            player: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Player",
              required: true,
            },
            position: Number,
            runs: { type: Number, default: null },
            balls: { type: Number, default: null },
            minutes: { type: Number, default: null },
            sixes: { type: Number, default: null },
            fours: { type: Number, default: null },
            strikerate: { type: Number, default: null },
            isOut: { type: Boolean, default: false },
            battedType: {
              type: String,
            },
          },
        ],
        inningBowlers: [
          {
            player: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Player",
              required: true,
            },
            bowledType: {
              type: String,
            },
            overs: { type: Number, default: null },
            balls: { type: Number, default: null },
            maidens: { type: Number, default: null },
            conceded: { type: Number, default: null },
            wickets: { type: Number, default: null },
            detailedWickets: [
              {
                player: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "Player",
                },
                runs: Number,
                balls: Number,
                position: Number,
              },
            ],
            economy: { type: Number, default: null },
            dots: { type: Number, default: null },
            fours: { type: Number, default: null },
            sixes: { type: Number, default: null },
            noballs: { type: Number, default: null },
            wides: { type: Number, default: null },
            runsPerBall: { type: Number, default: null },
          },
        ],
        fieldings: [
          {
            dismissalType: String,
            fielders: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Player",
              },
            ],
            batsman: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Player",
            },
            bowler: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Player",
            },
          },
        ],
      },
    ],
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    slug: String,
    objectId: String,
    matchId: String,
    status: String,
    statusText: String,
    startTime: String,
    amsr: {
      type: Number,
      default: null,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    playerPoints: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
        },
        points: { type: Number, default: 0 },
        breakdown: Array,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MatchSchema = mongoose.model("Match", matchSchema);

export default MatchSchema;
