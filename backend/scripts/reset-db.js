const mongoose = require('mongoose');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Room = require('../src/models/Room');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maths_arena';

async function resetDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    // Delete all matches
    console.log('Deleting all matches...');
    await Match.deleteMany({});
    console.log('Matches deleted.');

    // Delete all persistent rooms
    console.log('Deleting all persistent rooms...');
    await Room.deleteMany({});
    console.log('Rooms deleted.');

    // Delete all users except admin
    console.log('Deleting all users except admins...');
    const result = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${result.deletedCount} users.`);

    // Clear friends lists for remaining admins
    console.log('Clearing friends lists for admins...');
    await User.updateMany({ role: 'admin' }, { $set: { friends: [], score: 0, totalGames: 0, wins: 0, rankPoints: 0, coins: 0 } });
    console.log('Admins reset.');

    console.log('Database reset successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
}

resetDB();
