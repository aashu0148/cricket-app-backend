import express from "express";

import {
  getPlayerById,
  scrapeAndStorePlayerDataFromEspn,
  searchPlayerByName,
} from "./playerServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.post(
  "/scrape",
  authenticateAdminMiddleware,
  scrapeAndStorePlayerDataFromEspn
);
router.get("/search", authenticateUserMiddleware, searchPlayerByName);
router.get("/:id", authenticateUserMiddleware, getPlayerById);

rootRouter.use("/players", router);

export default rootRouter;
