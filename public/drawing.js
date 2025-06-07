class PixelDrawing {
  constructor(canvas, webrtcManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.webrtcManager = webrtcManager;
    
    // Drawing settings
    this.pixelSize = 4; // Size of each pixel in the grid
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.gridWidth = Math.floor(this.canvasWidth / this.pixelSize);
    this.gridHeight = Math.floor(this.canvasHeight / this.pixelSize);
    
    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'pencil';
    this.currentColor = '#000000';
    this.brushSize = 2;
    this.drawingMode = 'free'; // 'free' or 'turn'
    
    // Pixel data - 2D array storing color of each pixel
    this.pixelData = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill('#ffffff'));
    
    // Turn-based mode
    this.currentTurn = null;
    this.turnDuration = 30; // seconds
    this.turnTimer = null;
    this.turnStartTime = null;
    this.players = [];
    this.localPlayerId = null;
    
    // Drawing state
    this.sessionActive = false;
    
    this.setupEventHandlers();
    this.setupWebRTCHandlers();
    this.clearCanvas();
  }

  setupEventHandlers() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      this.canvas.dispatchEvent(mouseEvent);
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setupWebRTCHandlers() {
    // Store the original handler if it exists
    const originalHandler = this.webrtcManager.onDataReceived;
    
    this.webrtcManager.onDataReceived = (peerId, data) => {
      console.log('Received drawing data:', data);
      this.handleDrawingData(peerId, data);
      
      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(peerId, data);
      }
    };
  }

  startSession(roomPlayers = null) {
    console.log('Starting drawing session');
    this.sessionActive = true;
    this.localPlayerId = this.webrtcManager.localPlayerId;
    
    // Initialize players list with actual player names
    this.players = [];
    
    if (roomPlayers && roomPlayers.length > 0) {
      // Use the actual room players with real names
      console.log('Using room players:', roomPlayers);
      roomPlayers.forEach(player => {
        this.players.push({
          id: player.playerId,
          name: player.playerName,
          isLocal: player.playerId === this.localPlayerId
        });
      });
    } else {
      // Fallback to old method if no room players provided
      this.players = [{
        id: this.localPlayerId,
        name: this.webrtcManager.playerName,
        isLocal: true
      }];
      
      // Add connected peers as players
      const connectedPeers = this.webrtcManager.getConnectedPeers();
      console.log('Connected peers:', connectedPeers);
      connectedPeers.forEach(peerId => {
        this.players.push({
          id: peerId,
          name: `Player ${peerId.substring(0, 8)}`,
          isLocal: false
        });
      });
    }

    console.log('Players in session:', this.players);

    // Start turn-based mode if selected
    if (this.drawingMode === 'turn') {
      this.startTurnBasedMode();
    }

    // Broadcast session start
    console.log('Broadcasting session start');
    this.webrtcManager.sendToAllPeers({
      type: 'session-start',
      mode: this.drawingMode,
      players: this.players
    });
  }

  startTurnBasedMode() {
    console.log('Starting turn-based mode with players:', this.players);
    
    if (this.players.length === 0) {
      console.error('No players available for turn-based mode');
      return;
    }
    
    // Shuffle players for random turn order
    this.players = this.shuffleArray([...this.players]);
    this.currentTurn = 0;
    
    console.log('Turn order:', this.players.map(p => p.name));
    
    this.startTurn();
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startTurn() {
    const currentPlayer = this.players[this.currentTurn];
    console.log(`Starting turn ${this.currentTurn + 1}/${this.players.length} for player:`, currentPlayer.name);
    
    this.turnStartTime = Date.now();
    
    // Update UI
    this.updateTurnIndicator(currentPlayer);
    
    // Set canvas state
    const isMyTurn = currentPlayer.id === this.localPlayerId;
    console.log('Is my turn:', isMyTurn);
    this.setCanvasEnabled(isMyTurn);
    
    // Start turn timer
    this.startTurnTimer();
    
    // Broadcast turn start to all peers
    const turnData = {
      type: 'turn-start',
      currentPlayer: currentPlayer,
      turnIndex: this.currentTurn,
      players: this.players // Include full player list for sync
    };
    console.log('Broadcasting turn start:', turnData);
    this.webrtcManager.sendToAllPeers(turnData);
  }

  startTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }
    
    let timeLeft = this.turnDuration;
    const timerElement = document.getElementById('turnTimer');
    
    // Initialize timer display
    if (timerElement) {
      timerElement.textContent = `${timeLeft}s`;
    }
    
    console.log('Starting turn timer:', timeLeft, 'seconds');
    
    this.turnTimer = setInterval(() => {
      timeLeft--;
      if (timerElement) {
        timerElement.textContent = `${timeLeft}s`;
      }
      
      if (timeLeft <= 0) {
        console.log('Turn timer expired, ending turn');
        this.endTurn();
      }
    }, 1000);
  }

  endTurn() {
    console.log('Ending turn for player:', this.players[this.currentTurn]?.name);
    
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
    
    // Move to next player
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
    console.log('Next turn will be player:', this.players[this.currentTurn]?.name);
    
    // Broadcast turn end
    this.webrtcManager.sendToAllPeers({
      type: 'turn-end',
      nextTurnIndex: this.currentTurn,
      playerId: this.localPlayerId
    });
    
    // Start next turn or end session
    if (this.sessionActive && this.drawingMode === 'turn') {
      setTimeout(() => this.startTurn(), 1000); // Small delay between turns
    }
  }

  updateTurnIndicator(currentPlayer) {
    const indicator = document.getElementById('turnIndicator');
    const playerName = document.getElementById('currentTurnPlayer');
    
    if (!indicator || !playerName) {
      console.warn('Turn indicator elements not found');
      return;
    }
    
    const isMyTurn = currentPlayer.id === this.localPlayerId;
    
    console.log('Updating turn indicator for:', currentPlayer.name, 'isMyTurn:', isMyTurn);
    
    if (this.drawingMode === 'turn') {
      indicator.classList.add('active');
      playerName.textContent = isMyTurn ? 'Your turn!' : `${currentPlayer.name}'s turn`;
      indicator.className = `turn-indicator active ${isMyTurn ? 'your-turn' : 'other-turn'}`;
    } else {
      indicator.classList.remove('active');
    }
  }

  setCanvasEnabled(enabled) {
    console.log('Setting canvas enabled:', enabled);
    
    const overlay = document.getElementById('canvasOverlay');
    
    if (enabled) {
      this.canvas.classList.remove('disabled');
      if (overlay) overlay.classList.remove('active');
    } else {
      this.canvas.classList.add('disabled');
      if (overlay) {
        overlay.classList.add('active');
        overlay.textContent = 'Waiting for your turn...';
      }
    }
  }

  getPixelCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / this.pixelSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / this.pixelSize);
    
    return { x: Math.max(0, Math.min(x, this.gridWidth - 1)), 
             y: Math.max(0, Math.min(y, this.gridHeight - 1)) };
  }

  startDrawing(e) {
    if (!this.sessionActive) return;
    if (this.drawingMode === 'turn' && !this.isMyTurn()) return;
    
    this.isDrawing = true;
    this.draw(e);
  }

  draw(e) {
    if (!this.isDrawing || !this.sessionActive) return;
    if (this.drawingMode === 'turn' && !this.isMyTurn()) return;
    
    const coords = this.getPixelCoordinates(e);
    
    if (this.currentTool === 'fill') {
      this.floodFill(coords.x, coords.y, this.currentColor);
    } else {
      this.drawPixel(coords.x, coords.y, this.currentColor, this.brushSize, true);
    }
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  drawPixel(x, y, color, size, broadcast = false) {
    const halfSize = Math.floor(size / 2);
    
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const pixelX = x + dx;
        const pixelY = y + dy;
        
        if (pixelX >= 0 && pixelX < this.gridWidth && 
            pixelY >= 0 && pixelY < this.gridHeight) {
          
          // Apply tool effect
          let finalColor = color;
          if (this.currentTool === 'eraser') {
            finalColor = '#ffffff';
          }
          
          this.pixelData[pixelY][pixelX] = finalColor;
          this.renderPixel(pixelX, pixelY, finalColor);
          
          // Broadcast pixel change
          if (broadcast) {
            const message = {
              type: 'pixel-draw',
              x: pixelX,
              y: pixelY,
              color: finalColor,
              tool: this.currentTool,
              playerId: this.localPlayerId
            };
            console.log('Broadcasting pixel draw:', message);
            this.webrtcManager.sendToAllPeers(message);
          }
        }
      }
    }
  }

  floodFill(startX, startY, newColor) {
    const targetColor = this.pixelData[startY][startX];
    if (targetColor === newColor) return;
    
    const stack = [{x: startX, y: startY}];
    const visited = new Set();
    
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) continue;
      if (this.pixelData[y][x] !== targetColor) continue;
      
      visited.add(key);
      this.pixelData[y][x] = newColor;
      this.renderPixel(x, y, newColor);
      
      // Add neighbors
      stack.push({x: x + 1, y: y});
      stack.push({x: x - 1, y: y});
      stack.push({x: x, y: y + 1});
      stack.push({x: x, y: y - 1});
    }
    
    // Broadcast fill operation
    this.webrtcManager.sendToAllPeers({
      type: 'flood-fill',
      startX: startX,
      startY: startY,
      color: newColor,
      playerId: this.localPlayerId
    });
  }

  renderPixel(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.pixelSize,
      y * this.pixelSize,
      this.pixelSize,
      this.pixelSize
    );
  }

  renderAll() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.renderPixel(x, y, this.pixelData[y][x]);
      }
    }
    
    // Draw grid lines
    this.drawGrid();
  }

  drawGrid() {
    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.pixelSize, 0);
      this.ctx.lineTo(x * this.pixelSize, this.canvasHeight);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.pixelSize);
      this.ctx.lineTo(this.canvasWidth, y * this.pixelSize);
      this.ctx.stroke();
    }
  }

  clearCanvas() {
    // Reset pixel data
    this.pixelData = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill('#ffffff'));
    this.renderAll();
    
    // Broadcast clear
    if (this.sessionActive) {
      this.webrtcManager.sendToAllPeers({
        type: 'canvas-clear',
        playerId: this.localPlayerId
      });
    }
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setBrushSize(size) {
    this.brushSize = parseInt(size);
  }

  setDrawingMode(mode) {
    console.log('Setting drawing mode to:', mode);
    this.drawingMode = mode;
    
    if (mode === 'free') {
      this.setCanvasEnabled(true);
      const indicator = document.getElementById('turnIndicator');
      if (indicator) indicator.classList.remove('active');
      if (this.turnTimer) {
        clearInterval(this.turnTimer);
        this.turnTimer = null;
      }
      
      // Broadcast mode change if session is active
      if (this.sessionActive) {
        this.webrtcManager.sendToAllPeers({
          type: 'mode-change',
          mode: mode,
          playerId: this.localPlayerId
        });
      }
    } else if (mode === 'turn' && this.sessionActive) {
      // Start turn-based mode immediately if session is active
      this.startTurnBasedMode();
      
      // Broadcast mode change
      this.webrtcManager.sendToAllPeers({
        type: 'mode-change',
        mode: mode,
        players: this.players,
        playerId: this.localPlayerId
      });
    }
  }

  isMyTurn() {
    if (this.drawingMode !== 'turn') return true;
    const currentPlayer = this.players[this.currentTurn];
    return currentPlayer && currentPlayer.id === this.localPlayerId;
  }

  handleDrawingData(peerId, data) {
    console.log('Handling drawing data:', data.type, data);
    
    try {
      switch (data.type) {
        case 'session-start':
          // Sync with session that's already started
          this.sessionActive = true;
          this.drawingMode = data.mode;
          
          // Update players list with any new names, but preserve existing ones
          if (data.players) {
            data.players.forEach(receivedPlayer => {
              const existingPlayer = this.players.find(p => p.id === receivedPlayer.id);
              if (existingPlayer) {
                // Update name if it's more specific than what we have
                if (receivedPlayer.name && !receivedPlayer.name.startsWith('Player ')) {
                  existingPlayer.name = receivedPlayer.name;
                }
              } else {
                // Add new player
                this.players.push(receivedPlayer);
              }
            });
          }
          
          console.log('Session started remotely, players:', this.players);
          break;
          
        case 'pixel-draw':
          console.log('Drawing pixel at:', data.x, data.y, 'color:', data.color);
          this.pixelData[data.y][data.x] = data.color;
          this.renderPixel(data.x, data.y, data.color);
          break;
          
        case 'flood-fill':
          console.log('Performing flood fill');
          this.performFloodFill(data.startX, data.startY, data.color);
          break;
          
        case 'canvas-clear':
          console.log('Clearing canvas remotely');
          this.pixelData = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill('#ffffff'));
          this.renderAll();
          break;
          
        case 'turn-start':
          console.log('Received turn-start:', data);
          this.currentTurn = data.turnIndex;
          
          // Sync player list if provided, but preserve existing names
          if (data.players) {
            data.players.forEach(receivedPlayer => {
              const existingPlayer = this.players.find(p => p.id === receivedPlayer.id);
              if (existingPlayer) {
                // Update name if it's more specific than what we have
                if (receivedPlayer.name && !receivedPlayer.name.startsWith('Player ')) {
                  existingPlayer.name = receivedPlayer.name;
                }
              } else {
                // Add new player
                this.players.push(receivedPlayer);
              }
            });
          }
          
          this.updateTurnIndicator(data.currentPlayer);
          this.setCanvasEnabled(data.currentPlayer.id === this.localPlayerId);
          this.startTurnTimer();
          break;
          
        case 'turn-end':
          console.log('Received turn-end:', data);
          this.currentTurn = data.nextTurnIndex;
          if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
          }
          break;
          
        case 'mode-change':
          console.log('Received mode-change:', data);
          this.drawingMode = data.mode;
          
          if (data.mode === 'free') {
            this.setCanvasEnabled(true);
            const indicator = document.getElementById('turnIndicator');
            if (indicator) indicator.classList.remove('active');
            if (this.turnTimer) {
              clearInterval(this.turnTimer);
              this.turnTimer = null;
            }
          } else if (data.mode === 'turn' && data.players) {
            // Update players list while preserving existing names
            data.players.forEach(receivedPlayer => {
              const existingPlayer = this.players.find(p => p.id === receivedPlayer.id);
              if (existingPlayer) {
                // Update name if it's more specific than what we have
                if (receivedPlayer.name && !receivedPlayer.name.startsWith('Player ')) {
                  existingPlayer.name = receivedPlayer.name;
                }
              } else {
                // Add new player
                this.players.push(receivedPlayer);
              }
            });
            this.startTurnBasedMode();
          }
          break;
          
        case 'session-end':
          this.endSession();
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling drawing data:', error, data);
    }
  }

  saveImage() {
    // Create a temporary canvas for the final image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvasWidth;
    tempCanvas.height = this.canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Render without grid
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        tempCtx.fillStyle = this.pixelData[y][x];
        tempCtx.fillRect(
          x * this.pixelSize,
          y * this.pixelSize,
          this.pixelSize,
          this.pixelSize
        );
      }
    }
    
    // Download the image
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = tempCanvas.toDataURL();
    link.click();
  }

  endSession() {
    this.sessionActive = false;
    
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
    
    // Create thumbnail for session summary
    const thumbnail = document.getElementById('finalArtwork');
    if (thumbnail) {
      const thumbCtx = thumbnail.getContext('2d');
      thumbCtx.drawImage(this.canvas, 0, 0, thumbnail.width, thumbnail.height);
    }
    
    // Broadcast session end
    this.webrtcManager.sendToAllPeers({
      type: 'session-end',
      playerId: this.localPlayerId
    });
    
    // Show session over screen
    if (window.showSessionOver) {
      window.showSessionOver();
    }
  }

  reset() {
    this.sessionActive = false;
    this.currentTurn = null;
    this.players = [];
    
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
    
    this.clearCanvas();
    this.setCanvasEnabled(true);
    document.getElementById('turnIndicator').classList.remove('active');
  }
} 