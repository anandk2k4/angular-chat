const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const MAX_USERS_PER_ROOM = 100;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/anonymous-chat-angular/browser')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/anonymous-chat-angular/browser/index.html'));
});

// ─── In-Memory Store ───────────────────────────────────────────────────────

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),     // userId -> { id, username, socketId }
      messages: [],
      typingUsers: new Set(),
    });
  }
  return rooms.get(roomId);
}

function addSystemMessage(roomId, content) {
  const room = getOrCreateRoom(roomId);
  const msg = {
    id: uuidv4(),
    userId: 'system',
    username: 'system',
    content,
    timestamp: Date.now(),
    type: 'system',
    reactions: {},
  };
  room.messages.push(msg);
  if (room.messages.length > 200) room.messages = room.messages.slice(-200);
  return msg;
}

function getRoomUsers(roomId) {
  return Array.from(rooms.get(roomId)?.users.values() || [])
    .map(({ id, username }) => ({ id, username }));
}

// ─── Socket.io Events ──────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  let currentRoomId = null;
  let currentUserId = null;

  // ── Join Room ──
  socket.on('join', ({ roomId, userId, username }) => {
    if (!roomId || !userId || !username) return;

    const room = getOrCreateRoom(roomId);

    // Enforce limit (skip for rejoins)
    if (!room.users.has(userId) && room.users.size >= MAX_USERS_PER_ROOM) {
      socket.emit('room-full');
      return;
    }

    const isRejoin = room.users.has(userId);
    currentRoomId = roomId;
    currentUserId = userId;

    // Store user with socketId so we can track disconnects
    room.users.set(userId, { id: userId, username, socketId: socket.id });

    // Join Socket.io room (room = a channel that we can broadcast to)
    socket.join(roomId);

    // Send existing messages + users back to THIS user only
    socket.emit('room-joined', {
      messages: [...room.messages],
      users: getRoomUsers(roomId),
    });

    // Broadcast join system message to EVERYONE else in room
    if (!isRejoin) {
      const sysMsg = addSystemMessage(roomId, `${username} joined the room`);
      io.to(roomId).emit('new-message', sysMsg);
      // Tell everyone the updated user list
      io.to(roomId).emit('users-updated', getRoomUsers(roomId));
    }
  });

  // ── Send Message ──
  socket.on('message', ({ roomId, userId, username, content, replyTo }) => {
    if (!roomId || !userId || !username || !content) return;

    const room = getOrCreateRoom(roomId);
    const message = {
      id: uuidv4(),
      userId,
      username,
      content,
      timestamp: Date.now(),
      type: 'message',
      reactions: {},
      replyTo: replyTo || null,
    };
    room.messages.push(message);
    if (room.messages.length > 200) room.messages = room.messages.slice(-200);

    // Broadcast to EVERYONE in room (including sender)
    io.to(roomId).emit('new-message', message);
  });

  // ── Typing ──
  socket.on('typing', ({ roomId, userId, username, isTyping }) => {
    if (!roomId || !userId) return;
    const room = getOrCreateRoom(roomId);
    isTyping ? room.typingUsers.add(userId) : room.typingUsers.delete(userId);

    // Broadcast to everyone EXCEPT the sender
    socket.to(roomId).emit('typing-updated', {
      userId,
      username,
      isTyping,
    });
  });

  // ── Reaction ──
  socket.on('reaction', ({ roomId, messageId, emoji, username }) => {
    if (!roomId || !messageId || !emoji || !username) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const message = room.messages.find(m => m.id === messageId);
    if (!message) return;

    if (!message.reactions[emoji]) message.reactions[emoji] = [];
    const idx = message.reactions[emoji].indexOf(username);
    if (idx === -1) {
      message.reactions[emoji].push(username);
    } else {
      message.reactions[emoji].splice(idx, 1);
      if (message.reactions[emoji].length === 0) delete message.reactions[emoji];
    }

    // Broadcast updated message to everyone in room
    io.to(roomId).emit('reaction-updated', message);
  });

  // ── Leave Room ──
  socket.on('leave', ({ roomId, userId }) => {
    handleLeave(roomId, userId, socket);
  });

  // ── Disconnect (browser closed / tab closed) ──
  // ── Disconnect (browser closed / tab closed) ──
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (currentRoomId && currentUserId) {
      const roomId = currentRoomId;
      const userId = currentUserId;
      // Wait 3 seconds — if user rejoins (refresh) within this time,
      // their userId will be back in the room and we skip the leave message
      setTimeout(() => {
        const room = rooms.get(roomId);
        if (!room) return;
        const user = room.users.get(userId);
        // Only show "left" if the user hasn't rejoined with same userId
        if (user && user.socketId === socket.id) {
          handleLeave(roomId, userId, socket);
        }
      }, 3000);
    }
  });
});

function handleLeave(roomId, userId, socket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const user = room.users.get(userId);
  if (!user) return;

  room.users.delete(userId);
  room.typingUsers.delete(userId);
  socket.leave(roomId);

  // Broadcast leave system message + updated users to remaining users
  const sysMsg = addSystemMessage(roomId, `${user.username} left the room`);
  io.to(roomId).emit('new-message', sysMsg);
  io.to(roomId).emit('users-updated', getRoomUsers(roomId));

  // Clean up empty rooms
  if (room.users.size === 0) {
    setTimeout(() => {
      if (rooms.get(roomId)?.users.size === 0) rooms.delete(roomId);
    }, 30000);
  }
}

// ─── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
