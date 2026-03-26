const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
require('dotenv').config();

const achievements = [
  {
    name: 'First Step',
    key: 'first_win',
    description: 'Win your first ever match in the Arena!',
    icon: 'Trophy',
    xpReward: 100,
    coinReward: 50,
    criteria: { type: 'win_count', threshold: 1 }
  },
  {
    name: 'Veteran',
    key: 'veteran_5',
    description: 'Achieve 5 total wins in the Arena.',
    icon: 'Shield',
    xpReward: 500,
    coinReward: 200,
    criteria: { type: 'win_count', threshold: 5 }
  },
  {
    name: 'Mathematical Legend',
    key: 'legend_10',
    description: 'A true master. Reach 10 total wins.',
    icon: 'Crown',
    xpReward: 1000,
    coinReward: 500,
    criteria: { type: 'win_count', threshold: 10 }
  },
  {
    name: 'Daily Conqueror',
    key: 'daily_1',
    description: 'Complete your first Daily Challenge.',
    icon: 'Zap',
    xpReward: 200,
    coinReward: 100,
    criteria: { type: 'daily_challenge', threshold: 1 }
  },
  {
    name: 'Steady Habit',
    key: 'daily_5',
    description: 'Complete 5 Daily Challenges.',
    icon: 'Calendar',
    xpReward: 1000,
    coinReward: 500,
    criteria: { type: 'daily_challenge', threshold: 5 }
  },
  {
    name: 'Unstoppable',
    key: 'streak_5',
    description: 'Reach a 5-match winning streak.',
    icon: 'Flame',
    xpReward: 2000,
    coinReward: 1000,
    criteria: { type: 'streak', threshold: 5 }
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/math_arena';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    for (const a of achievements) {
      await Achievement.updateOne(
        { key: a.key },
        { $set: a },
        { upsert: true }
      );
    }

    console.log('Achievements seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
