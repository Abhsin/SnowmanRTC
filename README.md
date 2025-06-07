# 🎨 WebRTC Multiplayer Pixel Art

A real-time collaborative pixel art drawing application with WebRTC peer-to-peer communication.

![Pixel Art Game](https://img.shields.io/badge/Status-Live-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.0+-purple)

## 🚀 Live Demo

🎮 **[Play Now!](https://snowmanrtc.onrender.com)** (Replace with your deployed URL)

## ✨ Features

### 🎨 **Collaborative Drawing**
- **Real-time pixel art** creation with friends
- **4-pixel brush system** for crisp pixel art
- **Multiple drawing tools:** Pencil, Eraser, Flood Fill
- **12 preset colors** + custom color picker
- **Adjustable brush sizes** (1-10 pixels)

### 🎮 **Game Modes**
- **Free Draw:** Everyone draws simultaneously
- **Turn-based:** 30-second timed turns
- **Ready system:** All players must ready up before host starts

### 💬 **Built-in Chat**
- **Lobby chat** for pre-game communication
- **Drawing session chat** with show/hide toggle
- **Real-time messaging** via WebRTC and Socket.io

### 🌐 **Multiplayer Features**
- **Up to 4 players** per room
- **WebRTC P2P communication** for low latency
- **Room-based sessions** with unique room IDs
- **Host system** with game start controls
- **Automatic reconnection** handling

### 📱 **Cross-Platform**
- **Mobile touch support** for drawing
- **Responsive design** works on phones, tablets, computers
- **All browsers** - Chrome, Safari, Firefox, Edge

### 💾 **Additional Features**
- **Save artwork** as PNG images
- **Clear canvas** functionality
- **Connection status** indicators
- **Turn timer** with visual countdown

## 🛠️ Tech Stack

- **Frontend:** HTML5 Canvas, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Real-time:** Socket.io, WebRTC
- **Styling:** Modern CSS with gradients and animations

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/multiplayer-pixel-art.git
cd multiplayer-pixel-art

# 2. Install dependencies
npm install

# 3. Start the server
node server.js

# 4. Open your browser
# Go to http://localhost:3000
```

### 🌐 Deploy to Web

See [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md) for detailed deployment instructions to:
- Render.com (Free)
- Railway (Always-on)
- Vercel (Fast)

## 🎮 How to Play

### Starting a Game
1. **Enter your name** and room ID (or create random room)
2. **Wait for friends** to join the same room
3. **Everyone clicks "Ready Up!"**
4. **Host starts the drawing session**

### Drawing Together
- **Free Draw Mode:** Everyone draws at the same time
- **Turn-based Mode:** Take 30-second turns
- **Use chat** to coordinate and communicate
- **Save your artwork** when finished

### Controls
- **Left click/touch:** Draw with selected tool
- **Tool selection:** Pencil, Eraser, Flood Fill
- **Color picker:** 12 presets + custom colors
- **Brush size:** Adjust from 1-10 pixels

## 📁 Project Structure

```
multiplayer-pixel-art/
├── public/                 # Client-side files
│   ├── index.html         # Main HTML page
│   ├── main.js           # App logic & UI
│   ├── drawing.js        # Drawing engine
│   ├── webrtc.js         # WebRTC manager
│   └── styles.css        # Styling
├── server.js             # Node.js server
├── package.json          # Dependencies
├── render.yaml           # Render.com config
├── Procfile             # Heroku config
└── README.md            # This file
```

## 🔧 Key Components

### Drawing Engine (`drawing.js`)
- Pixel-perfect 4x4 grid system
- Flood fill algorithm
- Real-time synchronization
- Turn-based mode management

### WebRTC Manager (`webrtc.js`)
- Peer-to-peer connections
- Data channel communication
- Connection state management
- Automatic reconnection

### Game Logic (`main.js`)
- Room management
- Ready system
- Chat functionality
- UI state management

### Server (`server.js`)
- Socket.io signaling server
- Room creation/management
- Chat message relay
- Player state synchronization

## 🌟 Contributing

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin amazing-feature`
5. **Open Pull Request**

## 🐛 Issues & Support

- **Report bugs:** [GitHub Issues](https://github.com/YOUR_USERNAME/multiplayer-pixel-art/issues)
- **Feature requests:** [GitHub Discussions](https://github.com/YOUR_USERNAME/multiplayer-pixel-art/discussions)
- **Questions:** Check existing issues or create new one

## 📈 Future Features

- [ ] More drawing tools (line, rectangle, circle)
- [ ] Animation frames support
- [ ] Gallery of saved artworks
- [ ] Voting system for best artwork
- [ ] Themes and color palettes
- [ ] Sound effects and music
- [ ] Mobile app version

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Performance

- **WebRTC P2P:** Ultra-low latency communication
- **Optimized rendering:** 60fps drawing performance
- **Efficient sync:** Only sends pixel changes
- **Mobile optimized:** Touch-friendly interface

## 🔐 Privacy

- **No data stored:** Drawings are not saved on servers
- **P2P communication:** Direct browser-to-browser
- **Temporary rooms:** Automatically cleaned up
- **No registration:** Just enter name and play

---

**Made with ❤️ for creative collaboration**

🎨 **[Play Now!](https://your-app-url.onrender.com)** | 📚 **[Deployment Guide](GITHUB_DEPLOYMENT.md)** | 🐛 **[Report Issues](https://github.com/YOUR_USERNAME/multiplayer-pixel-art/issues)** 
