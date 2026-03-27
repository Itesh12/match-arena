const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('./auth');
const ShopService = require('../services/ShopService');

// @route   GET api/shop
// @desc    Get all available shop items
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const items = await ShopService.getShopItems();
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shop/inventory
// @desc    Get user's owned items
// @access  Private
router.get('/inventory', auth, async (req, res) => {
  try {
    const items = await ShopService.getUserInventory(req.user.id);
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shop/purchase
// @desc    Purchase an item
// @access  Private
router.post('/purchase', auth, async (req, res) => {
  try {
    const { itemKey } = req.body;
    if (!itemKey) {
      return res.status(400).json({ message: 'Item key is required' });
    }

    const result = await ShopService.purchaseItem(req.user.id, itemKey);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
