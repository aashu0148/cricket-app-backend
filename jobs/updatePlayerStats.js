import mongoose from "mongoose";

import PlayerSchema from "#app/players/playerSchema.js";
import { updatePlayerStats } from "#app/players/playerServices.js";

import configs from "#utils/configs.js";

await mongoose.connect(configs.MONGO_URI);

async function updateOutdatedPlayerStats() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Find the first 100 players updated before yesterday
    const playersToUpdate = await PlayerSchema.find({
      $or: [
        { updatedAt: { $lt: yesterday } },
        { updatedAt: { $exists: false } },
      ],
    }).limit(250);

    console.log(
      `🏏 Updating Player Stats for ${playersToUpdate.length} players`
    );
    for (const player of playersToUpdate) {
      const res = await updatePlayerStats(player._id);
      if (res) console.log(`✔️ 🏏  ${player.name}`);
    }
    console.log(`✅ Updated Players Stats`);
  } catch (error) {
    console.error("Error updating player stats:", error);
  } finally {
    // Close the database connection after job is done
    mongoose.connection.close();
  }
}

await updateOutdatedPlayerStats();
process.exit(0);
