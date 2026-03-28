const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const GameEngine = require('./game/engine');
const { authRouter } = require('./routes/auth');
const adminRouter = require('./routes/admin');
const matchesRouter = require('./routes/matches');
const socialRoutes = require('./routes/SocialRoutes');
const practiceRouter = require('./routes/practice');
const achievementsRouter = require('./routes/achievements');
const shopRouter = require('./routes/shop');
const { onlineUsers } = require('./controllers/SocialController');

dotenv.config();

const app = express();
app.use(express.json()); // Body parser
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'https://match-arena-bmdh.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://match-arena.vercel.app'
    ].filter(Boolean);

    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
};

app.use(cors(corsOptions));

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/math_arena';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

const gameEngine = new GameEngine(io);

// Health Check for Deployment
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Routes
app.use('/auth', authRouter);
app.use('/matches', matchesRouter);
app.use('/social', socialRoutes);
app.use('/practice', practiceRouter);
app.use('/achievements', achievementsRouter);
app.use('/shop', shopRouter);
app.use('/admin', adminRouter(gameEngine));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_arena', ({ roomId, username, userId }) => {
    // Also track globally
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    gameEngine.joinRoom(socket, roomId, username, userId);
  });

  socket.on('join_lobby', ({ userId }) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} joined lobby (online)`);
  });

  socket.on('submit_answer', ({ roomId, answer }) => {
    gameEngine.submitAnswer(socket.id, roomId, answer);
  });

  socket.on('start_game', (roomId) => {
    gameEngine.startCountdown(socket, roomId);
  });

  socket.on('update_room_settings', ({ roomId, settings }) => {
    gameEngine.updateRoomSettings(socket.id, roomId, settings);
  });

  socket.on('leave_game', (roomId) => {
    gameEngine.leaveRoom(socket.id, roomId);
  });

  socket.on('send_message', ({ roomId, message, username }) => {
    io.to(roomId).emit('message_received', { 
        id: Date.now(),
        sender: username, 
        text: message,
        timestamp: new Date()
    });
  });


  socket.on('rematch_request', ({ roomId }) => {
    gameEngine.requestRematch(socket, roomId);
  });

  socket.on('rematch_response', ({ roomId, accept }) => {
    gameEngine.handleRematchResponse(socket, roomId, accept);
  });

  socket.on('use_power_up', ({ roomId, type }) => {
    gameEngine.usePowerUp(socket, roomId, type);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log(`User ${socket.userId} went offline`);
    }
    gameEngine.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
