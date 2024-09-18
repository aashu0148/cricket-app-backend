import dotenv from "dotenv";
dotenv.config();

const configs = {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GMAIL_MAIL: process.env.GMAIL_MAIL,
  GMAIL_PASS: process.env.GMAIL_PASS,
  JWT_SECRET: process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
};

export default configs;
