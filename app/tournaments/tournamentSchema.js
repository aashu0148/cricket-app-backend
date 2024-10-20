import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  slug: String,
  startDate: Date,
  endDate: Date,
  startTime: Date,
  matchId: String,
  objectId: String,
  isCancelled: Boolean,
  format: String,
  statusText: String,
  teams: [
    {
      slug: String,
      name: String,
      country: String,
      image: String,
    },
  ],
});

const squadSchema = new mongoose.Schema({
  squadId: String,
  objectId: String,
  slug: String,
  teamSlug: String,
  teamName: String,
  teamImage: String,
  title: String,
});

const schema = new mongoose.Schema(
  {
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    playerPoints: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
        },
        points: Number,
      },
    ],
    scoringSystem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoringSystem",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    longName: String,
    season: String,
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    allMatches: [matchSchema],
    allSquads: [squadSchema],
    players: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
        },
        squadId: String,
      },
    ],
    slug: String,
    objectId: String,
  },
  {
    timestamps: true,
  }
);

const TournamentSchema = mongoose.model("Tournament", schema);

export default TournamentSchema;
