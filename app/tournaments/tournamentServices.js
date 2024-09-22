import TournamentSchema from "./tournamentSchema.js";
import MatchSchema from "#app/matches/matchSchema.js";
import ScoringSystemSchema from "#app/scoringSystems/scoringSystemSchema.js";

import { createError, createResponse } from "#utils/util.js";
import {
  getTournamentDataFromUrl,
  scrapeMatchDataFromUrl,
  scrapeMatchesFromTournamentUrl,
  scrapePlayerIdsFromTournamentUrl,
  scrapeSquadsFromTournamentUrl,
} from "#scrapper/scrapper.js";
import { getMatchResultPageUrl } from "#scrapper/scraperUtil.js";
import {
  calculateAndStoreMatchPlayerPoints,
  insertMatchIntoDB,
} from "#app/matches/matchServices.js";
import { espnOrigin } from "#scrapper/scrapperConstants.js";

const insertMatchesResultsToTournamentIfNeeded = async (tournamentId) => {
  try {
    const tournament = await TournamentSchema.findById(tournamentId);

    const allMatches = tournament.allMatches;
    const needToFetchResultFor = [];
    for (const m of allMatches) {
      const completedMatch = await MatchSchema.findOne({
        objectId: m.objectId,
      });

      const matchAlreadyPresent = completedMatch?._id ? true : false;
      const matchIsInFuture = new Date(m.startDate) > new Date();
      if (matchAlreadyPresent || matchIsInFuture) continue;

      needToFetchResultFor.push({ objectId: m.objectId, slug: m.slug });
    }

    for (const obj of needToFetchResultFor) {
      const matchPageUrl = getMatchResultPageUrl({
        tournamentSlug: tournament.slug,
        tournamentObjectId: tournament.objectId,
        matchSlug: obj.slug,
        matchObjectId: obj.objectId,
      });
      const matchData = await scrapeMatchDataFromUrl(matchPageUrl);
      if (!matchData.success) {
        console.error(
          `❗ Error getting match data for: ${matchPageUrl} `,
          matchData.error
        );
        continue;
      }

      const res = await insertMatchIntoDB(tournament._id, matchData.data);
      if (res.success) {
        const matchId = res.data?._id;
        console.log(`✅ New match data inserted[${matchId}] for: ${obj.slug}`);

        // await TournamentSchema.updateOne(
        //   { _id: tournament._id },
        //   { $push: { matches: matchId } }
        // );

        await calculateAndStoreMatchPlayerPoints(matchId);
      }
    }

    return true;
  } catch (err) {
    console.error(`Error inserting matches: ${err.message}`, err);
    return false;
  }
};

// Create a new tournament
const createTournament = async (req, res) => {
  const { espnUrl, scoringSystemId } = req.body;

  if (!espnUrl) return createError(res, "espnUrl required");
  else if (!scoringSystemId)
    return createError(res, "scoringSystemId required");

  try {
    const scoringSystem = await ScoringSystemSchema.findById(scoringSystemId);
    if (!scoringSystem)
      return createError(res, "Scoring system not present", 422);

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
    const tournamentAlreadyExist = existing ? true : false;
    if (tournamentAlreadyExist && new Date() > new Date(existing?.endDate))
      return createError(res, `Tournament: ${existing.name} already ended`);
    // if (existing)
    //   return createError(
    //     res,
    //     `Tournament: ${existing.name} already exist`,
    //     400
    //   );

    const allMatchesRes = await scrapeMatchesFromTournamentUrl(espnUrl);
    if (!allMatchesRes.success) return createError(res, allMatchesRes.error);

    const squadsRes = await scrapeSquadsFromTournamentUrl(espnUrl);
    if (!squadsRes.success) return createError(res, squadsRes.error);

    const playersRes = await scrapePlayerIdsFromTournamentUrl(espnUrl);
    if (!playersRes.success) return createError(res, playersRes.error);

    if (tournamentAlreadyExist) {
      if (allMatchesRes.matches?.length)
        existing.allMatches = allMatchesRes.matches;
      if (squadsRes.squads?.length) existing.allSquads = squadsRes.squads;
      if (playersRes.playerIds?.length) existing.players = playersRes.playerIds;

      existing
        .save()
        .then((t) => {
          insertMatchesResultsToTournamentIfNeeded(t._id);
          createResponse(res, t, 200);
        })
        .catch((err) => createError(res, err?.message, 500, err));
    } else {
      const tournament = new TournamentSchema({
        ...tournamentData.data,
        allMatches: allMatchesRes.matches,
        allSquads: squadsRes.squads,
        players: playersRes.playerIds,
        scoringSystem: scoringSystemId,
      });

      tournament
        .save()
        .then((t) => {
          insertMatchesResultsToTournamentIfNeeded(t._id);
          createResponse(res, t, 201);
        })
        .catch((err) => createError(res, err?.message, 500, err));
    }
  } catch (err) {
    createError(res, err.message || "Error creating tournament", 500, err);
  }
};

