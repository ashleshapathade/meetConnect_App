// import { truncate } from "node:fs";
// import { json } from "node:stream/consumers";
import { Server, Socket } from "socket.io";
import { Meeting } from "../models/meeting.model.js";

const connections = {};
const messages = {};
const timOnline = {};

const waitingRooms = {}; // { [room]: [ { socketId, username, userId } ] }
const admittedUsers = {}; // { [room]: Set(userId) }
const kickedUsers = {}; // { [room]: [userId] }
const rejoinRequests = {}; // { [room]: [ { userId, username, socketId } ] }
const lockedMeetings = {}; // { [room]: true/false }
const waitingRoomSettings = {}; // { [room]: true/false }

const REFRESH_WINDOW_MS = 3000;
const userMediaState = {}; // keyed by socketId so refresh/reconnect keeps media status
const socketToUser = {}; // map socketId to userId

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on(
      "join-call",
      ({ path, username, userId, isRefresh = false, isHost = false }) => {
        // socket.join(path) is intentionally delayed until after blocking checks
        if (!connections[path]) connections[path] = [];
        if (!waitingRooms[path]) waitingRooms[path] = [];
        if (!admittedUsers[path]) admittedUsers[path] = new Set();
        if (!kickedUsers[path]) kickedUsers[path] = [];
        if (!rejoinRequests[path]) rejoinRequests[path] = [];
        if (typeof lockedMeetings[path] === "undefined")
          lockedMeetings[path] = false;
        if (typeof waitingRoomSettings[path] === "undefined")
          waitingRoomSettings[path] = false;
          
        // If meeting is locked and user is not already in the meeting, block join (except host)
        // Fallback for older clients that don't pass isHost
        if (!isHost) {
          isHost =
            connections[path].length === 0 ||
            (connections[path][0] &&
              String(connections[path][0].userId) === String(userId));
        }

        // Always send current waiting room state to host (first user in connections[path])
        setTimeout(() => {
          if (connections[path][0]) {
            io.to(connections[path][0].socketId).emit(
              "waiting-room-update",
              waitingRooms[path],
            );
          }
        }, 0);
        const alreadyInMeeting = connections[path].some(
          (u) => String(u.userId) === String(userId),
        );
        if (lockedMeetings[path] && !isHost && !alreadyInMeeting) {
          io.to(socket.id).emit("meeting-locked");
          return;
        }
        // Host toggles lock meeting
        socket.on("toggle-lock-meeting", ({ path, locked }) => {
          lockedMeetings[path] = locked;
          // Notify host and all participants
          if (connections[path]) {
            connections[path].forEach((u) => {
              io.to(u.socketId).emit("lock-meeting-update", locked);
            });
          }
        });

        // If user is in kicked list, do not allow direct join
        if (kickedUsers[path].includes(String(userId))) {
          // Add to rejoin requests if not already present
          const alreadyRequested = rejoinRequests[path].some(
            (r) => String(r.userId) === String(userId),
          );
          if (!alreadyRequested) {
            rejoinRequests[path].push({
              userId,
              username,
              socketId: socket.id,
            });
          }
          // Notify host of rejoin request
          if (connections[path][0]) {
            io.to(connections[path][0].socketId).emit(
              "rejoin-request",
              rejoinRequests[path],
            );
          }
          // Tell user to wait for host approval
          io.to(socket.id).emit("waiting-for-rejoin-approval");
          return;
        }

        // Host toggles waiting room
        socket.on("toggle-waiting-room", ({ path, enabled }) => {
          waitingRoomSettings[path] = enabled;
        });

        // If waiting room is enabled (server-side), AND user is not host, and not already admitted
        if (waitingRoomSettings[path] && !isHost && !admittedUsers[path].has(String(userId))) {
          const exists = waitingRooms[path].findIndex((u) => String(u.userId) === String(userId));
          if (exists !== -1) {
            waitingRooms[path][exists].socketId = socket.id;
          } else {
            waitingRooms[path].push({ socketId: socket.id, username, userId });
          }
          // Notify all sockets in the room (host(s) will show popup)
          if (connections[path]) {
            connections[path].forEach((u) => {
              io.to(u.socketId).emit("waiting-room-update", waitingRooms[path]);
            });
          }
          // Notify user they are in waiting room
          io.to(socket.id).emit("in-waiting-room");
          return; // Do not add to main room yet
        }

        // 🔥 CHECK if user already exists (refresh case)
        const existingUserIndex = connections[path].findIndex(
          (u) => String(u.userId) === String(userId),
        );

        socket.join(path); // <--- Add to Socket.IO room only after being admitted
        socketToUser[socket.id] = userId;
        if (existingUserIndex !== -1) {
          const existingUser = connections[path][existingUserIndex];
          const oldSocketId = existingUser.socketId;
          const oldMedia = userMediaState[oldSocketId] || {
            video: false,
            audio: false,
          };

          if (existingUser.disconnectTimeout) {
            clearTimeout(existingUser.disconnectTimeout);
            existingUser.disconnectTimeout = null;
          }

          existingUser.socketId = socket.id;
          existingUser.disconnected = false;
          existingUser.isRefresh = isRefresh;
          userMediaState[socket.id] = { screen: false, ...oldMedia };

          if (oldSocketId !== socket.id) {
            // 🔥 notify peers that the same user reconnected with a new socket id
            socket.to(path).emit("user-refreshed", {
              oldSocketId,
              socketId: socket.id,
              username,
              userId,
              video: userMediaState[socket.id].video,
              audio: userMediaState[socket.id].audio,
              screen: userMediaState[socket.id].screen,
            });

            delete socketToUser[oldSocketId];
            delete userMediaState[oldSocketId];
          }
        } else {
          // ✅ NEW USER
          connections[path].push({
            socketId: socket.id,
            username,
            userId,
            isRefresh,
            disconnected: false,
            disconnectTimeout: null,
          });

          if (!userMediaState[socket.id]) {
            userMediaState[socket.id] = {
              video: false,
              audio: false,
              screen: false,
            };
          }

          if (!isRefresh) {
            socket.to(path).emit("user-joined", {
              socketId: socket.id,
              username,
              userId,
              video: userMediaState[socket.id].video,
              audio: userMediaState[socket.id].audio,
              screen: userMediaState[socket.id].screen,
            });
          }
        }

        // ✅ SEND ALL USERS TO EVERYONE IN ROOM
        const usersWithState = connections[path].map((u) => ({
          ...u,
          video: userMediaState[u.socketId]?.video ?? false,
          audio: userMediaState[u.socketId]?.audio ?? false,
          screen: userMediaState[u.socketId]?.screen ?? false,
        }));

        connections[path].forEach((u) => {
          io.to(u.socketId).emit("all-users", usersWithState);
        });
      },
    );

    // Host admits user from waiting room
    socket.on("admit-user", ({ path, socketId }) => {
      if (!waitingRooms[path]) return;
      const idx = waitingRooms[path].findIndex((u) => u.socketId === socketId);
      if (idx !== -1) {
        const user = waitingRooms[path][idx];
        waitingRooms[path].splice(idx, 1);
        // Mark userId as admitted
        if (user && user.userId) {
          admittedUsers[path].add(String(user.userId));
        }
        // Add to main room
        io.to(socketId).emit("admitted-to-meeting");
      }
      // Update host's waiting room list
      if (connections[path][0]) {
        io.to(connections[path][0].socketId).emit(
          "waiting-room-update",
          waitingRooms[path],
        );
      }
    });

    // Host removes user from waiting room
    socket.on("remove-from-waiting-room", ({ path, socketId }) => {
      if (!waitingRooms[path]) return;
      const idx = waitingRooms[path].findIndex((u) => u.socketId === socketId);
      if (idx !== -1) {
        waitingRooms[path].splice(idx, 1);
        io.to(socketId).emit("removed-from-waiting-room");
      }
      if (connections[path][0]) {
        io.to(connections[path][0].socketId).emit(
          "waiting-room-update",
          waitingRooms[path],
        );
      }
    });

    // Host kicks a participant
    socket.on("kick-user", ({ path, socketId }) => {
      if (!connections[path]) return;
      const idx = connections[path].findIndex((u) => u.socketId === socketId);
      if (idx !== -1) {
        const kickedUser = connections[path][idx];
        io.to(socketId).emit("kicked-from-meeting");
        // Add to kicked users list
        if (!kickedUsers[path]) kickedUsers[path] = [];
        if (!kickedUsers[path].includes(String(kickedUser.userId))) {
          kickedUsers[path].push(String(kickedUser.userId));
        }
        connections[path].splice(idx, 1);
        delete userMediaState[socketId];
        delete socketToUser[socketId];
        // Notify others
        connections[path].forEach((u) => {
          io.to(u.socketId).emit("user-left", socketId);
        });
        // Force the socket to leave the room so they don't receive broadcasts
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) targetSocket.leave(path);
      }
    });

    // Host approves a rejoin request
    socket.on("approve-rejoin", ({ path, userId }) => {
      if (!kickedUsers[path]) kickedUsers[path] = [];
      kickedUsers[path] = kickedUsers[path].filter(
        (id) => id !== String(userId),
      );
      // Find the rejoin request
      if (!rejoinRequests[path]) rejoinRequests[path] = [];
      const reqIdx = rejoinRequests[path].findIndex(
        (r) => String(r.userId) === String(userId),
      );
      if (reqIdx !== -1) {
        const req = rejoinRequests[path][reqIdx];
        io.to(req.socketId).emit("rejoin-approved");
        rejoinRequests[path].splice(reqIdx, 1);
      }
      // Update host's rejoin request list
      if (connections[path][0]) {
        io.to(connections[path][0].socketId).emit(
          "rejoin-request",
          rejoinRequests[path],
        );
      }
    });

    // Host denies a rejoin request
    socket.on("deny-rejoin", ({ path, userId }) => {
      if (!rejoinRequests[path]) rejoinRequests[path] = [];
      const reqIdx = rejoinRequests[path].findIndex(
        (r) => String(r.userId) === String(userId),
      );
      if (reqIdx !== -1) {
        const req = rejoinRequests[path][reqIdx];
        io.to(req.socketId).emit("rejoin-denied");
        rejoinRequests[path].splice(reqIdx, 1);
      }
      // Update host's rejoin request list
      if (connections[path][0]) {
        io.to(connections[path][0].socketId).emit(
          "rejoin-request",
          rejoinRequests[path],
        );
      }
    });

    // Host mutes/unmutes a participant
    socket.on("mute-user", ({ path, socketId, enabled }) => {
      io.to(socketId).emit("force-mute", { enabled });
    });

    // Host asks a participant to unmute
    socket.on("ask-unmute", ({ path, socketId }) => {
      io.to(socketId).emit("ask-unmute");
    });

    // Host stops video for a participant
    socket.on("stop-video-user", ({ path, socketId }) => {
      io.to(socketId).emit("force-stop-video");
    });

    // Host asks a participant to start video
    socket.on("ask-start-video", ({ path, socketId }) => {
      io.to(socketId).emit("ask-start-video");
    });

    // Host Mute All
    socket.on("mute-all", ({ path }) => {
      if (connections[path]) {
        connections[path].forEach(user => {
          if (user.socketId !== socket.id) io.to(user.socketId).emit("force-mute", { enabled: false });
        });
      }
    });

    // Host Ask Unmute All
    socket.on("ask-unmute-all", ({ path }) => {
      if (connections[path]) {
        connections[path].forEach(user => {
          if (user.socketId !== socket.id) io.to(user.socketId).emit("ask-unmute");
        });
      }
    });

    // Host Stop All Video
    socket.on("stop-all-video", ({ path }) => {
      if (connections[path]) {
        connections[path].forEach(user => {
          if (user.socketId !== socket.id) io.to(user.socketId).emit("force-stop-video");
        });
      }
    });

    // Host Ask Start All Video
    socket.on("ask-start-video-all", ({ path }) => {
      if (connections[path]) {
        connections[path].forEach(user => {
          if (user.socketId !== socket.id) io.to(user.socketId).emit("ask-start-video");
        });
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", ({ message, sender, socketId }) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (
            !isFound &&
            roomValue.some((user) => user.socketId === socket.id)
          ) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          sender: sender,
          data: message,
          socketId: socket.id,
        });
        //console.log("message",matchingRoom ,":", sender,data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem.socketId).emit("chat-message", {
            sender: sender,
            message: message,
            socketId: socket.id,
          });
        });
      }
    });

    socket.on("disconnect", () => {
      let found = false;
      for (const [room, users] of Object.entries(connections)) {
        const index = users.findIndex((u) => u.socketId === socket.id);

        if (index !== -1) {
          found = true;
          const user = users[index];

          if (user.disconnectTimeout) {
            // Already waited once, ignore duplicate disconnects.
            return;
          }

          user.disconnected = true;
          delete socketToUser[socket.id];

          user.disconnectTimeout = setTimeout(() => {
            const roomUsers = connections[room];
            if (!roomUsers) return;

            const reconnectIndex = roomUsers.findIndex(
              (u) =>
                String(u.userId) === String(user.userId) &&
                u.disconnected === true &&
                u.socketId === user.socketId,
            );

            if (reconnectIndex === -1) return;

            const timedOutUser = roomUsers[reconnectIndex];

            roomUsers.forEach((u) => {
              if (u.socketId !== timedOutUser.socketId) {
                io.to(u.socketId).emit("user-left", timedOutUser.socketId);
              }
            });

            roomUsers.splice(reconnectIndex, 1);

            if (roomUsers.length === 0) {
              delete connections[room];
            }

            delete userMediaState[timedOutUser.socketId];
          }, REFRESH_WINDOW_MS);

          return;
        }
      }
      if (!found) {
        delete socketToUser[socket.id];
      }
    });

    socket.on("end-meeting-for-all", () => {
      const room = Object.keys(connections).find((room) =>
        connections[room].some((u) => u.socketId === socket.id),
      );

      if (!room) return;

      connections[room].forEach((u) => {
        io.to(u.socketId).emit("meeting-ended");
      });

      // 🔥 CLEAN ROOM
      delete connections[room];
      delete messages[room];
    });

    socket.on("leave-meeting", () => {
      for (const [room, users] of Object.entries(connections)) {
        const index = users.findIndex((u) => u.socketId === socket.id);

        if (index !== -1) {
          const user = users[index];
          if (user.disconnectTimeout) {
            clearTimeout(user.disconnectTimeout);
          }

          users.forEach((u) => {
            if (u.socketId !== socket.id) {
              io.to(u.socketId).emit("user-left", socket.id);
            }
          });

          users.splice(index, 1);

          if (users.length === 0) {
            delete connections[room];
          }

          delete socketToUser[socket.id];
          delete userMediaState[socket.id];
        }
      }
    });

    socket.on("toggle-video", ({ enabled }) => {
      const userId = socketToUser[socket.id];
      userMediaState[socket.id] = userMediaState[socket.id] || {
        video: false,
        audio: false,
        screen: false,
      };
      userMediaState[socket.id].video = enabled;

      const room = Object.keys(connections).find((room) =>
        connections[room].some((u) => u.socketId === socket.id),
      );

      if (!room) return;

      connections[room].forEach((u) => {
        if (u.socketId !== socket.id) {
          io.to(u.socketId).emit("user-video-toggle", {
            socketId: socket.id,
            enabled,
          });
        }
      });
    });

    socket.on("toggle-audio", ({ enabled }) => {
      const userId = socketToUser[socket.id];
      userMediaState[socket.id] = userMediaState[socket.id] || {
        video: false,
        audio: false,
        screen: false,
      };
      userMediaState[socket.id].audio = enabled;

      const room = Object.keys(connections).find((room) =>
        connections[room].some((u) => u.socketId === socket.id),
      );

      if (!room) return;

      connections[room].forEach((u) => {
        if (u.socketId !== socket.id) {
          io.to(u.socketId).emit("user-audio-toggle", {
            socketId: socket.id,
            enabled,
          });
        }
      });
    });

    socket.on("toggle-screen", ({ enabled }) => {
      const userId = socketToUser[socket.id];
      userMediaState[socket.id] = userMediaState[socket.id] || {
        video: false,
        audio: false,
        screen: false,
      };
      userMediaState[socket.id].screen = enabled;

      const room = Object.keys(connections).find((room) =>
        connections[room].some((u) => u.socketId === socket.id),
      );

      if (!room) return;

      connections[room].forEach((u) => {
        if (u.socketId !== socket.id) {
          io.to(u.socketId).emit("user-screen-toggle", {
            socketId: socket.id,
            enabled,
          });
        }
      });
    });

    socket.on("send-reaction", ({ emoji, username, socketId }) => {
      const room = Object.keys(connections).find((room) =>
        connections[room].some((u) => u.socketId === socket.id),
      );

      if (!room) return;

      socket.to(room).emit("reaction", {
        socketId,
        username,
        emoji,
      });
    });
  });
  return io;
};

//export default connectToSocket ;
