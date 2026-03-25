'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
    setWinner 
  } = useGameStore();

  useEffect(() => {
    // Use environment variable for backend connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '${process.env.NEXT_PUBLIC_API_URL}');
    socketRef.current = socket;

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
    };
  }, [setPlayers, setCurrentQuestion, setGameStatus, setLeaderboard, setWinner]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};
