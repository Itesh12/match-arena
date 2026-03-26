'use client';

import { useSocket } from '@/context/SocketContext';
import { useGameStore } from '@/store/useGameStore';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Timer, User, Users, CheckCircle2, XCircle, Play, Shield, LogOut, Skull, ShieldCheck, Zap, Globe, Info, Copy, MousePointer2, MessagesSquare, Send } from 'lucide-react';
import Toast from '@/components/Toast';

export default function Arena() {
  const { id } = useParams();
  const socket = useSocket();
  const { initialized } = useAuth();
  const { t, i18n } = useTranslation();
  const {
    players,
    currentQuestion,
    gameStatus,
    leaderboard,
    user,
    winner,
    ownerId,
    ownerSocketId,
    finalQuestions,
    setFinalQuestions,
    countdown,
    roomSettings,
    setRoomSettings,
    setPlayers,
    setGameStatus,
    setCurrentQuestion,
    setLeaderboard,
    setWinner,
    setOwnerId,
    setOwnerSocketId,
    setCountdown,
    reset
  } = useGameStore();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean | null, correctAnswer: number | null }>({ isCorrect: null, correctAnswer: null });
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'standard' | 'sudden_death' | 'double_jeopardy' | 'team_battle'>('standard');
  const [notifications, setNotifications] = useState<{ id: string, msg: string }[]>([]);
  const [rematchRequest, setRematchRequest] = useState<{ ownerUsername: string; timeout: number } | null>(null);
  const [rematchTimeLeft, setRematchTimeLeft] = useState<number>(30);
  const [rematchStatus, setRematchStatus] = useState<{ acceptedCount: number; rejectedCount: number; totalPlayers: number } | null>(null);
  const [hasRespondedToRematch, setHasRespondedToRematch] = useState(false);
  const [rematchReason, setRematchReason] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: number; sender: string; text: string; timestamp: Date }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [initialized, user, router]);

  // Handle Room Join/Leave
  useEffect(() => {
    if (!socket || !user || !initialized) return;

    const roomId = (id as string).toUpperCase();
    console.log('Joining arena:', roomId);
    
    socket.emit('join_arena', {
      username: user.username,
      userId: user.id || (user as any)._id,
      roomId
    });

    return () => {
      console.log('Leaving arena:', roomId);
      socket.emit('leave_game', roomId);
    };
  }, [socket, id, user?.id, user?._id, initialized]);

  // Handle Socket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('player_joined', (data) => setPlayers(data));
    socket.on('room_update', (data) => {
      if (data.ownerId) setOwnerId(data.ownerId);
      if (data.ownerSocketId) setOwnerSocketId(data.ownerSocketId);
    });
    socket.on('countdown_update', (count) => setCountdown(count));
    socket.on('settings_updated', (settings) => setRoomSettings(settings));
    socket.on('game_start', (data) => {
      setGameStatus('playing');
      setCountdown(null);
      if (data.settings) setRoomSettings(data.settings);
      setTimeLeft(data.settings?.timePerQuestion || 60);
    });
    socket.on('new_question', (q) => {
      setCurrentQuestion(q);
      setAnswerResult({ isCorrect: null, correctAnswer: null });
    });
    socket.on('answer_result', (data) => setAnswerResult(data));
    socket.on('leaderboard_update', (l) => setLeaderboard(l));
    socket.on('game_end', (data) => {
      setWinner(data.winner);
      setLeaderboard(data.leaderboard);
      setFinalQuestions(data.questions || []);
      setGameStatus('finished');
    });
    socket.on('player_left_game', ({ username }) => {
      console.log(`${username} left the game`);
    });
    socket.on('arena_terminated', () => {
      setIsTerminated(true);
    });

    socket.on('rematch_requested', (data) => {
      setRematchRequest(data);
      setRematchTimeLeft(data.timeout / 1000);
      setHasRespondedToRematch(false);
      setRematchStatus({ acceptedCount: 1, rejectedCount: 0, totalPlayers: players.length });
    });

    socket.on('rematch_status_update', (data) => {
      setRematchStatus(data);
    });

    socket.on('rematch_started', () => {
      setRematchRequest(null);
      setRematchReason(null);
      setAnswerResult({ isCorrect: null, correctAnswer: null });
      setIsReviewing(false);
      setSelectedOption(null);
      setFinalQuestions([]);
    });

    socket.on('rematch_failed', (data) => {
      setRematchRequest(null);
      setRematchReason(data.reason);
      setTimeout(() => setRematchReason(null), 5000);
    });

    socket.on('room_info', (data) => {
      if (data.mode) setSelectedMode(data.mode);
      if (data.players) setPlayers(data.players);
      if (data.status) setGameStatus(data.status);
    });

    socket.on('power_up_granted', ({ type }) => {
      const id = Math.random().toString();
      setNotifications(prev => [...prev, { id, msg: `${t('arena.power_up_granted')}: ${type.toUpperCase()}!` }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    });

    socket.on('power_up_used', ({ playerId, type }) => {
      const p = players.find(p => p.id === playerId);
      const id = Math.random().toString();
      setNotifications(prev => [...prev, { id, msg: `${p?.username || 'Player'} ${t('arena.used')} ${type.toUpperCase()}!` }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    });

    socket.on('error', (err: any) => {
      setNotifications(prev => [...prev, { id: Math.random().toString(), msg: err.message }]);
    });

    socket.on('message_received', (msg) => {
      setMessages(prev => [...prev, msg].slice(-50)); // Keep last 50
    });

    return () => {
      socket.off('player_joined');
      socket.off('room_update');
      socket.off('countdown_update');
      socket.off('settings_updated');
      socket.off('game_start');
      socket.off('new_question');
      socket.off('answer_result');
      socket.off('leaderboard_update');
      socket.off('game_end');
      socket.off('error');
      socket.off('player_left_game');
      socket.off('arena_terminated');
      socket.off('rematch_requested');
      socket.off('rematch_status_update');
      socket.off('rematch_started');
      socket.off('rematch_failed');
      socket.off('room_info');
      socket.off('power_up_granted');
      socket.off('power_up_used');
      socket.off('message_received');
    };
  }, [socket, id, user?.id, user?._id, players, t, setPlayers, setOwnerId, setOwnerSocketId, setCountdown, setGameStatus, setCurrentQuestion, setAnswerResult, setLeaderboard, setWinner, setFinalQuestions, setRoomSettings, setRematchRequest, setRematchStatus]);

  useEffect(() => {
    if (!rematchRequest || rematchTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setRematchTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rematchRequest, rematchTimeLeft]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      setTimeLeft(roomSettings.timePerQuestion || 60);
      setSelectedOption(null);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStatus, currentQuestion, roomSettings.timePerQuestion]);

  const handleSelect = (option: number) => {
    if (selectedOption !== null || !socket) return;
    setSelectedOption(option);
    socket.emit('submit_answer', { roomId: id, answer: option });
  };

  const handleStart = () => {
    if (socket && (ownerSocketId === socket.id)) {
      socket.emit('start_game', id, selectedMode);
    }
  };

  const handleRematch = () => {
    if (socket && id) {
      socket.emit('rematch_request', { roomId: id });
    }
  };

  const handleAcceptRematch = () => {
    if (socket && id) {
      socket.emit('rematch_response', { roomId: id, accept: true });
      setHasRespondedToRematch(true);
    }
  };

  const handleRejectRematch = () => {
    if (socket && id) {
      socket.emit('rematch_response', { roomId: id, accept: false });
      setHasRespondedToRematch(true);
    }
  };

  const handleUsePowerUp = (type: string) => {
    if (socket && id) {
      socket.emit('use_power_up', { roomId: id, type });
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit('leave_game', id);
    }
    reset();
    router.push('/');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !newMessage.trim() || !user) return;
    socket.emit('send_message', { 
        roomId: id, 
        message: newMessage.trim(), 
        username: user.username 
    });
    setNewMessage('');
  };

  const InfoModal = ({ title, message, onConfirm, show, isConfirmation }: { title: string, message: string, onConfirm: () => void, show: boolean, isConfirmation?: boolean }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="glass max-w-md w-full p-10 rounded-[40px] border-white/10 shadow-2xl text-center space-y-8 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <LogOut className="w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black tracking-tight">{title}</h3>
            <p className="text-slate-400 font-medium">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onConfirm} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all active:scale-[0.98]">
              {isConfirmation ? t('common.yes_leave') : t('common.confirm')}
            </button>
            {isConfirmation && (
              <button onClick={() => setShowExitModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl transition-all active:scale-[0.98]">
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (gameStatus === 'finished') {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white p-6 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full animate-pulse-glow" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full animate-pulse-glow" style={{ animationDelay: '3s' }}></div>

        <div className="relative z-10 max-w-2xl w-full glass rounded-[32px] p-10 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5 animate-float">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-yellow-400/20 blur-[60px] rounded-full animate-pulse"></div>
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto relative z-10 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce" />
          </div>

          {!isReviewing ? (
            <>
              <div className="mb-8">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] mb-3">
                  {t('arena.game_over')}
                </span>
                <h1 className="text-4xl font-black mb-3 tracking-tighter">{t('arena.game_results')}</h1>
                <div className="text-lg font-black text-slate-400">
                  {t('arena.first_place')}: <span className="text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">{winner?.username}</span>
                </div>
              </div>

              <div className="glass rounded-[32px] p-8 mb-8 border-white/5 text-left relative overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{t('arena.leaderboard')}</h2>
                <div className="space-y-4">
                  {leaderboard.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-400 text-black' : 'bg-white/5 border border-white/5'}`}>
                          {i + 1}
                        </span>
                        <span className={`font-black text-lg ${i === 0 ? 'text-white' : 'text-slate-400'}`}>{p.username}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-blue-400 tracking-tighter">{p.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {socket?.id === ownerSocketId && !rematchRequest && (
                <button
                  onClick={handleRematch}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black py-5 rounded-[24px] shadow-xl shadow-yellow-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 animate-pulse mb-4"
                >
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                  {t('arena.play_again')}
                </button>
              )}

              {rematchReason && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-4">
                  <span className="text-red-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {rematchReason}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setIsReviewing(true)}
                  className="group relative w-full bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black py-4 rounded-[20px] transition-all hover:bg-blue-600/20 active:scale-[0.98]"
                >
                  {t('arena.review_questions')}
                </button>
                <button
                  onClick={handleLeave}
                  className="group relative w-full bg-white text-black font-black py-4 rounded-[20px] shadow-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  {t('arena.dashboard')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {socket?.connected ? 'Socket Connected' : 'Socket Disconnected'}
                  </span>
                </div>
                <div className="text-xl font-black text-white">{players.length}</div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">{t('arena.players')}</div>
              </div>

              <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-left">
                {finalQuestions.map((q, idx) => (
                  <div key={idx} className="glass p-6 rounded-2xl border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('arena.question')} {idx + 1}</span>
                      <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <span className="text-[10px] font-black text-green-400 uppercase">{t('arena.answer')}: {q.correctAnswer}</span>
                      </div>
                    </div>
                    <p className="text-xl font-black tracking-tight">{q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map(opt => (
                        <div key={opt} className={`px-3 py-2 rounded-xl text-xs font-bold border ${opt === q.correctAnswer ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsReviewing(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-[20px] border border-white/10 transition-all active:scale-[0.98]"
              >
                {t('arena.back_to_results')}
              </button>
            </>
          )}
        </div>

        {/* Persistent Chat for Finished State */}
        <div className={`fixed top-0 right-0 w-full sm:w-[400px] h-full bg-[#020617]/95 backdrop-blur-3xl z-[100] border-l border-white/10 transition-transform duration-500 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                      <MessagesSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-widest">Lobby Chat</h3>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
              </button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === user?.username ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase mb-1">{msg.sender}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] ${msg.sender === user?.username ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 rounded-tl-none'}`}>
                          {msg.text}
                      </div>
                  </div>
              ))}
           </div>
           <form onSubmit={handleSendChat} className="p-6 border-t border-white/10">
              <div className="relative group">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full h-14 pl-6 pr-14 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:border-blue-500/50" />
                  <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Send className="w-4 h-4" /></button>
              </div>
           </form>
        </div>
        <Toast show={!!notifications.length} msg={notifications[notifications.length - 1]?.msg || ''} type="success" />
      </div>
    );
  }

  if (!initialized || !user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden flex flex-col lg:flex-row">
      <InfoModal
        show={showExitModal}
        title={t('arena.leave_game_title')}
        message={t('arena.leave_game_msg')}
        isConfirmation={true}
        onConfirm={handleLeave}
      />

      <InfoModal
        show={isTerminated}
        title={t('arena.game_closed_title')}
        message={t('arena.game_closed_msg')}
        onConfirm={() => setIsTerminated(false)}
      />

      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-[30%] left-[40%] w-[20%] h-[20%] bg-indigo-600/5 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      {/* Sidebar: Players & Progress */}
      <div className={`relative z-20 bg-slate-950/60 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)]
        /* Mobile: fixed drawer overlay, Desktop: static sidebar */
        fixed inset-y-0 left-0 w-[300px] transition-transform duration-300 lg:static lg:w-[320px] lg:h-auto lg:min-h-screen
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5">
          <button
            onClick={() => setShowExitModal(true)}
            className="w-full group relative flex items-center gap-4 p-4 rounded-[20px] bg-white/[0.03] border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/0 to-red-600/5 group-hover:via-red-600/5 transition-all duration-700"></div>
            <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-red-500/40 group-hover:bg-red-500/10 group-hover:rotate-12 transition-all duration-500 shadow-inner">
              <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
            </div>
            <div className="text-left relative z-10">
              <h2 className="font-black text-sm text-white/90 group-hover:text-red-500 transition-colors tracking-tight">{t('arena.quit_session')}</h2>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">{t('arena.abandon_subtitle')}</p>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
          {gameStatus !== 'waiting' && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Users className="w-3 h-3 text-blue-400" />
                  </div>
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t('arena.participants')}</h3>
                </div>
                <div className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/20 shadow-lg shadow-blue-500/5">
                  {players.length}
                </div>
              </div>
              <div className="space-y-3">
                {players.map((p) => (
                  <div key={p.id} className={`group relative transition-all duration-300 ${p.hasLeft ? 'opacity-30' : 'hover:scale-[1.02]'}`}>
                    <div className={`absolute -inset-[1px] bg-gradient-to-r ${p.username === user?.username ? 'from-blue-600/20 to-indigo-600/20' : 'from-white/5 to-white/0'} rounded-[17px] opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]`}></div>
                    <div className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${p.username === user?.username ? 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/10' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-2 h-2 rounded-full ${p.isEliminated ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : p.hasLeft ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : p.username === user?.username ? 'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                          {!p.hasLeft && !p.isEliminated && <div className={`absolute -inset-1 rounded-full animate-ping opacity-20 ${p.username === user?.username ? 'bg-blue-400' : 'bg-green-400'}`}></div>}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-black tracking-tight transition-colors ${p.username === user?.username ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>
                            {p.username}
                          </span>
                          <div className="flex items-center gap-2">
                            {p.isEliminated && <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest leading-none">{t('arena.eliminated')}</span>}
                            {p.hasShield && <ShieldCheck className="w-3 h-3 text-yellow-400" />}
                            {p.isFrozen && <div className="w-3 h-3 border border-blue-400 rounded-full flex items-center justify-center animate-pulse"><div className="w-1 h-1 bg-blue-400 rounded-full"></div></div>}
                            {p.team && (
                              <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${p.team === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
                                {t('arena.team')} {p.team}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
  
                      <div className="flex items-center gap-2">
                        {p.id === ownerSocketId && (
                          <div className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5 text-yellow-400" />
                            <span className="text-[7px] font-black text-yellow-500 uppercase tracking-tighter">{t('arena.host')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-yellow-400" />
              </div>
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t('arena.rankings')}</h3>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-5 relative overflow-hidden group/board">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover/board:opacity-100 transition-opacity duration-700"></div>
              {leaderboard.length > 0 ? leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between relative z-10 group/item ${p.hasLeft ? 'opacity-30' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all duration-500 ${
                      i === 0 ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] rotate-3' : 
                      i === 1 ? 'bg-slate-300 text-black border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.2)]' :
                      i === 2 ? 'bg-amber-700 text-white border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.2)]' :
                      'bg-white/5 text-white/40 border-white/5 group-hover/item:border-white/20'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 ">
                        <span className={`text-xs font-black transition-colors ${i < 3 ? 'text-white' : 'text-white/60 group-hover/item:text-white/90'}`}>{p.username}</span>
                        {p.team && <div className={`w-1.5 h-1.5 rounded-full ${p.team === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}></div>}
                      </div>
                      {i === 0 && <span className="text-[6px] font-black text-yellow-500 uppercase tracking-widest mt-0.5">{t('arena.leading')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-black text-sm tracking-tighter leading-none ${i === 0 ? 'text-yellow-400' : 'text-blue-400'}`}>{p.hasLeft ? 0 : p.score}</span>
                    <span className="text-[6px] font-black text-white/20 uppercase tracking-widest leading-none mt-1">{t('arena.pts')}</span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center">
                  <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">{t('arena.no_data_yet')}</div>
                </div>
              )}
              
              {selectedMode === 'team_battle' && (
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">{t('arena.red_team')}</span>
                    <span className="text-[10px] font-black text-red-400 tracking-tighter">
                      {players.filter(p => p.team === 'red').reduce((acc, p) => acc + (p.score || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{t('arena.blue_team')}</span>
                    <span className="text-[10px] font-black text-blue-400 tracking-tighter">
                      {players.filter(p => p.team === 'blue').reduce((acc, p) => acc + (p.score || 0), 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      {/* Mobile sidebar overlay backdrop */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}

      {/* Main Game Area */}
      <div className="relative z-10 flex-1 flex flex-col h-full lg:min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => setShowMobileSidebar(true)} className="flex items-center gap-2 glass px-3 py-2 rounded-xl border border-white/10">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black text-white/70">{players.length} Players</span>
          </button>
          <span className="text-sm font-black text-white uppercase tracking-widest">Math Arena</span>
          <button 
            onClick={() => setShowChat(!showChat)} 
            className={`p-3 rounded-xl border transition-all lg:hidden mr-2 ${showChat ? 'bg-blue-600 border-blue-400' : 'glass border-white/10'}`}
          >
            <MessagesSquare className={`w-4 h-4 ${showChat ? 'text-white' : 'text-blue-400'}`} />
          </button>
          <button onClick={() => setShowExitModal(true)} className="text-red-400 glass px-3 py-2 rounded-xl border border-red-500/20 text-xs font-black">
            Quit
          </button>
        </div>
        {gameStatus === 'waiting' ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* 3-Section Premium Top Bar - perfectly aligned with sidebar's p-6 header - desktop only */}
            <header className="hidden lg:grid grid-cols-3 items-center w-full mx-auto p-6">
              {/* Left: Players Info - Compact and matching sidebar style */}
              <div className="flex justify-start">
                <div className="flex items-center gap-4 px-6 py-4 bg-white/[0.03] rounded-2xl border border-white/10 group hover:border-blue-500/30 transition-all duration-500 h-[76px]">
                  <div className="relative">
                    <Users className="w-5 h-5 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none flex items-center gap-2">
                       {t('arena.players')}
                       <span className="text-white ml-1">{players.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                       <span className="w-1 h-1 bg-green-500 rounded-full animate-ping"></span>
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{t('arena.active')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Branding Logo - Refined */}
              <div className="flex justify-center">
                <div className="relative group cursor-default">
                  <div className="absolute -inset-4 bg-blue-600/10 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative flex items-center gap-6 px-10 glass rounded-full border border-white/5 shadow-2xl overflow-hidden group-hover:border-white/10 transition-all duration-700 h-[76px]">
                    <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center border border-white/5 transform rotate-3 group-hover:rotate-12 transition-transform">
                      <Zap className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-widest text-white uppercase leading-none">{t('arena.math_arena')}</span>
                      <span className="text-[7px] font-black text-blue-400/40 uppercase tracking-[0.4em] mt-1.5 text-center">{t('arena.premium_engine')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Room ID - Bold & Modern */}
              <div className="flex justify-end pr-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-full border transition-all duration-300 relative group h-[76px] w-[76px] flex items-center justify-center ${showChat ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'glass border-white/5 hover:border-white/20'}`}
                  >
                    <MessagesSquare className={`w-6 h-6 ${showChat ? 'text-white' : 'text-blue-400/60 group-hover:text-blue-400'}`} />
                    {messages.length > 0 && !showChat && (
                      <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-[#020617] animate-pulse"></span>
                    )}
                  </button>
                  <div className="flex items-center gap-6 px-10 glass rounded-full border border-white/5 shadow-xl h-[76px]">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">{t('arena.room_id')}</span>
                      <span className="text-xl font-black text-white tracking-widest uppercase">{(id as string).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Vertically Centered Content Area */}
            <div className="flex-1 flex flex-col items-center justify-start px-6 pb-6 space-y-12">
              {/* Main Math Arena Card - Perfectly Centered */}
              <div className="w-full max-w-xl mx-auto">
                <div className="relative group/main">
                  <div className="absolute -inset-10 bg-blue-600/10 rounded-full blur-[100px] opacity-0 group-hover/main:opacity-100 transition-opacity duration-1000"></div>
                  <div className="relative glass rounded-[48px] p-12 border border-white/10 shadow-3xl text-center overflow-hidden">
                    {/* Background ∑ Decoration */}
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                      <div className="text-[200px] italic font-serif leading-none">∑</div>
                    </div>

                    {countdown !== null ? (
                      <div className="py-10">
                        <div className="relative w-40 h-40 mx-auto mb-10">
                          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-25"></div>
                          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-[0_0_80px_rgba(37,99,235,0.4)] flex items-center justify-center border-4 border-white/10">
                            <span className="text-8xl font-black italic text-white animate-in zoom-in duration-500">{countdown}</span>
                          </div>
                        </div>
                        <h2 className="text-[10px] font-black tracking-[0.8em] text-blue-400 animate-pulse uppercase translate-x-[0.4em]">
                          {t('arena.get_ready')}
                        </h2>
                      </div>
                    ) : (
                      <>
                        <div className="mb-12">
                          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-[0.4em] mb-8">
                            {t('arena.lobby_protocol')}
                          </div>
                          <h2 className="text-7xl font-black mb-6 tracking-tighter text-white leading-[0.8]">
                            {t('arena.math_arena')}
                          </h2>
                          <p className="text-slate-400 font-medium text-lg max-w-sm mx-auto leading-relaxed">
                            {t('arena.share_code_message')}
                          </p>
                        </div>

                        {/* Secret Code Centered Widget */}
                        <div className="mb-12 relative group/code inline-block mx-auto min-w-[280px]">
                          <div className="absolute -inset-4 bg-blue-500/10 blur-xl opacity-0 group-hover/code:opacity-100 transition-opacity"></div>
                          <div 
                            className="relative bg-white/[0.03] border border-white/10 rounded-[32px] p-8 cursor-pointer active:scale-[0.98] transition-all hover:bg-white/[0.05] duration-500 shadow-2xl"
                            onClick={() => {
                              navigator.clipboard.writeText(id as string);
                              setShowCopyMessage(true);
                              setTimeout(() => setShowCopyMessage(false), 2000);
                            }}
                          >
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-lg">
                              {t('arena.room_code')}
                            </div>
                            <div className="text-5xl font-black font-mono tracking-[0.3em] text-white flex items-center justify-center py-4 pl-4">
                              {id}
                              <Copy className="ml-4 w-5 h-5 text-blue-400/40 group-hover/code:text-blue-400 transition-colors" />
                            </div>
                            <div className="flex items-center justify-center gap-2 text-slate-600 group-hover/code:text-slate-400 transition-colors mt-4">
                              <MousePointer2 className="w-3 h-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{t('arena.click_to_copy')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Owner Controls / Room Settings */}
                        <div className="w-full max-w-sm mx-auto space-y-6">
                          {(socket?.id === ownerSocketId || 
                            (user?.id && String(user.id) === String(ownerId)) || 
                            ((user as any)?._id && String((user as any)._id) === String(ownerId))) ? (
                            <>
                              {/* Host Settings */}
                              <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                                  <div className="flex flex-col text-left">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('arena.questions')}</span>
                                    <span className="text-xs font-black text-white">{roomSettings.questionsCount}</span>
                                  </div>
                                  <select 
                                    value={roomSettings.questionsCount}
                                    onChange={(e) => socket?.emit('update_room_settings', { roomId: id, settings: { questionsCount: parseInt(e.target.value) }})}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-blue-400 outline-none cursor-pointer"
                                  >
                                    {[5, 10, 15, 20].map(n => <option key={n} value={n} className="bg-slate-900">{n} Questions</option>)}
                                  </select>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                                  <div className="flex flex-col text-left">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('arena.time_limit')}</span>
                                    <span className="text-xs font-black text-white">{roomSettings.timePerQuestion}s</span>
                                  </div>
                                  <select 
                                    value={roomSettings.timePerQuestion}
                                    onChange={(e) => socket?.emit('update_room_settings', { roomId: id, settings: { timePerQuestion: parseInt(e.target.value) }})}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-blue-400 outline-none cursor-pointer"
                                  >
                                    {[15, 30, 45, 60].map(s => <option key={s} value={s} className="bg-slate-900">{s} Seconds</option>)}
                                  </select>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                                  <div className="flex flex-col text-left">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('arena.difficulty')}</span>
                                    <span className="text-xs font-black text-white uppercase">{roomSettings.difficulty}</span>
                                  </div>
                                  <select 
                                    value={roomSettings.difficulty}
                                    onChange={(e) => socket?.emit('update_room_settings', { roomId: id, settings: { difficulty: e.target.value }})}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-blue-400 outline-none cursor-pointer uppercase"
                                  >
                                    {['easy', 'medium', 'hard'].map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                  </select>
                                </div>
                              </div>

                              <button
                                disabled={players.length < 2}
                                onClick={handleStart}
                                className={`group relative w-full h-16 font-black rounded-[2rem] shadow-2xl transition-all duration-500 flex items-center justify-center gap-4 overflow-hidden
                                  ${players.length < 2
                                    ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'}`}
                              >
                                <Play className={`w-5 h-5 ${players.length < 2 ? 'opacity-20' : 'fill-current'}`} />
                                <span className="relative z-10 text-lg tracking-tight uppercase">
                                  {players.length < 2 ? t('arena.need_players') : t('arena.start_game')}
                                </span>
                              </button>
                            </>
                          ) : (
                            <div className="h-16 flex items-center justify-center rounded-[2rem] bg-blue-500/5 border border-blue-500/10 text-blue-400 font-extrabold tracking-[0.2em] animate-pulse uppercase text-xs px-10 text-center leading-tight">
                              {t('arena.waiting_for_owner')}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Grid - Now Centered Below Math Arena Card */}
              <div className="w-full max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-700 delay-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {t('arena.participants')}
                  </h3>
                  <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-white/50 tracking-widest uppercase">
                    {players.length} / 8
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
                  {/* Slots for up to 8 players, centered in their grid */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const p = players[i];
                    return (
                      <div key={i} className={`aspect-square rounded-[2rem] border transition-all duration-500 flex flex-col items-center justify-center p-4 gap-3 ${
                        p 
                          ? p.username === user?.username 
                            ? 'glass border-blue-500/40 shadow-xl shadow-blue-500/10' 
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                          : 'bg-white/[0.01] border-white/5 opacity-20'
                      }`}>
                        {p ? (
                          <>
                            <div className="relative">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-500 ${
                                 p.username === user?.username ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-white/5 text-slate-500'
                               }`}>
                                 {p.username[0].toUpperCase()}
                               </div>
                               <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#020617] shadow-lg" />
                            </div>
                            <span className="block text-[10px] font-black text-white/80 uppercase tracking-tight truncate w-full text-center px-2">
                              {p.username}
                            </span>
                          </>
                        ) : (
                           <div className="w-10 h-10 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center">
                              <Users className="w-4 h-4 text-white/5" />
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col p-6 lg:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-8">
                <div className={`glass px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl transition-all duration-300 ${timeLeft < 10 ? 'border-red-500/50 bg-red-500/5 animate-pulse-red' : 'border-white/5'}`}>
                  <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(timeLeft / (roomSettings.timePerQuestion || 60)) * 100}%` }}></div>
                  <Timer className={`w-6 h-6 transition-colors ${timeLeft < 10 ? 'text-red-500 animate-shake' : 'text-blue-400'}`} />
                  <span className={`font-mono text-3xl font-black tracking-tighter tabular-nums transition-colors ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}<span className={`text-lg ml-1 ${timeLeft < 10 ? 'text-red-500/50' : 'text-slate-400'}`}>s</span></span>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{t('arena.total_progress')}</div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: roomSettings.questionsCount || 10 }).map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === (currentQuestion?.index ?? 0) ? 'w-6 bg-blue-500' : i < (currentQuestion?.index ?? 0) ? 'w-2 bg-blue-500/40' : 'w-2 bg-white/5'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tracking-tighter text-white">
                  <span className="text-blue-500">{t('arena.question_short')}</span>{(currentQuestion?.index ?? 0) + 1} <span className="text-slate-400 text-lg">/ {roomSettings.questionsCount || 10}</span>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">{t('arena.current_question')}</div>
              </div>
            </header>

            <div className="flex-1 flex flex-col justify-center">
              {/* Notifications */}
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] space-y-2 pointer-events-none">
                {notifications.map(n => (
                  <div key={n.id} className="glass px-6 py-3 rounded-2xl border-blue-500/30 text-blue-400 font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    {n.msg}
                  </div>
                ))}
              </div>

              {players.find(p => p.id === socket?.id)?.isEliminated ? (
                <div className="glass rounded-[32px] p-20 text-center shadow-2xl border-orange-500/20 relative overflow-hidden group animate-in zoom-in fade-in duration-700">
                  <div className="absolute inset-0 bg-orange-500/5 blur-3xl animate-pulse"></div>
                  <Skull className="w-24 h-24 text-orange-500 mx-auto mb-8 animate-bounce" />
                  <h2 className="text-4xl font-black mb-4 tracking-tighter">{t('arena.eliminated')}</h2>
                  <p className="text-slate-400 font-medium max-w-sm mx-auto mb-8">{t('arena.spectating')}</p>
                  <div className="inline-block px-6 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest">
                    {t('arena.spectator_active')}
                  </div>
                </div>
              ) : (
                <>
                  <div className={`glass rounded-[32px] p-10 mb-8 text-center shadow-[0_0_80px_rgba(0,0,0,0.5)] border-white/5 relative overflow-hidden group transition-all duration-300 ${timeLeft < 10 ? 'animate-shake animate-pulse-red border-red-500/40' : ''} ${players.find(p => p.id === socket?.id)?.hasShield ? 'border-yellow-400/40 shadow-[0_0_40px_rgba(250,204,21,0.2)]' : ''}`}>
                    <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${timeLeft < 10 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'}`}></div>
                    
                    {players.find(p => p.id === socket?.id)?.isFrozen && (
                      <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="text-6xl mb-4 animate-spin-slow">❄️</div>
                        <h3 className="text-2xl font-black text-blue-300 uppercase tracking-tighter">{t('arena.frozen')}</h3>
                        <p className="text-blue-200/60 font-medium">{t('arena.frozen_desc')}</p>
                      </div>
                    )}

                    {/* Mode Display */}
                    {selectedMode !== 'standard' && (
                      <div className={`absolute top-4 right-6 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        selectedMode === 'sudden_death' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}>
                         {selectedMode === 'sudden_death' ? <Skull className="w-3 h-3" /> : <Zap className="w-3 h-3 fill-current" />}
                         {selectedMode.replace('_', ' ')}
                      </div>
                    )}

                    <h2 className={`text-6xl md:text-7xl font-black tracking-tighter mb-2 select-none transition-colors ${timeLeft < 10 && !selectedOption ? 'text-red-500' : 'text-white'}`}>
                      {currentQuestion?.question}
                    </h2>
                    <div className={`font-black text-[9px] uppercase tracking-[0.8em] translate-x-[0.4em] leading-none transition-colors ${timeLeft < 10 ? 'text-red-500/40' : 'text-blue-400/60'}`}>
                      {timeLeft < 10 ? t('arena.low_time') : t('arena.realtime')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion?.options.map((option) => {
                      const isSelected = selectedOption === option;
                      const isCorrectAnswer = answerResult.correctAnswer === option;
                      const isWrongAnswer = isSelected && answerResult.isCorrect === false;

                      let buttonStyle = 'glass border-white/5 hover:border-white/20 hover:bg-white/[0.08] shadow-xl';
                      if (isSelected) {
                        if (answerResult.isCorrect === true) buttonStyle = 'bg-green-600 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)] scale-[1.05] z-10';
                        else if (answerResult.isCorrect === false) buttonStyle = 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-shake z-10';
                        else buttonStyle = 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]';
                      } else if (answerResult.correctAnswer !== null) {
                        if (isCorrectAnswer) buttonStyle = 'bg-green-600/20 border-green-500/40 text-green-400 scale-[1.02]';
                        else buttonStyle = 'glass border-white/5 opacity-20 grayscale scale-95';
                      }

                      return (
                        <button
                          key={option}
                          disabled={selectedOption !== null || players.find(p => p.id === socket?.id)?.isFrozen}
                          onClick={() => handleSelect(option)}
                          className={`
                            group relative px-6 py-4 rounded-2xl text-2xl font-black transition-all border-2 text-left overflow-hidden h-24
                            ${buttonStyle}
                            ${selectedOption === null && !players.find(p => p.id === socket?.id)?.isFrozen ? 'hover:scale-[1.01] active:scale-[0.98]' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between relative z-10">
                            <span>{option}</span>
                            <div className="flex items-center gap-3">
                              {isSelected && answerResult.isCorrect === null && (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                              )}
                              {isSelected && answerResult.isCorrect === true && <CheckCircle2 className="w-8 h-8 text-white animate-in zoom-in spin-in-90 duration-500" />}
                              {isSelected && answerResult.isCorrect === false && <XCircle className="w-8 h-8 text-white animate-in zoom-in duration-500" />}
                              {!isSelected && isCorrectAnswer && <CheckCircle2 className="w-6 h-6 text-green-400/50 animate-in fade-in zoom-in duration-500" />}
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Power-Ups Inventory */}
                  {players.find(p => p.id === socket?.id)?.powerUps && (players.find(p => p.id === socket?.id)?.powerUps?.length ?? 0) > 0 && (
                    <div className="mt-8 flex items-center justify-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mr-2">{t('arena.powerups')}</span>
                      {players.find(p => p.id === socket?.id)?.powerUps?.map((pu, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUsePowerUp(pu)}
                          className={`group relative p-4 rounded-2xl border transition-all active:scale-[0.9] hover:scale-110 ${
                            pu === 'shield' ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                          }`}
                        >
                          {pu === 'shield' ? <ShieldCheck className="w-5 h-5 text-yellow-400" /> : <Zap className="w-5 h-5 text-blue-400 fill-current" />}
                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedOption !== null && !players.find(p => p.id === socket?.id)?.isEliminated && (
              <div className="mt-16 flex items-center justify-center gap-6 animate-in slide-in-from-bottom-8">
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-blue-500 origin-left animate-loading-bar"></div>
                </div>
                <div className="text-slate-400 font-bold tracking-tight text-lg">
                  {t('arena.waiting_others')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Toast 
        show={showCopyMessage} 
        msg={t('arena.copy_success')} 
        type="info" 
        title={t('arena.room_code')}
      />

      {/* Rematch Request Overlay */}
      {rematchRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-md w-full glass rounded-[40px] p-10 text-center shadow-[0_0_80px_rgba(59,130,246,0.3)] border-white/10 animate-in zoom-in-95 duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full animate-pulse"></div>
              <Play className="w-16 h-16 text-blue-400 mx-auto relative z-10 animate-bounce" />
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tighter">{t('arena.rematch_requested')}</h2>
            <p className="text-slate-400 font-medium mb-8">
              <span className="text-white font-black">{rematchRequest?.ownerUsername}</span> {t('arena.wants_to_play_again')}
            </p>

            {/* Countdown Circle */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle
                  cx="48" cy="48" r="44"
                  className="stroke-white/5 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="48" cy="48" r="44"
                  className="stroke-blue-500 fill-none transition-all duration-1000"
                  strokeWidth="8"
                  strokeDasharray="276"
                  strokeDashoffset={276 - (276 * (rematchTimeLeft || 0)) / 30}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black italic">
                {rematchTimeLeft}
              </div>
            </div>

            {rematchStatus && (
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-black text-green-400">{rematchStatus?.acceptedCount || 0}</div>
                  <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">{t('arena.accepted')}</div>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-red-400">{rematchStatus?.rejectedCount || 0}</div>
                  <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">{t('arena.rejected')}</div>
                </div>
              </div>
            )}

            {!hasRespondedToRematch ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleAcceptRematch}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.95]"
                >
                  {t('arena.accept')}
                </button>
                <button
                  onClick={handleRejectRematch}
                  className="bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-3xl border border-white/10 transition-all active:scale-[0.95]"
                >
                  {t('arena.reject')}
                </button>
              </div>
            ) : (
              <div className="py-5 px-8 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                {t('arena.waiting_others')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`fixed top-0 right-0 w-full sm:w-[400px] h-full bg-[#020617]/95 backdrop-blur-3xl z-[100] border-l border-white/10 transition-transform duration-500 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <MessagesSquare className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest">Lobby Chat</h3>
            </div>
            <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
                <XCircle className="w-5 h-5" />
            </button>
         </div>
         <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                    <MessagesSquare className="w-12 h-12 mb-4" />
                    <p className="text-sm font-medium">No messages yet. Say hello to the arena!</p>
                </div>
            ) : (
                messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === user?.username ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{msg.sender}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] break-words ${msg.sender === user?.username ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))
            )}
         </div>
         <form onSubmit={handleSendChat} className="p-6 border-t border-white/10 bg-white/[0.02]">
            <div className="relative group">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full h-14 pl-6 pr-14 bg-white/[0.03] border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
                <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Send className="w-4 h-4" />
                </button>
            </div>
         </form>
      </div>

      <Toast show={!!notifications.length} msg={notifications[notifications.length - 1]?.msg || ''} type="success" />
    </div>
  );
}
