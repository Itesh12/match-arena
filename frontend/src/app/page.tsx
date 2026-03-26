'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGameStore } from '@/store/useGameStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, LayoutDashboard, Shield, Coins, Globe, Trophy, CheckCircle2, XCircle, BrainCircuit, Menu, Users, History, Home, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRankTier } from '@/utils/ranks';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import MobileDrawer from '@/components/MobileDrawer';
import AchievementsView from '@/components/AchievementsView';
import ShopView from '@/components/ShopView';
import { API_URL } from '@/config';

export default function Lobby() {
  const [room, setRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [view, setView] = useState<'lobby' | 'history' | 'social' | 'settings' | 'achievements' | 'market'>('lobby');
  const [matches, setMatches] = useState<any[] | null>(null);
  const [friends, setFriends] = useState<any[] | null>(null);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'join', roomId?: string } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const socket = useSocket();
  const { user, roomId, setRoomId, logout, fetchStats, token, toast: globalToast, hideToast } = useGameStore();
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

  const handleCreate = (bypassCheck = false) => {
    if (!user || !socket) return;
    if (roomId && !bypassCheck) {
      setPendingAction({ type: 'create' });
      setShowConfirmModal(true);
      return;
    }
    const newRoom = generateRoomCode();
    joinRoom(newRoom);
  };

  const handleJoin = (bypassCheck = false) => {
    if (!room) return;
    if (roomId && !bypassCheck) {
      setPendingAction({ type: 'join', roomId: room.toUpperCase() });
      setShowConfirmModal(true);
      return;
    }
    joinRoom(room.toUpperCase());
  };

  const handleConfirmModal = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'create') {
      handleCreate(true);
    } else {
      const roomToJoin = pendingAction.roomId || room.toUpperCase();
      joinRoom(roomToJoin);
    }
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const handleRejoin = () => {
    if (roomId) {
      router.push(`/arena/${roomId}`);
    }
    setShowConfirmModal(false);
    setPendingAction(null);
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
    <div className="relative flex flex-col min-h-screen bg-[#020617] text-white overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full animate-pulse-glow pointer-events-none" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full animate-pulse-glow pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[10%] h-[10%] bg-pink-600/10 rounded-full animate-pulse-glow pointer-events-none" style={{ animationDelay: '1s' }}></div>

      {/* Top Bar - Responsive */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0">
        {/* Left: Brand / Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all md:pointer-events-none"
          >
            <span className="text-white font-black text-base">{user.username[0].toUpperCase()}</span>
          </button>
          <span className="text-sm font-black text-white/70 uppercase tracking-widest hidden sm:block">Math Arena</span>
        </div>

        {/* Center: Desktop Nav (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-2">
          {user.role === 'admin' && (
            <button onClick={() => router.push('/admin')} className="flex items-center gap-2 glass glass-hover px-4 py-2 rounded-xl transition-all">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold">{t('dashboard.admin')}</span>
            </button>
          )}
          {(['history', 'achievements', 'market', 'social', 'settings'] as const).map(v => (
            <button key={v} onClick={() => setView(view === v ? 'lobby' : v)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${view === v ? 'bg-blue-600 text-white border-blue-500' : 'glass glass-hover text-blue-400 border-white/5'}`}>
              {view === v ? t('dashboard.lobby') : v === 'settings' ? t('dashboard.language') : t(`dashboard.${v}`)}
            </button>
          ))}
        </nav>

        {/* Right: Coins + Logout (Logout hidden on smallest mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-yellow-500/20">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-xs sm:text-sm font-black">{user.coins || 0}</span>
          </div>
          <button onClick={logout} className="hidden sm:flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition-all border border-red-500/20">
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{t('dashboard.logout')}</span>
          </button>
        </div>
      </header>

      {/* Main Scroll Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center py-8 sm:py-12 px-4 sm:px-8 pb-24 md:pb-12 overflow-y-auto">

        {/* Main Card */}
        <div className="w-full max-w-5xl glass rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 shadow-2xl border-white/5 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8 sm:mb-12">
            <div className="text-micro text-blue-400 mb-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 inline-block">
              {t('dashboard.math_arena_v1')}
            </div>
            <h1 className="text-title mb-1 text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.3)] break-all px-4">
              {user.username}
            </h1>
            <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3">
              {(() => {
                const rank = getRankTier(user.rankPoints);
                return (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-micro text-blue-400">
                      {t(`dashboard.${rank.name.toLowerCase()}`)}
                    </span>
                  </div>
                );
              })()}
              <div className="text-micro text-slate-500 tracking-[0.4em] mb-2">{user.rankPoints || 0} {t('dashboard.rp')}</div>
            </div>
            <p className="text-slate-500 font-medium mt-6 sm:mt-8 text-sm sm:text-base">{t('dashboard.ready_for_challenge')}</p>
          </div>
          
          {view === 'market' ? (
            <div className="animate-in slide-in-from-right-10 duration-500 space-y-6">
              <ShopView />
              <button onClick={() => setView('lobby')} className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
                  {t('dashboard.back_to_lobby')}
               </button>
            </div>
          ) : view === 'achievements' ? (
            <div className="animate-in slide-in-from-right-10 duration-500 space-y-6">
              <AchievementsView />
              <button onClick={() => setView('lobby')} className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
                  {t('dashboard.back_to_lobby')}
               </button>
            </div>
          ) : view === 'history' ? (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto text-left animate-in slide-in-from-right-10 duration-500">
               {isLoadingHistory ? (
                 <div className="text-center py-10 text-slate-500 font-bold animate-pulse">{t('dashboard.loading_history')}</div>
               ) : (matches && matches.length > 0) ? (
                 matches.map((m) => (
                   <div key={m._id} className="glass p-4 sm:p-5 rounded-3xl border-white/5 space-y-3 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                      <div className="flex justify-between items-start">
                         <div>
                           <div className="text-micro text-blue-400 mb-1">
                             {new Date(m.completedAt).toLocaleDateString()}
                           </div>
                            <div className="text-base sm:text-lg font-black tracking-tight">{m.winner?.username === user.username ? t('dashboard.victory') : t('dashboard.defeat')}</div>
                         </div>
                         <div className="text-right">
                           <div className="text-xl font-black text-white">{m.participants.find((p: any) => p.userId === (user.id || user._id))?.score || 0}</div>
                           <div className="text-nano text-slate-500">{t('dashboard.points')}</div>
                         </div>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-10 text-slate-400 font-bold">{t('dashboard.no_matches')}</div>
               )}
               <button onClick={() => setView('lobby')} className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
                  {t('dashboard.back_to_lobby')}
               </button>
            </div>
          ) : view === 'social' ? (
            <div className="space-y-5 animate-in slide-in-from-right-10 duration-500">
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
                  <button onClick={handleAddFriend} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase transition-all active:scale-95">
                    {t('dashboard.add_friend')}
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto text-left">
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
                          <div className="text-nano text-slate-500 mb-1">
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
                  <div className="text-center py-6 text-slate-400 font-bold">{t('dashboard.no_friends')}</div>
                )}
              </div>

              <button onClick={() => setView('lobby')} className="w-full py-4 text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
                {t('dashboard.back_to_lobby')}
              </button>
            </div>
          ) : !isJoining ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {roomId && (
                <button
                  onClick={() => router.push(`/arena/${roomId}`)}
                  className="col-span-1 sm:col-span-2 w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold py-4 rounded-[24px] border border-green-500/20 transition-all flex items-center justify-center gap-3 mb-2 animate-pulse text-sm sm:text-base"
                >
                  <span>{t('dashboard.return_to_arena')} (#{roomId})</span>
                </button>
              )}
              
              <button
                onClick={() => handleCreate()}
                className="col-span-1 sm:col-span-2 group relative w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-6 sm:py-8 rounded-[32px] sm:rounded-[40px] shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] transform active:scale-[0.97] transition-all overflow-hidden text-lg sm:text-2xl"
              >
                <div className="relative z-10 flex items-center justify-center gap-4">
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                  {t('dashboard.create_game')}
                </div>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
              </button>
 
              <button
                onClick={() => router.push('/practice')}
                className="group relative w-full h-20 sm:h-28 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black rounded-[32px] flex flex-col items-center justify-center gap-2 overflow-hidden transition-all hover:bg-blue-600/20 active:scale-[0.98] shadow-lg"
              >
                <BrainCircuit className="w-6 h-6 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-lg tracking-widest uppercase">
                  {t('practice.title')}
                </span>
              </button>

              <button
                onClick={() => setIsJoining(true)}
                className="w-full h-20 sm:h-28 glass glass-hover text-white font-bold rounded-[32px] transform active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-2 text-xs sm:text-lg border-white/10"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                {t('dashboard.join_with_code')}
              </button>
            </div>
>
          ) : (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="space-y-3">
                <label className="text-micro text-slate-500 ml-1">{t('dashboard.room_code')}</label>
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  value={room}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  placeholder="------"
                  className="w-full bg-white/5 border border-white/10 rounded-[24px] px-5 py-5 sm:py-6 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all text-center tracking-[0.5em] font-mono text-2xl sm:text-3xl font-black text-blue-400 placeholder-white/5"
                />
              </div>
              
              <div className="flex gap-3 sm:gap-4">
                <button onClick={() => setIsJoining(false)} className="flex-1 glass glass-hover text-slate-400 font-bold py-4 sm:py-5 rounded-2xl transition-all">
                  {t('dashboard.cancel')}
                </button>
                <button onClick={() => handleJoin()} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 sm:py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95">
                  {t('dashboard.join_game')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-slate-500">
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 sm:bg-transparent sm:border-0">
              <div className="text-lg sm:text-xl font-black text-white">{user.role === 'admin' ? '∞' : (user.totalGames || 0)}</div>
              <div className="text-micro text-slate-500">{t('dashboard.games')}</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 sm:bg-transparent sm:border-0">
              <div className="text-lg sm:text-xl font-black text-white">{user.wins || 0}</div>
              <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-slate-500">{t('dashboard.wins')}</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 sm:bg-transparent sm:border-0">
              <div className="text-lg sm:text-xl font-black text-white">{user.score || 0}</div>
              <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-slate-500">{t('dashboard.score')}</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 sm:bg-transparent sm:border-0">
              <div className="text-lg sm:text-xl font-black text-yellow-500 flex items-center gap-1 justify-center">
                <Coins className="w-3.5 h-3.5" />
                {user.coins || 0}
              </div>
              <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-yellow-500/60">{t('dashboard.coins')}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (visible on < md screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 flex items-stretch h-20 mb-safe px-2">
        {([
          { key: 'lobby', icon: Home, label: 'Lobby' },
          { key: 'practice', icon: BrainCircuit, label: 'Practice' },
          { key: 'market', icon: ShoppingBag, label: 'Shop' },
          { key: 'achievements', icon: Trophy, label: 'Awards' },
          { key: 'social', icon: Users, label: 'Social' },
          { key: 'settings', icon: Globe, label: 'Lang' },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === 'practice') { router.push('/practice'); return; }
                setView(view === tab.key ? 'lobby' : tab.key as any);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all relative ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-blue-600/10 text-blue-400' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'animate-in zoom-in-75' : ''}`} />
              </div>
              <span className={`text-nano ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full blur-[2px]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={logout}
        onChangeView={setView}
        currentView={view}
        rank={getRankTier(user.rankPoints)}
        languages={[{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिंदी' }]}
        currentLang={i18n.language}
        onLanguageChange={(code) => { i18n.changeLanguage(code); setIsDrawerOpen(false); }}
      />

      {view === 'settings' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm">
          <div className="glass rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
              <Globe className="w-10 h-10 mx-auto text-blue-400 mb-4 opacity-70" />
              <h2 className="text-2xl font-black tracking-tight">{t('dashboard.language')}</h2>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">Choose your preferred language</p>
            </div>
            <div className="space-y-3">
              {[{ code: 'en', label: 'English', sub: 'English' }, { code: 'hi', label: 'हिंदी', sub: 'Hindi' }].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all duration-300 ${i18n.language === lang.code ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20 hover:text-white'}`}
                >
                  <div className="text-left">
                    <div className="font-black text-base">{lang.label}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{lang.sub}</div>
                  </div>
                  {i18n.language === lang.code && <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmModal}
        onRejoin={handleRejoin}
        title={t('dashboard.rejoin_title')}
        message={t('dashboard.rejoin_confirm')}
        roomId={roomId}
      />

      <Toast 
        show={!!globalToast?.show || !!notification} 
        msg={globalToast?.msg || notification?.msg || ''} 
        type={globalToast?.type || notification?.type}
        title={globalToast?.title}
      />
    </div>
  );
}
