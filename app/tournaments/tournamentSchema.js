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
      url: String,
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
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
      },
    ],
    allMatches: [matchSchema],
    allSquads: [squadSchema],
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
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
