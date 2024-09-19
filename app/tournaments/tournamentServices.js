import TournamentSchema from "./tournamentSchema.js";
import { createError, createResponse } from "../../utils/util.js";
import {
  getTournamentDataFromUrl,
  scrapeMatchesFromTournamentUrl,
  scrapePlayerIdsFromTournamentUrl,
  scrapeSquadsFromTournamentUrl,
} from "#scrapper/scrapper.js";

// Create a new tournament
const createTournament = async (req, res) => {
  const { espnUrl } = req.body;

  if (!espnUrl) return createError(res, "espnUrl required");

  try {
    const tournamentData = await getTournamentDataFromUrl(espnUrl);
    if (!tournamentData.success)
      return createError(
        res,
        tournamentData.error || "Error finding tournament"
      );

    const tournamentObjId = tournamentData.data.objectId;
    const existing = await TournamentSchema.findOne({
      objectId: tournamentObjId,
    });
    if (existing)
      return createError(
        res,
        `Tournament: ${existing.name} already exist`,
        400
      );

    const allMatchesRes = await scrapeMatchesFromTournamentUrl(espnUrl);
    if (!allMatchesRes.success) return createError(res, allMatchesRes.error);

    const squadsRes = await scrapeSquadsFromTournamentUrl(espnUrl);
    if (!squadsRes.success) return createError(res, squadsRes.error);

    const playersRes = await scrapePlayerIdsFromTournamentUrl(espnUrl);
    if (!playersRes.success) return createError(res, playersRes.error);

    const tournament = new TournamentSchema({
      ...tournamentData.data,
      allMatches: allMatchesRes.matches,
      squads: squadsRes.squads,
      players: playersRes.playerIds,
    });

    tournament
      .save()
      .then((t) => createResponse(res, t, 201))
      .catch((err) => createError(res, err?.message, 500, err));
  } catch (err) {
    createError(res, err.message || "Error creating tournament", 500, err);
  }
};

// Get all tournaments
const getAllTournaments = async (req, res) => {
  try {
    const tournaments = await TournamentSchema.find();
    createResponse(res, tournaments, 200);
  } catch (err) {
    createError(res, err.message || "Error fetching tournaments", 500, err);
  }
};

// Get a specific tournament by ID
const getTournamentById = async (req, res) => {
  const { id } = req.params;

  try {
    const tournament = await TournamentSchema.findById(id).populate(
      "players",
      "-stats"
    );
    if (!tournament) {
      return createError(res, "Tournament not found", 404);
    }
    createResponse(res, tournament, 200);
  } catch (err) {
    createError(res, err.message || "Error fetching tournament", 500, err);
  }
};

// Update a tournament
const updateTournament = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate } = req.body;

  try {
    const tournament = await TournamentSchema.findById(id);
    if (!tournament) {
      return createError(res, "Tournament not found", 404);
    }

    if (name) tournament.name = name;
    if (startDate) tournament.startDate = startDate;
    if (endDate) tournament.endDate = endDate;

    await tournament.save();
    createResponse(res, tournament, 200);
  } catch (err) {
    createError(res, err.message || "Error updating tournament", 500, err);
  }
};

// Delete a tournament
const deleteTournament = async (req, res) => {
  const { id } = req.params;

  try {
    await TournamentSchema.findByIdAndDelete(id);
    createResponse(res, { message: "Tournament deleted successfully" }, 200);
  } catch (err) {
    createError(res, err.message || "Error deleting tournament", 500, err);
  }
};

export {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
};
