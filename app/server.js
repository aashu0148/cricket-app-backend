import express from "express";

import userRoutes from "#app/users/userRoutes.js";
import playerRoutes from "#app/players/playerRoutes.js";

const router = express.Router();

router.get("/hi", (_req, res) => res.send("Hello there!"));

router.use(userRoutes);
router.use(playerRoutes);

export default router;
