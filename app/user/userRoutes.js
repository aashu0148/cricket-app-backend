import express from "express";

import {
  handleGoogleLogin,
  getCurrentUser,
  updateUser,
} from "./userServices.js";
import { authenticateUserMiddleware } from "../middleware/user.js";

const rootRouter = express.Router();
const router = express.Router();

router.post("/google-login", handleGoogleLogin);
router.get("/me", authenticateUserMiddleware, getCurrentUser);
router.patch("/", authenticateUserMiddleware, updateUser);

rootRouter.use("/user", router);

export default rootRouter;
