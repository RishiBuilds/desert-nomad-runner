# 🏜️ Desert Nomad

> A minimal endless runner featuring a stickman traveler and dynamic weather that affects gameplay.

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
- **Progressive Difficulty** - Speed increases over time with step-based tiers

### Dynamic Weather System
Weather isn't just visual — **it changes how you play**:

| Weather | Visual Effect | Gameplay Effect |
|---------|--------------|-----------------|
| ☀️ **Clear** | Normal visibility | Baseline physics |
| 🌬️ **Loo (Hot Wind)** | Dust particles, warm sky | Strong horizontal push, floatier jumps |
| 🔥 **Heatwave** | Screen shimmer, orange tint | Weaker jumps, heavier gravity, slower legs |
| 🌪️ **Sandstorm** | Low visibility, sand particles | Very strong wind push, requires earlier reactions |

### 🌵 Obstacles
- **Cacti** - Static obstacles (jump over)
- **Rocks** - Desert rocks (jump over)
- **Tumbleweeds** - Flying obstacles (duck under!)

---

## � The Stickman Character

Desert Nomad features a **minimal stickman** designed for maximum clarity and responsiveness.

### Design Philosophy
> "Clarity over realism"

| Element | Implementation |
|---------|---------------|
| **Head** | Simple circle |
| **Body** | Single vertical line |
| **Arms** | Thin lines with swing animation |
| **Legs** | Thin lines with procedural run cycle |

### Procedural Animation
All animation is calculated in real-time using sine waves — no sprites needed:

| Animation | Description |
|-----------|-------------|
| **Run Cycle** | Sine-wave leg swing synced to game speed |
| **Arm Swing** | Opposite phase to legs for natural balance |
| **Jump Squash** | 0.85x vertical scale on takeoff |
| **Land Stretch** | Up to 1.25x based on fall velocity |
| **Wind Lean** | Body tilts into wind direction |

### Weather Reactions
The stickman **visually responds** to weather:

| Weather | Character Response |
|---------|-------------------|
| **Clear** | Normal upright posture |
| **Loo** | Leans into wind, faster leg animation |
| **Heatwave** | Slower leg movement (exhaustion) |
| **Sandstorm** | Strong forward lean |

---

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `Space` | Jump / Double Jump |
| `↓` or `S` | Duck |
| `Esc` or `P` | Pause |

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
├── style.css       # Styling, animations, responsive design
├── game.js         # Game logic (~900 lines, heavily commented)
└── README.md       # This file
```

### JavaScript Classes

| Class | Responsibility |
|-------|---------------|
| `Game` | Main controller, game loop, state management |
| `Player` | Stickman physics, procedural animation, weather reactions |
| `ObstacleManager` | Spawning and collision detection |
| `Obstacle` | Individual hazard with type-specific drawing |
| `WeatherSystem` | Weather state machine, effects, gameplay modifiers |
| `Renderer` | Background, parallax dunes, environment |
| `InputHandler` | Keyboard and touch events |
| `AudioManager` | Synthesized sounds via Web Audio API |

### Key Technical Features
- **60 FPS Target** - Optimized game loop with delta time
- **Procedural Animation** - All motion calculated in real-time
- **Minimal Draw Calls** - Simple shapes for performance
- **Device Pixel Ratio** - Crisp rendering on high-DPI displays
- **Responsive Design** - Adapts to any screen size
- **Local Storage** - High score persistence
- **No Dependencies** - Pure HTML5/CSS/JavaScript
- **Beginner-Friendly Code** - Heavily commented for learning

---

## Weather Gameplay Effects

Each weather state **forces different timing**:

```javascript
WEATHER_EFFECTS: {
    CLEAR:     { jumpMod: 1.0,  gravityMod: 1.0,  windForce: 0   },
    LOO:       { jumpMod: 0.95, gravityMod: 0.9,  windForce: 4.0 },
    HEATWAVE:  { jumpMod: 0.85, gravityMod: 1.15, windForce: 0.5 },
    SANDSTORM: { jumpMod: 0.92, gravityMod: 1.0,  windForce: 5.5 }
}
```

- **Loo**: Wind pushes you forward → jump earlier
- **Heatwave**: Heavier gravity → jump earlier, reactions feel sluggish
- **Sandstorm**: Strong push + low visibility → requires prediction

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/RishiBuilds/desert-nomad-runner.git

# Navigate to directory
cd desert-nomad

# Open in browser (macOS)
open index.html
<<<<<<< HEAD

# Or on Windows
start index.html
```
---

## Future Enhancements

- [ ] Power-ups (speed boost, shield)
- [ ] Day/night cycle
- [ ] Achievement system
- [ ] More obstacle varieties
- [ ] Sound toggle in HUD

---

## Contact

Rishi - @RishiBuilds

Project Link: https://github.com/RishiBuilds/desert-nomad-runner

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ using vanilla JavaScript**

*Survive the endless desert • Adapt to changing weather • Run forever*

*⭐ Star this repo if you enjoyed the game!*

</div>
