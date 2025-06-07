class WebRTCManager {
  constructor() {
    this.socket = null;
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.localPlayerId = null;
    this.roomId = null;
    this.playerName = null;
    this.onDataReceived = null;
    this.onPlayerConnected = null;
    this.onPlayerDisconnected = null;
    
    // WebRTC configuration with STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    this.setupSocketConnection();
  }

  setupSocketConnection() {
    this.socket = io();
    
    // Handle successful room join
    this.socket.on('room-joined', async (data) => {
      console.log('Joined room:', data);
      this.roomId = data.roomId;
      this.localPlayerId = this.socket.id;
      
      // Connect to existing players (only if we should initiate)
      for (const player of data.players) {
        if (player.playerId !== this.localPlayerId) {
          // Only initiate if our ID is lexicographically smaller
          const shouldInitiate = this.localPlayerId < player.playerId;
          console.log(`Should initiate to existing player ${player.playerId}:`, shouldInitiate);
          
          if (shouldInitiate) {
            await this.createPeerConnection(player.playerId, true);
          }
        }
      }
    });

    // Handle new player joining
    this.socket.on('player-joined', async (data) => {
      console.log('Player joined:', data);
      
      // Only initiate connection if our ID is lexicographically smaller (prevents dual initiation)
      const shouldInitiate = this.localPlayerId && this.localPlayerId < data.playerId;
      console.log(`Should initiate to ${data.playerId}:`, shouldInitiate);
      
      if (shouldInitiate) {
        await this.createPeerConnection(data.playerId, true);
      }
      
      if (this.onPlayerConnected) {
        this.onPlayerConnected(data);
      }
    });

    // Handle player leaving
    this.socket.on('player-left', (data) => {
      console.log('Player left:', data);
      this.closePeerConnection(data.playerId);
      if (this.onPlayerDisconnected) {
        this.onPlayerDisconnected(data);
      }
    });

    // Handle WebRTC signaling
    this.socket.on('offer', async (data) => {
      await this.handleOffer(data);
    });

    this.socket.on('answer', async (data) => {
      await this.handleAnswer(data);
    });

    this.socket.on('ice-candidate', async (data) => {
      await this.handleIceCandidate(data);
    });

    // Handle room full
    this.socket.on('room-full', () => {
      alert('Room is full! Maximum 4 players allowed.');
    });
  }

  async joinRoom(roomId, playerName) {
    this.playerName = playerName;
    this.socket.emit('join-room', { roomId, playerName });
  }

  async createPeerConnection(peerId, isInitiator = false) {
    console.log(`Creating peer connection with ${peerId}, initiator: ${isInitiator}`);
    
    // Check if connection already exists
    if (this.peerConnections.has(peerId)) {
      console.log(`Connection with ${peerId} already exists, skipping`);
      return;
    }
    
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, peerConnection);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection with ${peerId}: ${peerConnection.connectionState} (signaling: ${peerConnection.signalingState})`);
      if (peerConnection.connectionState === 'failed') {
        console.log(`Connection failed with ${peerId}, cleaning up`);
        this.closePeerConnection(peerId);
      } else if (peerConnection.connectionState === 'connected') {
        console.log(`Successfully connected to ${peerId}`);
      }
    };

    if (isInitiator) {
      // Create data channel and offer
      const dataChannel = peerConnection.createDataChannel('gameData', {
        ordered: true
      });
      this.setupDataChannel(dataChannel, peerId);
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        target: peerId,
        offer: offer
      });
    } else {
      // Wait for data channel from remote peer
      peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, peerId);
      };
    }
  }

  setupDataChannel(dataChannel, peerId) {
    this.dataChannels.set(peerId, dataChannel);
    
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
    };
    
    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.dataChannels.delete(peerId);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onDataReceived) {
          this.onDataReceived(peerId, data);
        }
      } catch (error) {
        console.error('Error parsing received data:', error);
      }
    };
  }

  async handleOffer(data) {
    console.log('Received offer from:', data.from);
    
    // Check if connection already exists
    if (this.peerConnections.has(data.from)) {
      console.log(`Connection with ${data.from} already exists, handling offer on existing connection`);
      const existingConnection = this.peerConnections.get(data.from);
      
      // If connection is in stable state, we can't set remote description
      if (existingConnection.signalingState !== 'stable') {
        console.log(`Connection with ${data.from} not in stable state: ${existingConnection.signalingState}`);
        await existingConnection.setRemoteDescription(data.offer);
        const answer = await existingConnection.createAnswer();
        await existingConnection.setLocalDescription(answer);
        
        this.socket.emit('answer', {
          target: data.from,
          answer: answer
        });
        return;
      } else {
        console.log(`Connection with ${data.from} already stable, ignoring offer`);
        return;
      }
    }
    
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(data.from, peerConnection);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: data.from,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection with ${data.from}: ${peerConnection.connectionState} (signaling: ${peerConnection.signalingState})`);
      if (peerConnection.connectionState === 'failed') {
        console.log(`Connection failed with ${data.from}, cleaning up`);
        this.closePeerConnection(data.from);
      } else if (peerConnection.connectionState === 'connected') {
        console.log(`Successfully connected to ${data.from}`);
      }
    };

    // Handle incoming data channel
    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, data.from);
    };

    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    this.socket.emit('answer', {
      target: data.from,
      answer: answer
    });
  }

  async handleAnswer(data) {
    console.log('Received answer from:', data.from);
    
    const peerConnection = this.peerConnections.get(data.from);
    if (peerConnection) {
      console.log(`Setting remote description for ${data.from}, current state: ${peerConnection.signalingState}`);
      
      // Only set remote description if we're in the right state
      if (peerConnection.signalingState === 'have-local-offer') {
        try {
          await peerConnection.setRemoteDescription(data.answer);
          console.log(`Successfully set remote description for ${data.from}`);
        } catch (error) {
          console.error(`Error setting remote description for ${data.from}:`, error);
        }
      } else {
        console.log(`Cannot set remote description for ${data.from}, wrong state: ${peerConnection.signalingState}`);
      }
    } else {
      console.log(`No peer connection found for ${data.from}`);
    }
  }

  async handleIceCandidate(data) {
    console.log('Received ICE candidate from:', data.from);
    
    const peerConnection = this.peerConnections.get(data.from);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(data.candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  sendToAllPeers(data) {
    const message = JSON.stringify(data);
    console.log('Sending to all peers:', data, 'Connected peers:', this.dataChannels.size);
    
    this.dataChannels.forEach((dataChannel, peerId) => {
      console.log(`Data channel ${peerId} state:`, dataChannel.readyState);
      if (dataChannel.readyState === 'open') {
        try {
          dataChannel.send(message);
          console.log(`Sent data to ${peerId}:`, data.type);
        } catch (error) {
          console.error(`Error sending data to ${peerId}:`, error);
        }
      } else {
        console.log(`Data channel ${peerId} not ready:`, dataChannel.readyState);
      }
    });
  }

  sendToPeer(peerId, data) {
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(data));
      } catch (error) {
        console.error(`Error sending data to ${peerId}:`, error);
      }
    }
  }

  closePeerConnection(peerId) {
    const peerConnection = this.peerConnections.get(peerId);
    const dataChannel = this.dataChannels.get(peerId);
    
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }
  }

  getConnectedPeers() {
    return Array.from(this.dataChannels.keys()).filter(peerId => {
      const channel = this.dataChannels.get(peerId);
      return channel && channel.readyState === 'open';
    });
  }

  disconnect() {
    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      this.closePeerConnection(peerId);
    });
    
    // Disconnect from signaling server
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isConnected() {
    return this.getConnectedPeers().length > 0;
  }
} 