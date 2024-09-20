import express from "express";

import {
  handleGoogleLogin,
  getCurrentUser,
  updateUser,
} from "./userServices.js";
import {
  authenticateAdminMiddleware,
  authenticateUserMiddleware,
} from "../middleware/user.js";
import { createResponse } from "#utils/util.js";

const rootRouter = express.Router();
const router = express.Router();

router.post("/google-login", handleGoogleLogin);
router.get("/me", authenticateUserMiddleware, getCurrentUser);
router.patch("/", authenticateUserMiddleware, updateUser);
router.get("/is-admin", authenticateAdminMiddleware, (req, res) =>
  createResponse(res, { admin: true })
);

rootRouter.use("/user", router);

export default rootRouter;
