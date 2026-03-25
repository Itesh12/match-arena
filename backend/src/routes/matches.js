const express = require('express');
const Match = require('../models/Match');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Get match history for the current user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    console.log(`Fetching history for user: ${req.user.id}`);
    const matches = await Match.find({
      'participants.userId': req.user.id.toString()
    }).sort({ completedAt: -1 }).limit(20);
    
    console.log(`Found ${matches.length} matches`);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get specific match details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    
    // Check if user was a participant
    const isParticipant = match.participants.some(p => p.userId === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You were not a participant in this match' });
    }
    
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
