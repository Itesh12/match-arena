const express = require('express');
const router = express.Router();
const socialController = require('../controllers/SocialController');
const { authMiddleware: auth } = require('./auth');

router.post('/add-friend', auth, socialController.addFriend);
router.get('/friends', auth, socialController.getFriends);

module.exports = router;
