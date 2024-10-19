import express from "express";

import { getAllEmails, getEmailById } from "./emailService.js";
import { authenticateAdminMiddleware } from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

// Get all sent emails (only for authenticated users)
router.get("/", authenticateAdminMiddleware, getAllEmails);

// Get a specific email by ID (authenticated users only)
router.get("/:id", authenticateAdminMiddleware, getEmailById);

rootRouter.use("/emails", router);

export default rootRouter;
