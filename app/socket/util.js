// Utility function to validate user objects
const isValidUser = (user) => {
  return typeof user.name === "string" && typeof user._id === "string";
};

const isValidPlayer = (player) =>
  typeof player._id === "string" && player.name === "string";

// Utility function to validate chat objects
const isValidChat = (chat) => {
  return (
    isValidUser(chat.user) &&
    typeof chat.message === "string" &&
    typeof chat.timestamp === "string"
  );
};

// Utility function to validate room objects
const isValidRoom = (room) => {
  return (
    typeof room.name === "string" &&
    typeof room.leagueId === "string" &&
    Array.isArray(room.playersPool) &&
    room.players.every(isValidPlayer) &&
    Array.isArray(room.users) &&
    room.users.every(isValidUser) &&
    Array.isArray(room.chats) &&
    room.chats.every(isValidChat)
  );
};

const isPickedPlayerValid = (playerId, playersPool, leagueTeams) => {
  // Check if the player exists in the playersPool
  const isInPool = playersPool.some((p) => p._id === playerId);

  // Check if the player has already been picked by any team
  const isAlreadyPicked = leagueTeams.some((team) =>
    team.players.includes(playerId)
  );

  // The player is valid only if they are in the pool and not already picked
  return isInPool && !isAlreadyPicked;
};

export { isPickedPlayerValid, isValidChat, isValidRoom, isValidUser };
