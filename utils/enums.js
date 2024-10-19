const tournamentStatusEnum = {
  UPCOMING: "UPCOMING",
  ONGOING: "ONGOING",
  COMPLETED: "COMPLETED",
};

const userRoleEnum = {
  USER: "USER",
  ADMIN: "ADMIN",
};

// its important to not change this enum, its based on espn's data
const playerDismissalTypeEnum = {
  caught: "caught",
  bowled: "bowled",
  runOut: "run out",
  stumped: "stumped",
  lbw: "lbw",
};
// its important to not change this enum, its based on espn's data
const matchStatusEnum = {
  RESULT: "RESULT",
  ABANDONED: "ABANDONED",
  NO_RESULT: "NO RESULT",
};

const leagueTypeEnum = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
};

const playerRoleEnum = {
  BATTER: "BATTER",
  BOWLER: "BOWLER",
  ALLROUNDER: "ALLROUNDER",
};

const emailTypesEnum = {
  DRAFT_ROUND_TIME_UPDATE: "DRAFT_ROUND__TIMEUPDATE",
  DRAFT_ROUND_REMINDER: "DRAFT_ROUND_REMINDER",
  DRAFT_ROUND_RESULTS: "DRAFT_ROUND_RESULTS",
};

export {
  leagueTypeEnum,
  playerDismissalTypeEnum,
  tournamentStatusEnum,
  userRoleEnum,
  matchStatusEnum,
  playerRoleEnum,
  emailTypesEnum,
};
