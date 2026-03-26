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
const { onlineUsers } = require('./controllers/SocialController');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Body parser

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/math_arena';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
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

  socket.on('leave_game', (roomId) => {
    gameEngine.leaveRoom(socket.id, roomId);
  });

  socket.on('rematch_arena', (roomId) => {
    gameEngine.rematchRoom(socket, roomId);
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
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
