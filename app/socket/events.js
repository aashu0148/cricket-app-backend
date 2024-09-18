// import roomSchema from "../room/roomSchema.js";
import { roomUserTypeEnum } from "../../util/constant.js";

const SocketEvents = (io, rooms, updateRoom, deleteRoom) => {
  const sendNotificationInRoom = (roomId, title, desc) => {
    io.to(roomId).emit("notification", {
      title: title || "",
      description: desc || "",
    });
  };

  const sendSocketError = (socket, message) => {
    socket.emit("error", message);
  };

  const removeUserFromRooms = (uid, rid, socket) => {
    let room;
    if (rid) room = rooms[rid];
    else {
      const roomKey = Object.keys(rooms).find((key) =>
        rooms[key]?.users
          ? rooms[key].users.some((item) => item._id == uid)
          : false
      );

      if (roomKey) rid = roomKey;
      room = roomKey ? rooms[roomKey] : undefined;
    }

    if (!room) return null;

    const user = room.users ? room.users.find((item) => item._id == uid) : {};
    let newUsers = room.users
      ? room.users.filter((item) => item._id !== uid)
      : [];

    const updatedRoom = updateRoom(rid, { users: newUsers });

    if (user && socket) {
      sendNotificationInRoom(rid, `${user?.name || "undefined"} left the room`);
      socket.leave(rid);
    }

    return { user, room: updatedRoom };
  };

  io.on("connection", (socket) => {
    const leaveRoomSocketHandler = (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const updatedRoom = removeUserFromRooms(userId, roomId, socket);
      socket.emit("left-room", { _id: roomId });

      if (!updatedRoom?.room?.users?.length) deleteRoom(roomId);
    };

    const checkForUserInRoom = (
      socket,
      roomId,
      userId,
      doNotSendError = false
    ) => {
      let room = rooms[roomId] ? rooms[roomId] : undefined;

      if (!room) {
        if (!doNotSendError) sendSocketError(socket, "Room not found");
        return false;
      }

      const user = room.users.find((item) => item._id == userId);
      if (!user) {
        if (!doNotSendError)
          sendSocketError(socket, `user not found in the room: ${room.name}`);
        return false;
      }

      return { room, user };
    };

    socket.on("join-room", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId, name, email, profileImage } = obj;
      removeUserFromRooms(userId, null, socket);
      let room = rooms[roomId] ? { ...rooms[roomId] } : undefined;

      const user = {
        _id: userId,
        name,
        email,
        profileImage,
        heartbeat: Date.now(),
      };

      // if (room) {
      //   user.role =
      //     room.owner?._id == userId
      //       ? roomUserTypeEnum.owner
      //       : Array.isArray(room.admins) && room.admins.includes(userId)
      //       ? roomUserTypeEnum.admin
      //       : roomUserTypeEnum.member;

      //   room.users = Array.isArray(room.users) ? [...room.users, user] : [user];
      // } else {
      //   room = await roomSchema
      //     .findOne({ _id: roomId })
      //     .populate({
      //       path: "playlist",
      //       options: {
      //         transform: (doc) =>
      //           typeof doc !== "object"
      //             ? null
      //             : {
      //                 ...doc,
      //                 _id: doc?._id?.toString
      //                   ? doc._id.toString()
      //                   : doc?._id || "dummy_id",
      //               },
      //       },
      //     })
      //     .populate({
      //       path: "owner",
      //       select: "-token -createdAt",
      //     })
      //     .lean();

      //   if (!room) {
      //     sendSocketError(socket, "Room not found in the database");
      //     return;
      //   }

      //   user.role =
      //     room.owner?._id == userId
      //       ? roomUserTypeEnum.owner
      //       : Array.isArray(room.admins) && room.admins.includes(userId)
      //       ? roomUserTypeEnum.admin
      //       : roomUserTypeEnum.member;

      //   room = {
      //     ...room,
      //     users: [user],
      //     chats: [],
      //     admins: room.admins?.length ? room.admins : [],
      //     controllers: [],
      //     currentSong: room.playlist[0] ? room.playlist[0]._id : "",
      //     lastPlayedAt: Date.now(),
      //     paused: false,
      //     secondsPlayed: 0,
      //   };
      // }

      // const updatedRoom = updateRoom(roomId, room);
      socket.join(roomId);
      socket.emit("joined-room", { ...updatedRoom, _id: roomId });
      sendNotificationInRoom(roomId, `${name} joined the room`);

      io.to(roomId).emit("users-change", {
        users: updatedRoom.users || [],
        _id: roomId,
      });
    });

    socket.on("leave-room", leaveRoomSocketHandler);

    socket.on("get-room", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      socket.emit("get-room", { room });
    });

    socket.on("alive", async (obj) => {
      if (!obj?.roomId || !obj?.userId) return;

      const { roomId, userId } = obj;

      const roomCheck = checkForUserInRoom(socket, roomId, userId, true);
      if (!roomCheck) return;

      const { room, user } = roomCheck;

      const newUsers = room.users.map((item) =>
        item._id == userId ? { ...item, heartbeat: Date.now() } : item
      );

      updateRoom(roomId, {
        users: newUsers,
      });
    });
  });
};

export default SocketEvents;
