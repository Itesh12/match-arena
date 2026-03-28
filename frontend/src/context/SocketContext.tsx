'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useGameStore } from '../store/useGameStore';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const { 
    setPlayers, 
    setCurrentQuestion, 
    setGameStatus, 
    setLeaderboard, 
    setWinner,
    token,
    showToast
  } = useGameStore();

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket.io connection error:', err.message);
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('player_joined', (players) => {
      setPlayers(players);
    });

    newSocket.on('game_start', () => {
      setGameStatus('playing');
    });

    newSocket.on('new_question', (question) => {
      setCurrentQuestion(question);
    });

    newSocket.on('leaderboard_update', (leaderboard) => {
      setLeaderboard(leaderboard);
    });

    newSocket.on('game_end', (data) => {
      setGameStatus('finished');
      setWinner(data.winner);
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('achievement_unlocked', (unlocked) => {
      unlocked.forEach((a: any) => {
        showToast(a.name, 'achievement', 'New Achievement Unlocked!');
      });
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [setPlayers, setCurrentQuestion, setGameStatus, setLeaderboard, setWinner, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
