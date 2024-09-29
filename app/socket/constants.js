const socketEventsEnum = {
  heartbeat: "heartbeat",
  getRoom: "get-room",
  picked: "picked",
  turnUpdate: "turn-update",
  roundStatusUpdate: "round-status-update",
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
  pauseRound: "pause-round",
  paused: "paused",
  resumeRound: "resume-round",
  resumed: "resumed",
};

export { socketEventsEnum };
