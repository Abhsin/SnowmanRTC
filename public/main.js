class GameApp {
  constructor() {
    this.webrtcManager = new WebRTCManager();
    this.game = null;
    this.gameState = 'menu'; // menu, lobby, playing, gameOver
    this.gameTimer = null;
    this.lobbyTimer = null;
    this.roomPlayers = []; // Store all players in the room
    this.isReady = false;
    this.isHost = false;
    
    this.initializeUI();
    this.setupWebRTCCallbacks();
  }

  initializeUI() {
    // Menu elements
    const joinButton = document.getElementById('joinButton');
    const createRoomButton = document.getElementById('createRoomButton');
    const playerNameInput = document.getElementById('playerName');
    const roomIdInput = document.getElementById('roomId');

    // Lobby elements
    const startDrawingButton = document.getElementById('startDrawingButton');
    const leaveGameButton = document.getElementById('leaveGameButton');
    const copyRoomIdButton = document.getElementById('copyRoomId');
    const readyButton = document.getElementById('readyButton');

    // Drawing elements
    const clearCanvasButton = document.getElementById('clearCanvas');
    const saveImageButton = document.getElementById('saveImage');
    const endDrawingButton = document.getElementById('endDrawing');

    // Chat elements
    const chatInput = document.getElementById('chatInput');
    const sendMessageButton = document.getElementById('sendMessage');
    const toggleChatButton = document.getElementById('toggleChat');
    const showChatButton = document.getElementById('showChatButton');
    
    console.log('Elements found:');
    console.log('showChatButton:', showChatButton);
    console.log('toggleChatButton:', toggleChatButton);
    
    // Lobby chat elements
    const lobbyChatInput = document.getElementById('lobbyChatInput');
    const sendLobbyMessageButton = document.getElementById('sendLobbyMessage');

    // Session over elements
    const drawAgainButton = document.getElementById('drawAgainButton');
    const backToMenuButton = document.getElementById('backToMenuButton');

    // Event listeners
    joinButton.addEventListener('click', () => this.joinRoom());
    createRoomButton.addEventListener('click', () => this.createRoom());
    startDrawingButton.addEventListener('click', () => this.startDrawing());
    leaveGameButton.addEventListener('click', () => this.leaveGame());
    copyRoomIdButton.addEventListener('click', () => this.copyRoomId());
    readyButton.addEventListener('click', () => this.toggleReady());
    clearCanvasButton.addEventListener('click', () => this.clearCanvas());
    saveImageButton.addEventListener('click', () => this.saveImage());
    endDrawingButton.addEventListener('click', () => this.endDrawing());
    
    // Chat event listeners
    sendMessageButton.addEventListener('click', () => this.sendChatMessage());
    toggleChatButton.addEventListener('click', () => this.toggleChat());
    showChatButton.addEventListener('click', () => this.showChat());
    
    // Lobby chat event listeners
    sendLobbyMessageButton.addEventListener('click', () => this.sendLobbyChatMessage());
    
    drawAgainButton.addEventListener('click', () => this.drawAgain());
    backToMenuButton.addEventListener('click', () => this.backToMenu());

    // Enter key handling
    playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });
    roomIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });
    
    // Chat input enter key handling
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });
    
    // Lobby chat input enter key handling
    lobbyChatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendLobbyChatMessage();
    });

    // Initialize drawing canvas
    const canvas = document.getElementById('drawingCanvas');
    this.drawing = new PixelDrawing(canvas, this.webrtcManager);
    
    // Setup drawing controls
    this.setupDrawingControls();
  }

  setupWebRTCCallbacks() {
    this.webrtcManager.onPlayerConnected = (data) => {
      // Add new player to room players list if not already there
      if (!this.roomPlayers.find(p => p.playerId === data.playerId)) {
        this.roomPlayers.push(data);
      }
      this.showNotification(`${data.playerName} joined the room!`, 'success');
      this.updatePlayersList();
      this.updateConnectionStatus();
    };

    this.webrtcManager.onPlayerDisconnected = (data) => {
      // Remove player from room players list
      this.roomPlayers = this.roomPlayers.filter(p => p.playerId !== data.playerId);
      this.showNotification(`${data.playerName} left the room.`, 'warning');
      this.updatePlayersList();
      this.updateConnectionStatus();
    };

    // Listen for room joined event
    this.webrtcManager.socket.on('room-joined', (data) => {
      this.roomPlayers = data.players;
      this.isHost = data.isHost;
      this.showLobby(data.roomId);
      this.updatePlayersList();
      this.updateConnectionStatus();
      this.updateReadyStatus();
    });

    // Listen for chat messages
    this.webrtcManager.socket.on('chat-message', (data) => {
      if (this.gameState === 'drawing') {
        this.addChatMessage(data.senderName, data.message, data.senderId, data.timestamp);
      } else if (this.gameState === 'lobby') {
        this.addLobbyChatMessage(data.senderName, data.message, data.senderId, data.timestamp);
      }
    });

    // Listen for ready state changes
    this.webrtcManager.socket.on('player-ready-changed', (data) => {
      // Update player ready state
      const player = this.roomPlayers.find(p => p.playerId === data.playerId);
      if (player) {
        player.isReady = data.isReady;
        this.updatePlayersList();
        this.updateReadyStatus();
      }
    });

    // Listen for game start
    this.webrtcManager.socket.on('game-started', (data) => {
      this.startDrawing();
    });
  }

  async joinRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomId = document.getElementById('roomId').value.trim();

    if (!playerName) {
      this.showNotification('Please enter your name!', 'error');
      return;
    }

    const finalRoomId = roomId || this.generateRoomId();
    
    try {
      await this.webrtcManager.joinRoom(finalRoomId, playerName);
      this.showNotification('Joining room...', 'info');
    } catch (error) {
      this.showNotification('Failed to join room!', 'error');
      console.error('Join room error:', error);
    }
  }

  async createRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
      this.showNotification('Please enter your name!', 'error');
      return;
    }

    const roomId = this.generateRoomId();
    document.getElementById('roomId').value = roomId;
    
    await this.joinRoom();
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  showMenu() {
    this.gameState = 'menu';
    this.hideAllScreens();
    document.getElementById('menu').classList.remove('hidden');
  }

  showLobby(roomId) {
    this.gameState = 'lobby';
    this.hideAllScreens();
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('currentRoomId').textContent = roomId;
    
    // Start periodic updates for connection status
    this.startLobbyUpdates();
  }

  showDrawing() {
    this.gameState = 'drawing';
    this.hideAllScreens();
    document.getElementById('drawingArea').classList.remove('hidden');
    
    // Initialize chat button state - chat starts visible, so hide the show button
    const showChatButton = document.getElementById('showChatButton');
    const chatContainer = document.querySelector('.chat-container');
    if (showChatButton && chatContainer) {
      if (chatContainer.classList.contains('hidden')) {
        showChatButton.classList.remove('hidden');
      } else {
        showChatButton.classList.add('hidden');
      }
    }
  }

  showSessionOver() {
    this.gameState = 'sessionOver';
    this.hideAllScreens();
    document.getElementById('sessionOver').classList.remove('hidden');
  }

  hideAllScreens() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('drawingArea').classList.add('hidden');
    document.getElementById('sessionOver').classList.add('hidden');
  }

  updatePlayersList() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    // Add all players from the room data
    if (this.roomPlayers && this.roomPlayers.length > 0) {
      this.roomPlayers.forEach((player, index) => {
        const item = document.createElement('li');
        item.className = 'player-item';
        
        const isLocalPlayer = player.playerId === this.webrtcManager.localPlayerId;
        const isHost = index === 0; // First player is host
        const connectedPeers = this.webrtcManager.getConnectedPeers();
        const isConnected = isLocalPlayer || connectedPeers.includes(player.playerId);
        
        // Player name with special styling
        let playerNameClass = 'player-name';
        let playerNameText = player.playerName;
        
        if (isLocalPlayer) {
          playerNameClass += ' you';
          playerNameText += ' (You)';
        }
        if (isHost) {
          playerNameClass += ' host';
          playerNameText += ' 👑';
        }
        
        // Connection and ready status
        const connectionClass = isConnected ? 'connected' : 'connecting';
        const readyStatus = player.isReady ? 'ready' : 'not-ready';
        const readyText = player.isReady ? 'Ready' : 'Not Ready';
        
        item.innerHTML = `
          <span class="${playerNameClass}">${playerNameText}</span>
          <div class="player-status">
            <span class="connection-indicator ${connectionClass}"></span>
            <span class="ready-indicator ${readyStatus}">${readyText}</span>
          </div>
        `;
        
        playersList.appendChild(item);
      });
    }
  }

  updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const connectedPeers = this.webrtcManager.getConnectedPeers();
    const totalPlayers = this.roomPlayers.length;
    const otherPlayers = totalPlayers - 1; // Exclude self
    
    if (otherPlayers === 0) {
      statusElement.textContent = 'Waiting for players to join...';
      statusElement.style.color = '#ffc107';
    } else if (connectedPeers.length === 0) {
      statusElement.textContent = `Connecting to ${otherPlayers} player(s)...`;
      statusElement.style.color = '#ffc107';
    } else if (connectedPeers.length < otherPlayers) {
      statusElement.textContent = `Connected to ${connectedPeers.length}/${otherPlayers} player(s)`;
      statusElement.style.color = '#ffc107';
    } else {
      statusElement.textContent = `Connected to all ${connectedPeers.length} player(s)`;
      statusElement.style.color = '#28a745';
    }
  }

  async copyRoomId() {
    const roomId = document.getElementById('currentRoomId').textContent;
    try {
      await navigator.clipboard.writeText(roomId);
      this.showNotification('Room ID copied to clipboard!', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showNotification('Room ID copied to clipboard!', 'success');
    }
  }

  startDrawing() {
    if (this.gameState !== 'lobby') return;
    
    // If host is starting the game, notify server
    if (this.isHost) {
      // Check if all players are ready
      const allReady = this.roomPlayers.every(player => player.isReady);
      if (!allReady) {
        this.showNotification('All players must be ready before starting!', 'warning');
        return;
      }
      
      // Notify server to start game for everyone
      this.webrtcManager.socket.emit('start-game', {
        roomId: this.webrtcManager.roomId
      });
    }
    
    // Check if we have connected peers
    const connectedPeers = this.webrtcManager.getConnectedPeers();
    console.log('Starting drawing with peers:', connectedPeers);
    
    // Get drawing mode from UI
    const mode = document.getElementById('drawingMode').value;
    this.drawing.setDrawingMode(mode);
    
    this.showDrawing();
    this.drawing.startSession(this.roomPlayers);
    this.showNotification('Drawing session started!', 'success');
  }

  clearCanvas() {
    this.drawing.clearCanvas();
    this.showNotification('Canvas cleared!', 'info');
  }

  saveImage() {
    this.drawing.saveImage();
    this.showNotification('Image saved!', 'success');
  }

  endDrawing() {
    if (this.drawing && this.drawing.sessionActive) {
      this.drawing.endSession();
    } else {
      this.showLobby(this.webrtcManager.roomId);
    }
  }

  leaveGame() {
    // Explicitly leave the room on the server
    this.webrtcManager.socket.emit('leave-room');
    
    this.webrtcManager.disconnect();
    this.drawing.reset();
    this.roomPlayers = [];
    this.isReady = false;
    this.isHost = false;
    this.showMenu();
    this.showNotification('Left the session', 'info');
  }

  drawAgain() {
    this.drawing.reset();
    this.showLobby(this.webrtcManager.roomId);
  }

  backToMenu() {
    // Explicitly leave the room on the server
    this.webrtcManager.socket.emit('leave-room');
    
    this.webrtcManager.disconnect();
    this.drawing.reset();
    this.roomPlayers = [];
    this.isReady = false;
    this.isHost = false;
    this.showMenu();
  }

  startGameTimer() {
    this.gameTimer = setInterval(() => {
      if (this.game && this.game.gameRunning) {
        const gameTime = this.game.getGameTime();
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        document.getElementById('gameTime').textContent = 
          `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('yourScore').textContent = 
          this.game.getLocalPlayerScore();
      }
    }, 1000);
  }

  stopGameTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  startLobbyUpdates() {
    // Clear any existing lobby update timer
    if (this.lobbyTimer) {
      clearInterval(this.lobbyTimer);
    }
    
    // Update lobby status every 2 seconds
    this.lobbyTimer = setInterval(() => {
      if (this.gameState === 'lobby') {
        this.updatePlayersList();
        this.updateConnectionStatus();
      } else {
        // Stop updates if we're no longer in lobby
        clearInterval(this.lobbyTimer);
        this.lobbyTimer = null;
      }
    }, 2000);
  }

  setupDrawingControls() {
    // Drawing mode selector
    const drawingModeSelect = document.getElementById('drawingMode');
    drawingModeSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      console.log('Mode selector changed to:', mode);
      this.drawing.setDrawingMode(mode);
    });

    // Tool selector
    const drawingToolSelect = document.getElementById('drawingTool');
    drawingToolSelect.addEventListener('change', (e) => {
      this.drawing.setTool(e.target.value);
    });

    // Brush size slider
    const brushSizeSlider = document.getElementById('brushSize');
    const brushSizeDisplay = document.getElementById('brushSizeDisplay');
    brushSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      this.drawing.setBrushSize(size);
      brushSizeDisplay.textContent = `${size}px`;
    });

    // Color palette
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        // Remove active class from all options
        colorOptions.forEach(opt => opt.classList.remove('active'));
        // Add active class to clicked option
        e.target.classList.add('active');
        // Set drawing color
        const color = e.target.getAttribute('data-color');
        this.drawing.setColor(color);
        // Update color picker
        document.getElementById('colorPicker').value = color;
      });
    });

    // Custom color picker
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('change', (e) => {
      const color = e.target.value;
      this.drawing.setColor(color);
      // Remove active class from predefined colors
      colorOptions.forEach(opt => opt.classList.remove('active'));
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    if (message.length > 200) {
      this.showNotification('Message too long! Maximum 200 characters.', 'error');
      return;
    }
    
    // Send message via socket
    this.webrtcManager.socket.emit('chat-message', {
      roomId: this.webrtcManager.roomId,
      senderName: this.webrtcManager.playerName,
      senderId: this.webrtcManager.localPlayerId,
      message: message,
      timestamp: Date.now()
    });
    
    // Add message to local chat
    this.addChatMessage(this.webrtcManager.playerName, message, this.webrtcManager.localPlayerId, Date.now());
    
    // Clear input
    chatInput.value = '';
  }

  addChatMessage(senderName, message, senderId, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    
    const isOwnMessage = senderId === this.webrtcManager.localPlayerId;
    messageDiv.className = `chat-message ${isOwnMessage ? 'user' : 'other'}`;
    
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      ${!isOwnMessage ? `<span class="message-sender">${senderName}</span>` : ''}
      <span class="message-text">${this.escapeHtml(message)}</span>
      <span class="message-time">${time}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // If chat is hidden, show a notification
    const chatContainer = document.getElementById('chatMessages').closest('.chat-container');
    if (chatContainer.classList.contains('hidden') && !isOwnMessage) {
      this.showNotification(`💬 ${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');
    }
  }

  toggleChat() {
    const chatContainer = document.querySelector('.chat-container');
    const toggleButton = document.getElementById('toggleChat');
    const showChatButton = document.getElementById('showChatButton');
    
    console.log('toggleChat called');
    console.log('chatContainer:', chatContainer);
    console.log('showChatButton:', showChatButton);
    
    if (chatContainer.classList.contains('hidden')) {
      // Show chat
      chatContainer.classList.remove('hidden');
      toggleButton.textContent = 'Hide';
      showChatButton.classList.add('hidden');
      console.log('Showing chat, hiding show button');
    } else {
      // Hide chat
      chatContainer.classList.add('hidden');
      toggleButton.textContent = 'Show';
      showChatButton.classList.remove('hidden');
      console.log('Hiding chat, showing show button');
    }
  }

  showChat() {
    const chatContainer = document.querySelector('.chat-container');
    const toggleButton = document.getElementById('toggleChat');
    const showChatButton = document.getElementById('showChatButton');
    
    // Show chat
    chatContainer.classList.remove('hidden');
    toggleButton.textContent = 'Hide';
    showChatButton.classList.add('hidden');
  }

  sendLobbyChatMessage() {
    const lobbyChatInput = document.getElementById('lobbyChatInput');
    const message = lobbyChatInput.value.trim();
    
    if (!message) return;
    
    if (message.length > 200) {
      this.showNotification('Message too long! Maximum 200 characters.', 'error');
      return;
    }
    
    // Send message via socket
    this.webrtcManager.socket.emit('chat-message', {
      roomId: this.webrtcManager.roomId,
      senderName: this.webrtcManager.playerName,
      senderId: this.webrtcManager.localPlayerId,
      message: message,
      timestamp: Date.now()
    });
    
    // Add message to local lobby chat
    this.addLobbyChatMessage(this.webrtcManager.playerName, message, this.webrtcManager.localPlayerId, Date.now());
    
    // Clear input
    lobbyChatInput.value = '';
  }

  addLobbyChatMessage(senderName, message, senderId, timestamp) {
    const lobbyChatMessages = document.getElementById('lobbyChatMessages');
    const messageDiv = document.createElement('div');
    
    const isOwnMessage = senderId === this.webrtcManager.localPlayerId;
    messageDiv.className = `chat-message ${isOwnMessage ? 'user' : 'other'}`;
    
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      ${!isOwnMessage ? `<span class="message-sender">${senderName}</span>` : ''}
      <span class="message-text">${this.escapeHtml(message)}</span>
      <span class="message-time">${time}</span>
    `;
    
    lobbyChatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    lobbyChatMessages.scrollTop = lobbyChatMessages.scrollHeight;
  }

  toggleReady() {
    this.isReady = !this.isReady;
    
    // Update local player state
    const localPlayer = this.roomPlayers.find(p => p.playerId === this.webrtcManager.localPlayerId);
    if (localPlayer) {
      localPlayer.isReady = this.isReady;
    }
    
    // Notify server
    this.webrtcManager.socket.emit('player-ready', {
      roomId: this.webrtcManager.roomId,
      playerId: this.webrtcManager.localPlayerId,
      isReady: this.isReady
    });
    
    // Update UI
    this.updatePlayersList();
    this.updateReadyStatus();
    
    this.showNotification(this.isReady ? 'You are ready!' : 'You are not ready', 'info');
  }

  updateReadyStatus() {
    const readyButton = document.getElementById('readyButton');
    const readyStatusText = document.getElementById('readyStatusText');
    const startDrawingButton = document.getElementById('startDrawingButton');
    
    // Update ready button
    if (this.isReady) {
      readyButton.textContent = 'Not Ready';
      readyButton.className = 'btn btn-warning';
    } else {
      readyButton.textContent = 'Ready Up!';
      readyButton.className = 'btn btn-secondary';
    }
    
    // Check if all players are ready
    const allReady = this.roomPlayers.every(player => player.isReady);
    const readyCount = this.roomPlayers.filter(player => player.isReady).length;
    const totalPlayers = this.roomPlayers.length;
    
    // Update status text
    if (this.isHost) {
      if (allReady && totalPlayers > 1) {
        readyStatusText.textContent = '🎉 All players ready! You can start the game.';
        readyStatusText.style.color = '#28a745';
        startDrawingButton.disabled = false;
        startDrawingButton.textContent = 'Start Drawing';
        startDrawingButton.className = 'btn btn-primary';
      } else {
        readyStatusText.textContent = `Waiting for players... (${readyCount}/${totalPlayers} ready)`;
        readyStatusText.style.color = '#666';
        startDrawingButton.disabled = true;
        startDrawingButton.textContent = 'Waiting for All Players';
        startDrawingButton.className = 'btn btn-secondary';
      }
    } else {
      if (allReady && totalPlayers > 1) {
        readyStatusText.textContent = '🎉 All players ready! Waiting for host to start.';
        readyStatusText.style.color = '#28a745';
      } else {
        readyStatusText.textContent = `Waiting for players... (${readyCount}/${totalPlayers} ready)`;
        readyStatusText.style.color = '#666';
      }
      startDrawingButton.style.display = 'none'; // Hide start button for non-hosts
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global functions for drawing integration
window.showSessionOver = () => {
  if (window.gameApp) {
    window.gameApp.showSessionOver();
  }
};

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
}); 