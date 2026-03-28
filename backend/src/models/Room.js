const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: String,
    required: true,
  },
  ownerSocketId: {
    type: String,
  },
  mode: {
    type: String,
    enum: ['standard', 'sudden_death', 'double_jeopardy', 'team_battle'],
    default: 'standard',
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  },
  settings: {
    questionsCount: { type: Number, default: 10 },
    timePerQuestion: { type: Number, default: 60 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    theme: { type: String, default: 'standard' },
  },
  players: {
    type: Map,
    of: {
      id: String,
      userId: String,
      username: String,
      score: Number,
      answers: [Boolean],
      consecutiveTimeouts: Number,
      isOwner: Boolean,
      hasLeft: Boolean,
    }
  },
  questions: [{
    index: Number,
    question: String,
    options: [Number],
    answer: Number,
  }],
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Auto-delete after 24 hours
  }
});

module.exports = mongoose.model('Room', RoomSchema);
