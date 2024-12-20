import express from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  getOngoingUpcomingTournaments,
  refreshTournament,
  addPlayerToTournament,
  deletePlayerFromTournament,
  checkForTournamentMatchResults,
  getTournamentsPlayers,
  getAllTournamentsInShort,
} from "./tournamentServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Create a new tournament (Admin only)
router.post("/", authenticateAdminMiddleware, createTournament);

// Add player (Admin only)
router.post("/:id/players", authenticateAdminMiddleware, addPlayerToTournament);

// Delete player (Admin only)
router.delete(
  "/:id/players",
  authenticateAdminMiddleware,
  deletePlayerFromTournament
);

// Create a new tournament (Admin only)
router.post("/refresh/:id", authenticateAdminMiddleware, refreshTournament);

// Get all tournaments
router.get("/", authenticateUserMiddleware, getAllTournaments);

router.get("/short", authenticateAdminMiddleware, getAllTournamentsInShort);

router.get(
  "/:id/matches/results",
  authenticateAdminMiddleware,
  checkForTournamentMatchResults
);

router.get("/players", authenticateUserMiddleware, getTournamentsPlayers);

router.get(
  "/ongoing-upcoming",
  authenticateUserMiddleware,
  getOngoingUpcomingTournaments
);

// Get a specific tournament by ID
router.get("/:id", authenticateUserMiddleware, getTournamentById);

// Update a tournament (Admin only)
router.patch("/:id", authenticateAdminMiddleware, updateTournament);

// Delete a tournament (Admin only)
router.delete("/:id", authenticateAdminMiddleware, deleteTournament);

rootRouter.use("/tournaments", router);

export default rootRouter;
