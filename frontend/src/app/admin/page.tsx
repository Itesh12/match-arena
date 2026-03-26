'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useRouter } from 'next/navigation';
import { Activity, Users, PlayCircle, StopCircle, ArrowLeft, ShieldAlert, ShieldCheck, Key, RefreshCw, LayoutDashboard, UserSquare2, LogOut, ChevronRight, X, Copy, CheckCircle2, Clock, Database, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '@/config';

interface Room {
  id: string;
  playerCount: number;
  players: string[];
  status: string;
  currentQuestion: number;
  createdAt: number;
  owner?: string;
}

const formatDuration = (start: number) => {
  const diff = Math.floor((Date.now() - start) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}m ${s}s`;
};

interface UserProfile {
  _id: string;
  username: string;
  role: string;
  resetKey: string | null;
  score: number;
  totalGames: number;
  wins: number;
  isBanned: boolean;
}

export default function AdminDashboard() {
  const { user, token, logout } = useGameStore();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncTime, setSyncTime] = useState<number | null>(null);
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'arenas' | 'users' | 'system'>('arenas');
  const [resetOptions, setResetOptions] = useState({ users: false, matches: false, rooms: false });
  const [showModal, setShowModal] = useState(false);
  const [activeResetUser, setActiveResetUser] = useState<UserProfile | null>(null);
  const [currentResetKey, setCurrentResetKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    actionLabel?: string;
    variant: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user, router]);

  const fetchData = async () => {
    // 1. Measure Network Ping (Lightweight)
    const pStart = performance.now();
    try {
      await fetch(`${API_URL}/admin/ping`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPingTime(Math.round(performance.now() - pStart));
    } catch (e) {
      setPingTime(null);
    }

    // 2. Measure Data Sync (Database heavy)
    const sStart = performance.now();
    await Promise.all([fetchRooms(), fetchUsers()]);
    setSyncTime(Math.round(performance.now() - sStart));
    setLoading(false);
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const openResetModal = async (u: UserProfile) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${u._id}/reset-key`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentResetKey(data.key);
        setActiveResetUser(u);
        setShowModal(true);
        setCopied(false);
      }
    } catch (err) {
      console.error('Failed to generate reset key:', err);
    }
  };

  const copyToClipboard = () => {
    if (currentResetKey) {
      navigator.clipboard.writeText(currentResetKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    setConfirmConfig({
      show: true,
      title: isBanned ? t('admin.unban_user') : t('admin.ban_user'),
      message: t(isBanned ? 'admin.unban_confirm' : 'admin.ban_confirm'),
      actionLabel: isBanned ? t('admin.unban') : t('admin.ban'),
      variant: isBanned ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${userId}/toggle-ban`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            fetchUsers();
            setConfirmConfig(prev => ({ ...prev, show: false }));
          }
        } catch (err) {
          console.error('Failed to toggle ban:', err);
        }
      }
    });
  };

  const handleSystemReset = async () => {
    const selectedCount = Object.values(resetOptions).filter(Boolean).length;
    if (selectedCount === 0) return;

    setConfirmConfig({
      show: true,
      title: t('admin.critical_system_reset'),
      message: `${t('admin.reset_warning')} ${Object.entries(resetOptions).filter(([_, v]) => v).map(([k]) => k.toUpperCase()).join(', ')}. ${t('admin.irreversible')}`,
      actionLabel: t('admin.execute_reset'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/system/reset`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(resetOptions)
          });
          if (res.ok) {
            setConfirmConfig(prev => ({ ...prev, show: false }));
            setResetOptions({ users: false, matches: false, rooms: false });
            fetchData();
          }
        } catch (err) {
          console.error('System reset failed:', err);
        }
      }
    });
  };

  const deleteUser = async (userId: string) => {
    setConfirmConfig({
      show: true,
      title: t('admin.delete_user'),
      message: t('admin.delete_user_confirm'),
      actionLabel: t('admin.delete_forever'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            fetchUsers();
            setConfirmConfig(prev => ({ ...prev, show: false }));
          }
        } catch (err) {
          console.error('Failed to delete user:', err);
        }
      }
    });
  };

  const endRoom = async (roomId: string) => {
    try {
      await fetch(`${API_URL}/admin/rooms/${roomId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRooms();
    } catch (err) {
      console.error('Failed to end room:', err);
    }
  };

  const clearAllRooms = async () => {
    setConfirmConfig({
      show: true,
      title: t('admin.global_arena_reset'),
      message: t('admin.global_reset_confirm'),
      actionLabel: t('admin.terminate_all'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/admin/rooms/clear-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchRooms();
          setConfirmConfig(prev => ({ ...prev, show: false }));
        } catch (err) {
          console.error('Failed to clear rooms:', err);
        }
      }
    });
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0a0f1d] border-r border-white/5 flex flex-col items-stretch p-6 relative z-10">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">Admin<span className="text-blue-500">Center</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('arenas')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${activeTab === 'arenas' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            {t('admin.arena_monitor')}
            {activeTab === 'arenas' && <ChevronRight className="ml-auto w-4 h-4" />}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <UserSquare2 className="w-5 h-5" />
            <span className="font-bold text-sm">{t('admin.user_management')}</span>
            {activeTab === 'users' && <ChevronRight className="ml-auto w-4 h-4" />}
          </button>

          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${activeTab === 'system' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Database className="w-5 h-5" />
            <span className="font-bold text-sm">System Reset</span>
            {activeTab === 'system' && <ChevronRight className="ml-auto w-4 h-4" />}
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-[10px] font-black">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-black truncate">{user.username}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t('admin.root_admin')}</div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('admin.back_to_app')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <header className="mb-12 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              {activeTab === 'arenas' ? t('admin.arena_monitoring') : activeTab === 'users' ? t('admin.user_management') : t('admin.system_reset')}
            </h1>
            <p className="text-slate-500 font-medium">
              {activeTab === 'arenas' ? t('admin.arena_desc') : activeTab === 'users' ? t('admin.user_desc') : t('admin.system_desc')}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'arenas' && rooms.length > 0 && (
              <button
                onClick={clearAllRooms}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                {t('admin.clear_all')}
              </button>
            )}
            <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${(pingTime || 0) < 100 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <div>
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{t('admin.network_ping')}</div>
                  <div className="text-xs font-mono font-bold text-blue-500">{pingTime ? `${pingTime}ms` : '--'}</div>
                </div>
              </div>
              <div className="h-6 w-[1px] bg-white/10"></div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${(syncTime || 0) < 500 ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
                <div>
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{t('admin.database_sync')}</div>
                  <div className="text-xs font-mono font-bold text-slate-400">{syncTime ? `${syncTime}ms` : '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-6 glass rounded-3xl animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('admin.loading_data')}</span>
          </div>
        ) : (
          <>
            {/* Tab 1: Arenas */}
            {activeTab === 'arenas' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                {rooms.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center glass rounded-[40px] border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-slate-700">
                      <PlayCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">{t('admin.no_active_arenas')}</h3>
                    <p className="text-slate-500 font-medium">{t('admin.idle_desc')}</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group hover:border-white/20 transition-all shadow-xl p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center relative overflow-hidden">
                            <span className="text-blue-500 font-black text-xl relative"># {room.id}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${room.status === 'playing' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                {room.status}
                              </span>
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Active for {room.createdAt ? formatDuration(room.createdAt) : '--'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('admin.room_owner')}:</div>
                              <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.1em]">@{room.owner || t('admin.system')}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-12">
                          <div className="text-center">
                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Players ({room.playerCount})</div>
                            <div className="flex flex-wrap gap-2 max-w-[200px] justify-center">
                              {room.players.map(p => (
                                <div key={p} className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase">
                                  {p}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-center min-w-[100px]">
                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('admin.question')}</div>
                            <div className="text-lg font-black text-white">{room.currentQuestion + 1} / 10</div>
                          </div>

                          <button
                            onClick={() => endRoom(room.id)}
                            className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-95"
                          >
                            <StopCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Users */}
            {activeTab === 'users' && (
              <div className="glass border-white/5 rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 border border-white/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('admin.user_identity')}</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{t('admin.status')}</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{t('admin.performance')}</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('admin.security_control')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u._id} className={`hover:bg-white/[0.02] transition-colors ${u.isBanned ? 'bg-red-500/[0.03]' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-white text-sm">{u.username}</div>
                              <div className="text-[10px] font-bold text-slate-500 tracking-tight">{u.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.isBanned ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                            {u.isBanned ? t('admin.banned') : t('admin.active')}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="text-xs font-black text-slate-300">{u.score} pts</div>
                          <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{u.wins} {t('admin.wins')} / {u.totalGames} {t('admin.played')}</div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openResetModal(u)}
                              className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-600/5 active:scale-95"
                              title="Reset Password Key"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            {u.role !== 'admin' && (
                              <>
                                <button
                                  onClick={() => toggleBan(u._id, u.isBanned)}
                                  className={`p-2.5 rounded-xl border transition-all shadow-lg active:scale-95 ${u.isBanned ? 'bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white shadow-green-600/5' : 'bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white shadow-red-600/5'}`}
                                  title={u.isBanned ? "Unban" : "Ban"}
                                >
                                  {u.isBanned ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => deleteUser(u._id)}
                                  className="p-2.5 bg-white/5 text-slate-400 rounded-xl border border-white/10 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-lg active:scale-95"
                                  title="Delete User"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: System Reset */}
            {activeTab === 'system' && (
              <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-8 mb-8">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white mb-2">{t('admin.infrastructure_reset')}</h2>
                      <p className="text-slate-400 leading-relaxed">
                        {t('admin.infrastructure_desc')}
                        <span className="text-red-400 font-bold ml-1 italic underline decoration-red-500/30">{t('admin.admin_protected')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    {[
                      { id: 'users', label: t('admin.wipe_users'), icon: Users, desc: t('admin.wipe_users_desc') },
                      { id: 'matches', label: t('admin.clear_history'), icon: Activity, desc: t('admin.clear_history_desc') },
                      { id: 'rooms', label: t('admin.terminate_arenas'), icon: PlayCircle, desc: t('admin.terminate_arenas_desc') },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setResetOptions(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof resetOptions] }))}
                        className={`p-6 rounded-2xl border transition-all text-left flex flex-col gap-3 group ${resetOptions[item.id as keyof typeof resetOptions] ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-slate-900 border-white/5 hover:border-white/10'}`}
                      >
                        <div className={`p-2 rounded-lg w-fit transition-colors ${resetOptions[item.id as keyof typeof resetOptions] ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-100'}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-sm text-white">{item.label}</div>
                          <div className="text-[10px] font-medium text-slate-500 mt-1">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={!Object.values(resetOptions).some(Boolean)}
                    onClick={handleSystemReset}
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center justify-center gap-3 ${Object.values(resetOptions).some(Boolean) ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-500/20 active:scale-[0.98]' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                  >
                    <RefreshCw className={`w-5 h-5 ${Object.values(resetOptions).some(Boolean) ? 'animate-spin-slow' : ''}`} />
                    {t('admin.execute_platform_reset')}
                  </button>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-[32px] p-8">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 font-mono">{t('admin.security_protocol')}</h3>
                  <ul className="space-y-4">
                    {[
                      'All actions are logged with Admin ID and Timestamp.',
                      'Active sessions for affected users will be instantly invalidated.',
                      'Media assets associated with deleted records will be queued for cleanup.'
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Security Modal (Reset Key) */}
      {showModal && activeResetUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="max-w-md w-full glass rounded-[40px] p-10 border border-white/10 shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-500 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-8 top-8 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-600/10 rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-blue-600/20 shadow-xl shadow-blue-600/5">
                <Key className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{t('admin.new_security_key')}</h2>
              <p className="text-slate-500 font-medium">{t('admin.temporary_access')} <span className="text-white font-black italic">@{activeResetUser.username}</span></p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="relative group">
                <div className="bg-slate-900 border-2 border-dashed border-white/10 rounded-3xl p-8 text-center transition-all group-hover:border-blue-500/50">
                  <div className="text-5xl font-black font-mono text-blue-500 tracking-[0.4em] translate-x-[0.2em]">
                    {currentResetKey}
                  </div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 border border-white/10 rounded-full flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{t('admin.duplicate_token')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-12 w-full bg-white text-black font-black py-5 rounded-[24px] shadow-2xl hover:bg-slate-100 transition-all active:scale-[0.98] text-lg uppercase tracking-tighter"
            >
              {t('admin.secure_and_close')}
            </button>
          </div>
        </div>
      )}

      {/* Global Confirmation Modal */}
      {confirmConfig.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, show: false }))}></div>
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-[0_0_80px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${confirmConfig.variant === 'danger' ? 'bg-red-500/10 text-red-500' : confirmConfig.variant === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{confirmConfig.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{confirmConfig.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, show: false }))}
                className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className={`flex-1 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 ${confirmConfig.variant === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : confirmConfig.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
              >
                {confirmConfig.actionLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
