const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms and their players
const rooms = new Map();

// Helper function to clean up stale players from room
function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const stalePlayers = [];
  room.forEach(playerId => {
    const playerSocket = io.sockets.sockets.get(playerId);
    if (!playerSocket || !playerSocket.connected) {
      stalePlayers.push(playerId);
    }
  });
  
  stalePlayers.forEach(playerId => {
    room.delete(playerId);
    console.log(`Cleaned up stale player ${playerId} from room ${roomId}`);
  });
  
  // Only delete room if it's been empty for a while and no one is trying to join
  if (room.size === 0) {
    // Keep room alive for 30 seconds to allow reconnections
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom && currentRoom.size === 0) {
        rooms.delete(roomId);
        console.log(`Deleted empty room ${roomId}`);
      }
    }, 30000); // 30 seconds
  }
}

// Serve the main game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
      console.log(`Created new room ${roomId}`);
    }
    
    const room = rooms.get(roomId);
    
    // Clean up any stale players first
    cleanupRoom(roomId);
    
    // Check if player is already in the room (reconnection)
    if (room.has(socket.id)) {
      console.log(`${playerName} is reconnecting to room ${roomId}`);
    } else {
      // Check room capacity after cleanup
      if (room.size >= 4) { // Limit to 4 players per room
        socket.emit('room-full');
        return;
      }
    }
    
    socket.join(roomId);
    room.add(socket.id);
    socket.roomId = roomId;
    socket.playerName = playerName;
    
    console.log(`${playerName} joined room ${roomId} (${room.size} players total)`);
    
    // Notify others in the room
    socket.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerName: playerName
    });
    
    // Send current players list to the new player (only active ones)
    const currentPlayers = Array.from(room).map(id => {
      const playerSocket = io.sockets.sockets.get(id);
      if (playerSocket && playerSocket.connected) {
        return {
          playerId: id,
          playerName: playerSocket.playerName || 'Unknown',
          isReady: playerSocket.isReady || false
        };
      }
      return null;
    }).filter(player => player !== null);
    
    // Determine if this player is the host (first player in room)
    const isHost = currentPlayers.length > 0 && currentPlayers[0].playerId === socket.id;
    
    socket.emit('room-joined', {
      roomId,
      players: currentPlayers,
      isHost: isHost
    });
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Handle game events
  socket.on('game-state', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('game-state', {
        from: socket.id,
        ...data
      });
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { roomId, senderName, senderId, message, timestamp } = data;
    
    // Validate message
    if (!roomId || !senderName || !senderId || !message) {
      console.log('Invalid chat message data:', data);
      return;
    }
    
    // Check if sender is in the room and message is not too long
    if (socket.roomId !== roomId || message.length > 200) {
      console.log('Invalid chat message from', senderName, '- room mismatch or message too long');
      return;
    }
    
    // Basic message sanitization (remove potential HTML/script tags)
    const sanitizedMessage = message.replace(/<[^>]*>?/gm, '');
    
    console.log(`Chat message in room ${roomId} from ${senderName}: ${sanitizedMessage}`);
    
    // Broadcast to all other players in the room
    socket.to(roomId).emit('chat-message', {
      senderName,
      senderId,
      message: sanitizedMessage,
      timestamp
    });
  });

  // Handle player ready state
  socket.on('player-ready', (data) => {
    const { roomId, playerId, isReady } = data;
    
    if (socket.roomId !== roomId || socket.id !== playerId) {
      console.log('Invalid ready state change');
      return;
    }
    
    socket.isReady = isReady;
    console.log(`Player ${socket.playerName} in room ${roomId} is ${isReady ? 'ready' : 'not ready'}`);
    
    // Broadcast ready state change to all players in the room
    io.to(roomId).emit('player-ready-changed', {
      playerId,
      playerName: socket.playerName,
      isReady
    });
  });

  // Handle game start (host only)
  socket.on('start-game', (data) => {
    const { roomId } = data;
    
    if (socket.roomId !== roomId) {
      console.log('Invalid game start request');
      return;
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log('Room not found for game start');
      return;
    }
    
    // Verify this player is the host (first player in room)
    const roomPlayers = Array.from(room);
    if (roomPlayers.length === 0 || roomPlayers[0] !== socket.id) {
      console.log('Non-host attempted to start game');
      return;
    }
    
    console.log(`Host ${socket.playerName} started game in room ${roomId}`);
    
    // Broadcast game start to all players in the room
    io.to(roomId).emit('game-started', {
      startedBy: socket.playerName
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      
      // Don't immediately remove from room - allow for reconnection
      console.log(`Player ${socket.playerName} disconnected from room ${socket.roomId}, keeping room alive for reconnection`);
      
      // Notify others in the room about disconnection
      socket.to(socket.roomId).emit('player-left', {
        playerId: socket.id,
        playerName: socket.playerName
      });
      
      // Clean up the room after a delay to allow reconnection
      setTimeout(() => {
        cleanupRoom(socket.roomId);
      }, 5000); // 5 second delay
    }
  });

  // Handle explicit leave room (when user clicks leave button)
  socket.on('leave-room', () => {
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      room.delete(socket.id);
      
      console.log(`${socket.playerName} explicitly left room ${socket.roomId}`);
      
      // Notify others in the room
      socket.to(socket.roomId).emit('player-left', {
        playerId: socket.id,
        playerName: socket.playerName
      });
      
      socket.leave(socket.roomId);
      const oldRoomId = socket.roomId;
      socket.roomId = null;
      socket.playerName = null;
      socket.isReady = false;
      
      // Clean up room
      cleanupRoom(oldRoomId);
    }
  });
});

const PORT = process.env.PORT || 3000;

// Periodic room status logging
setInterval(() => {
  if (rooms.size > 0) {
    console.log(`\n=== Room Status ===`);
    rooms.forEach((players, roomId) => {
      console.log(`Room ${roomId}: ${players.size} players`);
    });
    console.log(`===================\n`);
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebRTC Multiplayer Pixel Art ready!`);
}); 