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

export {
  leagueTypeEnum,
  playerDismissalTypeEnum,
  tournamentStatusEnum,
  userRoleEnum,
  matchStatusEnum,
};
