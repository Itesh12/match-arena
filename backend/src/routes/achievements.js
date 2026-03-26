const express = require('express');
const { authMiddleware } = require('./auth');
const Achievement = require('../models/Achievement');
const User = require('../models/User');

const router = express.Router();

// Get all achievements and mark those earned by user
// GET /api/achievements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('achievements');
    const allAchievements = await Achievement.find().sort({ 'criteria.threshold': 1 });

    const earnedIds = user.achievements.map(id => id.toString());

    const result = allAchievements.map(a => {
      const achievementObj = a.toObject();
      return {
        ...achievementObj,
        isEarned: earnedIds.includes(a._id.toString())
      };
    });

    res.json({
      success: true,
      achievements: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
