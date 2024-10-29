import PlayerSchema from "./playerSchema.js";
import { createError, createResponse } from "#utils/util.js";
import {
  scrapePlayerDataFromEspn,
  scrapePlayersDataFromSquadUrl,
} from "#scrapper/scrapper.js";
import { playerRoleEnum } from "#utils/enums.js";

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

const updatePlayerStats = async (playerId = "") => {
  const player = await PlayerSchema.findOne({ _id: playerId }).lean();
  if (!player || !player.espnUrl) return false;

  try {
    const url = player.espnUrl;
    const data = await scrapePlayerDataFromEspn(url);
    const stats = data.stats;

    if (stats?.length) {
      await PlayerSchema.updateOne(
        { _id: player._id },
        {
          $set: {
            stats,
          },
        }
      );
    }

    return true;
  } catch (error) {
    console.log("Error updating player stats:", error?.message);
    return false;
  }
};

const getAllPlayers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const skip = (page - 1) * limit;

    const players = await PlayerSchema.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDoc = await PlayerSchema.countDocuments();
    const totalPages = Math.ceil(totalDoc / limit);

    createResponse(res, players, 200, {
      limit,
      page,
      totalPages,
      total: totalDoc,
    });
  } catch (error) {
    createError(res, error.message || "Server error", 500, error);
  }
};

// Get player data by ID
const getPlayerById = async (req, res) => {
  try {
    const player = await PlayerSchema.findOne({ _id: req.params.id });

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
    }).limit(40);

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

    const existing = await PlayerSchema.findOne({ objectId: data.objectId });
    if (existing)
      return createError(res, `Player already exist: ${existing.fullName}`);

    const playingRole = (data.playingRole || "").toLowerCase();
    const role = playingRole.includes("allrounder")
      ? playerRoleEnum.ALLROUNDER
      : playingRole.includes("batter")
      ? playerRoleEnum.BATTER
      : playingRole.includes("bowler")
      ? playerRoleEnum.BOWLER
      : "";

    const newPlayer = new PlayerSchema({
      playerId: data.id,
      fullName: data.full_name,
      espnUrl: url,
      ...data,
      role,
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

const scrapeAndStorePlayerDataFromSquadUrl = async (req, res) => {
  try {
    const { squadUrl } = req.body;

    if (!squadUrl) return createError(res, "squadUrl is required", 400);

    const data = await scrapePlayersDataFromSquadUrl(squadUrl);
    if (!data?.length)
      return createError(res, `Incorrect URL or something went wrong`);

    const saved = [];
    for (const player of data) {
      const existing = await PlayerSchema.findOne({
        objectId: player.objectId,
      });
      if (existing) continue;

      const playingRole = (player.playingRole || "").toLowerCase();
      const role = playingRole.includes("allrounder")
        ? playerRoleEnum.ALLROUNDER
        : playingRole.includes("batter")
        ? playerRoleEnum.BATTER
        : playingRole.includes("bowler")
        ? playerRoleEnum.BOWLER
        : "";

      const newPlayer = new PlayerSchema({
        playerId: player.id,
        fullName: player.full_name,
        ...player,
        role,
      });

      await newPlayer.save();
      saved.push(newPlayer._id.toString());
    }

    if (!saved.length) return createError(res, "All Players already exist");

    createResponse(res, saved, 201);
  } catch (error) {
    createError(res, error.message || "Server error", 500, error);
  }
};

export {
  updatePlayerStats,
  getAllPlayers,
  getPlayerById,
  searchPlayerByName,
  scrapeAndStorePlayerDataFromEspn,
  scrapeAndStorePlayerDataFromSquadUrl,
};
