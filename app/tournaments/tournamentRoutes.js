import express from "express";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
} from "./tournamentServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Create a new tournament (Admin only)
router.post("/", createTournament);

// Get all tournaments
router.get("/", authenticateUserMiddleware, getAllTournaments);

// Get a specific tournament by ID
router.get("/:id", authenticateUserMiddleware, getTournamentById);

// Update a tournament (Admin only)
router.patch("/:id", authenticateAdminMiddleware, updateTournament);

// Delete a tournament (Admin only)
router.delete("/:id", authenticateAdminMiddleware, deleteTournament);

rootRouter.use("/tournaments", router);

export default rootRouter;
