import express from "express";

import userRoutes from "#app/users/userRoutes.js";
import playerRoutes from "#app/players/playerRoutes.js";
import tournamentRoutes from "#app/tournaments/tournamentRoutes.js";
import matchRoutes from "#app/matches/matchRoutes.js";
import scoringSystemRoutes from "#app/scoringSystems/scoringSystemRoutes.js";

const router = express.Router();

router.get("/hi", (_req, res) => res.send("Hello there!"));
// router.get("/temp", async (req, res) => {
//   const data = await scrapeMatchDataFromUrl(req.query.url);
//   // const data = await getTournamentDataFromUrl(req.query.url);

//   createResponse(res, data);
// });

router.use(userRoutes);
router.use(playerRoutes);
router.use(tournamentRoutes);
router.use(matchRoutes);
router.use(scoringSystemRoutes);

export default router;
