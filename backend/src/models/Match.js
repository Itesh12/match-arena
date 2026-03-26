const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  winner: {
    userId: String,
    username: String,
    score: Number,
  },
  participants: [{
    userId: String,
    username: String,
    score: Number,
    rank: Number,
  }],
  questions: [{
    question: String,
    answer: Number,
    options: [Number],
  }],
  duration: Number,
  completedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Match', MatchSchema);
