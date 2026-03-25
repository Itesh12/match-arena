const User = require('../models/User');

// Global online users map (exported for use in index.js)
const onlineUsers = new Map();

exports.addFriend = async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ message: 'User not found' });
    
    if (friend._id.equals(req.user.id)) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const user = await User.findById(req.user.id);
    if (user.friends.includes(friend._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    user.friends.push(friend._id);
    await user.save();
    
    // Auto-reciprocate for simple social proof
    if (!friend.friends.includes(user._id)) {
      friend.friends.push(user._id);
      await friend.save();
    }

    res.json({ message: 'Friend added successfully', friend: { username: friend.username, id: friend._id } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username rankPoints score');
    const friendsWithStatus = user.friends.map(f => ({
      id: f._id,
      username: f.username,
      rankPoints: f.rankPoints,
      score: f.score,
      isOnline: onlineUsers.has(f._id.toString())
    }));
    res.json(friendsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.onlineUsers = onlineUsers;
