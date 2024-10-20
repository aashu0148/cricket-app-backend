import express from "express";
import {
  createScoringSystem,
  getScoringSystemById,
  updateScoringSystem,
  deleteScoringSystem,
  getAllScoringSystems,
} from "./scoringSystemServices.js";
import { authenticateAdminMiddleware } from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Get All scoring systems (Admin Only)
router.get("/", authenticateAdminMiddleware, getAllScoringSystems);

// Create a new scoring system (Admin only)
router.post("/", authenticateAdminMiddleware, createScoringSystem);

// Get a specific scoring system by ID (Admin only)
router.get("/:id", getScoringSystemById);

// Update a scoring system (Admin only)
router.patch("/:id", authenticateAdminMiddleware, updateScoringSystem);

// Delete a scoring system (Admin only)
router.delete("/:id", authenticateAdminMiddleware, deleteScoringSystem);

rootRouter.use("/scoring-systems", router);

export default rootRouter;
