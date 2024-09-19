import TournamentSchema from "./tournamentSchema.js";
import { createError, createResponse } from "../../utils/util.js";

// Create a new tournament
const createTournament = async (req, res) => {
  const { name, startDate, endDate } = req.body;

  try {
    const tournament = new TournamentSchema({
      name,
      startDate,
      endDate,
    });

    await tournament.save();
    createResponse(res, tournament, 201);
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
    const tournament = (await TournamentSchema.findById(id)).populated(
      "players"
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
