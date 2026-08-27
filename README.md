# 🐍 Super Snake Game

A modern Snake game built with React 18 and Vite architecture, featuring enhanced food mechanics and rich gameplay experience.

## ✨ Game Features

### 🎯 Enhanced Food Mechanics
- **Normal Beans** (+10 points) - Red, basic scoring
- **Golden Beans** (+50 points) - Golden yellow, high-value targets with rotating animation
- **Speed Beans** (+25 points) - Cyan, temporary speed boost effect
- **Slow Beans** (+15 points) - Light green, temporary slow-down effect
- **Ghost Beans** (+30 points) - Purple, temporary wall-phasing ability

### 🎮 Gameplay
- Use arrow keys to control snake movement
- Press spacebar to pause/resume the game
- Collect different bean types for special effects
- Ghost mode allows passing through walls
- Food items have expiration mechanics for added strategy

### 🎨 Visual Effects
- Modern gradient backgrounds and glassmorphism effects
- Smooth animations and transitions
- Unique visual representations for different bean types
- Responsive design supporting mobile devices
- Semi-transparent effects during ghost mode

### 🔊 Sound System
- Different sound effects when eating various beans
- Game over failure sound effects
- Web Audio API for dynamic sound generation

### 🛠️ Technical Features
- **React 18** - Latest React version with concurrent features
- **Vite 7** - Ultra-fast build tool and development server
- **Modern CSS** - CSS variables, gradients, animations, and modern features
- **React Hooks** - Best practices using useState, useEffect, useCallback
- **Performance Optimization** - useCallback to avoid unnecessary re-renders
- **Code Quality** - ESLint checks for code quality assurance

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build

# Preview production version
npm run preview
```

## 🎯 Game Controls

- **↑ ↓ ← →** - Control snake movement direction
- **Spacebar** - Pause/resume game
- **Start Button** - Begin new game
- **Restart** - Restart after game over

## 🌟 Game Highlights

1. **Strategic Bean System** - Different beans offer different scores and effects, requiring players to weigh risks and rewards
2. **Dynamic Difficulty** - Special beans increase unpredictability and enjoyment
3. **Modern UI** - Latest CSS technologies and design principles
4. **Smooth Experience** - 60fps game loop with responsive controls
5. **Extensible Architecture** - Easy to add new bean types and game modes

## 🔧 Development Notes

Project structure:
```
src/
├── components/          # React components
│   ├── SnakeGame.jsx   # Main game component
│   └── SnakeGame.css   # Game styles
├── utils/              # Utility functions
│   └── SoundManager.js # Sound effects manager
├── App.jsx             # Application entry point
└── main.jsx            # Application mount point
```

## 📱 Responsive Support

The game fully supports mobile devices, automatically adjusting for small screens:
- Game board size adaptation
- Button and text size adjustments
- Touch-friendly interaction design

## 🎵 Sound Technology

Uses Web Audio API for dynamic sound generation without external audio files:
- Different frequencies and waveform types
- Dynamic volume control
- Smooth sound transitions

---

Enjoy the game! 🎮✨