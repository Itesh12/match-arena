const Achievement = require('../models/Achievement');
const User = require('../models/User');

class AchievementService {
  /**
   * Check and award achievements for a user based on specific criteria.
   * @param {string} userId - The ID of the user.
   * @param {string} criteriaType - The type of criteria (e.g., 'win_count', 'match_count').
   * @param {number} value - The current value of that criteria.
   * @returns {Promise<Array>} - Array of newly unlocked achievements.
   */
  static async checkAndAward(userId, criteriaType, value) {
    try {
      // Find achievements for this criteria that the user doesn't have yet
      const user = await User.findById(userId).populate('achievements');
      const existingAchievementIds = user.achievements.map(a => a._id.toString());

      const possibleAchievements = await Achievement.find({
        'criteria.type': criteriaType,
        'criteria.threshold': { $lte: value },
        _id: { $nin: existingAchievementIds }
      });

      if (possibleAchievements.length === 0) return [];

      const newlyUnlocked = [];

      for (const achievement of possibleAchievements) {
        user.achievements.push(achievement._id);
        user.coins += (achievement.coinReward || 0);
        user.rankPoints += (achievement.xpReward || 0); // Using rankPoints as XP for now
        
        newlyUnlocked.push(achievement);
      }

      await user.save();
      return newlyUnlocked;
    } catch (error) {
      console.error('Achievement check failed:', error);
      return [];
    }
  }
}

module.exports = AchievementService;
