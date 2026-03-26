const mongoose = require('mongoose');
const Item = require('../models/Item');
require('dotenv').config();

const items = [
  {
    name: 'Blue Glow Border',
    key: 'border_blue_glow',
    type: 'border',
    price: 500,
    description: 'A sleek neon blue border for your profile.',
    icon: 'Shield',
    rarity: 'common'
  },
  {
    name: 'Gold Aura Border',
    key: 'border_gold_aura',
    type: 'border',
    price: 2000,
    description: 'A premium golden aura for true masters.',
    icon: 'Crown',
    rarity: 'rare'
  },
  {
    name: 'Math Genius Badge',
    key: 'badge_math_genius',
    type: 'badge',
    price: 1500,
    description: 'A badge confirming your elite status.',
    icon: 'Zap',
    rarity: 'epic'
  },
  {
    name: 'Scholar Badge',
    key: 'badge_scholar',
    type: 'badge',
    price: 300,
    description: 'Awarded to those who study hard.',
    icon: 'Book',
    rarity: 'common'
  },
  {
    name: 'Victory Flame',
    key: 'border_victory_flame',
    type: 'border',
    price: 5000,
    description: 'An animated flame border (Legendary).',
    icon: 'Flame',
    rarity: 'legendary'
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/math_arena';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for shop seeding...');

    for (const item of items) {
      await Item.updateOne(
        { key: item.key },
        { $set: item },
        { upsert: true }
      );
    }

    console.log('Shop items seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Shop seeding failed:', error);
    process.exit(1);
  }
}

seed();
