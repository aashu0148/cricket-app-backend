import express from "express";
import { getMatchesForTournament, getMatchDetails } from "./matchServices.js";
import { authenticateUserMiddleware } from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.get(
  "/tournament/:tournamentId",
  authenticateUserMiddleware,
  getMatchesForTournament
);
router.get("/:matchId", getMatchDetails);

rootRouter.use("/matches", router);

export default rootRouter;
