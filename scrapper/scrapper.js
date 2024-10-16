import axios from "axios";
import { parse as parseHtmlAsDOM } from "node-html-parser";

import {
  getMatchesUrlFromTournamentUrl,
  getSquadsUrlFromTournamentUrl,
  getTournamentUrlFromUrl,
} from "./scraperUtil.js";
import PlayerSchema from "#app/players/playerSchema.js";
import { matchStatusEnum } from "#utils/enums.js";

const getNextJsDataInScriptTagFromUrl = async (url) => {
  try {
    const textResponse = (await axios.get(url)).data;

    let scriptText = textResponse.slice(
      textResponse.indexOf(`id="__NEXT_DATA__"`)
    );
    scriptText = scriptText.slice(
      scriptText.indexOf(">") + 1,
      scriptText.indexOf("</script>")
    );

    const parsed = JSON.parse(scriptText).props.appPageProps.data;

    return parsed;
  } catch (err) {
    console.error("Error scrapping data", err);
    return null;
  }
};

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,error:string,data:object}}
 */
async function getTournamentDataFromUrl(url) {
  const urlRes = getTournamentUrlFromUrl(url);
  if (!urlRes.success) return urlRes;

  try {
    const { series } = await getNextJsDataInScriptTagFromUrl(urlRes.url);

    const { season, longName, name, startDate, endDate, slug, objectId } =
      series;

    return {
      success: true,
      data: {
        name,
        longName,
        startDate,
        season,
        endDate,
        slug,
        objectId,
      },
    };
  } catch (err) {
    console.error("Error scrapping tournament", err);
    return {
      success: false,
      error: err?.message || "Error finding tournament data",
    };
  }
}

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,error:string,matches:Array}}
 */
async function scrapeMatchesFromTournamentUrl(tUrl) {
  const matchesUrlRes = getMatchesUrlFromTournamentUrl(tUrl);
  if (!matchesUrlRes.success) return matchesUrlRes;

  try {
    const data = await getNextJsDataInScriptTagFromUrl(matchesUrlRes.url);
    const matches = data.content.matches;

    const parsedMatches = matches.map((item) => {
      const {
        slug,
        startDate,
        endDate,
        startTime,
        id,
        objectId,
        isCancelled,
        format,
        statusText,
      } = item;

      return {
        slug,
        startDate,
        endDate,
        startTime,
        matchId: id,
        objectId,
        isCancelled,
        format,
        statusText,
        teams: item.teams.map((t) => ({
          slug: t.team.slug,
          name: t.team.name,
          country: t.team?.country?.name,
          image: t.team?.image?.url,
        })),
      };
    });

    return { success: true, matches: parsedMatches };
  } catch (err) {
    console.error("Error scrapping matches", err);
    return { success: false, error: err?.message || "Error getting matches" };
  }
}

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,error:string,squads:Array}}
 */
async function scrapeSquadsFromTournamentUrl(tUrl) {
  const squadUrlRes = getSquadsUrlFromTournamentUrl(tUrl);
  if (!squadUrlRes.success) return squadUrlRes;

  try {
    const data = await getNextJsDataInScriptTagFromUrl(squadUrlRes.url);

    const squads = data.content.squads.map((item) => {
      const { id, objectId, teamName, teamSlug, slug, title } = item.squad;

      return {
        squadId: id,
        objectId,
        slug,
        teamSlug,
        teamName,
        title,
        teamImage: item.squad.teamImage?.url,
      };
    });
    return { success: true, squads };
  } catch (err) {
    console.error("Error scrapping squads", err);
    return { success: false, error: err?.message || "Error getting squads" };
  }
}

/**
 *
 * @param {string} tUrl
 *
 * @returns {{success:boolean,playerIds:Array}}
 */
