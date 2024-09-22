import express from "express";
import {
  createLeague,
  getAllLeaguesOfTournament,
  getLeagueById,
  updateLeague,
  deleteLeague,
  joinLeague,
  addPlayerToWishlist,
  removePlayerFromWishlist,
  getJoinedLeagues,
} from "./leagueServices.js";
import { authenticateUserMiddleware } from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Get joined Leagues
router.get("/joined", authenticateUserMiddleware, getJoinedLeagues);

// Create a new league (authenticated users only)
router.post("/", authenticateUserMiddleware, createLeague);

// Get all leagues (available to all authenticated users)
router.get(
  "/tournament/:id",
  authenticateUserMiddleware,
  getAllLeaguesOfTournament
);

// Add player to wishlist
router.post("/wishlist", authenticateUserMiddleware, addPlayerToWishlist);

// Remove player to wishlist
router.delete(
  "/wishlist",
  authenticateUserMiddleware,
  removePlayerFromWishlist
);

// Get specific league by ID (available to all authenticated users)
router.get("/:id", authenticateUserMiddleware, getLeagueById);

// Update a league (only owner or admin can update)
router.patch("/:id", authenticateUserMiddleware, updateLeague);

// Delete a league (only owner or admin can delete)
router.delete("/:id", authenticateUserMiddleware, deleteLeague);

// Join a league (private leagues require a password)
router.post("/:id/join", authenticateUserMiddleware, joinLeague);

rootRouter.use("/leagues", router);

export default rootRouter;