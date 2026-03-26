const express = require('express');
const { generateQuestion } = require('../game/questions');
const { authMiddleware } = require('./auth');
const DailyChallenge = require('../models/DailyChallenge');
const User = require('../models/User');

const router = express.Router();

// Get questions for solo practice
// GET /api/practice/questions?count=10&difficulty=medium
router.get('/questions', authMiddleware, async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const difficulty = req.query.difficulty || 'medium';

    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push({
            ...generateQuestion(difficulty),
            index: i
        });
    }

    res.json({
        success: true,
        questions,
        settings: {
            count,
            difficulty
        }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate questions', error: err.message });
  }
});

// Daily Challenge Routes

// Helper to get today's date string
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Get today's challenge
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const today = getTodayStr();
    let challenge = await DailyChallenge.findOne({ date: today });

    if (!challenge) {
      // Generate 10 random questions for the day (Mixed difficulty)
      const questions = [];
      const difficulties = ['easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard'];
      
      for (let i = 0; i < 10; i++) {
        questions.push({
          ...generateQuestion(difficulties[i]),
          difficulty: difficulties[i]
        });
      }

      challenge = new DailyChallenge({
        date: today,
        questions
      });
      await challenge.save();
    }

    // Check if user already participated
    const userId = req.user.id;
    const hasParticipated = challenge.participants.some(p => p.userId.toString() === userId);

    res.json({
      success: true,
      challenge: {
        id: challenge._id,
        date: challenge.date,
        questions: challenge.questions,
        participantCount: challenge.participants.length
      },
      hasParticipated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Submit daily challenge results
router.post('/daily/submit', authMiddleware, async (req, res) => {
  try {
    const { score, timeSpent } = req.body;
    const today = getTodayStr();
    const challenge = await DailyChallenge.findOne({ date: today });

    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const userId = req.user.id;
    if (challenge.participants.some(p => p.userId.toString() === userId)) {
      return res.status(400).json({ message: 'Already participated today' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Reward user (50 coins + RP based on score)
    const rpGained = score * 10;
    const coinsGained = 50;

    user.coins += coinsGained;
    user.rankPoints += rpGained;
    user.matchesPlayed += 1;
    await user.save();

    challenge.participants.push({
      userId,
      username: user.username,
      score,
      timeSpent
    });
    await challenge.save();

    res.json({
      success: true,
      reward: { coins: coinsGained, rp: rpGained },
      newTotal: { coins: user.coins, rp: user.rankPoints }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
