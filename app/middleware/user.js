import { createError } from "../../utils/util.js";
import UserSchema from "../user/userSchema.js";

const authenticateUserMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return createError(res, "Token not found");

  let user = await UserSchema.findOne({
    token: token,
  })
    .select("-token")
    .lean();

  if (!user) return createError(res, "Invalid Token", 422);

  req.user = { ...user, _id: user._id.toString() };
  next();
};

const authenticateAdminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return createError(res, "Token not found");

  let user = await UserSchema.findOne({
    token: token,
  })
    .select("-token")
    .lean();

  if (!user) return createError(res, "Invalid Token", 422);

  if (user.role !== "admin")
    return createError(res, "You need to be admin to access this route", 401);

  req.user = { ...user, _id: user._id.toString() };
  return next();
};

export { authenticateUserMiddleware, authenticateAdminMiddleware };
