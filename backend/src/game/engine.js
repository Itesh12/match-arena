const { generateQuestion } = require('./questions');
const User = require('../models/User');
const Room = require('../models/Room');
const Match = require('../models/Match');

class GameEngine {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> roomState
    this.initialize();
  }

  async initialize() {
    try {
      const activeRooms = await Room.find({ status: { $ne: 'finished' } });
      activeRooms.forEach(room => {
        // Convert Map from MongoDB back to nested objects if necessary
        const playersMap = new Map();
        if (room.players instanceof Map) {
          room.players.forEach((val, key) => playersMap.set(key, val));
        } else {
          Object.entries(room.players || {}).forEach(([key, val]) => playersMap.set(key, val));
        }

        this.rooms.set(room.roomId, {
          id: room.roomId,
          status: room.status,
          players: playersMap,
          questions: room.questions,
          currentQuestionIndex: room.currentQuestionIndex,
          mode: room.mode || 'standard',
          ownerId: room.ownerId,
          ownerSocketId: room.ownerSocketId,
          countdown: null,
        });
      });
      console.log(`Loaded ${activeRooms.length} active rooms from MongoDB`);
    } catch (err) {
      console.error('Failed to initialize GameEngine from MongoDB:', err);
    }
  }

  async saveRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    try {
      await Room.findOneAndUpdate(
        { roomId },
        {
          roomId,
          ownerId: room.ownerId,
          ownerSocketId: room.ownerSocketId,
          status: room.status,
          mode: room.mode,
          players: Object.fromEntries(room.players),
          questions: room.questions,
          currentQuestionIndex: room.currentQuestionIndex,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`Failed to save room ${roomId} to MongoDB:`, err);
    }
  }

  async joinRoom(socket, roomId, username, userId) {
    if (!roomId) return;
    roomId = roomId.toUpperCase();
    // Force leave any existing connections for this user in ANY room (including this one)
    for (const [existingId, roomState] of this.rooms.entries()) {
      for (const [sid, player] of roomState.players.entries()) {
        if (userId && player.userId === userId && sid !== socket.id) {
          this.leaveRoom(sid, existingId);
        }
      }
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        players: new Map(),
        status: 'waiting',
        currentQuestionIndex: 0,
        questions: [],
        questionStartTime: null,
        createdAt: Date.now(),
        ownerId: userId,
        ownerSocketId: socket.id,
        countdown: null,
      });
    }

    const room = this.rooms.get(roomId);
    
    let rankPoints = 0;
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) rankPoints = user.rankPoints || 0;
      } catch (err) {
        console.error('Failed to fetch user rank for joining:', err);
      }
    }

    // Fallback owner if not set
    if (!room.ownerId) {
      room.ownerId = userId;
      room.ownerSocketId = socket.id;
    } else if (userId === room.ownerId) {
      // Latest connection from the owner becomes the primary host
      room.ownerSocketId = socket.id;
    }

    room.players.set(socket.id, {
      id: socket.id,
      userId,
      username,
      score: 0,
      answers: [], // boolean[] indicating if answer was correct
      consecutiveTimeouts: 0,
      isOwner: room.ownerId === userId,
      hasLeft: false,
      rankPoints: rankPoints,
      isEliminated: false,
      team: null, // null, 'red', or 'blue'
      powerUps: [], // e.g., ['shield', 'freeze']
      isFrozen: false,
      hasShield: false,
      consecutiveCorrect: 0,
    });

    if (room.mode === 'team_battle') {
      const redCount = Array.from(room.players.values()).filter(p => p.team === 'red').length;
      const blueCount = Array.from(room.players.values()).filter(p => p.team === 'blue').length;
      room.players.get(socket.id).team = redCount <= blueCount ? 'red' : 'blue';
    }

    socket.join(roomId);
    socket.emit('room_info', { 
      id: roomId, 
      status: room.status,
      mode: room.mode || 'standard', 
      players: Array.from(room.players.values()) 
    });
    this.io.to(roomId).emit('room_update', { 
      ownerId: room.ownerId,
      ownerSocketId: room.ownerSocketId
    });
    this.io.to(roomId).emit('player_joined', Array.from(room.players.values()));

    console.log(`[ARENA] ${username} (${userId}) joined room ${roomId}. Total: ${room.players.size}`);

    this.saveRoom(roomId);
  }

  startCountdown(socket, roomId, mode = 'standard') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if the room is in a waiting state and if the caller is the owner
    if (room.status !== 'waiting' || socket.id !== room.ownerSocketId) {
      return socket.emit('error', { message: 'Only the primary arena host can start the game.' });
    }

    if (room.players.size < 2) {
      return socket.emit('error', { message: 'At least 2 players are required to start the match.' });
    }

    if (room.countdown) return; // Already counting down

    room.mode = mode;
    
    // Assign teams if not already assigned
    if (mode === 'team_battle') {
      let i = 0;
      room.players.forEach(player => {
        player.team = i % 2 === 0 ? 'red' : 'blue';
        i++;
      });
    }

    this.saveRoom(roomId);

    let count = 10;
    this.io.to(roomId).emit('countdown_started', count); // Emit initial countdown value
    room.countdown = setInterval(() => {
      count--;
      this.io.to(roomId).emit('countdown_update', count);
      if (count <= 0) {
        clearInterval(room.countdown);
        room.countdown = null;
        this.startGame(roomId);
      }
    }, 1000);
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.status = 'playing';
    room.questions = Array.from({ length: 10 }, () => generateQuestion());
    room.currentQuestionIndex = 0;
    
    this.io.to(roomId).emit('game_start', {
      totalQuestions: room.questions.length,
      mode: room.mode
    });

    this.saveRoom(roomId);
    this.sendNextQuestion(roomId);
  }

  sendNextQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Filter out eliminated players for sudden death
    const activePlayers = Array.from(room.players.values()).filter(p => !p.hasLeft && !p.isEliminated);
    if (room.mode === 'sudden_death' && activePlayers.length <= 1 && room.currentQuestionIndex > 0) {
      this.endGame(roomId);
      return;
    }

    if (room.currentQuestionIndex >= room.questions.length) {
      this.endGame(roomId);
      return;
    }

    const question = room.questions[room.currentQuestionIndex];
    room.questionStartTime = Date.now();
    
    // We don't send the correctAnswer to the client
    const clientQuestion = {
      index: room.currentQuestionIndex,
      question: question.question,
      options: question.options
    };

    this.io.to(roomId).emit('new_question', clientQuestion);

    // Timeout for question (60s)
    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => {
      this.handleTimeout(roomId);
    }, 60000);
  }

  submitAnswer(socketId, roomId, answer) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.get(socketId);
    if (!player || player.answers.length > room.currentQuestionIndex || player.isEliminated) return;

    const question = room.questions[room.currentQuestionIndex];
    const isCorrect = answer === question.correctAnswer;
    const timeTaken = (Date.now() - room.questionStartTime) / 1000;

    let points = 0;
    if (isCorrect) {
      points = 10 + Math.max(0, Math.floor(10 * (1 - timeTaken / 60))); // Speed bonus
      player.consecutiveCorrect++;
      
      // Grant power-up every 3 correct answers
      if (player.consecutiveCorrect % 3 === 0) {
        const pTypes = ['shield', 'freeze'];
        const granted = pTypes[Math.floor(Math.random() * pTypes.length)];
        player.powerUps.push(granted);
        this.io.to(roomId).emit('power_up_granted', { playerId: socketId, type: granted });
      }
    } else {
      player.consecutiveCorrect = 0;
      
      // Shield protection
      if (player.hasShield) {
        player.hasShield = false;
        points = 0; // No penalty
        this.io.to(roomId).emit('shield_broke', socketId);
      } else {
        // Sudden Death Elimination
        if (room.mode === 'sudden_death') {
          player.isEliminated = true;
        }
        // Wrong answer: Deduct points based on time (faster = more deduction)
        points = -(5 + Math.max(0, Math.floor(5 * (1 - timeTaken / 60))));
      }
    }

    // Double Jeopardy Multiplier
    if (room.mode === 'double_jeopardy') {
      points *= 2;
    }

    player.score = Math.max(0, player.score + points); // Ensure score doesn't go below 0
    player.answers.push(isCorrect);
    player.consecutiveTimeouts = 0; // Reset inactivity counter

    // Emit result back to the player immediately
    this.io.to(socketId).emit('answer_result', {
      isCorrect,
      correctAnswer: question.correctAnswer
    });

    // Check if all active players answered
    const activePlayers = Array.from(room.players.values()).filter(p => !p.hasLeft && !p.isEliminated);
    const allAnswered = activePlayers.length > 0 && activePlayers.every(
      p => p.answers.length > room.currentQuestionIndex
    );
    
    // If all surviving players have answered or are eliminated
    const allEliminated = activePlayers.length === 0;

    if (allAnswered || allEliminated) {
      this.saveRoom(roomId);
      clearTimeout(room.timer);
      this.progressRoom(roomId);
    }

    // Update leaderboard
    this.io.to(roomId).emit('leaderboard_update', Array.from(room.players.values()).sort((a, b) => b.score - a.score));
  }

  handleTimeout(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Fill missing answers with false and track inactivity
    room.players.forEach(player => {
      if (player.answers.length <= room.currentQuestionIndex) {
        player.answers.push(false);
        player.consecutiveTimeouts++;

        // Sudden Death: Eliminate on timeout
        if (room.mode === 'sudden_death') {
          player.isEliminated = true;
        }

        // Kick player if inactive for 3 questions
        if (player.consecutiveTimeouts >= 3 && !player.hasLeft) {
          this.leaveRoom(player.id, roomId);
        }
      }
    });

    this.saveRoom(roomId);
    this.progressRoom(roomId);
  }

  progressRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.currentQuestionIndex++;
    this.saveRoom(roomId);
    this.sendNextQuestion(roomId);
  }

  async endGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'finished';
    
    let teamResult = null;
    if (room.mode === 'team_battle') {
      const redScore = Array.from(room.players.values()).filter(p => p.team === 'red').reduce((acc, p) => acc + p.score, 0);
      const blueScore = Array.from(room.players.values()).filter(p => p.team === 'blue').reduce((acc, p) => acc + p.score, 0);
      teamResult = { red: redScore, blue: blueScore, winner: redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'draw' };
    }

    const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    // Persistence to MongoDB
    for (const player of room.players.values()) {
      if (player.userId) {
        try {
          // In team battle, everyone on the winning team "wins"
          let isWinner = false;
          if (room.mode === 'team_battle') {
            isWinner = player.team === teamResult.winner;
          } else {
            isWinner = player.id === winner.id;
          }

          const user = await User.findById(player.userId);
          if (user) {
            user.score += player.score;
            user.totalGames += 1;
            if (isWinner) user.wins += 1;
            
            // Rank Point logic (+20 for win, -10 for loss)
            const rankAdjust = isWinner ? 20 : -10;
            user.rankPoints = Math.max(0, user.rankPoints + rankAdjust);

            // Coin logic (0.5 * match score + 50 bonus for winner)
            const coinReward = Math.floor(player.score * 0.5) + (isWinner ? 50 : 0);
            user.coins = (user.coins || 0) + coinReward;
            
            await user.save();
          }
        } catch (err) {
          console.error(`Failed to update stats for user ${player.userId}:`, err);
        }
      }
    }

    this.io.to(roomId).emit('game_end', {
      winner: winner,
      leaderboard: sortedPlayers,
      questions: room.questions
    });

    // Create Match Record
    try {
      await Match.create({
        roomId,
        winner: {
          userId: winner.userId.toString(),
          username: winner.username,
          score: winner.score
        },
        participants: sortedPlayers.map((p, i) => ({
          userId: p.userId.toString(),
          username: p.username,
          score: p.score,
          rank: i + 1
        })),
        questions: room.questions.map(q => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          options: q.options
        })),
        completedAt: new Date()
      });

      // Cleanup room in DB
      await Room.deleteOne({ roomId });
    } catch (err) {
      console.error(`Failed to archive match ${roomId}:`, err);
    }
  }

  async requestRematch(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'finished') {
      console.log(`Rematch rejected: Room ${roomId} status is ${room?.status}`);
      return;
    }

    // Only owner can initiate rematch
    if (socket.id !== room.ownerSocketId) return;

    // Initialize rematch state
    room.rematchData = {
      accepted: new Set([socket.id]), // Owner automatically accepts
      rejected: new Set(),
      totalPlayers: room.players.size,
      expiresAt: Date.now() + 30000
    };

    // Broadcast request
    this.io.to(roomId).emit('rematch_requested', {
      ownerUsername: room.players.get(socket.id).username,
      timeout: 30000
    });

    // Automatic timeout handling
    room.rematchTimeout = setTimeout(() => {
      this.finalizeRematch(roomId);
    }, 30000);
  }

  handleRematchResponse(socket, roomId, accept) {
    const room = this.rooms.get(roomId);
    if (!room || !room.rematchData) return;

    if (accept) {
      room.rematchData.accepted.add(socket.id);
      room.rematchData.rejected.delete(socket.id);
    } else {
      room.rematchData.rejected.add(socket.id);
      room.rematchData.accepted.delete(socket.id);
    }

    // Broadcast status update
    this.io.to(roomId).emit('rematch_status_update', {
      acceptedCount: room.rematchData.accepted.size,
      rejectedCount: room.rematchData.rejected.size,
      totalPlayers: room.rematchData.totalPlayers
    });

    // If everyone has responded, finalize early
    if (room.rematchData.accepted.size + room.rematchData.rejected.size === room.rematchData.totalPlayers) {
      if (room.rematchTimeout) clearTimeout(room.rematchTimeout);
      this.finalizeRematch(roomId);
    }
  }

  finalizeRematch(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.rematchData) return;

    const acceptedPlayers = Array.from(room.rematchData.accepted);
    
    // Cleanup: Remove players who didn't accept or rejected
    for (const [sid, player] of room.players.entries()) {
      if (!room.rematchData.accepted.has(sid)) {
        // Force them to leave (or just notify them)
        this.io.to(sid).emit('rematch_failed', { reason: 'You did not join the rematch' });
        this.leaveRoom(sid, roomId);
      }
    }

    if (acceptedPlayers.length >= 2) {
      // RESET ROOM STATE (SAME ROOM ID)
      room.status = 'waiting';
      room.currentQuestionIndex = 0;
      room.questions = [];
      room.rematchData = null;
      
      // Reset scores for accepted players
      room.players.forEach(player => {
        player.score = 0;
        player.answers = [];
        player.consecutiveTimeouts = 0;
        player.isEliminated = false;
        player.isFrozen = false;
      });

      this.io.to(roomId).emit('rematch_started');
      console.log(`Match ${roomId} restarted with ${acceptedPlayers.length} players`);
      
      // Auto-start game if it was a group rematch
      setTimeout(() => {
        this.startCountdown(roomId);
      }, 3000);
    } else {
      this.io.to(roomId).emit('rematch_failed', { reason: 'Not enough players accepted the rematch' });
      room.rematchData = null;
    }
  }

  async usePowerUp(socket, roomId, type) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || !player.powerUps.includes(type) || player.isEliminated) return;

    // Use it
    player.powerUps = player.powerUps.filter(p => p !== type);
    
    if (type === 'shield') {
      player.hasShield = true;
      this.io.to(roomId).emit('power_up_used', { playerId: socket.id, type: 'shield' });
    } else if (type === 'freeze') {
      this.io.to(roomId).emit('power_up_used', { playerId: socket.id, type: 'freeze' });
      
      // Freeze others for 5 seconds
      room.players.forEach(p => {
        if (p.id !== socket.id) {
          p.isFrozen = true;
        }
      });
      
      this.io.to(roomId).emit('freeze_others', socket.id);
      
      setTimeout(() => {
        room.players.forEach(p => {
          if (p.id !== socket.id) p.isFrozen = false;
        });
        this.io.to(roomId).emit('unfreeze_all');
      }, 5000);
    }
    
    this.saveRoom(roomId);
  }

  terminateRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.io.to(roomId).emit('arena_terminated');
    this.rooms.delete(roomId);
  }

  leaveRoom(socketId, roomId) {
    if (!roomId) return;
    roomId = roomId.toUpperCase();
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (!player) return;

    if (room.status === 'playing') {
      player.hasLeft = true;
      player.score = 0;
      this.io.to(roomId).emit('player_left_game', { socketId, username: player.username });
      this.io.to(roomId).emit('leaderboard_update', Array.from(room.players.values()).sort((a, b) => b.score - a.score));
      
      // Check if active players have all answered after this player left
      const activePlayers = Array.from(room.players.values()).filter(p => !p.hasLeft);
      const allActiveAnswered = activePlayers.length > 0 && activePlayers.every(
        p => p.answers.length > room.currentQuestionIndex
      );

      if (allActiveAnswered) {
        this.saveRoom(roomId);
        clearTimeout(room.timer);
        this.progressRoom(roomId);
      }
      
      // Check if everyone left
      const allLeft = Array.from(room.players.values()).every(p => p.hasLeft);
      if (allLeft) {
        if (room.countdown) clearInterval(room.countdown);
        if (room.timer) clearTimeout(room.timer);
        this.rooms.delete(roomId);
      }
    } else {
      room.players.delete(socketId);
      
      // Transfer ownership if needed
      if (player.userId === room.ownerId && room.players.size > 0) {
        const nextPlayer = Array.from(room.players.values())[0];
        room.ownerId = nextPlayer.userId;
        nextPlayer.isOwner = true;
        this.io.to(roomId).emit('room_update', { ownerId: room.ownerId });
      }

      this.io.to(roomId).emit('player_joined', Array.from(room.players.values()));
      
      if (room.players.size === 0) {
        if (room.countdown) clearInterval(room.countdown);
        this.rooms.delete(roomId);
      }
    }
  }

  handleDisconnect(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.has(socketId)) {
        this.leaveRoom(socketId, roomId);
      }
    }
  }
}

module.exports = GameEngine;
