import mongoose from "mongoose";

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
      required: true,
    },
    token: String,
    role: {
      type: String,
      default: "user",
    },
    profileImage: String,
  },
  {
    timestamps: true,
  }
);

const UserSchema = mongoose.model("User", schema);

export default UserSchema;
