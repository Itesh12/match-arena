import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { API_URL } from '@/config';

interface Player {
  id: string;
  userId?: string;
  username: string;
  score: number;
  isOwner?: boolean;
  hasLeft?: boolean;
  isEliminated?: boolean;
  rankPoints?: number;
  team?: 'red' | 'blue' | null;
  powerUps?: string[];
  isFrozen?: boolean;
  hasShield?: boolean;
}

interface Question {
  index: number;
  question: string;
  options: number[];
  correctAnswer?: number;
}

interface UserInfo {
  id: string;
  _id?: string;
  username: string;
  role: 'user' | 'admin';
  score?: number;
  totalGames?: number;
  wins?: number;
  rankPoints?: number;
  coins?: number;
  currentStreak?: number;
  inventory?: string[];
}

interface GameState {
  players: Player[];
  currentQuestion: Question | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
  leaderboard: Player[];
  user: UserInfo | null;
  token: string | null;
  roomId: string;
  winner: Player | null;
  ownerId: string;
  ownerSocketId: string;
  finalQuestions: Question[];
  countdown: number | null;
  roomSettings: {
    questionsCount: number;
    timePerQuestion: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  toast: {
    show: boolean;
    msg: string;
    type: 'success' | 'error' | 'info' | 'achievement';
    title?: string;
  } | null;
  isHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  setRoomSettings: (settings: { questionsCount: number, timePerQuestion: number, difficulty: 'easy' | 'medium' | 'hard' }) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentQuestion: (q: Question | null) => void;
  setGameStatus: (status: 'waiting' | 'playing' | 'finished') => void;
  setLeaderboard: (leaderboard: Player[]) => void;
  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
  setRoomId: (roomId: string) => void;
  setWinner: (winner: Player | null) => void;
  setOwnerId: (ownerId: string) => void;
  setOwnerSocketId: (ownerSocketId: string) => void;
  setFinalQuestions: (questions: Question[]) => void;
  setCountdown: (countdown: number | null) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'achievement', title?: string) => void;
  hideToast: () => void;
  reset: () => void;
  logout: () => void;
  fetchStats: () => Promise<void>;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      players: [],
      currentQuestion: null,
      gameStatus: 'waiting',
      leaderboard: [],
      user: null,
      token: null,
      roomId: '',
      winner: null,
      ownerId: '',
      ownerSocketId: '',
      finalQuestions: [],
      countdown: null,
      roomSettings: {
        questionsCount: 10,
        timePerQuestion: 60,
        difficulty: 'medium'
      },
      toast: null,
      isHydrated: false,
      setHasHydrated: (state) => set({ isHydrated: state }),

      setPlayers: (players) => set({ players }),
      setCurrentQuestion: (q) => set({ currentQuestion: q }),
      setGameStatus: (status) => set({ gameStatus: status }),
      setLeaderboard: (leaderboard) => set({ leaderboard }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setRoomId: (roomId) => set({ roomId }),
      setWinner: (winner) => set({ winner }),
      setOwnerId: (ownerId) => set({ ownerId }),
      setOwnerSocketId: (ownerSocketId) => set({ ownerSocketId }),
      setFinalQuestions: (questions) => set({ finalQuestions: questions }),
      setCountdown: (countdown) => set({ countdown }),
      setRoomSettings: (roomSettings) => set({ roomSettings }),
      
      showToast: (msg, type = 'info', title) => {
        set({ toast: { show: true, msg, type, title } });
        setTimeout(() => {
          set((state) => (state.toast?.msg === msg ? { toast: null } : state));
        }, 5000);
      },
      hideToast: () => set({ toast: null }),

      reset: () => set({
        players: [],
        currentQuestion: null,
        gameStatus: 'waiting',
        leaderboard: [],
        winner: null,
        roomId: '',
        ownerId: '',
        ownerSocketId: '',
        finalQuestions: [],
        countdown: null,
        roomSettings: {
          questionsCount: 10,
          timePerQuestion: 60,
          difficulty: 'medium'
        },
        toast: null,
      }),
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, roomId: '', players: [], currentQuestion: null, gameStatus: 'waiting', toast: null });
      },
      fetchStats: async () => {
        const { token, setUser } = useGameStore.getState();
        if (!token) return;

        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser({
              id: data._id,
              username: data.username,
              role: data.role,
              score: data.score,
              totalGames: data.totalGames,
              wins: data.wins,
              rankPoints: data.rankPoints,
              coins: data.coins,
              currentStreak: data.currentStreak,
              inventory: data.inventory
            });
          }
        } catch (err) {
          console.error('Failed to fetch stats:', err);
        }
      }
    }),
    {
      name: 'math-arena-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        roomId: state.roomId 
      }),
      onRehydrateStorage: (state) => {
        return () => {
          state.setHasHydrated(true);
        };
      },
    }
  )
);
