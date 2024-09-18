import PlayerSchema from "./playerSchema.js";
import { createError, createResponse } from "#utils/util.js";

// Bulk insert players into the database
// const bulkInsertPlayers = async (req, res) => {
//   try {
//     // Insert players into the database
//     const insertedPlayers = await PlayerSchema.insertMany(
//       data.map((e) => ({
//         ...e,
//         playerId: e.id,
//         fullName: e.full_name,
//         objectId: e.object_id,
//         espnUrl: e.url,
//       })),
//       {
//         ordered: false,
//       }
//     );

//     // Respond with inserted players
//     createResponse(res, insertedPlayers, 201);
//   } catch (error) {
//     console.error(error); // Log error for debugging

//     // Check if it's a duplicate key error
//     if (error.name === "BulkWriteError" && error.code === 11000) {
//       return createError(
//         res,
//         "Duplicate key error: One or more players already exist.",
//         409
//       );
//     }

//     // Handle other potential errors
//     createError(res, "Server error during bulk insert.", 500);
//   }
// };

// Get player data by ID
const getPlayerById = async (req, res) => {
  try {
    const player = await PlayerSchema.findOne({ id: req.params.id });

    if (!player) {
      return createError(res, "Player not found", 500);
    }

    createResponse(res, player, 200);
  } catch (error) {
    createError(res, "Server error", 500, error);
  }
};

// Search player by name
const searchPlayerByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return createError(res, "Name query parameter is required", 400);
    }

    const players = await PlayerSchema.find({
      fullName: new RegExp(name, "i"), // Case-insensitive search
    });

    createResponse(res, players, 200);
  } catch (error) {
    createError(res, "Server error", 500, error);
  }
};

export { getPlayerById, searchPlayerByName };
