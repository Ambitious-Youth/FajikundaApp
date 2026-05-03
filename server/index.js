require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const db         = require('./config/db');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);

// ── Allowed origins ───────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5174',
  'http://100.126.253.109:5174',
  process.env.CLIENT_URL,
].filter(Boolean);
const allowedOriginPatterns = [/\.trycloudflare\.com$/];

const originAllowed = (origin) =>
  !origin ||
  allowedOrigins.includes(origin) ||
  allowedOriginPatterns.some(p => p.test(origin));

// ── Express middleware ────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) =>
    originAllowed(origin) ? callback(null, true) : callback(new Error(`CORS blocked: ${origin}`)),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── REST Routes ───────────────────────────────────────────────
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/events',        require('./routes/events'));

const { newsRouter, membersRouter, donationsRouter } = require('./routes/other');
app.use('/api/news',      newsRouter);
app.use('/api/members',   membersRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/chat',      require('./routes/chat'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', project: 'Fajikunda Society', time: new Date() })
);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) =>
      originAllowed(origin) ? callback(null, true) : callback(new Error(`CORS blocked: ${origin}`)),
    credentials: true,
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

const onlineUsers = new Map();

io.on('connection', async (socket) => {
  const user = socket.user;
  onlineUsers.set(user.id, socket.id);
  console.log(`💬 ${user.username} connected`);
  io.emit('online_users', Array.from(onlineUsers.keys()));

  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_room', async (roomId) => {
    try {
      const [rooms] = await db.query('SELECT * FROM chat_rooms WHERE id=?', [roomId]);
      if (!rooms[0]) return socket.emit('error', 'Room not found');
      if (rooms[0].type === 'admin' && user.role !== 'admin')
        return socket.emit('error', 'Admin only room');
      socket.join(roomId);
      const [messages] = await db.query(`
        SELECT cm.id, cm.room_id, cm.message, cm.created_at,
               u.id AS user_id, u.username, u.full_name, u.avatar_url, u.role
        FROM chat_messages cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.room_id = ?
        ORDER BY cm.created_at DESC LIMIT 50
      `, [roomId]);
      socket.emit('room_history', messages.reverse());
    } catch (err) { console.error(err); }
  });

  socket.on('send_message', async ({ roomId, message }) => {
    if (!message?.trim()) return;
    try {
      const [rooms] = await db.query('SELECT * FROM chat_rooms WHERE id=?', [roomId]);
      if (!rooms[0]) return;
      if (rooms[0].type === 'admin' && user.role !== 'admin')
        return socket.emit('error', 'Admin only room');
      const id = uuidv4();
      await db.query(
        'INSERT INTO chat_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
        [id, roomId, user.id, message.trim()]
      );
      const [rows] = await db.query(`
        SELECT cm.id, cm.room_id, cm.message, cm.created_at,
               u.id AS user_id, u.username, u.full_name, u.avatar_url, u.role
        FROM chat_messages cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.id = ?
      `, [id]);
      io.to(roomId).emit('new_message', rows[0]);
    } catch (err) { console.error(err); }
  });

  socket.on('send_dm', async ({ toId, message }) => {
    if (!message?.trim()) return;
    try {
      const id = uuidv4();
      await db.query(
        'INSERT INTO direct_messages (id, from_id, to_id, message) VALUES (?, ?, ?, ?)',
        [id, user.id, toId, message.trim()]
      );
      const dmPayload = {
        id, from_id: user.id, to_id: toId,
        message: message.trim(), created_at: new Date(),
        username: user.username, full_name: user.full_name,
      };
      const recipientSocket = onlineUsers.get(toId);
      if (recipientSocket) io.to(recipientSocket).emit('new_dm', dmPayload);
      socket.emit('new_dm', dmPayload);
    } catch (err) { console.error(err); }
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', { username: user.username, roomId });
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing', { username: user.username, roomId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log(`💬 ${user.username} disconnected`);
  });
});

module.exports.io = io;

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () =>
  console.log(`🌍 Fajikunda Server running on port ${PORT}`)
);







