"use client";

import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Lock, 
  CheckCircle2, 
  Coins, 
  Shield, 
  Zap, 
  Crown, 
  Calendar, 
  Flame,
  Award,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { useGameStore } from '@/store/useGameStore';

interface Achievement {
  _id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
  isEarned: boolean;
  criteria: {
    type: string;
    threshold: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const IconMap: { [key: string]: any } = {
  Trophy,
  Shield,
  Crown,
  Zap,
  Calendar,
  Flame,
  Award
};

export default function AchievementsView() {
  const { token } = useGameStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await axios.get(`${API_URL}/achievements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setAchievements(res.data.achievements);
        }
      } catch (err) {
        console.error('Failed to fetch achievements', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAchievements();
  }, [token]);

  const earnedCount = achievements.filter(a => a.isEarned).length;
  const progressPercent = achievements.length > 0 ? (earnedCount / achievements.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Award className="w-12 h-12 text-blue-500/20 mb-4" />
        <div className="h-4 w-32 bg-white/5 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overall Progress Header */}
      <div className="glass p-8 rounded-[32px] border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <Trophy className="w-32 h-32" />
        </div>
        
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-subtitle text-white mb-2">My Trophies</h2>
                <p className="text-nano text-slate-500 uppercase">Master the Arena to unlock them all</p>
            </div>
            <div className="text-right">
                <span className="text-title text-blue-400">{earnedCount}</span>
                <span className="text-subtitle text-slate-600"> / {achievements.length}</span>
            </div>
        </div>

        <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
            />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map((achievement) => {
          const Icon = IconMap[achievement.icon] || Award;
          
          return (
            <div 
              key={achievement._id}
              className={`glass p-6 rounded-3xl border transition-all duration-500 flex items-center gap-6 group/item ${
                achievement.isEarned 
                ? 'border-blue-500/20 bg-blue-500/[0.02]' 
                : 'border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                achievement.isEarned 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 rotate-3 group-hover/item:rotate-0' 
                : 'bg-white/5 text-slate-500'
              }`}>
                {achievement.isEarned ? <Icon className="w-8 h-8" /> : <Lock className="w-6 h-6" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-caption transition-colors ${achievement.isEarned ? 'text-white' : 'text-slate-400'}`}>
                        {achievement.name}
                    </h3>
                    {achievement.isEarned && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                </div>
                <p className="text-nano text-slate-500 leading-tight mb-3">
                    {achievement.description}
                </p>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                        <Coins className="w-3 h-3 text-yellow-500" />
                        <span className="text-nano text-yellow-500">+{achievement.coinReward}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <span className="text-nano text-blue-400">+{achievement.xpReward} RP</span>
                    </div>
                </div>
              </div>

              {achievement.isEarned && (
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
