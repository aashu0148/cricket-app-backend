import mongoose from "mongoose";

import { leagueTypeEnum } from "#utils/enums.js";

const leagueSchema = new mongoose.Schema(
  {
    // League Name
    name: { type: String, required: true, trim: true },

    // Tournament
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },

    // League Description (Optional)
    description: { type: String, trim: true },

    // League type: Public or Private
    type: {
      type: String,
      enum: Object.values(leagueTypeEnum),
      required: true,
      default: leagueTypeEnum.PUBLIC,
    },

    // Password (for private leagues)
    password: String,

    // Owner of the League
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Teams participating in the league
    teams: [
      {
        owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        players: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
          },
        ],
        joinedAt: { type: Date, default: Date.now },

        // Wishlist for preferred players before the draft
        wishlist: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
          },
        ],
      },
    ],

    // Draft rounds details
    draftRound: {
      completed: Boolean,
      startDate: { type: Date, required: true },
    },
  },
  { timestamps: true }
);

const LeagueSchema = mongoose.model("League", leagueSchema);

export default LeagueSchema;
