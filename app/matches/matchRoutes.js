import express from "express";
import {
  getMatchesForTournament,
  getMatchDetails,
  getMatchPointsData,
  deleteMatch,
  getAllMatches,
} from "./matchServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.get("/", authenticateUserMiddleware, getAllMatches);
router.get(
  "/tournament/:tournamentId",
  authenticateUserMiddleware,
  getMatchesForTournament
);
router.get("/points-data/:id", authenticateAdminMiddleware, getMatchPointsData);
router.get("/:matchId", authenticateUserMiddleware, getMatchDetails);
router.delete("/:matchId", authenticateAdminMiddleware, deleteMatch);

rootRouter.use("/matches", router);

export default rootRouter;
