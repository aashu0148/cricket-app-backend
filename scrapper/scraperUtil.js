import { espnOrigin } from "./scrapperConstants.js";

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,url:string,error:string}}
 */
const getTournamentUrlFromUrl = (tUrl = "") => {
  tUrl = tUrl.replace("https://", "");
  const parts = tUrl.split("/");

  if (parts[1] !== "series") return { success: false, error: "Invalid URL" };
  const tournamentSlug = parts[2];

  return {
    success: true,
    url: `${espnOrigin}/series/${tournamentSlug}`,
  };
};

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,url:string,error:string}}
 */
const getMatchesUrlFromTournamentUrl = (tUrl = "") => {
  tUrl = tUrl.replace("https://", "");
  const parts = tUrl.split("/");

  if (parts[1] !== "series") return { success: false, error: "Invalid URL" };
  const tournamentSlug = parts[2];

  return {
    success: true,
    url: `${espnOrigin}/series/${tournamentSlug}/match-schedule-fixtures-and-results`,
  };
};

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,url:string,seriesUrl:string,error:string}}
 */
const getSquadsUrlFromTournamentUrl = (tUrl = "") => {
  tUrl = tUrl.replace("https://", "");
  const parts = tUrl.split("/");

  if (parts[1] !== "series") return { success: false, error: "Invalid URL" };
  const tournamentSlug = parts[2];

  return {
    success: true,
    url: `${espnOrigin}/series/${tournamentSlug}/squads`,
    seriesUrl: `${espnOrigin}/series/${tournamentSlug}`,
  };
};

const getMatchResultPageUrl = ({
  tournamentSlug = "",
  tournamentObjectId = "",
  matchSlug = "",
  matchObjectId = "",
}) => {
  if (!tournamentObjectId || !tournamentSlug || !matchObjectId || !matchSlug)
    return null;

  return `${espnOrigin}/series/${tournamentSlug}-${tournamentObjectId}/${matchSlug}-${matchObjectId}/full-scorecard`;
};

export {
  getMatchResultPageUrl,
  getTournamentUrlFromUrl,
  getMatchesUrlFromTournamentUrl,
  getSquadsUrlFromTournamentUrl,
};
