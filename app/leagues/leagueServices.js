import LeagueSchema from "./leagueSchema.js";
import { createError, createResponse, getUniqueId } from "#utils/util.js";
import { leagueTypeEnum, userRoleEnum } from "#utils/enums.js";
import TournamentSchema from "#app/tournaments/tournamentSchema.js";

// Create a new league
const createLeague = async (req, res) => {
  try {
    const { name, description, type, draftRoundStartDate, tournamentId } =
      req.body;
    let password = req.body;
    if (!password) password = getUniqueId(13).toUpperCase();

    const ownerId = req.user._id;

    // Check if the tournament exists and if it has ended
    const tournamentDetails = await TournamentSchema.findById(tournamentId);
    if (!tournamentDetails) {
      return createError(res, "Tournament not found", 404);
    }

    const currentDate = new Date();
    if (tournamentDetails.endDate && currentDate > tournamentDetails.endDate) {
      return createError(
        res,
        "Can not create a league for a tournament that has ended"
      );
    }

    const leagueData = {
      name,
      description,
      type,
      tournament: tournamentId,
      createdBy: ownerId,
      draftRound: {
        startDate: draftRoundStartDate,
        completed: false,
      },
      password,
    };

    const league = new LeagueSchema(leagueData);

    league
      .save()
      .then((l) => createResponse(res, l, 201))
      .catch((err) =>
        createError(res, err.message || "Failed to create league", 500, err)
      );
  } catch (error) {
    createError(res, error.message || "Error creating league", 500, error);
  }
};

// Get all leagues of tournament
const getAllLeaguesOfTournament = async (req, res) => {
  const tid = req.params.id;
  try {
    const leagues = await LeagueSchema.find({ tournament: tid })
      .populate(
        "tournament",
        "name season startDate endDate scoringSystem longName"
      )
      .populate("teams.owner", "-token -role");

    createResponse(res, leagues, 200);
  } catch (error) {
    createError(res, error.message || "Failed to fetch leagues", 500, error);
  }
};

// Get league by ID
const getLeagueById = async (req, res) => {
  try {
    const league = await LeagueSchema.findById(req.params.id)
      .populate(
        "tournament",
        "name season startDate endDate scoringSystem longName"
      )
      .populate("teams.owner", "-token -role");

    if (!league) {
      return createError(res, "League not found", 404);
    }

    createResponse(res, league, 200);
  } catch (error) {
    createError(res, "Error fetching league", 500, error);
  }
};

// Update a league (only by owner or admin)
const updateLeague = async (req, res) => {
  try {
    const { name, description, draftRoundStartDate, type } = req.body;
    const league = await LeagueSchema.findById(req.params.id);

    if (!league) {
      return createError(res, "League not found", 404);
    }

    // Check if the user is the owner or an admin
    const isOwner = league.createdBy === req.user._id;
    const isAdmin = req.user.role === userRoleEnum.ADMIN;

    if (!isOwner && !isAdmin) {
      return createError(
        res,
        "You do not have permission to update this league",
        401
      );
    }

    const obj = {};
    // Update allowed fields only
    if (name) obj.name = name;
    if (description) obj.description = description;
    if (draftRoundStartDate) obj.draftRound.startDate = draftRoundStartDate;
    if (type) obj.type = type;

    const updated = await LeagueSchema.findOneAndUpdate(
      {
        _id: league._id,
      },
      obj,
      { new: true }
    );

    createResponse(res, updated, 200);
  } catch (error) {
    createError(res, error.message || "Error updating league", 500, error);
  }
};

// Delete a league (only by owner or admin)
const deleteLeague = async (req, res) => {
  try {
    const league = await LeagueSchema.findById(req.params.id);

    if (!league) {
      return createError(res, "League not found", 404);
    }

    // Check if the user is the owner or an admin
    const isOwner = league.createdBy === req.user._id;
    const isAdmin = req.user.role === userRoleEnum.ADMIN;

    if (!isOwner && !isAdmin) {
      return createError(
        res,
        "You do not have permission to delete this league",
        403
      );
    }

    await LeagueSchema.deleteOne({ _id: league._id });

    createResponse(res, { message: "League deleted successfully" }, 200);
  } catch (error) {
    createError(res, error.message || "Error deleting league", 500, error);
  }
};

// Join a league
const joinLeague = async (req, res) => {
  try {
    const { leagueId, password } = req.body;
    const userId = req.user._id;

    const league = await LeagueSchema.findById(leagueId);

    if (!league) {
      return createError(res, "League not found", 404);
    }

    // If private, check password
    if (
      league.type === leagueTypeEnum.PRIVATE &&
      league.password !== password
    ) {
      return createError(res, "Invalid password", 401);
    }

    // Check if league has space for more teams
    if (league.teams.length >= 10) {
      return createError(res, "League is full", 403);
    }

    // Add the user's team to the league
    league.teams.push({ owner: userId, players: [], joinedAt: new Date() });
    await league.save();

    createResponse(res, league, 200);
  } catch (error) {
    createError(res, "Error joining league", 500, error);
  }
};

const addPlayerToWishlist = async (req, res) => {
  try {
    const { leagueId, playerId } = req.body;
    const userId = req.user._id;

    // Find the league
    const league = await LeagueSchema.findById(leagueId).lean();
    if (!league) return createError(res, "League not found", 404);

    // Find the team belonging to the user
    const team = league.teams.find((t) => t.owner === userId);
    if (!team) {
      return createError(res, "Your team not found in this league", 404);
    }

    // Check if the player is already in the wishlist
    if (team.wishlist.includes(playerId))
      return createError(res, "Player is already in the wishlist", 400);

    // Add player to the wishlist
    team.wishlist.push(playerId);

    // Save the league
    await league.save();

    createResponse(
      res,
      { message: "Player added to wishlist", wishlist: team.wishlist },
      200
    );
  } catch (error) {
    createError(
      res,
      error.message || "Error adding player to wishlist",
      500,
      error
    );
  }
};

const removePlayerFromWishlist = async (req, res) => {
  try {
    const { leagueId, playerId } = req.body;
    const userId = req.user._id;

    // Find the league
    const league = await LeagueSchema.findById(leagueId).lean();
    if (!league) return createError(res, "League not found", 404);

    // Find the team belonging to the user
    const team = league.teams.find((t) => t.owner === userId);
    if (!team) {
      return createError(res, "Your team not found in this league", 404);
    }

    // Check if the player is in the wishlist
    const playerIndex = team.wishlist.indexOf(playerId);
    if (playerIndex === -1)
      return createError(res, "Player to remove not found in wishlist", 404);

    // Remove player from the wishlist
    team.wishlist.splice(playerIndex, 1);

    // Save the league
    await league.save();

    createResponse(
      res,
      { message: "Player removed from wishlist", wishlist: team.wishlist },
      200
    );
  } catch (error) {
    createError(
      res,
      error.message || "Error removing player from wishlist",
      500,
      error
    );
  }
};

export {
  createLeague,
  getAllLeaguesOfTournament,
  getLeagueById,
  updateLeague,
  deleteLeague,
  joinLeague,
  addPlayerToWishlist,
  removePlayerFromWishlist,
};
