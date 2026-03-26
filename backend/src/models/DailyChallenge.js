const mongoose = require('mongoose');

const DailyChallengeSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    unique: true
  },
  questions: [{
    question: String,
    options: [Number],
    answer: Number,
    difficulty: String
  }],
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    score: Number,
    timeSpent: Number,
    completedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('DailyChallenge', DailyChallengeSchema);
