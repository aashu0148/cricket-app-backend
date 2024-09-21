import mongoose from "mongoose";

import { userRoleEnum } from "#utils/enums.js";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    token: String,
    role: {
      type: String,
      default: userRoleEnum.USER,
    },
    profileImage: String,
  },
  {
    timestamps: true,
  }
);

const UserSchema = mongoose.model("User", schema);

export default UserSchema;
