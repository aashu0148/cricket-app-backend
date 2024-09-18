import express from "express";

import userRoutes from "./user/userRoutes.js";

const router = express.Router();

router.get("/hi", (_req, res) => res.send("Hello there!"));

router.use(userRoutes);

export default router;
