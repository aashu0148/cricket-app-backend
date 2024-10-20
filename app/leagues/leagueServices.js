import LeagueSchema from "./leagueSchema.js";
import EmailSchema from "#app/emails/emailSchema.js";
import TournamentSchema from "#app/tournaments/tournamentSchema.js";
import Email from "#app/notifications/Email.js";

import {
  createError,
  createResponse,
  getDateTimeFormatted,
  getUniqueId,
} from "#utils/util.js";
import { emailTypesEnum, leagueTypeEnum, userRoleEnum } from "#utils/enums.js";
import { appName } from "#utils/configs.js";

const emailClient = new Email();

async function sendDraftRoundTimeChangeReminderEmail({
  leagueId,
  oldStartDate,
  newStartDate,
}) {
  try {
    const league = await LeagueSchema.findById(leagueId).populate(
      "teams.owner"
    );
    if (!league)
      return console.error(
        "League not found to send draft round time update mail, leagueId:",
        leagueId
      );

    const leagueName = league.name;
    const dates = {
      old: oldStartDate || league.draftRound.startDate,
      new: newStartDate,
    };

    const subject = `Contest Draft Time Change: ${leagueName}`;
    const text = `Dear User,\n\nThe draft round for the contest ${leagueName} has been rescheduled. The previous time was ${getDateTimeFormatted(
      dates.old
    )}, and the new time is now ${getDateTimeFormatted(
      dates.new
    )}. Please make sure to adjust your plans accordingly.\n\nBest Regards,\n${appName} Team`;

    const html = `
      <p>Dear User,</p>
      <p>The draft round for the contest: <strong>${leagueName}</strong> has been rescheduled.</p>
      <p><strong>Old Time:</strong> ${getDateTimeFormatted(dates.old)}</p>
      <p><strong>New Time:</strong> ${getDateTimeFormatted(dates.new)}</p>
      <p>Please make sure to adjust your plans accordingly.</p>
      <p>Best Regards,</p>
      <p>${appName} Team</p>
    `;

    const users = league.teams.map((e) => ({
      userId: e.owner._id,
      email: e.owner.email,
    }));

    for (const user of users) {
      await emailClient.sendMail({
        type: emailTypesEnum.DRAFT_ROUND_TIME_UPDATE,
        sentToUserId: user.userId,
        to: user.email,
        subject,
        text,
        html,
        metadata: {
          leagueId,
          startDate: dates.new,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error in sending draft round time change reminder: ", error);
    return false;
  }
}

async function sendDraftRoundReminderEmail({ leagueId }) {
  try {
    const league = await LeagueSchema.findById(leagueId).populate(
      "teams.owner"
    );
    if (!league)
      return console.error(
        "League not found to send draft round update, leagueId:",
        leagueId
      );

    const leagueName = league.name;
    const formattedStartDate = getDateTimeFormatted(
      league.draftRound.startDate
    );

    const subject = `Draft Round Reminder for ${leagueName}`;
    const text = `Hello,\n\nThis is a reminder that the draft round for the contest "${leagueName}" will start on ${formattedStartDate}.\n\nBest regards,\n${appName} Team`;
    const html = `
    <p>Hello,</p>
    <p>This is a reminder that the draft round for the contest <strong>"${leagueName}"</strong> will start on <strong>${formattedStartDate}</strong>.</p>
    <p>Best regards,<br>${appName} Team</p>
    `;

    const users = league.teams.map((e) => ({
      userId: e.owner._id,
      email: e.owner.email,
    }));
    for (const user of users) {
      const alreadySentEmail = await EmailSchema.findOne({
        "metadata.leagueId": leagueId,
        sentTo: user.userId,
        type: emailTypesEnum.DRAFT_ROUND_REMINDER,
      });

      if (alreadySentEmail) continue; // already sent email

      await emailClient.sendMail({
        type: emailTypesEnum.DRAFT_ROUND_REMINDER,
        sentToUserId: user.userId,
        to: user.email,
        subject,
        text,
        html,
        metadata: {
          leagueId,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error in sending draft round reminder: ", error);
    return false;
  }
}

// Create a new league
const createLeague = async (req, res) => {
  try {
    const { name, description, type, draftRoundStartDate, tournamentId } =
      req.body;
    let { password } = req.body;
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

    if (new Date(draftRoundStartDate) > tournamentDetails.endDate)
      return createError(
        res,
        "Draft round can nto be scheduled after tournament ends"
      );

    const league = new LeagueSchema({
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
      teams: [
        {
          owner: req.user._id,
          joinedAt: new Date(),
          players: [],
          wishlist: [],
        },
      ],
    });

    league
      .save()
      .then((l) => createResponse(res, l, 201))
      .catch((err) =>
        createError(res, err.message || "Failed to create league", 500, err)
      );
  } catch (error) {
    console.error("Error creating league: ", err.message);
    createError(res, error.message || "Error creating league", 500, error);
  }
};

const getLeaguesBasedOnFilter = async (filter) => {
  return await LeagueSchema.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .populate(
      "tournament",
      "name season completed startDate endDate scoringSystem longName"
    )
    .populate("createdBy", "-token -role")
    .populate("teams.owner", "-token -role")
    .lean();
};

// Get all leagues of tournament
const getAllLeaguesOfTournament = async (req, res) => {
  const tid = req.params.id;
  try {
    const leagues = await getLeaguesBasedOnFilter({ tournament: tid });

    createResponse(res, leagues, 200);
  } catch (error) {
    createError(res, error.message || "Failed to fetch leagues", 500, error);
  }
};

// Get all leagues of tournament
const getJoinableLeaguesOfTournament = async (req, res) => {
  const tid = req.params.id;
  try {
    const leagues = await getLeaguesBasedOnFilter({
      tournament: tid,
      "draftRound.completed": false,
    });

    createResponse(res, leagues, 200);
  } catch (error) {
    createError(
      res,
      error.message || "Failed to get joinable leagues",
      500,
      error
    );
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
      .populate("createdBy", "-token -role")
      .populate("teams.owner", "-token -role")
      .populate("teams.players", "-stats")
      .populate("teams.wishlist", "-stats")
      .lean();

    if (!league) {
      return createError(res, "League not found", 404);
    }

    if (req.user._id !== league.createdBy._id.toString())
      delete league.password;

    createResponse(res, league, 200);
  } catch (error) {
    createError(res, "Error fetching league", 500, error);
  }
};

const getJoinedLeagues = async (req, res) => {
  const userId = req.user?._id;

  try {
    const leagues = await getLeaguesBasedOnFilter({
      "teams.owner": userId,
    });

    createResponse(res, leagues, 200);
  } catch (error) {
    createError(res, "Error fetching joined league", 500, error);
  }
};

const getJoinedLeaguesOfTournament = async (req, res) => {
  const userId = req.user._id;
  const tid = req.params.id;

  try {
    const leagues = await getLeaguesBasedOnFilter({
      "teams.owner": userId,
      tournament: tid,
    });

    createResponse(res, leagues, 200);
  } catch (error) {
    createError(res, "Error fetching joined league for tournament", 500, error);
  }
};

const getJoinedActiveLeagues = async (req, res) => {
  const userId = req.user?._id;
  const currentDate = new Date();

  try {
    const leagues = await LeagueSchema.find({
      "teams.owner": userId,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .populate({
        path: "tournament",
        select:
          "name completed season startDate endDate scoringSystem longName",
        match: {
          endDate: { $gte: currentDate }, // Tournament not ended
        },
      })
      .populate("teams.owner", "-token -role")
      .populate("createdBy", "-token -role")
      .lean();

    const final = leagues.filter((e) => e.tournament); // manually remove past date tournaments

    createResponse(res, final, 200);
  } catch (error) {
    createError(res, "Error fetching joined league", 500, error);
  }
};

const updateLeagueTeamName = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;
    if (!name || !name.trim()) return createError(res, "name required");

    const league = await LeagueSchema.findById(req.params.id);

    if (!league) {
      return createError(res, "League not found", 404);
    }

    // Check if the user is the owner or an admin
    const isParticipant = league.teams.some(
      (t) => t.owner.toString() === userId
    );
    if (!isParticipant) {
      return createError(res, "You are not in this league", 401);
    }

    league.teams.forEach((t) => {
      if (t.owner.toString() === userId) t.name = name;
    });

    league
      .save()
      .then((l) => createResponse(res, l, 200))
      .catch((err) => createError(res, err?.message, 500, err));
  } catch (error) {
    createError(res, error.message || "Error updating team name", 500, error);
  }
};

// Update a league (only by owner or admin)
const updateLeague = async (req, res) => {
  try {
    const { name, description, draftRoundStartDate, type, password } = req.body;
    const league = await LeagueSchema.findById(req.params.id);

    if (!league) {
      return createError(res, "League not found", 404);
    }

    // Check if the user is the owner or an admin
    const isOwner = league.createdBy.toString() === req.user._id;
    const isAdmin = req.user.role === userRoleEnum.ADMIN;

    if (!isOwner && !isAdmin) {
      return createError(
        res,
        "You do not have permission to update this league",
        401
      );
    }

    const doAnyTeamMemberHavePlayers = league.teams.some(
      (t) => t.players.length > 0
    );

    const currentStartDate = league.draftRound.startDate;
    const obj = {};
    // Update allowed fields only
    if (name) obj.name = name;
    if (description) obj.description = description;
    if (type) obj.type = type;
    if (password) obj.password = password;

    // only update it if draft round has not started (no one has selected a player)
    if (draftRoundStartDate && !doAnyTeamMemberHavePlayers) {
      obj.draftRound = { ...league.draftRound, startDate: draftRoundStartDate };

      if (
        new Date(draftRoundStartDate).getTime() !==
        new Date(currentStartDate).getTime()
      )
        sendDraftRoundTimeChangeReminderEmail({
          leagueId: league._id,
          newStartDate: draftRoundStartDate,
          oldStartDate: league.draftRound.startDate,
        }); // send email reminder
    }

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

    if (league.draftRound.completed)
      return createError(
        res,
        "Can not join a league after draft round is completed"
      );

    // Check if league has space for more teams
    if (league.teams.length >= 10) {
      return createError(res, "League is full", 403);
    }

    const timeDiff = new Date(league.draftRound.startDate) - new Date();

    if (timeDiff < 5 * 60 * 1000)
      return createError(
        res,
        "Can not join a league after draft round has started or about to start"
      );

    const existing = await LeagueSchema.findOne({
      _id: leagueId,
      "teams.owner": userId,
    });
    if (existing) return createError(res, "You are already in this league");

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
    const league = await LeagueSchema.findById(leagueId);
    if (!league) return createError(res, "League not found", 404);

    // Find the team belonging to the user
    const team = league.teams.find((t) => t.owner.toString() === userId);
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
    const league = await LeagueSchema.findById(leagueId);
    if (!league) return createError(res, "League not found", 404);

    // Find the team belonging to the user
    const team = league.teams.find((t) => t.owner.toString() === userId);
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

const updateWishlistOrder = async (req, res) => {
  try {
    const { leagueId, playersOrder } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(playersOrder))
      return createError("playersOrder required");
    if (typeof playersOrder[0] !== "string")
      return createError("invalid playersOrder array");

    // Find the league
    const league = await LeagueSchema.findById(leagueId);
    if (!league) return createError(res, "League not found", 404);

    // Find the team belonging to the user
    const team = league.teams.find((t) => t.owner.toString() === userId);
    if (!team) {
      return createError(res, "Your team not found in this league", 404);
    }

    const newWishlist = playersOrder
      .map((e) => team.wishlist.find((p) => p.toString() === e))
      .filter((e) => e);
    const remainingPlayers = team.wishlist.filter(
      (e) => !newWishlist.some((p) => p.toString() === e.toString())
    );

    team.wishlist = [...newWishlist, ...remainingPlayers];

    // Save the league
    await league.save();

    createResponse(
      res,
      { message: "Wishlist updated successfully", wishlist: team.wishlist },
      200
    );
  } catch (error) {
    createError(res, error.message || "Error updating wishlist", 500, error);
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
  getJoinedLeagues,
  getJoinedActiveLeagues,
  getJoinableLeaguesOfTournament,
  getJoinedLeaguesOfTournament,
  updateLeagueTeamName,
  updateWishlistOrder,
  sendDraftRoundReminderEmail,
};
