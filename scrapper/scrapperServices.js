import { createError, createResponse } from "#utils/util.js";
import {
  scrapeMatchDataFromUrl,
  scrapePlayerDataFromEspn,
} from "./scrapper.js";

const getScrapedMatchData = async (req, res) => {
  const { url } = req.query;
  if (!url) return createError(res, "url not present");

  const data = await scrapeMatchDataFromUrl(url);
  createResponse(res, data);
};

const getScrappedPlayerData = async (req, res) => {
  const { url } = req.query;
  if (!url) return createError(res, "url not present");

  const data = await scrapePlayerDataFromEspn(url);
  createResponse(res, data);
};

export { getScrapedMatchData, getScrappedPlayerData };
