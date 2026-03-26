const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  key: {
    type: String, // e.g., 'first_win', 'streak_10', 'daily_conqueror'
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String, // Lucide icon name or URL
    default: 'Award'
  },
  xpReward: {
    type: Number,
    default: 0
  },
  coinReward: {
    type: Number,
    default: 0
  },
  criteria: {
    type: {
      type: String, // 'win_count', 'match_count', 'streak', 'daily_challenge'
      required: true
    },
    threshold: {
      type: Number,
      default: 1
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', AchievementSchema);
