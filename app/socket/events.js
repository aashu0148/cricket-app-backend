import LeagueSchema from "#app/leagues/leagueSchema.js";
import UserSchema from "#app/users/userSchema.js";

import { socketEventsEnum } from "./constants.js";
import { getRoom, updateRoom, deleteRoom, addRoom } from "./index.js";

const SocketEvents = (io) => {
  // Send a notification to the room
  const sendNotificationInRoom = (roomId, title, desc) => {
    io.to(roomId).emit(socketEventsEnum.notification, {
      title: title || "",
      description: desc || "",
    });
  };

  // Send an error message to the socket
  const sendSocketError = (socket, message) => {
    socket.emit(socketEventsEnum.error, message);
  };

  // Remove a user from all rooms or a specific room
  const removeUserFromRoom = (userId, leagueId, socket) => {
    let room = null;

    try {
      room = getRoom(leagueId);
      if (!room) return null;

      const user = room.users.find((u) => u._id === userId);
      if (!user)
        throw new Error(`User do not exist in room[${room.name}] to remove`);

      const updatedUsers = room.users.filter((u) => u._id !== userId);

      const updatedRoom = updateRoom(leagueId, { users: updatedUsers });

      sendNotificationInRoom(
        leagueId,
        `${user.name || "undefined"} left the room`
      );
      socket.leave(leagueId);

      return { user, room: updatedRoom };
    } catch (error) {
      console.error("Error in removeUserFromRooms:", error.message, error);
      return null;
    }
  };

  io.on("connection", (socket) => {
    // Handler for joining a room
    socket.on(socketEventsEnum.joinRoom, async (obj) => {
      const { leagueId, userId } = obj;

      try {
        // Validate inputs
        if (!leagueId || !userId) {
          sendSocketError(socket, "Missing leagueId or userId.");
          return;
        }

        // Find the league
        const league = await LeagueSchema.findOne({ _id: leagueId });
        if (!league) {
          sendSocketError(socket, "League not found!");
          return;
        }

        // Find the user
        const user = await UserSchema.findOne({ _id: userId }).select(
          "-token -role"
        );
        if (!user) {
          sendSocketError(socket, "User not found!");
          return;
        }

        // Find the team belonging to the user in the league
        const team = league.teams.find(
          (t) => t.owner.toString() === user._id.toString()
        );
        if (!team) {
          sendSocketError(socket, "Your team not found in this league", 404);
          return;
        }

        // Check if the room exists
        let room = getRoom(leagueId);
        const userObject = {
          _id: userId,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage || "",
          heartbeat: Date.now(),
        };

        let updatedRoom;
        // If room exists, add the user
        if (room) {
          room.users = [...room.users, userObject];

          updatedRoom = updateRoom(leagueId, room);
        } else {
          // If room doesn't exist, create a new one
          room = {
            name: league.name,
            leagueId: leagueId,
            users: [userObject],
            chats: [],
          };
          addRoom(room);

          updatedRoom = room;
        }

        // Join the user to the socket room
        socket.join(leagueId);
        socket.emit(socketEventsEnum.joinedRoom, {
          ...updatedRoom,
          _id: leagueId,
        });
        sendNotificationInRoom(leagueId, `${user.name} joined the room`);

        // Notify all clients about the users' change
        io.to(leagueId).emit(socketEventsEnum.usersChange, {
          users: updatedRoom.users || [],
          _id: leagueId,
        });
      } catch (error) {
        console.error("Error in join-room:", error.message, error);
      }
    });

    // Handler for leaving a room
    socket.on(socketEventsEnum.leaveRoom, (obj) => {
      const { leagueId, userId } = obj;
      try {
        if (!leagueId || !userId) return;

        const updatedRoom = removeUserFromRoom(userId, leagueId, socket);
        socket.emit(socketEventsEnum.leftRoom, { _id: leagueId });

        // If room is empty, delete the room
        if (!updatedRoom?.room?.users?.length) {
          deleteRoom(leagueId);
        }
      } catch (error) {
        console.error("Error in leave-room:", error.message, error);
      }
    });

    // Handler for sending a chat message
    socket.on(socketEventsEnum.chat, async (obj) => {
      const { leagueId, userId, message, timestamp } = obj;

      try {
        // Validate input
        if (!leagueId || !userId || !message) {
          sendSocketError(socket, "Missing required parameters.");
          return;
        }

        const room = getRoom(leagueId);
        if (!room) {
          sendSocketError(socket, "Room not found.");
          return;
        }

        const user = room.users.find((u) => u._id === userId);
        if (!user) {
          sendSocketError(socket, "User not found in the room.");
          return;
        }

        // Validate message
        if (!message.trim()) {
          sendSocketError(socket, "Message cannot be empty.");
          return;
        }

        // Create chat object
        const chat = {
          user: {
            _id: userId,
            name: user.name,
            profileImage: user.profileImage || "",
          },
          message,
          timestamp: timestamp || Date.now(),
        };

        // Update room chats
        const updatedChats = [...room.chats, chat];
        updateRoom(leagueId, { chats: updatedChats });

        // Emit the chat message to everyone in the room
        io.to(leagueId).emit(socketEventsEnum.chat, {
          chats: updatedChats,
        });
      } catch (error) {
        console.error("Error in chat:", error.message, error);
      }
    });
  });
};

export default SocketEvents;
