const SocketEvents = (io) => {
  // Helper function to send notifications to a room
  const sendNotificationInRoom = (roomId, title, desc) => {
    io.to(roomId).emit("notification", {
      title: title || "",
      description: desc || "",
    });
  };

  // Helper function to send errors to a specific socket
  const sendSocketError = (socket, message) => {
    socket.emit("error", message);
  };

  // Function to handle leaving a room
  const leaveRoomSocketHandler = (socket, obj) => {
    if (!obj?.roomId || !obj?.userId) return;

    const { roomId, userId } = obj;
    socket.leave(roomId); // Leave the room
    socket.emit("left-room", { _id: roomId }); // Notify user
    sendNotificationInRoom(roomId, `${userId} left the room`);
    io.to(roomId).emit("users-change", {
      _id: roomId,
      users: getUpdatedRoomUsers(roomId),
    });
  };

  // Function to handle draft pick
  const handleDraftPick = (socket, obj) => {
    const { roomId, userId, playerId } = obj;

    if (!roomId || !userId || !playerId) {
      sendSocketError(socket, "Missing required data for draft pick.");
      return;
    }

    const currentTurn = getCurrentDraftTurn(roomId); // Fetch the team whose turn it is

    if (currentTurn !== userId) {
      sendSocketError(socket, "It's not your turn to pick.");
      return;
    }

    const playerSelected = selectPlayerForTeam(roomId, userId, playerId); // Handle player selection
    if (!playerSelected) {
      sendSocketError(socket, "Player not available or already picked.");
      return;
    }

    io.to(roomId).emit("draft-pick", {
      userId,
      playerId,
      teamId: currentTurn.teamId,
    });

    // Notify everyone in the room about the selection
    sendNotificationInRoom(
      roomId,
      "Draft Update",
      `${userId} picked player ${playerId}`
    );

    // Move to next turn
    moveToNextDraftTurn(roomId);
    io.to(roomId).emit("turn-change", {
      nextTurn: getCurrentDraftTurn(roomId),
    });
  };

  // Main connection handler
  io.on("connection", (socket) => {
    // Handle joining the room
    socket.on("join-room", async (obj) => {
      const { roomId, userId, name } = obj;

      if (!roomId || !userId) {
        sendSocketError(socket, "Missing roomId or userId.");
        return;
      }

      // Remove user from previous rooms, if any
      removeUserFromRooms(userId, null, socket);

      // Join the new room
      socket.join(roomId);

      const updatedRoom = getUpdatedRoom(roomId);

      socket.emit("joined-room", { ...updatedRoom, _id: roomId });
      sendNotificationInRoom(roomId, `${name} joined the room`);

      // Notify everyone about the updated users
      io.to(roomId).emit("users-change", {
        users: updatedRoom.users || [],
        _id: roomId,
      });
    });

    // Handle leaving the room
    socket.on("leave-room", (obj) => leaveRoomSocketHandler(socket, obj));

    // Handle draft pick during the draft round
    socket.on("draft-pick", (obj) => handleDraftPick(socket, obj));
  });
};

// Helper functions (these would interact with your backend/database)
const getUpdatedRoom = (roomId) => {
  // Fetch room details including users
  return {
    _id: roomId,
    users: getUpdatedRoomUsers(roomId),
  };
};

const getUpdatedRoomUsers = (roomId) => {
  // Fetch and return the list of users in the room
  // This should query your database for the room's user list
  return []; // Example: return the array of users
};

const getCurrentDraftTurn = (roomId) => {
  // Logic to return the team/user whose turn it is to pick
  // Example: return the user ID or team ID
  return "someUserId";
};

const selectPlayerForTeam = (roomId, userId, playerId) => {
  // Logic to assign a player to a user's team during draft
  // Example: check if the player is available and assign to the team
  return true; // Return true if successful, false otherwise
};

const moveToNextDraftTurn = (roomId) => {
  // Logic to advance the draft to the next user's turn
  // Example: update the draft round data to move to the next user
};

const removeUserFromRooms = (userId, currentRoomId, socket) => {
  // Logic to remove a user from all rooms they are currently in
  // Example: iterate over rooms and remove the user
};

export default SocketEvents;
