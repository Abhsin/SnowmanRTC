class SnakeGame {
  constructor(canvas, webrtcManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.webrtcManager = webrtcManager;
    
    // Game settings
    this.gridSize = 20;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.gridWidth = this.canvasWidth / this.gridSize;
    this.gridHeight = this.canvasHeight / this.gridSize;
    
    // Game state
    this.gameRunning = false;
    this.gameStartTime = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 150; // milliseconds between updates
    
    // Players
    this.players = new Map();
    this.localPlayerId = null;
    this.playerColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
    this.colorIndex = 0;
    
    // Game objects
    this.food = [];
    this.maxFood = 5;
    
    // Input handling
    this.inputQueue = [];
    this.lastDirection = { x: 1, y: 0 };
    
    this.setupInputHandlers();
    this.setupWebRTCHandlers();
  }

  setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
      if (!this.gameRunning) return;
      
      let direction = null;
      
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = { x: 1, y: 0 };
          break;
      }
      
      if (direction && this.isValidDirection(direction)) {
        this.inputQueue.push(direction);
        e.preventDefault();
      }
    });
  }

  setupWebRTCHandlers() {
    this.webrtcManager.onDataReceived = (peerId, data) => {
      this.handleGameData(peerId, data);
    };
  }

  isValidDirection(newDirection) {
    const player = this.players.get(this.localPlayerId);
    if (!player || player.snake.length === 0) return true;
    
    // Can't reverse direction
    const currentDirection = player.direction;
    return !(newDirection.x === -currentDirection.x && newDirection.y === -currentDirection.y);
  }

  startGame() {
    this.gameRunning = true;
    this.gameStartTime = Date.now();
    this.localPlayerId = this.webrtcManager.localPlayerId;
    
    // Initialize local player
    this.addPlayer(this.localPlayerId, this.webrtcManager.playerName, true);
    
    // Initialize food
    this.generateFood();
    
    // Start game loop
    this.gameLoop();
    
    // Broadcast game start
    this.webrtcManager.sendToAllPeers({
      type: 'game-start',
      playerId: this.localPlayerId
    });
  }

  addPlayer(playerId, playerName, isLocal = false) {
    const color = this.playerColors[this.colorIndex % this.playerColors.length];
    this.colorIndex++;
    
    const startX = Math.floor(Math.random() * (this.gridWidth - 10)) + 5;
    const startY = Math.floor(Math.random() * (this.gridHeight - 10)) + 5;
    
    const player = {
      id: playerId,
      name: playerName,
      color: color,
      snake: [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
      ],
      direction: { x: 1, y: 0 },
      score: 0,
      isLocal: isLocal,
      alive: true
    };
    
    this.players.set(playerId, player);
    
    if (isLocal) {
      this.lastDirection = player.direction;
    }
    
    return player;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  generateFood() {
    while (this.food.length < this.maxFood) {
      let foodPos;
      let validPosition = false;
      let attempts = 0;
      
      do {
        foodPos = {
          x: Math.floor(Math.random() * this.gridWidth),
          y: Math.floor(Math.random() * this.gridHeight)
        };
        
        validPosition = true;
        
        // Check if food position overlaps with any snake
        for (const player of this.players.values()) {
          for (const segment of player.snake) {
            if (segment.x === foodPos.x && segment.y === foodPos.y) {
              validPosition = false;
              break;
            }
          }
          if (!validPosition) break;
        }
        
        // Check if food position overlaps with existing food
        if (validPosition) {
          for (const food of this.food) {
            if (food.x === foodPos.x && food.y === foodPos.y) {
              validPosition = false;
              break;
            }
          }
        }
        
        attempts++;
      } while (!validPosition && attempts < 100);
      
      if (validPosition) {
        this.food.push(foodPos);
      } else {
        break; // Can't find valid position
      }
    }
  }

  gameLoop() {
    if (!this.gameRunning) return;
    
    const currentTime = Date.now();
    
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.update();
      this.lastUpdateTime = currentTime;
    }
    
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Process input queue for local player
    if (this.inputQueue.length > 0 && this.players.has(this.localPlayerId)) {
      const newDirection = this.inputQueue.shift();
      const player = this.players.get(this.localPlayerId);
      player.direction = newDirection;
      this.lastDirection = newDirection;
      
      // Broadcast direction change
      this.webrtcManager.sendToAllPeers({
        type: 'direction-change',
        playerId: this.localPlayerId,
        direction: newDirection
      });
    }
    
    // Update all players
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      
      // Move snake
      const head = { ...player.snake[0] };
      head.x += player.direction.x;
      head.y += player.direction.y;
      
      // Check wall collision
      if (head.x < 0 || head.x >= this.gridWidth || 
          head.y < 0 || head.y >= this.gridHeight) {
        this.killPlayer(player);
        continue;
      }
      
      // Check self collision
      if (this.checkSelfCollision(player.snake, head)) {
        this.killPlayer(player);
        continue;
      }
      
      // Check collision with other players
      if (this.checkPlayerCollisions(player.id, head)) {
        this.killPlayer(player);
        continue;
      }
      
      player.snake.unshift(head);
      
      // Check food collision
      const foodIndex = this.food.findIndex(food => 
        food.x === head.x && food.y === head.y
      );
      
      if (foodIndex !== -1) {
        // Eat food
        this.food.splice(foodIndex, 1);
        player.score += 10;
        
        // Broadcast food eaten
        if (player.isLocal) {
          this.webrtcManager.sendToAllPeers({
            type: 'food-eaten',
            playerId: player.id,
            foodPos: head,
            score: player.score
          });
        }
        
        // Generate new food
        this.generateFood();
      } else {
        // Remove tail if no food eaten
        player.snake.pop();
      }
    }
    
    // Check if game should end
    this.checkGameEnd();
  }

  checkSelfCollision(snake, head) {
    return snake.some(segment => 
      segment.x === head.x && segment.y === head.y
    );
  }

  checkPlayerCollisions(playerId, head) {
    for (const [id, player] of this.players) {
      if (id === playerId || !player.alive) continue;
      
      // Check collision with other player's snake
      if (player.snake.some(segment => 
          segment.x === head.x && segment.y === head.y)) {
        return true;
      }
    }
    return false;
  }

  killPlayer(player) {
    player.alive = false;
    
    if (player.isLocal) {
      this.webrtcManager.sendToAllPeers({
        type: 'player-died',
        playerId: player.id
      });
    }
  }

  checkGameEnd() {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
    
    if (alivePlayers.length <= 1 && this.players.size > 1) {
      this.endGame();
    }
  }

  endGame() {
    this.gameRunning = false;
    
    // Calculate final scores
    const scores = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .map(p => ({ name: p.name, score: p.score, alive: p.alive }));
    
    // Broadcast game end
    this.webrtcManager.sendToAllPeers({
      type: 'game-end',
      scores: scores
    });
    
    // Show game over screen
    if (window.showGameOver) {
      window.showGameOver(scores);
    }
  }

  handleGameData(peerId, data) {
    switch (data.type) {
      case 'game-start':
        // Another player started the game
        if (!this.gameRunning && !this.players.has(peerId)) {
          // Add the player who started
          this.addPlayer(peerId, 'Remote Player');
        }
        break;
        
      case 'direction-change':
        if (this.players.has(data.playerId)) {
          this.players.get(data.playerId).direction = data.direction;
        }
        break;
        
      case 'food-eaten':
        if (this.players.has(data.playerId)) {
          const player = this.players.get(data.playerId);
          player.score = data.score;
          
          // Remove the eaten food
          this.food = this.food.filter(food => 
            !(food.x === data.foodPos.x && food.y === data.foodPos.y)
          );
          
          this.generateFood();
        }
        break;
        
      case 'player-died':
        if (this.players.has(data.playerId)) {
          this.players.get(data.playerId).alive = false;
        }
        break;
        
      case 'game-end':
        this.gameRunning = false;
        if (window.showGameOver) {
          window.showGameOver(data.scores);
        }
        break;
    }
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw grid
    this.drawGrid();
    
    // Draw food
    this.ctx.fillStyle = '#ffff00';
    for (const food of this.food) {
      this.ctx.fillRect(
        food.x * this.gridSize + 1,
        food.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    }
    
    // Draw players
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      
      this.ctx.fillStyle = player.color;
      
      for (let i = 0; i < player.snake.length; i++) {
        const segment = player.snake[i];
        const alpha = i === 0 ? 1 : Math.max(0.3, 1 - (i * 0.1));
        
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(
          segment.x * this.gridSize + 1,
          segment.y * this.gridSize + 1,
          this.gridSize - 2,
          this.gridSize - 2
        );
      }
      
      this.ctx.globalAlpha = 1;
    }
    
    // Draw player names and scores
    this.drawPlayerInfo();
  }

  drawGrid() {
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasHeight);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasWidth, y);
      this.ctx.stroke();
    }
  }

  drawPlayerInfo() {
    const players = Array.from(this.players.values());
    let y = 30;
    
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    
    for (const player of players) {
      this.ctx.fillStyle = player.color;
      this.ctx.fillText(
        `${player.name}: ${player.score} ${player.alive ? '' : '(DEAD)'}`,
        10, y
      );
      y += 25;
    }
  }

  getGameTime() {
    if (!this.gameStartTime) return 0;
    return Math.floor((Date.now() - this.gameStartTime) / 1000);
  }

  getLocalPlayerScore() {
    const player = this.players.get(this.localPlayerId);
    return player ? player.score : 0;
  }

  reset() {
    this.gameRunning = false;
    this.players.clear();
    this.food = [];
    this.inputQueue = [];
    this.gameStartTime = null;
    this.colorIndex = 0;
  }
} 