const socketEventsEnum = {
  heartbeat: "heartbeat",
  error: "error",
  notification: "notification",
  joinedRoom: "joined-room",
  leftRoom: "left-room",
  leaveRoom: "leave-room",
  joinRoom: "join-room",
  chat: "chat",
  usersChange: "users-change",
  draftRoundCompleted: "draft-round-completed",
  pickPlayer: "pick-player",
};

export { socketEventsEnum };
