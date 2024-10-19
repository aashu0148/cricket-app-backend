import jwt from "jsonwebtoken";

import configs from "./configs.js";

const createError = (res, message, code = 400, err = "") => {
  res.status(code).json({
    success: false,
    message: message || "Something gone wrong",
    error: err,
  });
};

const createResponse = (res, data, code = 200, paginationObj) => {
  const output = {
    success: true,
    data,
  };
  if (paginationObj) output.pagination = paginationObj;

  res.status(code).json(output);
};

function sleep(time = 1000) {
  return new Promise((r) => setTimeout(r, time));
}

function getRandomInteger(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const validateEmail = (email) => {
  if (!email) return false;
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

/**
 * Sign a JWT token.
 *
 * @param {object | string} payload - The payload to include in the token.
 * @param {object} [options] - Optional settings for token creation, such as expiresIn.
 * @returns {string} - Returns the signed token.
 */
function signJwtToken(payload, options = {}) {
  return jwt.sign(payload, configs.JWT_SECRET, options);
}

/**
 * Decode and verify a JWT token.
 *
 * @param {string} token - The token to decode and verify.
 * @returns {object|null} - Returns the decoded token if valid, or null if invalid.
 */
function decodeJwtToken(token) {
  if (!token) return token;

  try {
    return jwt.verify(token, configs.JWT_SECRET);
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

const getUniqueId = (idLength = 15) => {
  let timeDigitsToKeep = Math.floor(idLength / 2);

  return (
    Date.now()
      .toString(16)
      .slice(-1 * timeDigitsToKeep) +
    parseInt(Math.random() * 9999999999).toString(16)
  ).slice(0, idLength);
};

const getDateFormatted = (val, short = false, excludeYear = false) => {
  if (!val) return "";
  const date = new Date(val);
  var day = date.toLocaleString("en-in", { day: "numeric" });
  var month = date.toLocaleString("en-in", {
    month: short ? "short" : "long",
  });
  var year = date.toLocaleString("en-in", { year: "numeric" });

  if (excludeYear) return `${day} ${month}`;
  else return `${day} ${month}, ${year}`;
};

function getTimeFormatted(value, includeSeconds = false) {
  if (!value) return;

  const date = new Date(value);
  let hours = date?.getHours();
  let minutes = date?.getMinutes();
  let seconds = date?.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  const strTime =
    hours + ":" + minutes + (includeSeconds ? `:${seconds} ` : " ") + ampm;

  return strTime;
}

function getDateTimeFormatted(val) {
  return `${getDateFormatted(val, true, true)} ${getTimeFormatted(val)}`;
}

export {
  sleep,
  createError,
  createResponse,
  validateEmail,
  getRandomInteger,
  signJwtToken,
  decodeJwtToken,
  getUniqueId,
  getDateTimeFormatted,
  getDateFormatted,
  getTimeFormatted,
};
