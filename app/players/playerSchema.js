import mongoose from "mongoose";

const statsSchema = new mongoose.Schema({
  heading: String,
  data: [
    {
      format: {
        type: String,
        required: true,
      },
      mat: String,
      inns: String,
      no: String,
      runs: String,
      hs: String,
      ave: String,
      bf: String,
      rr: String,
      "100s": String,
      "50s": String,
      "4s": String,
      "6s": String,
      balls: String,
      wkts: String,
      bbi: String,
      bbm: String,
      econ: String,
    },
  ],
});

const playerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
  },
  playerId: {
    type: Number,
    required: true,
    unique: true, // Ensures there's only one player with this ID
  },
  slug: {
    type: String,
    required: true,
  },
  playingRole: String,
  role: String,
  country: String,
  objectId: Number,
  espnUrl: String,
  image: String,

  // Stats (Nested Schema)
  stats: [statsSchema],
});

const PlayerSchema = mongoose.model("Player", playerSchema);

export default PlayerSchema;
