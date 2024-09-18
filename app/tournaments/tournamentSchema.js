import mongoose from "mongoose";

import { tournamentStatusEnum } from "#utils/enums";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(tournamentStatusEnum),
      default: tournamentStatusEnum.UPCOMING,
    },
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
      },
    ],
    slug: String,
  },
  {
    timestamps: true,
  }
);

const TournamentSchema = mongoose.model("Tournament", schema);

export default TournamentSchema;
