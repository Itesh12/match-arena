const express = require('express');
const { authMiddleware } = require('./auth');
const User = require('../models/User');
const Match = require('../models/Match');
const Room = require('../models/Room');

const router = express.Router();

// Admin check middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = (gameEngine) => {
  // Simple ping for latency measurement
  router.get('/ping', authMiddleware, adminMiddleware, (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get all active rooms
  router.get('/rooms', authMiddleware, adminMiddleware, (req, res) => {
    const rooms = Array.from(gameEngine.rooms.values()).map(r => {
      // Find owner username from players map
      let ownerName = "System/Unknown";
      for (const p of r.players.values()) {
        if (p.userId === r.ownerId) {
          ownerName = p.username;
          break;
        }
      }
      return {
        id: r.id,
        playerCount: r.players.size,
        players: Array.from(r.players.values()).map(p => p.username),
        status: r.status,
        currentQuestion: r.currentQuestionIndex,
        createdAt: r.createdAt || Date.now(),
        owner: ownerName
      }
    });
    res.json(rooms);
  });

  // Clear all in-memory rooms (Admin only)
  router.post('/rooms/clear-all', authMiddleware, adminMiddleware, (req, res) => {
    const count = gameEngine.rooms.size;
    gameEngine.rooms.clear();
    res.json({ message: `Successfully cleared ${count} active rooms from memory.` });
  });

  // Force end a room
  router.post('/rooms/:id/end', authMiddleware, adminMiddleware, (req, res) => {
    const roomId = req.params.id;
    if (gameEngine.rooms.has(roomId)) {
      gameEngine.terminateRoom(roomId);
      res.json({ message: `Game ${roomId} terminated` });
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  });

  // Get all users (admin only)
  router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Generate reset key for a user (admin only)
  router.post('/users/:id/reset-key', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const key = Math.random().toString(36).substring(2, 8).toUpperCase();
      await User.findByIdAndUpdate(req.params.id, { resetKey: key });
      res.json({ key });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete user (admin only)
  router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userToDelete = await User.findById(req.params.id);
      if (!userToDelete) return res.status(404).json({ message: 'User not found' });
      if (userToDelete.role === 'admin') return res.status(403).json({ message: 'Cannot delete an admin' });
      
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Toggle ban status (admin only)
  router.patch('/users/:id/toggle-ban', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userToBan = await User.findById(req.params.id);
      if (!userToBan) return res.status(404).json({ message: 'User not found' });
      if (userToBan.role === 'admin') return res.status(403).json({ message: 'Cannot ban an admin' });

      userToBan.isBanned = !userToBan.isBanned;
      await userToBan.save();
      
      res.json({ message: userToBan.isBanned ? 'User banned' : 'User unbanned', isBanned: userToBan.isBanned });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // System-wide reset (Admin only)
  router.post('/system/reset', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { users, matches, rooms } = req.body;
      const results = {};

      if (matches) {
        await Match.deleteMany({});
        results.matches = 'Matches cleared';
      }

      if (rooms) {
        await Room.deleteMany({});
        gameEngine.rooms.clear();
        results.rooms = 'Rooms cleared';
      }

      if (users) {
        // Delete all users except admins
        const userResult = await User.deleteMany({ role: { $ne: 'admin' } });
        // Clear friends lists for admins
        await User.updateMany({ role: 'admin' }, { friends: [] });
        results.users = `Deleted ${userResult.deletedCount} users`;
      }

      res.json({ message: 'System reset component(s) successful', results });
    } catch (err) {
      console.error('System reset error:', err);
      res.status(500).json({ message: 'System reset failed' });
    }
  });

  return router;
};
