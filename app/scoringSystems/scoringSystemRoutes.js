import express from "express";
import {
  createScoringSystem,
  getScoringSystemById,
  updateScoringSystem,
  deleteScoringSystem,
} from "./scoringSystemServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Create a new scoring system (Admin only)
router.post("/", authenticateAdminMiddleware, createScoringSystem);

// Get a specific scoring system by ID (Admin only)
router.get("/:id", authenticateAdminMiddleware, getScoringSystemById);

// Update a scoring system (Admin only)
router.patch("/:id", authenticateAdminMiddleware, updateScoringSystem);

// Delete a scoring system (Admin only)
router.delete("/:id", authenticateAdminMiddleware, deleteScoringSystem);

rootRouter.use("/scoring-systems", router);

export default rootRouter;
