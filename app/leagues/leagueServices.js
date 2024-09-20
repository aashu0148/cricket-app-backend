import LeagueSchema from "./leagueSchema.js";
import { createError, createResponse, getUniqueId } from "#utils/util.js";
import { leagueTypeEnum, userRoleEnum } from "#utils/enums.js";

// Create a new league
const createLeague = async (req, res) => {
  try {
    const { name, description, type, draftRoundStartDate, tournament } =
      req.body;
    const ownerId = req.user._id;

    const leagueData = {
      name,
      description,
      type,
      tournament,
      createdBy: ownerId,
      draftRound: {
        startDate: draftRoundStartDate,
        completed: false,
      },
      password: getUniqueId(12).toUpperCase(),
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

export {
  createLeague,
  getAllLeaguesOfTournament,
  getLeagueById,
  updateLeague,
  deleteLeague,
  joinLeague,
};
