import express from "express";

import {
  getAllPlayers,
  getPlayerById,
  scrapeAndStorePlayerDataFromEspn,
  scrapeAndStorePlayerDataFromSquadUrl,
  searchPlayerByName,
} from "./playerServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.post("/", authenticateAdminMiddleware, getAllPlayers);
router.post(
  "/scrape",
  authenticateAdminMiddleware,
  scrapeAndStorePlayerDataFromEspn
);
router.post(
  "/scrape/squad",
  authenticateAdminMiddleware,
  scrapeAndStorePlayerDataFromSquadUrl
);
router.get("/search", authenticateUserMiddleware, searchPlayerByName);
router.get("/:id", authenticateUserMiddleware, getPlayerById);

rootRouter.use("/players", router);

export default rootRouter;
