"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Timer, 
  Target, 
  ChevronLeft, 
  Play, 
  RotateCcw, 
  Home, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap,
  BrainCircuit,
  Settings2,
  Coins,
  Shield
} from 'lucide-react';
import axios from 'axios';
import { useGameStore } from '@/store/useGameStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  question: string;
  options: number[];
  answer: number;
}

export default function PracticePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token, user, fetchStats, showToast } = useGameStore();

  // Settings State
  const [gameState, setGameState] = useState<'settings' | 'loading' | 'playing' | 'results'>('settings');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [mode, setMode] = useState<'practice' | 'daily'>('practice');
  const [dailyStatus, setDailyStatus] = useState<{ hasParticipated: boolean, participantCount: number } | null>(null);

  // Gameplay State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [reward, setReward] = useState<{ coins: number, rp: number } | null>(null);
  const [results, setResults] = useState<{ isCorrect: boolean | null; correctAnswer: number | null }>({
    isCorrect: null,
    correctAnswer: null,
  });

  // Check daily status on mount
  useEffect(() => {
    const checkDaily = async () => {
        try {
            const res = await axios.get(`${API_URL}/practice/daily`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setDailyStatus({
                    hasParticipated: res.data.hasParticipated,
                    participantCount: res.data.challenge.participantCount
                });
            }
        } catch (e) {
            console.error('Daily check failed', e);
        }
    };
    if (token) checkDaily();
  }, [token]);

  const startSession = async () => {
    setGameState('loading');
    try {
      let response;
      if (mode === 'daily') {
        response = await axios.get(`${API_URL}/practice/daily`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
            setQuestions(response.data.challenge.questions);
        }
      } else {
        response = await axios.get(`${API_URL}/practice/questions`, {
            params: { count: questionCount, difficulty },
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
            setQuestions(response.data.questions);
        }
      }
      
      if (response.data.success) {
        setCurrentIndex(0);
        setScore(0);
        setGameState('playing');
        setStartTime(Date.now());
        setTimeLeft(mode === 'daily' ? 30 : getDifficultyTime(difficulty));
        setReward(null);
      }
    } catch (error) {
      console.error('Failed to fetch practice questions:', error);
      alert(t('practice.no_questions'));
      setGameState('settings');
    }
  };

  const getDifficultyTime = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return 45;
      case 'medium': return 30;
      case 'hard': return 15;
      default: return 30;
    }
  };

  const handleAnswer = (option: number) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(option);
    const currentQ = questions[currentIndex];
    const isCorrect = option === currentQ.answer;
    
    setResults({
      isCorrect,
      correctAnswer: currentQ.answer
    });

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setResults({ isCorrect: null, correctAnswer: null });
        setTimeLeft(getDifficultyTime(difficulty));
      } else {
        setEndTime(Date.now());
        setGameState('results');
        if (mode === 'daily') {
            submitDailyResults(score + (isCorrect ? 1 : 0));
        }
      }
    }, 1500);
  };

  const submitDailyResults = async (finalScore: number) => {
    try {
        const res = await axios.post(`${API_URL}/practice/daily/submit`, {
            score: finalScore,
            timeSpent: Date.now() - startTime
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
            fetchStats();
            if (res.data.unlocked && res.data.unlocked.length > 0) {
              res.data.unlocked.forEach((a: any) => {
                showToast(a.name, 'achievement', 'New Achievement Unlocked!');
              });
            }
        }
    } catch (e) {
        console.error('Daily submission failed', e);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && selectedOption === null) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && selectedOption === null) {
      handleAnswer(-1); // Time out
    }
  }, [gameState, timeLeft, selectedOption]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <BrainCircuit className="absolute inset-0 m-auto w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-subtitle text-white uppercase animate-pulse tracking-widest">
            {t('practice.loading_questions')}
        </h2>
      </div>
    );
  }

  if (gameState === 'results') {
    const timeSpent = endTime - startTime;
    const accuracy = Math.round((score / questions.length) * 100);

    return (
      <div className="min-h-screen bg-[#020617] p-6 lg:p-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="glass rounded-[48px] p-12 border border-white/10 text-center relative overflow-hidden">
             <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>

             <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-8 animate-bounce" />
             <h2 className="text-title mb-2 uppercase text-white">{mode === 'daily' ? 'Daily Challenge' : t('practice.session_complete')}</h2>
             <p className="text-slate-400 text-base-content mb-12">{t('practice.subtitle')}</p>

             {reward && (
                <div className="flex gap-4 justify-center mb-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-yellow-500/20 border border-yellow-500/30 px-6 py-3 rounded-2xl flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="text-xl font-black text-yellow-500">+{reward.coins}</span>
                    </div>
                    <div className="bg-blue-500/20 border border-blue-500/30 px-6 py-3 rounded-2xl flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <span className="text-xl font-black text-blue-400">+{reward.rp} RP</span>
                    </div>
                </div>
             )}

             <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="glass p-8 rounded-3xl border-white/5 bg-white/[0.02]">
                    <div className="text-4xl font-black text-white mb-2">{score}/{questions.length}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('practice.correct_answers')}</div>
                </div>
                <div className="glass p-8 rounded-3xl border-white/5 bg-white/[0.02]">
                    <div className="text-4xl font-black text-blue-400 mb-2">{accuracy}%</div>
                    <div className="text-micro text-slate-500">{t('practice.accuracy')}</div>
                </div>
                <div className="glass p-8 rounded-3xl border-white/5 bg-white/[0.02] col-span-2">
                    <div className="flex items-center justify-center gap-4">
                        <Clock className="w-8 h-8 text-indigo-400" />
                        <div className="text-4xl font-black text-white">{formatTime(timeSpent)}</div>
                    </div>
                    <div className="text-micro text-slate-500 mt-2">{t('practice.time_spent')}</div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setGameState('settings')}
                  className="flex-1 h-16 bg-white text-black rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <RotateCcw className="w-5 h-5" />
                    {t('practice.practice_again')}
                </button>
                <button 
                  onClick={() => router.push('/')}
                  className="flex-1 h-16 glass border-white/10 text-white rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-3 hover:bg-white/5 transition-all"
                >
                    <Home className="w-5 h-5" />
                    {t('practice.back_to_dashboard')}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    const currentQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-[#020617] flex flex-col">
         {/* Practice Header */}
         <header className="p-6 lg:p-12 flex items-center justify-between max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-8">
                <div className={`glass px-6 py-3 rounded-2xl flex items-center gap-4 transition-all ${timeLeft < 5 ? 'border-red-500/50 bg-red-500/5 animate-pulse' : 'border-white/5'}`}>
                    <Timer className={`w-6 h-6 ${timeLeft < 5 ? 'text-red-500' : 'text-blue-400'}`} />
                    <span className={`text-3xl font-black tabular-nums ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
                </div>
                <div>
                   <div className="text-micro text-slate-500 mb-1">{t('arena.total_progress')}</div>
                   <div className="flex gap-1.5">
                        {questions.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 bg-blue-500' : i < currentIndex ? 'w-2 bg-blue-500/40' : 'w-2 bg-white/5'}`}></div>
                        ))}
                   </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-3xl font-black text-white">
                    <span className="text-blue-500">Q</span>{currentIndex + 1} <span className="text-slate-400 text-lg">/ {questions.length}</span>
                </div>
                <div className="text-micro text-slate-500">{t('practice.title')}</div>
            </div>
         </header>

         {/* Question Area */}
         <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
            <div className={`glass w-full rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 mb-6 sm:mb-12 text-center border-white/5 relative overflow-hidden ${timeLeft < 5 && selectedOption === null ? 'animate-shake border-red-500/30' : ''}`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20"></div>
                <h2 className="text-hero mb-4 drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]">{currentQ.question}</h2>
                <div className="text-micro text-blue-400/40 uppercase tracking-widest font-black">
                    {t('arena.realtime')} • {difficulty.toUpperCase()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {currentQ.options.map((option) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = results.correctAnswer === option;
                    const isChosenWrong = isSelected && results.isCorrect === false;

                    let style = "glass border-white/5 hover:bg-white/[0.05] hover:border-white/20";
                    if (isSelected) {
                        if (results.isCorrect === true) style = "bg-green-600 border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.4)] scale-[1.02]";
                        else if (results.isCorrect === false) style = "bg-red-600 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-shake";
                        else style = "bg-blue-600 border-blue-400";
                    } else if (results.correctAnswer !== null) {
                        if (isCorrect) style = "bg-green-600/20 border-green-500/40 text-green-400";
                        else style = "opacity-20 grayscale scale-95";
                    }

                    return (
                        <button
                            key={option}
                            disabled={selectedOption !== null}
                            onClick={() => handleAnswer(option)}
                            className={`h-20 sm:h-28 rounded-2xl sm:rounded-[2rem] border-2 text-subtitle flex items-center justify-center relative overflow-hidden ${style}`}
                        >
                            <span className="relative z-10">{option}</span>
                            {isSelected && results.isCorrect === true && <CheckCircle2 className="absolute right-4 sm:right-8 w-6 h-6 sm:w-10 sm:h-10 text-white animate-in zoom-in" />}
                            {isSelected && results.isCorrect === false && <XCircle className="absolute right-4 sm:right-8 w-6 h-6 sm:w-10 sm:h-10 text-white animate-in zoom-in" />}
                        </button>
                    );
                })}
            </div>
         </main>
      </div>
    );
  }

  // Settings View
  return (
    <div className="min-h-screen bg-[#020617] p-6 lg:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none hidden sm:block">
            <div className="text-[200px] italic font-serif leading-none">?</div>
        </div>

        <button 
          onClick={() => router.push('/')}
          className="absolute -top-16 left-0 text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-caption uppercase group"
        >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('common.back')}
        </button>

        <div className="glass rounded-[48px] p-12 border border-white/10 shadow-3xl text-center relative overflow-hidden">
            <div className="mb-12">
                <div className="flex justify-center gap-4 mb-8">
                    <button 
                        onClick={() => setMode('practice')}
                        className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${mode === 'practice' ? 'bg-blue-600 border-blue-400 text-white' : 'glass border-white/5 text-slate-500'}`}
                    >
                        {t('practice.title')}
                    </button>
                    <button 
                        onClick={() => setMode('daily')}
                        className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 transition-all ${mode === 'daily' ? 'bg-indigo-600 border-indigo-400 text-white' : 'glass border-white/5 text-slate-500'}`}
                    >
                        Daily Challenge
                    </button>
                </div>

                <h2 className="text-title mb-6 text-white uppercase">
                    {mode === 'daily' ? 'Daily Challenge' : t('practice.title')}
                </h2>
                <p className="text-slate-400 text-base-content max-w-sm mx-auto">
                    {mode === 'daily' ? 'Complete today\' challenge for bonus rewards!' : t('practice.subtitle')}
                </p>
                {mode === 'daily' && dailyStatus?.hasParticipated && (
                    <div className="mt-4 text-micro text-green-400 bg-green-500/10 border border-green-500/20 py-2 px-4 rounded-full inline-block">
                        Completed Today
                    </div>
                )}
            </div>

            {mode === 'practice' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
                    {/* Difficulty Selector */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                            <Target className="w-4 h-4" />
                            <span className="text-micro text-slate-500">{t('practice.difficulty_select')}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-3xl border-2 font-black uppercase tracking-tight flex items-center justify-between transition-all ${
                                        difficulty === d 
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20 scale-[1.02]' 
                                        : 'glass border-white/5 text-slate-400 hover:border-white/10'
                                    }`}
                                >
                                    <span className="text-base sm:text-lg">{t(`practice.difficulty_${d}`)}</span>
                                    {difficulty === d && <Zap className="w-5 h-5 fill-current" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Count Selector */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                            <Settings2 className="w-4 h-4" />
                            <span className="text-micro text-slate-500">{t('practice.questions_select')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[5, 10, 15, 20].map(count => (
                                <button
                                    key={count}
                                    onClick={() => setQuestionCount(count)}
                                    className={`h-12 sm:h-16 rounded-2xl sm:rounded-3xl border-2 font-black text-xl sm:text-2xl transition-all ${
                                        questionCount === count 
                                        ? 'bg-white border-white text-black scale-[1.05] shadow-2xl' 
                                        : 'glass border-white/5 text-slate-500 hover:border-white/10'
                                    }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10 mt-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                                <BrainCircuit className="w-12 h-12" />
                            </div>
                            <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">{t('dashboard.rp')} Bonus</div>
                            <div className="text-xl font-black text-white">+{(difficulty === 'hard' ? 50 : difficulty === 'medium' ? 25 : 10) * (questionCount / 5)} {t('dashboard.rp')}</div>
                            <p className="text-[8px] font-medium text-slate-500 mt-1 uppercase italic">Earn RP while you train</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-12 grid grid-cols-3 gap-6">
                    <div className="glass p-8 rounded-3xl border-white/5">
                        <div className="text-3xl font-black text-white mb-1">10</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Questions</div>
                    </div>
                    <div className="glass p-8 rounded-3xl border-white/5">
                        <div className="text-3xl font-black text-blue-400 mb-1">Mixed</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Difficulty</div>
                    </div>
                    <div className="glass p-8 rounded-3xl border-white/5">
                        <div className="text-3xl font-black text-indigo-400 mb-1">{dailyStatus?.participantCount || 0}</div>
                        <div className="text-nano text-slate-500 uppercase">{t('practice.participants')}</div>
                    </div>
                    {dailyStatus?.hasParticipated ? (
                        <div className="col-span-3 p-12 glass border-green-500/20 bg-green-500/5 rounded-[40px] text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-black text-white uppercase mb-2">Already Conquered</h3>
                            <p className="text-slate-400 text-sm">You have already completed today's challenge. Come back tomorrow for a new set of problems!</p>
                        </div>
                    ) : (
                        <div className="col-span-3 p-8 glass border-blue-500/20 bg-blue-600/5 rounded-[40px] flex items-center justify-between">
                            <div className="text-left">
                                <div className="text-2xl font-black text-white uppercase mb-1">Ready to start?</div>
                                <div className="text-nano text-slate-400">{t('practice.daily_reward_desc')}</div>
                            </div>
                            <BrainCircuit className="w-12 h-12 text-blue-500 opacity-20" />
                        </div>
                    )}
                </div>
            )}

            <button 
                onClick={startSession}
                disabled={mode === 'daily' && dailyStatus?.hasParticipated}
                className={`w-full h-20 bg-white text-black rounded-[2.5rem] font-black text-xl uppercase flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl group ${mode === 'daily' && dailyStatus?.hasParticipated ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
                <Play className="w-6 h-6 fill-current group-hover:translate-x-1 transition-transform" />
                {mode === 'daily' ? 'Begin Daily Challenge' : t('practice.start_practice')}
            </button>
        </div>
      </div>
    </div>
  );
}
