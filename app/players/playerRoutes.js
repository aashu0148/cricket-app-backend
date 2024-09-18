import express from "express";

import { getPlayerById, searchPlayerByName } from "./playerServices.js";
import { authenticateUserMiddleware } from "#app/middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.get("/search", authenticateUserMiddleware, searchPlayerByName);
router.get("/:id", authenticateUserMiddleware, getPlayerById);

rootRouter.use("/players", router);

export default rootRouter;
