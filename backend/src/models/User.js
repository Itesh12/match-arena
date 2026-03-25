const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  rankPoints: {
    type: Number,
    default: 0
  },
  coins: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  resetKey: {
    type: String,
    default: null
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isBanned: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
