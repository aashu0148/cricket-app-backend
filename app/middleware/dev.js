import { createError } from "#utils/util.js";

const validateDevUser = async (req, res, next) => {
  const devFlag = req.headers.dev;

  if (!devFlag || devFlag !== "true")
    return createError(res, "you aren't a dev!");

  next();
};

export { validateDevUser };
