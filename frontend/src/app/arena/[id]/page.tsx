'use client';

import { useSocket } from '@/context/SocketContext';
import { useGameStore } from '@/store/useGameStore';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Timer, User, Users, CheckCircle2, XCircle, Play, Shield, LogOut, Skull, ShieldCheck, Zap, Globe, Info } from 'lucide-react';
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
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean | null, correctAnswer: number | null }>({ isCorrect: null, correctAnswer: null });
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'standard' | 'sudden_death' | 'double_jeopardy' | 'team_battle'>('standard');
  const [notifications, setNotifications] = useState<{ id: string, msg: string }[]>([]);
  const [rematchRequest, setRematchRequest] = useState<{ ownerUsername: string; timeout: number } | null>(null);
  const [rematchTimeLeft, setRematchTimeLeft] = useState<number>(30);
  const [rematchStatus, setRematchStatus] = useState<{ acceptedCount: number; rejectedCount: number; totalPlayers: number } | null>(null);
  const [hasRespondedToRematch, setHasRespondedToRematch] = useState(false);
  const [rematchReason, setRematchReason] = useState<string | null>(null);
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (!socket || !user) return;

    const join = () => {
      socket.emit('join_arena', {
        username: user.username,
        userId: user.id || (user as any)._id,
        roomId: (id as string).toUpperCase()
      });
    };

    if (socket.connected) {
      join();
    }

    socket.on('connect', join);

    socket.on('player_joined', (data) => setPlayers(data));
    socket.on('room_update', (data) => {
      if (data.ownerId) setOwnerId(data.ownerId);
      if (data.ownerSocketId) setOwnerSocketId(data.ownerSocketId);
    });
    socket.on('countdown_update', (count) => setCountdown(count));
    socket.on('game_start', (data) => {
      setGameStatus('playing');
      setCountdown(null);
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

    socket.on('rematch_started', () => {
      setFinalQuestions([]);
      setIsReviewing(false);
    });

    return () => {
      socket.off('connect', join);
      socket.off('player_joined');
      socket.off('room_update');
      socket.off('countdown_update');
      socket.off('game_start');
      socket.off('new_question');
      socket.off('leaderboard_update');
      socket.off('game_end');
      socket.off('player_left_game');
      socket.off('arena_terminated');
      socket.off('answer_result');
      socket.off('rematch_requested');
      socket.off('rematch_status_update');
      socket.off('rematch_started');
      socket.off('rematch_failed');
      // On refresh, we don't want to leave if we are just re-mounting with the same session
      // But the socket ID will change anyway.
      socket.emit('leave_game', id);
    };
  }, [socket, id, user, initialized, players.length, setPlayers, setGameStatus, setCurrentQuestion, setLeaderboard, setWinner, setOwnerId, setOwnerSocketId, setCountdown, setFinalQuestions]);

  useEffect(() => {
    if (!rematchRequest || rematchTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setRematchTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rematchRequest, rematchTimeLeft]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      setTimeLeft(60);
      setSelectedOption(null);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStatus, currentQuestion]);

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
      <div className="relative z-20 w-full lg:w-[320px] bg-slate-950/60 backdrop-blur-3xl border-r border-white/10 flex flex-col h-full lg:min-h-screen shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
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

        {/* Sidebar Footer Branding */}
        <div className="p-8 border-t border-white/5 flex items-center justify-center gap-3 opacity-20 hover:opacity-100 transition-opacity duration-700 cursor-default">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg transform -rotate-12 group">
            <span className="text-black font-black text-sm group-hover:rotate-12 transition-transform duration-500">M</span>
          </div>
          <div>
            <div className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{t('arena.math_arena')}</div>
            <div className="text-[6px] font-bold text-white/50 uppercase tracking-tighter mt-1">{t('arena.premium_engine')}</div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative z-10 flex-1 p-6 lg:p-12 flex flex-col h-full lg:min-h-screen">
        {gameStatus === 'waiting' ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                    <Users className="w-7 h-7 text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    {t('arena.players')}
                    <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black rounded-full">
                      {players.length}
                    </span>
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                    {t('arena.waiting_for_players')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white/[0.03] rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <select 
                    value={i18n.language} 
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white/80 focus:outline-none cursor-pointer appearance-none hover:text-white transition-colors"
                  >
                    <option value="en" className="bg-[#020617]">English</option>
                    <option value="hi" className="bg-[#020617]">हिंदी</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowExitModal(true)}
                  className="group w-12 h-12 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-500 transition-all duration-300 active:scale-[0.9]"
                >
                  <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Left Column: Game Status & Modes */}
              <div className="xl:col-span-4 space-y-6">
                <div className="relative group/main">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[40px] blur-2xl opacity-50 group-hover/main:opacity-100 transition-opacity duration-1000"></div>
                  <div className="relative glass rounded-[40px] p-10 border border-white/10 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <div className="text-9xl italic font-serif leading-none">∑</div>
                    </div>

                    {countdown !== null ? (
                      <div className="text-center py-10">
                         <div className="relative w-32 h-32 mx-auto mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-25"></div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-[0_0_50px_rgba(37,99,235,0.4)] flex items-center justify-center border-4 border-white/10">
                              <span className="text-6xl font-black italic">{countdown}</span>
                            </div>
                         </div>
                         <h2 className="text-3xl font-black tracking-tighter text-blue-400 animate-pulse uppercase leading-none">{t('arena.get_ready')}</h2>
                      </div>
                    ) : (
                      <>
                        <div className="mb-10 lg:text-left text-center">
                          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                            Lobby Protocol v1.4
                          </span>
                          <h2 className="text-5xl font-black mb-4 tracking-tighter text-white leading-[0.9]">{t('arena.math_arena')}</h2>
                          <p className="text-slate-400 font-medium text-sm leading-relaxed">{t('arena.share_code_message')}</p>
                        </div>

                        {socket?.id === ownerSocketId && (
                          <div className="space-y-4 mb-10 text-left">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 inline-flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              {t('arena.select_gameplay_mode')}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                              {[
                                { id: 'standard', name: t('arena.mode_standard'), desc: t('arena.mode_standard_desc') },
                                { id: 'sudden_death', name: t('arena.mode_sudden_death'), desc: t('arena.mode_sudden_death_desc') },
                                { id: 'double_jeopardy', name: t('arena.mode_double_jeopardy'), desc: t('arena.mode_double_jeopardy_desc') },
                                { id: 'team_battle', name: t('arena.mode_team_battle'), desc: t('arena.mode_team_battle_desc') }
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => setSelectedMode(m.id as any)}
                                  className={`p-4 rounded-2xl border transition-all duration-300 group/mode text-left ${selectedMode === m.id ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20' : 'bg-white/[0.03] border-white/10 hover:border-white/20'}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`font-black text-xs uppercase tracking-wider ${selectedMode === m.id ? 'text-white' : 'text-slate-300 group-hover/mode:text-white'}`}>{m.name}</span>
                                    {selectedMode === m.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                                  </div>
                                  <p className={`text-[10px] font-medium leading-tight ${selectedMode === m.id ? 'text-blue-100' : 'text-slate-500'}`}>{m.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {socket?.id === ownerSocketId ? (
                            <>
                              <button
                                disabled={players.length < 2}
                                onClick={handleStart}
                                className={`group relative w-full h-[72px] font-black rounded-3xl shadow-2xl transition-all duration-500 flex items-center justify-center gap-4 overflow-hidden
                                  ${players.length < 2
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-white/5 opacity-50'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'}`}
                              >
                                {players.length >= 2 && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
                                <Play className={`w-5 h-5 ${players.length < 2 ? 'opacity-20 text-slate-400' : 'fill-current text-black'}`} />
                                <span className="relative z-10 text-lg tracking-tight uppercase">
                                  {players.length < 2 ? t('arena.need_players') : t('arena.start_game')}
                                </span>
                              </button>
                              {players.length < 2 && (
                                <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest animate-pulse text-center">
                                  {t('arena.min_players_required')}
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="h-[72px] flex items-center justify-center rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold tracking-widest animate-pulse uppercase text-sm px-6 text-center leading-tight">
                              {t('arena.waiting_for_owner')}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 relative group/code cursor-pointer active:scale-[0.98] transition-all hover:bg-slate-800 duration-500 shadow-2xl"
                  onClick={() => {
                    navigator.clipboard.writeText(id as string);
                    setShowCopyMessage(true);
                    setTimeout(() => setShowCopyMessage(false), 2000);
                  }}>
                  <div className="absolute top-4 right-6 flex items-center gap-2">
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">{t('arena.secret_code')}</span>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-4xl font-black font-mono tracking-[0.25em] text-white flex items-center justify-center py-4 bg-black/20 rounded-2xl border border-white/5 my-4">
                    {id}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-500 group-hover/code:text-white transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">{t('arena.click_to_copy')}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Player Grid */}
              <div className="xl:col-span-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {players.map((p, idx) => (
                    <div key={p.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className={`relative group/p aspect-square rounded-[32px] border transition-all duration-500 flex flex-col items-center justify-center p-6 gap-4 ${
                        p.username === user?.username 
                          ? 'bg-blue-600/10 border-blue-500/40 shadow-xl shadow-blue-500/5' 
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}>
                        <div className="relative">
                           <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black transition-all duration-500 ${
                             p.username === user?.username ? 'bg-blue-600 text-white rotate-3 group-hover/p:-rotate-3' : 'bg-slate-800 text-slate-400 group-hover/p:bg-slate-700'
                           }`}>
                             {p.username[0].toUpperCase()}
                           </div>
                           <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-4 border-slate-900 flex items-center justify-center ${
                             p.id === ownerSocketId ? 'bg-yellow-400' : 'bg-green-500'
                           }`}>
                             {p.id === ownerSocketId ? <Shield className="w-3 h-3 text-black" /> : <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                           </div>
                        </div>
                        <div className="text-center">
                          <h4 className="font-black text-sm tracking-tight text-white/90 mb-1">{p.username}</h4>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${p.id === ownerSocketId ? 'text-yellow-500' : 'text-blue-400'}`}>
                            {p.id === ownerSocketId ? t('arena.host') : (p.username === user?.username ? t('arena.you') : t('arena.ready'))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-[32px] border border-dashed border-white/5 flex flex-col items-center justify-center opacity-30">
                       <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                          <Users className="w-5 h-5 text-white/20" />
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-8">
                <div className={`glass px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl transition-all duration-300 ${timeLeft < 10 ? 'border-red-500/50 bg-red-500/5 animate-pulse-red' : 'border-white/5'}`}>
                  <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                  <Timer className={`w-6 h-6 transition-colors ${timeLeft < 10 ? 'text-red-500 animate-shake' : 'text-blue-400'}`} />
                  <span className={`font-mono text-3xl font-black tracking-tighter tabular-nums transition-colors ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}<span className={`text-lg ml-1 ${timeLeft < 10 ? 'text-red-500/50' : 'text-slate-400'}`}>s</span></span>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">{t('arena.total_progress')}</div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === (currentQuestion?.index ?? 0) ? 'w-6 bg-blue-500' : i < (currentQuestion?.index ?? 0) ? 'w-2 bg-blue-500/40' : 'w-2 bg-white/5'}`}></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black tracking-tighter text-white">
                  <span className="text-blue-500">Q</span>{(currentQuestion?.index ?? 0) + 1} <span className="text-slate-400 text-lg">/ 10</span>
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
              <span className="text-white font-black">{rematchRequest.ownerUsername}</span> {t('arena.wants_to_play_again')}
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
                  strokeDashoffset={276 - (276 * rematchTimeLeft) / 30}
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
                  <div className="text-2xl font-black text-green-400">{rematchStatus.acceptedCount}</div>
                  <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">{t('arena.accepted')}</div>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-red-400">{rematchStatus.rejectedCount}</div>
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
    </div>
  );
}
