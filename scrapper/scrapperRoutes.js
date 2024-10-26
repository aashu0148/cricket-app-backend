import express from "express";

import {
  getScrapedMatchData,
  getScrappedPlayerData,
} from "./scrapperServices.js";

import { authenticateAdminMiddleware } from "#app/middleware/user.js";
import { validateDevUser } from "#app/middleware/dev.js";

const rootRouter = express.Router();
const router = express.Router();

router.get(
  "/match-data",
  authenticateAdminMiddleware,
  validateDevUser,
  getScrapedMatchData
);
router.get(
  "/player-data",
  authenticateAdminMiddleware,
  validateDevUser,
  getScrappedPlayerData
);

rootRouter.use("/scrapper", router);

export default rootRouter;
