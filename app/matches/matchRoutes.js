import express from "express";
import {
  getMatchesForTournament,
  getMatchDetails,
  getMatchPointsData,
} from "./matchServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.get(
  "/tournament/:tournamentId",
  authenticateUserMiddleware,
  getMatchesForTournament
);
router.get("/:matchId", authenticateUserMiddleware, getMatchDetails);
router.get("/points-data/:id", authenticateAdminMiddleware, getMatchPointsData);

rootRouter.use("/matches", router);

export default rootRouter;
