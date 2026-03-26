const User = require('../models/User');
const Item = require('../models/Item');

class ShopService {
  async getShopItems() {
    return await Item.find({}).sort({ price: 1 });
  }

  async purchaseItem(userId, itemKey) {
    // 1. Find the item
    const item = await Item.findOne({ key: itemKey });
    if (!item) {
      throw new Error('Item not found');
    }

    // 2. Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 3. Check if already owned (cosmetics should be unique)
    const inventory = user.inventory || [];
    if (inventory.includes(itemKey) && item.type !== 'powerup') {
      throw new Error('You already own this item');
    }

    // 4. Check balance
    if (user.coins < item.price) {
      throw new Error('Insufficient coins');
    }

    // 5. Atomic Update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { coins: -item.price },
        $addToSet: { inventory: itemKey } // $push if we want stacks, but $addToSet for uniqueness
      },
      { new: true }
    );

    return {
      success: true,
      item,
      newBalance: updatedUser.coins,
      inventory: updatedUser.inventory
    };
  }

  async getUserInventory(userId) {
    const user = await User.findById(userId);
    if (!user) return [];
    
    const inventory = user.inventory || [];
    // Find all items that match keys in user's inventory
    return await Item.find({ key: { $in: inventory } });
  }
}

module.exports = new ShopService();
