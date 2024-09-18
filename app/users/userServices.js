import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

import userSchema from "./userSchema.js";
import { createError, createResponse } from "../../utils/util.js";
import configs from "../../utils/configs.js";

const verifyGoogleToken = async ({ token }) => {
  const clientId = configs.GOOGLE_CLIENT_ID;
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });
    if (!ticket) {
      return { success: false, msg: "Invalid token!" };
    }
    const payload = ticket.getPayload();
    payload["profileImage"] = payload.picture;

    return { success: true, payload };
  } catch (error) {
    const err = error.message || error;
    return { success: false, msg: err };
  }
};

const handleGoogleLogin = async (req, res) => {
  let { credential: token, clientId } = req.body;

  let { origin } = req.query;

  if (!token || !clientId) {
    return createError(400, "Token and clientId are required", res);
  }

  let data = { token, clientId };
  let verifyRes = await verifyGoogleToken(data);
  if (!verifyRes.success) {
    return createError(res, verifyRes.msg, 400);
  }

  const { name, email, profileImage } = verifyRes.payload;

  const tokenHash = bcrypt.hashSync(token, 5);

  let user = await userSchema.findOne({ email });

  if (!user)
    user = new userSchema({
      name,
      email,
      token: tokenHash,
      profileImage,
    });
  else user.token = tokenHash;

  user
    .save()
    .then((user) => {
      const url = new URL(`${origin || configs.FRONTEND_URL}/auth`);
      for (const key in req.query) url.searchParams.append(key, req.query[key]);

      url.searchParams.append("accessToken", user.token);

      res.redirect(url.toString());
    })
    .catch((err) => {
      createError(res, err.message || "Something went wrong", 500, err);
    });
};

const getCurrentUser = (req, res) => {
  createResponse(res, req.user, 200);
};

const updateUser = async (req, res) => {
  const { name, profileImage } = req.body;

  const updateObj = {};

  if (name) updateObj.name = name;
  if (profileImage) updateObj.profileImage = profileImage;

  await userSchema.updateOne({ _id: req.user._id }, { $set: updateObj });

  const user = await userSchema.findOne({ _id: req.user._id });
  createResponse(res, user);
};

export { handleGoogleLogin, getCurrentUser, updateUser };
