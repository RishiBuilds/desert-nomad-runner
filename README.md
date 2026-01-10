# 🏜️ Desert Nomad

> An endless runner game where a lone traveler navigates through dynamic desert weather conditions.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Canvas API](https://img.shields.io/badge/Canvas%20API-FF6B6B?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 🎮 Play Now

Simply open `index.html` in any modern browser to play!

---

## Features

### Core Gameplay
- **Auto-Running System** - Player continuously moves forward through the endless desert
- **Responsive Controls** - Jump (Space/Tap) and Duck (↓/Swipe Down) mechanics
- **Double Jump** - Extra jump while airborne for advanced maneuvers
- **Progressive Difficulty** - Speed increases over time, obstacles appear more frequently

### Dynamic Weather System
The core innovation of Desert Nomad is a dynamic weather system that affects both visuals and gameplay:

| Weather | Visual Effect | Gameplay Effect |
|---------|--------------|-----------------|
| ☀️ Clear | Normal visibility | Standard physics |
| 💨 Windy | Wind particles | Higher, floatier jumps with horizontal drift |
| 🌡️ Heat Wave | Screen shimmer, warm sky | Subtle visual distortion |
| 🌪️ Sandstorm | Reduced visibility, sand particles | Strong backward push, more tumbleweeds |

### 🌵 Hazards & Obstacles
- **Cacti** - Static obstacles (jump over)
- **Rocks** - Jagged desert rocks (jump over)
- **Snakes** - Fast-moving ground hazards
- **Scorpions** - Animated threats with stinging tails
- **Tumbleweeds** - Flying obstacles (duck under!)
- **Quicksand** - Slows movement until recovery jump

### Visual Design
- Minimalist desert aesthetic with warm color palette
- Silhouetted player and obstacles for clean visual style
- Three-layer parallax scrolling dunes
- Glowing sun with radial gradient effects
- Smooth animations and transitions

---

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `Space` | Jump / Double Jump |
| `↓` or `S` | Duck |
| `Esc` | Pause |

### Mobile
| Gesture | Action |
|---------|--------|
| Tap | Jump |
| Swipe Down | Duck |

---

## Technical Architecture

```
Desert Nomad/
├── index.html      # Game structure and UI overlays
├── style.css       # Styling, animations, and responsive design
├── game.js         # Game logic (modular class-based architecture)
└── README.md       # This file
```

### JavaScript Modules

| Class | Responsibility |
|-------|---------------|
| `Game` | Main controller, game loop, state management |
| `Player` | Character physics, animation, and rendering |
| `ObstacleManager` | Spawning, pooling, and collision detection |
| `Obstacle` | Individual hazard entity with type-specific behavior |
| `WeatherSystem` | Weather state machine, visual effects, gameplay modifiers |
| `Renderer` | Background drawing, parallax scrolling, environment |
| `InputHandler` | Keyboard and touch event handling |
| `AudioManager` | Generated sound effects using Web Audio API |

### Key Technical Features
- **60 FPS Target** - Optimized game loop with delta time handling
- **Object Pooling** - Efficient obstacle reuse
- **Device Pixel Ratio** - Crisp rendering on high-DPI displays
- **Responsive Design** - Adapts to any screen size
- **Local Storage** - High score persistence
- **No External Dependencies** - Pure HTML5/CSS/JavaScript

---


## Quick Start

```bash
# Clone the repository
git clone https://github.com/RishiBuilds/desert-nomad-runner.git

# Navigate to directory
cd desert-nomad

# Open in browser
open index.html
```
---

## Future Enhancements

- [ ] Power-ups (speed boost, shield, score multiplier)
- [ ] Day/night cycle
- [ ] Achievement system
- [ ] Leaderboard integration
- [ ] More obstacle varieties
- [ ] Camel alternative character

---

## Contact

Rishi - @RishiBuilds

Project Link: https://github.com/RishiBuilds/desert-nomad-runner

## License

Distributed under the MIT License. Click [LICENSE](LICENSE) to view the full license text.

---

<div align="center">

**Built with ❤️ using vanilla JavaScript**

*Survive the endless desert • Adapt to changing weather • Run forever*

*⭐ Star this repo if you enjoyed the game!*

</div>
