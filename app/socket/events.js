import LeagueSchema from "#app/leagues/leagueSchema.js";
import UserSchema from "#app/users/userSchema.js";

import { isPickedPlayerValid } from "./util.js";
import { getRoom, updateRoom, deleteRoom, addRoom } from "./index.js";
import { socketEventsEnum } from "./constants.js";
import TournamentSchema from "#app/tournaments/tournamentSchema.js";

const roomTimeouts = {};

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

  const goToNextTurn = async (leagueId, room) => {
    const maxPlayersAllowed = 15;

    try {
      const league = await LeagueSchema.findOne({ _id: leagueId }).populate(
        "teams.owner",
        "name"
      );

      if (league.teams.every((t) => t.players.length >= maxPlayersAllowed)) {
        // everyone have chosen their players
        league.draftRound.completed = true;
        await league.save();
        io.to(leagueId).emit(socketEventsEnum.draftRoundCompleted);

        return false;
      }

      // Get the index of the current turn user
      const currentTurnIndex = league.teams.findIndex(
        (t) =>
          t.owner._id.toString() === league.draftRound.currentTurn.toString()
      );

      // Move to the next user in the list
      const nextUserIndex = (currentTurnIndex + 1) % league.teams.length;
      const nextTurnUser = league.teams[nextUserIndex].owner._id.toString();

      // Update the current turn
      league.draftRound.currentTurn = nextTurnUser;
      await league.save();

      const newTurnUser = league.teams.find(
        (t) => t.owner._id.toString() === nextTurnUser
      ).owner;

      // Notify the room about the next turn
      sendNotificationInRoom(leagueId, `It's ${newTurnUser.name}'s turn!`);

      // Start the next turn timer
      startTurnTimer(leagueId, nextTurnUser, room);
    } catch (err) {
      console.error("Error making next turn:", err);
      return false;
    }
  };

  const startTurnTimer = (leagueId, currentTurnUser, room) => {
    const turnSeconds = 120;

    const timer = setTimeout(async () => {
      try {
        const league = await LeagueSchema.findOne({ _id: leagueId }).populate(
          "teams.owner",
          "name"
        );
        const team = league.teams.find(
          (t) => t.owner._id.toString() === currentTurnUser
        );
        const playerPool = room.playersPool;

        let pickedPlayerId = null;
        // Try to pick from the wishlist first
        if (team.wishlist && team.wishlist.length > 0) {
          const validPlayer = team.wishlist.find((p) =>
            isPickedPlayerValid(p.toString(), playerPool, league.teams)
          );

          if (validPlayer) {
            pickedPlayerId = validPlayer.toString();
          }
        }

        // If no valid player in wishlist, pick a random player from the pool
        if (!pickedPlayerId) {
          for (let i = 0; i < playerPool.length; ++i) {
            const isValid = isPickedPlayerValid(
              playerPool[i]._id,
              playerPool,
              league.teams
            );
            if (isValid) {
              pickedPlayerId = playerPool[i]._id;
              break; // break from the loop
            }
          }
        }

        if (pickedPlayerId) {
          // Assign the picked player to the user's team
          team.players.push(pickedPlayerId);
          await league.save();
        }

        // Notify the room about the auto-picked player
        sendNotificationInRoom(
          leagueId,
          `${team.owner.name} missed their turn, auto-picked ${
            playerPool.find((p) => p._id === pickedPlayerId)?.slug
          }.`
        );

        // Move to the next turn
        goToNextTurn(leagueId, room);
      } catch (err) {
        console.error("Error assigning a player automatically:", err);
        return false;
      }
    }, turnSeconds * 1000);

    roomTimeouts[leagueId] = timer;
  };

  const checkAndStartDraftRound = async (socket, leagueId, room = {}) => {
    try {
      const league = await LeagueSchema.findOne({ _id: leagueId }).populate(
        "teams.owner",
        "name"
      );

      if (league.draftRound.paused) {
        sendSocketError(
          socket,
          "Draft round paused right now, ask owner to resume it"
        );
        return false;
      }

      if (
        room.users?.length / league.teams.length < 0.6 ||
        Date.now() < new Date(league.draftRound.startDate).getTime()
      )
      //   return false; // can not start yet

      // Notify users the draft round is starting
      sendNotificationInRoom(leagueId, "Draft round is starting!");

      // Set the first turn
      let currentTurnUser = league.draftRound.currentTurn
        ? league.draftRound.currentTurn.toString()
        : room.users[0]._id;
      league.draftRound.currentTurn = currentTurnUser;
      await league.save();

      const newTurnUser = league.teams.find(
        (t) => t.owner._id.toString() === currentTurnUser
      )?.owner;

      // Notify the room about whose turn it is
      sendNotificationInRoom(leagueId, `It's ${newTurnUser?.name}'s turn!`);

      // Start the first turn timer
      startTurnTimer(leagueId, currentTurnUser, room);
    } catch (error) {
      console.error("Error starting draft round:", error.message);
    }
  };

  io.on("connection", (socket) => {
    // Handler for joining a room
    socket.on(socketEventsEnum.joinRoom, async (obj = {}) => {
      try {
        const { leagueId, userId } = obj;
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
        if (league.draftRound.startDate > new Date())
          return sendSocketError(
            socket,
            "Draft round is yet to start, join after it starts"
          );

        // Find the team belonging to the user in the league
        const team = league.teams.find(
          (t) => t.owner.toString() === user._id.toString()
        );
        if (!team) {
          sendSocketError(socket, "Your team not found in this league", 404);
          return;
        }

        let room = getRoom(leagueId);
        const userAlreadyExist =
          room && room.users.some((e) => e._id === userId);

        let updatedRoom;
        if (!userAlreadyExist) {
          const userObject = {
            _id: userId,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage || "",
            heartbeat: Date.now(),
          };

          // If room exists, add the user
          if (room) {
            room.users = [...room.users, userObject];

            updatedRoom = updateRoom(leagueId, room);
          } else {
            // If room doesn't exist, create a new one
            const { players } = await TournamentSchema.findOne({
              _id: league.tournament,
            })
              .populate("players", "name slug")
              .lean();

            room = {
              name: league.name,
              leagueId: leagueId,
              users: [userObject],
              chats: [],
              playersPool: players.map((e) => ({
                ...e,
                _id: e._id.toString(),
              })),
            };
            addRoom(room);

            updatedRoom = room;
          }
        }

        // Join the user to the socket room
        socket.join(leagueId);
        socket.emit(socketEventsEnum.joinedRoom, {
          leagueId,
          name: room.name,
          chats: room.chats,
          users: room.users,
          _id: leagueId,
        });
        sendNotificationInRoom(leagueId, `${user.name} joined the room`);

        if (!userAlreadyExist)
          checkAndStartDraftRound(socket, leagueId, updatedRoom);

        // Notify all clients about the users' change
        io.to(leagueId).emit(socketEventsEnum.usersChange, {
          users: userAlreadyExist ? room.users : updatedRoom?.users || [],
          _id: leagueId,
        });
      } catch (error) {
        console.error("Error in join-room:", error.message, error);
      }
    });

    // Handler for leaving a room
    socket.on(socketEventsEnum.leaveRoom, (obj = {}) => {
      try {
        const { leagueId, userId } = obj;
        if (!leagueId || !userId) return;

        const updatedRoom = removeUserFromRoom(userId, leagueId, socket);
        socket.emit(socketEventsEnum.leftRoom, { _id: leagueId });

        // If room is empty, delete the room
        if (updatedRoom && !updatedRoom?.room?.users?.length) {
          deleteRoom(leagueId);
        }
      } catch (error) {
        console.error("Error in leave-room:", error.message, error);
      }
    });

    socket.on(socketEventsEnum.getRoom, (obj = {}) => {
      try {
        const { leagueId, userId } = obj;
        if (!leagueId || !userId) return;

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

        socket.emit(socketEventsEnum.getRoom, room);
      } catch (error) {
        console.error("Error in leave-room:", error.message, error);
      }
    });

    // Handler for sending a chat message
    socket.on(socketEventsEnum.chat, async (obj = {}) => {
      try {
        const { leagueId, userId, message, timestamp } = obj;
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
        io.to(leagueId).emit(socketEventsEnum.chat, chat);
      } catch (error) {
        console.error("Error in chat:", error.message, error);
      }
    });

    socket.on(socketEventsEnum.heartbeat, async (obj = {}) => {
      try {
        const { leagueId, userId } = obj;
        if (!leagueId || !userId) return;

        const room = getRoom(leagueId);
        if (!room) return;

        const userIndex = room.users.findIndex((u) => u._id === userId);
        if (userIndex < 0) return;

        updateRoom(leagueId, {
          users: room.users.map((u) =>
            u._id === userId ? { ...u, heartbeat: Date.now() } : u
          ),
        });
      } catch (error) {
        console.error("Error in heartbeat:", error?.message, error);
      }
    });

    socket.on(socketEventsEnum.pickPlayer, async (obj = {}) => {
      const { leagueId, userId, pickedPlayerId } = obj;
      if (!leagueId || !userId || !pickedPlayerId)
        return sendSocketError(socket, "Missing required parameters");

      try {
        const league = await LeagueSchema.findOne({ _id: leagueId }).populate(
          "owner",
          "name"
        );
        const team = league.teams.find(
          (t) => t.owner._id.toString() === userId
        );

        // Check if it's their turn
        if (league.draftRound.currentTurn !== userId) {
          sendSocketError(socket, "It's not your turn!");
          return;
        }

        const room = getRoom(leagueId);
        if (!room) return sendSocketError(socket, "You are not in any room");

        const isUserInRoom = room.users.some((e) => e._id === userId);
        if (!isUserInRoom)
          return sendSocketError(socket, "You are not found in this room");

        // Check if player is available in the pool
        const playerPool = room.playersPool;
        const isValidPick = isPickedPlayerValid(
          pickedPlayerId,
          playerPool,
          league.teams
        );
        if (!isValidPick)
          return sendSocketError(
            socket,
            "Player already picked by someone else"
          );

        // Assign player to user's team
        team.players.push(pickedPlayerId);
        await league.save();

        const pickedPlayer = playerPool.find((e) => e._id === pickedPlayerId);

        // Notify the room about the pick
        sendNotificationInRoom(
          leagueId,
          `${team.owner.name} picked ${pickedPlayer.slug.split("-").join(" ")}!`
        );

        // Clear the timer and move to the next turn
        clearTimeout(roomTimeouts[leagueId]);
        if (roomTimeouts.leagueId) roomTimeouts[leagueId] = null;

        goToNextTurn(leagueId, room);
      } catch (error) {
        console.error("Error picking player:", error.message);
        sendSocketError(socket, "Error picking a player:", error.message);
      }
    });
  });
};

export default SocketEvents;
