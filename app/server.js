import express from "express";

import userRoutes from "#app/users/userRoutes.js";
import playerRoutes from "#app/players/playerRoutes.js";
import tournamentRoutes from "#app/tournaments/tournamentRoutes.js";
import matchRoutes from "#app/matches/matchRoutes.js";
import scoringSystemRoutes from "#app/scoringSystems/scoringSystemRoutes.js";
import leagueRoutes from "#app/leagues/leagueRoutes.js";

import { authenticateAdminMiddleware } from "./middleware/user.js";
import { createResponse } from "#utils/util.js";
import { getAllRooms } from "./socket/index.js";

const router = express.Router();

router.get("/socket/rooms", authenticateAdminMiddleware, (_req, res) =>
  createResponse(res, getAllRooms())
);
router.get("/hi", (_req, res) => res.send("Hello there!"));

router.use(userRoutes);
router.use(playerRoutes);
router.use(tournamentRoutes);
router.use(matchRoutes);
router.use(scoringSystemRoutes);
router.use(leagueRoutes);

export default router;