async function scrapePlayerIdsFromTournamentUrl(tUrl) {
  const squadUrlRes = getSquadsUrlFromTournamentUrl(tUrl);
  if (!squadUrlRes.success) return squadUrlRes;

  try {
    const data = await getNextJsDataInScriptTagFromUrl(squadUrlRes.url);

    const squads = data.content.squads;
    const squadUrls = squads.map(
      (item) =>
        `${squadUrlRes.seriesUrl}/${item.squad.slug}-${item.squad.objectId}/series-squads`
    );

    const parsedPlayers = [];
    for (const url of squadUrls) {
      const res = await getNextJsDataInScriptTagFromUrl(url);

      const players = res.content.squadDetails.players;

      for (const player of players) {
        const dbObj = await PlayerSchema.findOne({
          playerId: player.player?.id,
        });
        if (!dbObj) continue;

        parsedPlayers.push(dbObj._id);
      }
    }

    return {
      success: true,
      playerIds: parsedPlayers.filter(
        (item, i, self) => self.indexOf(item) === i
      ),
    };
  } catch (err) {
    console.error("Error scrapping players", err);
    return { success: false, error: err?.message || "Error getting players" };
  }
}

/**
 *
 * @param {string} url
 * @returns {{success:boolean,error:string,data:object}}
 */
async function scrapeMatchDataFromUrl(url) {
  try {
    const data = await getNextJsDataInScriptTagFromUrl(url);

    const matchStatus = data.match.status;
    const isMatchCompleted = matchStatus === matchStatusEnum.RESULT;
    const isMatchAbandoned = matchStatus === matchStatusEnum.ABANDONED;
    const isNoResultForMatch = matchStatus === matchStatusEnum.NO_RESULT;

    if (!isMatchCompleted && !isMatchAbandoned && !isNoResultForMatch)
      return { success: false, error: "Math results are not yet there" };

    const match = data.match;
    const teams = data.match.teams;
    const innings = data.content.innings;

    const matchDetails = {
      slug: match.slug,
      objectId: match.objectId,
      matchId: match.id,
      status: match.status,
      statusText: match.statusText,
      startDate: match.startDate,
      endDate: match.endDate,
      startTime: match.startTime,
    };
    const teamsDetails = teams.map((t) => {
      const { name, longName, slug, objectId } = t.team;
      return {
        name,
        longName,
        slug,
        objectId,
        country: t.team.country?.name,
        score: t.score,
        image: t.team.image?.url,
      };
    });

    if (isMatchAbandoned || isNoResultForMatch)
      return {
        success: true,
        data: {
          ...matchDetails,
          teams: teamsDetails,
          innings: [],
        },
      };

    const inningsDetails = [];
    for (const item of innings) {
      const {
        runs,
        wickets,
        target,
        overs,
        balls,
        totalOvers,
        totalBalls,
        wides,
        noballs,
      } = item;

      const details = {
        runs,
        wickets,
        target,
        overs,
        balls,
        totalOvers,
        totalBalls,
        wides,
        noballs,
        inningBatsmen: [],
        inningBowlers: [],
        fieldings: [],
      };

      for (let i = 0; i < item.inningBatsmen.length; ++i) {
        const batsman = item.inningBatsmen[i];

        const dbPlayer = await PlayerSchema.findOne({
          playerId: batsman.player?.id,
        }).select("_id");
        if (!dbPlayer) continue;

        const {
          runs,
          balls,
          minutes,
          sixes,
          fours,
          strikerate,
          isOut,
          battedType,
        } = batsman;

        const obj = {
          player: dbPlayer._id,
          objectId: batsman.player.objectId,
          position: i + 1,
          runs,
          balls,
          minutes,
          sixes,
          fours,
          strikerate,
          isOut,
          battedType,
        };

        details.inningBatsmen.push(obj);
      }

      for (const bowler of item.inningBowlers) {
        const dbPlayer = await PlayerSchema.findOne({
          playerId: bowler.player?.id,
        }).select("_id");
        if (!dbPlayer) continue;

        const {
          overs,
          balls,
          maidens,
          conceded,
          wickets,
          economy,
          dots,
          fours,
          sixes,
          noballs,
          wides,
          runsPerBall,
          battedType,
        } = bowler;

        // we will be getting player from above calculated inning batsmen because we want player's position as well
        const detailedWickets = bowler.inningWickets.map((w) => {
          const player =
            details.inningBatsmen.find(
              (b) => b.objectId === w.dismissalBatsman.objectId
            ) || {};

          return {
            balls: player.balls,
            runs: player.runs,
            position: player.position,
            player: player.player,
          };
        });

        const obj = {
          player: dbPlayer._id,
          overs,
          balls,
          maidens,
          conceded,
          wickets,
          detailedWickets,
          economy,
          dots,
          fours,
          sixes,
          noballs,
          wides,
          runsPerBall,
          battedType,
        };

        details.inningBowlers.push(obj);
      }

      for (const wicket of item.inningWickets) {
        if (
          !wicket.dismissalFielders?.length ||
          !wicket.dismissalFielders[0].player?.id
        )
          continue; // fielding not involved

        const fielder = await PlayerSchema.findOne({
          playerId: wicket.dismissalFielders[0].player?.id,
        }).select("_id");
        if (!fielder) continue;
        const batsman = await PlayerSchema.findOne({
          objectId: wicket.dismissalBatsman.objectId,
        }).select("_id");
        const bowler = await PlayerSchema.findOne({
          objectId: wicket.dismissalBowler.objectId,
        }).select("_id");

        const obj = {
          fielder: fielder._id,
          batsman: batsman._id,
          bowler: bowler._id,
          dismissalType: wicket.dismissalText.short,
        };

        details.fieldings.push(obj);
      }

      inningsDetails.push(details);
    }

    return {
      success: true,
      data: {
        ...matchDetails,
        teams: teamsDetails,
        innings: inningsDetails,
      },
    };
  } catch (err) {
    console.error("Error scrapping match scores", err);
    return {
      success: false,
      error: err?.message || "Error getting match scores",
    };
  }
}

