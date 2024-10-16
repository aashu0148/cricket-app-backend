import PlayerSchema from "./playerSchema.js";
import { createError, createResponse } from "#utils/util.js";
import { scrapePlayerDataFromEspn } from "#scrapper/scrapper.js";

// Bulk insert players into the database
// const bulkInsertPlayers = async (req, res) => {
//   try {
//     // Insert players into the database
//     const insertedPlayers = await PlayerSchema.insertMany(
//       data.map((e) => ({
//         playerId: e.id,
//         fullName: e.full_name,
//         objectId: e.object_id,
//         espnUrl: e.url,
//         ...e,
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
    createError(res, error.message || "Server error", 500, error);
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
      $or: [
        { fullName: new RegExp(name, "i") }, // Case-insensitive search by fullName
        { country: new RegExp(name, "i") }, // Case-insensitive search by country
      ],
    });

    createResponse(res, players, 200);
  } catch (error) {
    createError(res, error.message || "Server error", 500, error);
  }
};

const scrapeAndStorePlayerDataFromEspn = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return createError(res, "url is required", 400);

    const data = await scrapePlayerDataFromEspn(url);
    if (!data) return createError(res, `Incorrect URL or something went wrong`);

    const existing = await PlayerSchema.findOne({ objectId: data.object_id });
    if (existing)
      return createError(res, `Player already exist: ${existing.fullName}`);

    const newPlayer = new PlayerSchema({
      playerId: data.id,
      fullName: data.full_name,
      espnUrl: url,
      ...data,
    });

    newPlayer
      .save()
      .then((p) => createResponse(res, p, 201))
      .catch((err) =>
        createError(res, err.message || `Error adding player to DB`, 500)
      );
  } catch (error) {
    createError(res, error.message || "Server error", 500, error);
  }
};

export { getPlayerById, searchPlayerByName, scrapeAndStorePlayerDataFromEspn };
