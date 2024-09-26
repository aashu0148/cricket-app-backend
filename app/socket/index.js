import SocketEvents from "./events.js";

import { socketEventsEnum } from "./constants.js";

// In-memory room storage
const rooms = [];

function getAllRooms() {
  return rooms;
}

// Utility function to validate user objects
const isValidUser = (user) => {
  return typeof user.name === "string" && typeof user._id === "string";
};

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
    Array.isArray(room.users) &&
    room.users.every(isValidUser) &&
    Array.isArray(room.chats) &&
    room.chats.every(isValidChat)
  );
};

/**
 * Retrieves a room by its leagueId.
 * @param {String} leagueId - The unique ID of the room.
 * @returns {Object|null} - The room object if found; otherwise, null.
 */
const getRoom = (leagueId) => {
  if (typeof leagueId !== "string") {
    throw new Error("Invalid leagueId: must be a string.");
  }
  return rooms.find((room) => room.leagueId === leagueId) || null;
};

/**
 * Adds a new room.
 * @param {Object} newRoom - The room object to add.
 * @returns {Object|null} - The added room object if successful; otherwise, null.
 */
const addRoom = (newRoom) => {
  if (!isValidRoom(newRoom)) {
    throw new Error("Invalid room object.");
  }

  if (getRoom(newRoom.leagueId)) {
    throw new Error("Room with this leagueId already exists.");
  }
  rooms.push(newRoom);
  return newRoom;
};

/**
 * Updates an existing room.
 * @param {String} leagueId - The unique ID of the room to update.
 * @param {Object} updatedData - The data to update in the room.
 * @returns {Object|null} - The updated room object if successful; otherwise, null.
 */
const updateRoom = (leagueId, updatedData = {}) => {
  if (typeof leagueId !== "string") {
    throw new Error("Invalid leagueId: must be a string.");
  }
  const roomIndex = rooms.findIndex((room) => room.leagueId === leagueId);
  if (roomIndex === -1) {
    throw new Error("Room not found.");
  }

  const updatedRoom = { ...rooms[roomIndex], ...updatedData };
  if (!isValidRoom(updatedRoom)) {
    throw new Error("Updated data is invalid.");
  }
  rooms[roomIndex] = updatedRoom;
  return updatedRoom;
};

/**
 * Deletes a room by its leagueId.
 * @param {String} leagueId - The unique ID of the room to delete.
 * @returns {Boolean} - True if the room was deleted; otherwise, false.
 */
const deleteRoom = (leagueId) => {
  if (typeof leagueId !== "string") {
    throw new Error("Invalid leagueId: must be a string.");
  }
  const roomIndex = rooms.findIndex((room) => room.leagueId === leagueId);
  if (roomIndex === -1) {
    throw new Error("Room not found.");
  }

  rooms.splice(roomIndex, 1);
  return true;
};

// Utility function to check if the user's heartbeat is older than 5 minutes
const isUserInactive = (user) => {
  const now = Date.now();
  const heartbeatTime = new Date(user.heartbeat).getTime();
  const buffer = 5 * 60 * 1000;

  return now - heartbeatTime > buffer;
};

// Clean up inactive users from a room (users with a heartbeat older than 5 minutes)
const cleanUpInactiveUsers = (io, room) => {
  if (!room || !room.users || !room.users.length) return room;

  const activeUsers = room.users.filter((user) => !isUserInactive(user));
  const removedUsers = room.users.filter((user) => isUserInactive(user));

  // If some users were removed, update the room
  if (removedUsers.length > 0) {
    room.users = activeUsers;
    updateRoom(room.leagueId, room);

    // Emit the 'users-change' event and notify the room about inactive users
    io.to(room.leagueId).emit(socketEventsEnum.usersChange, {
      users: activeUsers,
      _id: room.leagueId,
    });

    io.to(room.leagueId).emit(socketEventsEnum.notification, {
      title: "Inactive users removed",
      description: `Removed [${removedUsers
        .map((item) => item.name)
        .join(", ")}] from the room as they were not active.`,
    });

    // Log the action
    console.log(
      `🟢 Cleared ${removedUsers.length} inactive users: [${removedUsers
        .map((item) => item.name)
        .join(", ")}] from room ${room.name}`
    );
  }

  return room;
};

// Clean up rooms with no users and clean inactive users from rooms
const cleanUpEmptyRooms = (io) => {
  const allRooms = getAllRooms();
  if (!allRooms.length) return;

  console.log("🔵 Cleaning up the rooms 🧹🧹");
  allRooms.forEach((room) => {
    // First, clean up inactive users from the room
    cleanUpInactiveUsers(io, room);

    // Check if the room is empty after cleaning inactive users
    if (!room.users || room.users.length === 0) {
      deleteRoom(room.leagueId);

      console.log(`🟢 Cleared empty room - ${room.name}`);
    }
  });
};

let cleanupInterval;
function initSocket(io) {
  clearInterval(cleanupInterval);
  SocketEvents(io);
  console.log(`⚡ Socket initialized`);

  cleanupInterval = setInterval(() => cleanUpEmptyRooms(io), 5 * 60 * 1000);
}

export { initSocket, getRoom, updateRoom, deleteRoom, addRoom, getAllRooms };