async function scrapePlayerDataFromEspn(url) {
  function snakeToCamelCase(str) {
    return str.replace(/_(.)/g, (_, char) => char.toUpperCase());
  }

  function scrapeStatsFromTable(tableElement) {
    const colsNames = Array.from(tableElement.querySelectorAll("thead th")).map(
      (e) => e.textContent
    );
    const rows = tableElement.querySelectorAll("tbody tr");
    const data = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const rowData = {};

      cells.forEach((cell, index) => {
        rowData[colsNames[index]] = cell.innerText.trim();
      });

      let final = {};
      for (const k in rowData) {
        final[k.toLowerCase()] = rowData[k];
      }

      data.push(final);
    });

    return data;
  }

  try {
    const res = await fetch(url);
    const textResponse = await res.text();
    const dom = parseHtmlAsDOM(textResponse);

    const tables = Array.from(dom.querySelectorAll("table")).slice(0, 2);
    const allStats = [];
    tables.forEach((table) => {
      const heading = table.parentNode.parentNode.childNodes[0].textContent;
      const tableData = scrapeStatsFromTable(table).map((e) => ({
        ...e,
        type: heading,
      }));

      allStats.push(...tableData);
    });

    const image = dom.querySelector(".ds-bg-cover img")
      ? dom.querySelector(".ds-bg-cover img").getAttribute("src")
      : null;
    const information = Array.from(
      dom
        .querySelector(".ds-grid.ds-grid-cols-2")
        .querySelectorAll(":scope > div")
    )
      .map((box) => {
        let label = box.querySelector(":scope > p").textContent;
        const value = box.querySelector("span>p").textContent;

        if (label)
          label = snakeToCamelCase(
            label.toLowerCase().trim().replace(" ", "_")
          );

        return { label, value };
      })
      .reduce((acc, curr) => {
        acc[curr.label] = curr.value;
        return acc;
      }, {});

    let scriptText = textResponse.slice(
      textResponse.indexOf(`id="__NEXT_DATA__"`)
    );
    scriptText = scriptText.slice(
      scriptText.indexOf(">") + 1,
      scriptText.indexOf("</script>")
    );

    const parsed = JSON.parse(scriptText);
    const playerData = parsed.props.appPageProps.data?.player || "";
    const { name, id, slug, objectId } = playerData;

    return {
      ...information,
      image,
      stats: allStats,
      name,
      id,
      slug,
      country: playerData.country?.name,
      objectId,
    };
  } catch (err) {
    console.error("ERROR getting stats", err);
    return null;
  }
}

export {
  scrapeSquadsFromTournamentUrl,
  scrapePlayerIdsFromTournamentUrl,
  scrapeMatchesFromTournamentUrl,
  getTournamentDataFromUrl,
  scrapeMatchDataFromUrl,
  scrapePlayerDataFromEspn,
};
