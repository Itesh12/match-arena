export const getRankTier = (points = 0) => {
  if (points >= 10000) return { name: 'Grandmaster', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (points >= 7500) return { name: 'Master', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (points >= 5000) return { name: 'Diamond', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
  if (points >= 3500) return { name: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
  if (points >= 2000) return { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
  if (points >= 1000) return { name: 'Silver', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20' };
  return { name: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
};
