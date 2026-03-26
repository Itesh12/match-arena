'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGameStore } from '@/store/useGameStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, LayoutDashboard, Shield, Coins, Globe, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRankTier } from '@/utils/ranks';
import Toast from '@/components/Toast';
import { API_URL } from '@/config';

export default function Lobby() {
  const [room, setRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [view, setView] = useState<'lobby' | 'history' | 'social'>('lobby');
  const [matches, setMatches] = useState<any[] | null>(null);
  const [friends, setFriends] = useState<any[] | null>(null);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const socket = useSocket();
  const { user, roomId, setRoomId, logout, fetchStats, token } = useGameStore();
  const { initialized } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    } else if (user) {
      fetchStats();
    }
  }, [initialized, user, router]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (view === 'history' && userId && token) {
      fetchHistory();
    } else if (view === 'social' && userId && token) {
      fetchFriends();
    }
  }, [view, user?.id, user?._id, token]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (socket && userId) {
      socket.emit('join_lobby', { userId });
    }
  }, [socket, user?.id, user?._id]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/matches/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`${API_URL}/social/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleAddFriend = async () => {
    if (!newFriendUsername) return;
    try {
      const res = await fetch(`${API_URL}/social/add-friend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendUsername: newFriendUsername })
      });
        if (res.ok) {
        setNewFriendUsername('');
        fetchFriends();
        setNotification({ msg: t('dashboard.friend_added'), type: 'success' });
      } else {
        const data = await res.json();
        setNotification({ msg: data.message || t('dashboard.friend_add_failed'), type: 'error' });
      }
    } catch (err) {
      console.error('Add friend error:', err);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = () => {
    if (!user || !socket) return;
    const newRoom = generateRoomCode();
    joinRoom(newRoom);
  };

  const handleJoin = () => {
    if (!room) return;
    joinRoom(room.toUpperCase());
  };

  const joinRoom = (roomId: string) => {
    if (!user || !socket) return;
    setRoomId(roomId);
    socket.emit('join_arena', { 
      username: user.username, 
      userId: user.id, 
      roomId: roomId 
    });
    router.push(`/arena/${roomId}`);
  };

  if (!initialized || !user) return null;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white p-4 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full animate-pulse-glow" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[10%] h-[10%] bg-pink-600/10 rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

      {/* Header / Actions */}
      <div className="absolute top-6 right-6 flex items-center gap-4 z-20">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10 glass">
          <Globe className="w-4 h-4 text-blue-400" />
          <select 
            value={i18n.language} 
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-[#020617]">English</option>
            <option value="hi" className="bg-[#020617]">हिंदी</option>
          </select>
        </div>
        {user.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 glass glass-hover px-5 py-2.5 rounded-2xl transition-all shadow-xl"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold">{t('dashboard.admin')}</span>
          </button>
        )}
        <button
          onClick={() => setView(view === 'history' ? 'lobby' : 'history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all border shadow-xl ${view === 'history' ? 'bg-blue-600 text-white border-blue-500' : 'glass glass-hover text-blue-400 border-white/5'}`}
        >
          <span className="text-sm font-bold">{view === 'history' ? `🏠 ${t('dashboard.lobby')}` : `📜 ${t('dashboard.history')}`}</span>
        </button>
        <button
          onClick={() => setView(view === 'social' ? 'lobby' : 'social')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all border shadow-xl ${view === 'social' ? 'bg-blue-600 text-white border-blue-500' : 'glass glass-hover text-blue-400 border-white/5'}`}
        >
          <span className="text-sm font-bold">{view === 'social' ? `🏠 ${t('dashboard.lobby')}` : `👥 ${t('dashboard.social')}`}</span>
        </button>
        <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2.5 rounded-2xl border border-yellow-500/20 shadow-xl">
          <Coins className="w-4 h-4" />
          <span className="text-sm font-black">{user.coins || 0}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-5 py-2.5 rounded-2xl transition-all border border-red-500/20 shadow-xl"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">{t('dashboard.logout')}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="relative z-10 max-w-md w-full glass rounded-[48px] p-10 shadow-2xl border-white/5 animate-float">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            {t('dashboard.math_arena_v1')}
          </div>
          <h1 className="text-7xl font-black mb-1 tracking-tighter text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse-slow">
            {user.username}
          </h1>
          <div className="mt-6 flex flex-col items-center gap-3">
            {(() => {
              const rank = getRankTier(user.rankPoints);
              return (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
                    {t(`dashboard.${rank.name.toLowerCase()}`)}
                  </span>
                </div>
              );
            })()}
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{user.rankPoints || 0} {t('dashboard.rp')}</div>
          </div>
          <p className="text-slate-500 font-medium mt-8">{t('dashboard.ready_for_challenge')}</p>
        </div>
        
        {view === 'history' ? (
          // ... history view ...
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-left animate-in slide-in-from-right-10 duration-500">
             {isLoadingHistory ? (
               <div className="text-center py-10 text-slate-500 font-bold animate-pulse">{t('dashboard.loading_history')}</div>
             ) : (matches && matches.length > 0) ? (
               matches.map((m) => (
                 <div key={m._id} className="glass p-5 rounded-3xl border-white/5 space-y-3 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start">
                       <div>
                         <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                           {new Date(m.completedAt).toLocaleDateString()}
                         </div>
                         <div className="text-lg font-black tracking-tight">{m.winner?.username === user.username ? `🏆 ${t('dashboard.victory')}` : `💀 ${t('dashboard.defeat')}`}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-xl font-black text-white">{m.participants.find((p: any) => p.userId === (user.id || user._id))?.score || 0}</div>
                         <div className="text-[8px] font-black text-slate-500 uppercase">{t('dashboard.points')}</div>
                       </div>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-10 text-slate-500 font-bold text-slate-400">{t('dashboard.no_matches')}</div>
             )}
             <button
              onClick={() => setView('lobby')}
              className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors"
             >
                {t('dashboard.back_to_lobby')}
             </button>
          </div>
        ) : view === 'social' ? (
          <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('dashboard.add_friend')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
                  placeholder={t('dashboard.enter_username')}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all text-sm font-bold"
                />
                <button
                  onClick={handleAddFriend}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95"
                >
                  {t('dashboard.add_friend')}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar text-left">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('dashboard.friends')}</h3>
              {isLoadingFriends ? (
                <div className="text-center py-6 text-slate-500 font-bold animate-pulse">{t('dashboard.loading_friends')}</div>
              ) : (friends && friends.length > 0) ? (
                friends.map((f) => (
                  <div key={f.id} className="glass p-4 rounded-2xl border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black">
                          {f.username[0].toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#020617] ${f.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                      </div>
                      <div>
                        <div className="font-black text-sm">{f.username}</div>
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          {f.isOnline ? t('dashboard.online') : t('dashboard.offline')} • {f.rankPoints} {t('dashboard.rp')}
                        </div>
                      </div>
                    </div>
                    {f.isOnline && (
                      <button className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-black rounded-lg border border-blue-500/20 transition-all uppercase tracking-widest">
                        {t('dashboard.invite')}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 font-bold text-slate-400">{t('dashboard.no_friends')}</div>
              )}
            </div>

            <button
               onClick={() => setView('lobby')}
               className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors"
              >
                 {t('dashboard.back_to_lobby')}
              </button>
          </div>
        ) : !isJoining ? (
          <div className="space-y-4">
            {roomId && (
              <button
                onClick={() => router.push(`/arena/${roomId}`)}
                className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold py-4 rounded-[24px] border border-green-500/20 transition-all flex items-center justify-center gap-3 mb-2 animate-pulse"
              >
                <span>🌐 {t('dashboard.return_to_arena')} (#{roomId})</span>
              </button>
            )}
            
            <button
              onClick={() => {
                if (roomId && !confirm(t('dashboard.rejoin_confirm'))) return;
                handleCreate();
              }}
              className="group relative w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-6 rounded-[24px] shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transform active:scale-[0.97] transition-all overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-3 text-lg">
                🚀 {t('dashboard.create_game')}
              </div>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
            </button>
            <button
              onClick={() => setIsJoining(true)}
              className="w-full glass glass-hover text-white font-bold py-6 rounded-[24px] transform active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-lg border-white/10"
            >
              🎮 {t('dashboard.join_with_code')}
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('dashboard.room_code')}</label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="------"
                className="w-full bg-white/5 border border-white/10 rounded-[24px] px-5 py-6 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all text-center tracking-[0.5em] font-mono text-3xl font-black text-blue-400 placeholder-white/5"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setIsJoining(false)}
                className="flex-1 glass glass-hover text-slate-400 font-bold py-5 rounded-2xl transition-all"
              >
                {t('dashboard.cancel')}
              </button>
              <button
                onClick={() => {
                  if (roomId && !confirm(t('dashboard.rejoin_confirm'))) return;
                  handleJoin();
                }}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95"
              >
                {t('dashboard.join_game')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-8 text-slate-500">
          <div className="text-center">
            <div className="text-xl font-black text-white">{user.role === 'admin' ? '∞' : (user.totalGames || 0)}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard.games')}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/5"></div>
          <div className="text-center">
            <div className="text-xl font-black text-white">{user.wins || 0}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard.wins')}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/5"></div>
          <div className="text-center">
            <div className="text-xl font-black text-white">{user.score || 0}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold">{t('dashboard.score')}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/5"></div>
          <div className="text-center">
            <div className="text-xl font-black text-yellow-500 flex items-center gap-1.5 justify-center">
              <Coins className="w-4 h-4" />
              {user.coins || 0}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-yellow-500/60">{t('dashboard.coins')}</div>
          </div>
        </div>
      </div>

      <Toast 
        show={!!notification} 
        msg={notification?.msg || ''} 
        type={notification?.type} 
      />
    </div>
  );
}