const refreshTournament = async (req, res) => {
  const tId = req.params.id;

  try {
    const tournament = await TournamentSchema.findOne({
      _id: tId,
    });
    if (!tournament) return createError(res, `Tournament do not exist`, 400);

    const url = `${espnOrigin}/series/${tournament.slug}-${tournament.objectId}`;
    const allMatchesRes = await scrapeMatchesFromTournamentUrl(url);
    if (!allMatchesRes.success) return createError(res, allMatchesRes.error);

    const squadsRes = await scrapeSquadsFromTournamentUrl(url);
    if (!squadsRes.success) return createError(res, squadsRes.error);

    const playersRes = await scrapePlayerIdsFromTournamentUrl(url);
    if (!playersRes.success) return createError(res, playersRes.error);

    if (allMatchesRes.matches?.length)
      tournament.allMatches = allMatchesRes.matches;
    if (squadsRes.squads?.length) tournament.allSquads = squadsRes.squads;
    if (playersRes.playerIds?.length) tournament.players = playersRes.playerIds;

    tournament
      .save()
      .then((t) => {
        insertMatchesResultsToTournamentIfNeeded(t._id);
        createResponse(res, t, 200);
      })
      .catch((err) => createError(res, err?.message, 500, err));
  } catch (err) {
    createError(
      res,
      err.message || "Error refreshing tournament data",
      500,
      err
    );
  }
};

// Get all tournaments
const getAllTournaments = async (req, res) => {
  const str = req.query.tournamentIds;
  let ids = [];

  try {
    const filterObj = {};
    if (str) {
      ids = str
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e);

      if (ids.length)
        filterObj["_id"] = {
          $in: ids,
        };
    }

    const tournaments = await TournamentSchema.find(filterObj)
      .populate("players", "name image country fullName")
      .lean();

    for (let t of tournaments) {
      const matchIds = t.allMatches.map((e) => e.objectId);

      const completedMatches = await MatchSchema.find({
        objectId: {
          $in: matchIds,
        },
      }).select("objectId");

      t.completedMatches = completedMatches;
    }

    createResponse(res, tournaments, 200);
  } catch (err) {
    createError(res, err.message || "Error fetching tournaments", 500, err);
  }
};

// Get ongoing or upcoming tournaments
const getOngoingUpcomingTournaments = async (req, res) => {
  try {
    const currentDate = new Date();

    const tournaments = await TournamentSchema.find({
      $or: [
        {
          // Ongoing tournaments
          endDate: { $gte: currentDate },
        },
        {
          // Upcoming tournaments
          startDate: { $gte: currentDate },
        },
      ],
    }).populate("players", "name image country fullName");

    for (let t of tournaments) {
      const matchIds = t.allMatches.map((e) => e.objectId);

      const completedMatches = await MatchSchema.find({
        objectId: {
          $in: matchIds,
        },
      }).select("objectId");

      t.completedMatches = completedMatches;
    }

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
  const { name, startDate, endDate, scoringSystemId } = req.body;

  try {
    const tournament = await TournamentSchema.findById(id);
    if (!tournament) {
      return createError(res, "Tournament not found", 404);
    }

    if (name) tournament.name = name;
    if (startDate) tournament.startDate = startDate;
    if (endDate) tournament.endDate = endDate;
    if (scoringSystemId) tournament.scoringSystem = scoringSystemId;

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
  refreshTournament,
  getAllTournaments,
  getOngoingUpcomingTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  insertMatchesResultsToTournamentIfNeeded,
};
