'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useGameStore } from '../store/useGameStore';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const { 
    setPlayers, 
    setCurrentQuestion, 
    setGameStatus, 
    setLeaderboard, 
    setWinner,
    token
  } = useGameStore();

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Use centralized configuration
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Fallback for some environments
      reconnection: true,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;
    
    socket.on('connect_error', (err) => {
      console.error('Socket.io connection error:', err.message);
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('player_joined', (players) => {
      setPlayers(players);
    });

    socket.on('game_start', () => {
      setGameStatus('playing');
    });

    socket.on('new_question', (question) => {
      setCurrentQuestion(question);
    });

    socket.on('leaderboard_update', (leaderboard) => {
      setLeaderboard(leaderboard);
    });

    socket.on('game_end', (data) => {
      setGameStatus('finished');
      setWinner(data.winner);
      setLeaderboard(data.leaderboard);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setPlayers, setCurrentQuestion, setGameStatus, setLeaderboard, setWinner, token]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
