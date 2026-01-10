'use strict';
const CONFIG = {
    GRAVITY: 0.55,
    JUMP_FORCE: -13,
    DOUBLE_JUMP_FORCE: -10,
    GROUND_Y_OFFSET: 100,       
    COYOTE_TIME: 100,           

    // Speed progression
    INITIAL_SPEED: 4,
    MAX_SPEED: 14,
    SPEED_INCREMENT: 0.0003,

    // Difficulty tiers
    DIFFICULTY_TIERS: [
        { score: 0, speedMult: 1.0, label: 'Calm' },
        { score: 500, speedMult: 1.15, label: 'Easy' },
        { score: 1500, speedMult: 1.3, label: 'Medium' },
        { score: 3000, speedMult: 1.5, label: 'Hard' },
        { score: 5000, speedMult: 1.75, label: 'Expert' }
    ],

    // Player dimensions
    PLAYER_X: 100,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 60,
    DUCK_HEIGHT: 30,
    HITBOX_PADDING: 8,

    // Stickman visual settings
    STICKMAN: {
        HEAD_RADIUS: 8,
        LINE_WIDTH: 3,
        COLOR: '#1A1208',          
        LEG_LENGTH: 20,
        ARM_LENGTH: 15
    },

    // Obstacle spawning
    MIN_OBSTACLE_GAP: 400,
    MAX_OBSTACLE_GAP: 700,
    FIRST_OBSTACLE_DELAY: 250,

    // Weather timing
    WEATHER_CHANGE_INTERVAL: 22000,  
    WEATHER_GRACE_PERIOD: 6000,      
    WEATHER_RAMP_TIME: 25000,     

    // Weather gameplay effects 
    WEATHER_EFFECTS: {
        CLEAR: {
            jumpMod: 1.0,           
            gravityMod: 1.0,        
            windForce: 0,          
            speedMod: 1.0,        
            visibility: 1.0        
        },
        LOO: {
            jumpMod: 0.95,          
            gravityMod: 0.9,        
            windForce: 4.0,        
            speedMod: 1.1,          
            visibility: 0.85
        },
        HEATWAVE: {
            jumpMod: 0.85,          
            gravityMod: 1.15,       
            windForce: 0.5,
            speedMod: 0.7,         
            visibility: 0.9
        },
        SANDSTORM: {
            jumpMod: 0.92,
            gravityMod: 1.0,
            windForce: 5.5,         
            speedMod: 0.85,
            visibility: 0.55        
        }
    },

    // Colors
    COLORS: {
        SKY_TOP: '#87CEEB',
        SKY_BOTTOM: '#F5DEB3',
        SAND_LIGHT: '#F4E4C1',
        SAND_MEDIUM: '#E8C98B',
        SAND_DARK: '#C9A86C',
        GROUND_LINE: '#CC8B3C',
        CACTUS: '#3D6B22',
        ROCK: '#8B7355',
        SUN: '#FFD93D'
    },

    DEBUG_MODE: false
};

// Weather state names
const WEATHER = {
    CLEAR: 'clear',
    LOO: 'loo',
    HEATWAVE: 'heatwave',
    SANDSTORM: 'sandstorm'
};

// Obstacle types
const OBSTACLE_TYPE = {
    CACTUS: 'cactus',
    ROCK: 'rock',
    TUMBLEWEED: 'tumbleweed'
};

const Utils = {
    // Random number between min and max
    random: (min, max) => Math.random() * (max - min) + min,

    // Random integer between min and max (inclusive)
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Linear interpolation - smoothly transition between values
    lerp: (start, end, t) => start + (end - start) * t,

    // Clamp value between min and max
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

    // Simple AABB collision detection
    checkCollision: (a, b) => {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    }
};

// AUDIO MANAGER
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio not supported');
            }
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Play a simple tone
    playTone(freq, duration, type = 'sine', vol = 0.1) {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playJump() { this.playTone(350, 0.12); }
    playLand() { this.playTone(120, 0.08, 'triangle'); }
    playHit() { this.playTone(80, 0.25, 'sawtooth', 0.12); }
    playWarning() { this.playTone(250, 0.3, 'square', 0.06); }
    playWind() { this.playTone(100, 0.4, 'sawtooth', 0.03); }
}

// INPUT HANDLER
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.bindEvents();
    }

    bindEvents() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (this.keys[e.code]) return;
            this.keys[e.code] = true;

            if (e.code === 'Space') {
                e.preventDefault();
                this.handleAction();
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                e.preventDefault();
                if (this.game.state === 'playing') {
                    this.game.player.duck(true);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                if (this.game.state === 'playing') {
                    this.game.player.duck(false);
                }
            }
        });

        // Touch and mouse
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleAction();
        }, { passive: false });
        canvas.addEventListener('mousedown', () => this.handleAction());

        // Mobile buttons
        const jumpBtn = document.getElementById('jump-btn');
        const duckBtn = document.getElementById('duck-btn');

        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') this.game.player.jump();
            }, { passive: false });
        }

        if (duckBtn) {
            duckBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') this.game.player.duck(true);
            }, { passive: false });
            duckBtn.addEventListener('touchend', () => {
                if (this.game.state === 'playing') this.game.player.duck(false);
            });
        }
    }

    handleAction() {
        if (this.game.state === 'start') {
            this.game.start();
        } else if (this.game.state === 'playing') {
            this.game.player.jump();
        } else if (this.game.state === 'gameover') {
            this.game.restart();
        }
    }
}

// STICKMAN PLAYER
class Player {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        // Position and size
        this.x = CONFIG.PLAYER_X;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.velocityY = 0;
        this.velocityX = 0;

        // State
        this.isGrounded = true;
        this.isDucking = false;
        this.canDoubleJump = true;
        this.timeSinceGrounded = 0;

        // Animation state 
        this.animTime = 0;
        this.runCycle = 0;          
        this.jumpBend = 0;          
        this.stretchFactor = 1;    
        this.leanAngle = 0;         

        // Calculate ground position
        const canvasH = this.game.canvas.logicalHeight || this.game.canvas.height;
        this.groundY = canvasH - CONFIG.GROUND_Y_OFFSET;
        this.y = this.groundY - this.height;
    }

    jump() {
        const effects = this.game.weather.getEffects();
        const jumpForce = CONFIG.JUMP_FORCE * effects.jumpMod;

        // Can jump if grounded or within coyote time
        const canJump = this.isGrounded ||
            (this.timeSinceGrounded < CONFIG.COYOTE_TIME && this.velocityY >= 0);

        if (canJump) {
            this.velocityY = jumpForce;
            this.isGrounded = false;
            this.canDoubleJump = true;
            this.jumpBend = -0.3;       // Slight crouch before takeoff
            this.stretchFactor = 0.85;  // Squash on jump
            this.game.audio.playJump();
        } else if (this.canDoubleJump) {
            this.velocityY = CONFIG.DOUBLE_JUMP_FORCE * effects.jumpMod;
            this.canDoubleJump = false;
            this.stretchFactor = 0.9;
            this.game.audio.playJump();
        }
    }

    duck(isDucking) {
        if (this.isDucking === isDucking) return;
        this.isDucking = isDucking;

        if (isDucking) {
            const diff = this.height - CONFIG.DUCK_HEIGHT;
            this.height = CONFIG.DUCK_HEIGHT;
            this.y += diff;
        } else {
            this.height = CONFIG.PLAYER_HEIGHT;
            this.y = this.groundY - this.height;
        }
    }

    update(deltaTime) {
        const effects = this.game.weather.getEffects();
        const dt = deltaTime / 16.67; // Normalize to 60fps

        // Update animation time
        this.animTime += deltaTime * 0.001;

        // Ground position (in case of resize)
        this.groundY = (this.game.canvas.logicalHeight || this.game.canvas.height)
            - CONFIG.GROUND_Y_OFFSET;

        // --- GRAVITY (affected by weather) ---
        const gravity = CONFIG.GRAVITY * effects.gravityMod;

        if (!this.isGrounded) {
            this.velocityY += gravity * dt;
            this.timeSinceGrounded += deltaTime;

            // --- WIND FORCE (LOO/SANDSTORM push player) ---
            this.velocityX = effects.windForce * 0.35;
        } else {
            this.velocityX = 0;
            this.timeSinceGrounded = 0;
        }

        // Apply velocities
        this.y += this.velocityY * dt;
        this.x += this.velocityX * dt;
        this.x = Utils.clamp(this.x, 50, CONFIG.PLAYER_X + 60);

        // Ground collision
        const groundedY = this.groundY - this.height;
        if (this.y >= groundedY) {
            if (!this.isGrounded && this.velocityY > 2) {
                // Landing impact - squash based on fall speed
                this.stretchFactor = 1 + Math.min(0.25, this.velocityY / 25);
                this.game.audio.playLand();
            }
            this.y = groundedY;
            this.velocityY = 0;
            this.isGrounded = true;

            // Slowly return to default x position
            this.x = Utils.lerp(this.x, CONFIG.PLAYER_X, 0.08);
        }

        // --- RUN CYCLE (speed affected by weather) ---
        // Heatwave = slower legs (exhaustion visual)
        // Loo = faster legs (hurrying)
        if (this.isGrounded && !this.isDucking) {
            const runSpeed = this.game.gameSpeed * effects.speedMod;
            this.runCycle += deltaTime * runSpeed * 0.005;
        }

        // --- STICKMAN LEAN (reacts to wind) ---
        // Player leans into the wind - visual feedback of force
        const targetLean = effects.windForce * 0.02;
        this.leanAngle = Utils.lerp(this.leanAngle, targetLean, 0.08);

        // --- ANIMATION RECOVERY ---
        // Smooth return to neutral
        this.jumpBend = Utils.lerp(this.jumpBend, 0, 0.15);
        this.stretchFactor = Utils.lerp(this.stretchFactor, 1, 0.12);
    }

    // DRAW - Render the stickman
    draw(ctx) {
        const cfg = CONFIG.STICKMAN;

        ctx.save();

        // Apply body lean (rotates entire stickman)
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;
        ctx.translate(centerX, centerY);
        ctx.rotate(this.leanAngle);
        ctx.translate(-centerX, -centerY);

        // Apply stretch (jump/land feedback)
        ctx.translate(centerX, centerY);
        ctx.scale(1 / this.stretchFactor, this.stretchFactor);
        ctx.translate(-centerX, -centerY);

        // Setup drawing style
        ctx.strokeStyle = cfg.COLOR;
        ctx.fillStyle = cfg.COLOR;
        ctx.lineWidth = cfg.LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (this.isDucking) {
            this.drawDucking(ctx, cfg);
        } else {
            this.drawRunning(ctx, cfg);
        }

        ctx.restore();
    }

    drawRunning(ctx, cfg) {
        const x = this.x + this.width / 2;  // Center of character
        const baseY = this.y;

        // Calculate joint positions
        const headY = baseY + cfg.HEAD_RADIUS + 2;
        const shoulderY = headY + cfg.HEAD_RADIUS + 5;
        const hipY = baseY + this.height - cfg.LEG_LENGTH;
        const footY = baseY + this.height;

        // Leg animation (sine wave based run cycle)
        const legSwing = Math.sin(this.runCycle * 2) * 12;
        const legLift = Math.abs(Math.sin(this.runCycle * 2)) * 8;

        // Arm animation (opposite to legs for balance)
        const armSwing = Math.sin(this.runCycle * 2 + Math.PI) * 10;

        // 1. HEAD (simple circle)
        ctx.beginPath();
        ctx.arc(x, headY, cfg.HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // 2. BODY (single vertical line)
        ctx.beginPath();
        ctx.moveTo(x, shoulderY);
        ctx.lineTo(x, hipY);
        ctx.stroke();

        // 3. ARMS (thin lines with swing)
        // Left arm
        ctx.beginPath();
        ctx.moveTo(x, shoulderY + 3);
        ctx.lineTo(x - 8 + armSwing * 0.5, shoulderY + cfg.ARM_LENGTH);
        ctx.stroke();

        // Right arm
        ctx.beginPath();
        ctx.moveTo(x, shoulderY + 3);
        ctx.lineTo(x + 8 - armSwing * 0.5, shoulderY + cfg.ARM_LENGTH);
        ctx.stroke();

        // 4. LEGS (thin lines with run cycle)
        // Back leg
        ctx.beginPath();
        ctx.moveTo(x, hipY);
        ctx.lineTo(x - legSwing * 0.6, footY - legLift * 0.3);
        ctx.stroke();

        // Front leg
        ctx.beginPath();
        ctx.moveTo(x, hipY);
        ctx.lineTo(x + legSwing * 0.6, footY - legLift);
        ctx.stroke();
    }

    // -------------------------------------------------------------------------
    // DRAW DUCKING POSE
    // Compact crouch
    // -------------------------------------------------------------------------
    drawDucking(ctx, cfg) {
        const x = this.x + this.width / 2;
        const baseY = this.y;

        // Head lower and forward
        const headX = x - 5;
        const headY = baseY + cfg.HEAD_RADIUS + 3;

        // 1. HEAD
        ctx.beginPath();
        ctx.arc(headX, headY, cfg.HEAD_RADIUS * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // 2. BODY (curved/crouched)
        ctx.beginPath();
        ctx.moveTo(headX, headY + cfg.HEAD_RADIUS);
        ctx.quadraticCurveTo(x + 5, baseY + this.height * 0.5, x, baseY + this.height);
        ctx.stroke();

        // 3. ARMS (tucked in)
        ctx.beginPath();
        ctx.moveTo(headX + 3, headY + cfg.HEAD_RADIUS);
        ctx.lineTo(x + 8, baseY + this.height * 0.6);
        ctx.stroke();
    }

    // HITBOX 
    getHitbox() {
        const p = CONFIG.HITBOX_PADDING;
        return {
            x: this.x + p,
            y: this.y + p,
            width: this.width - p * 2,
            height: this.height - p * 2
        };
    }
}

// OBSTACLE
class Obstacle {
    constructor(type, x, groundY) {
        this.type = type;
        this.x = x;
        this.groundY = groundY;
        this.active = true;
        this.rotation = 0;

        // Setup based on type
        switch (type) {
            case OBSTACLE_TYPE.CACTUS:
                this.width = 25;
                this.height = Utils.randomInt(45, 70);
                this.y = groundY - this.height;
                this.speedMult = 1;
                break;
            case OBSTACLE_TYPE.ROCK:
                this.width = Utils.randomInt(35, 50);
                this.height = Utils.randomInt(22, 35);
                this.y = groundY - this.height;
                this.speedMult = 1;
                break;
            case OBSTACLE_TYPE.TUMBLEWEED:
                this.width = 35;
                this.height = 35;
                this.y = groundY - Utils.randomInt(50, 65); // Flying - must duck
                this.speedMult = 0.9;
                break;
        }
    }

    update(gameSpeed, deltaTime) {
        this.x -= gameSpeed * this.speedMult;

        if (this.type === OBSTACLE_TYPE.TUMBLEWEED) {
            this.rotation += gameSpeed * 0.07;
        }

        if (this.x + this.width < -50) {
            this.active = false;
        }
    }

    draw(ctx) {
        switch (this.type) {
            case OBSTACLE_TYPE.CACTUS:
                this.drawCactus(ctx);
                break;
            case OBSTACLE_TYPE.ROCK:
                this.drawRock(ctx);
                break;
            case OBSTACLE_TYPE.TUMBLEWEED:
                this.drawTumbleweed(ctx);
                break;
        }
    }

    drawCactus(ctx) {
        const { x, y, width: w, height: h } = this;
        ctx.fillStyle = CONFIG.COLORS.CACTUS;

        // Main trunk
        ctx.fillRect(x + w * 0.35, y, w * 0.3, h);

        // Arms (if tall enough)
        if (h > 50) {
            ctx.fillRect(x, y + h * 0.3, w * 0.4, 6);
            ctx.fillRect(x, y + h * 0.25, 6, 15);
            ctx.fillRect(x + w * 0.6, y + h * 0.5, w * 0.4, 6);
            ctx.fillRect(x + w - 6, y + h * 0.4, 6, 15);
        }
    }

    drawRock(ctx) {
        const { x, y, width: w, height: h } = this;
        ctx.fillStyle = CONFIG.COLORS.ROCK;

        // Simple polygon rock
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.8, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
    }

    drawTumbleweed(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        ctx.strokeStyle = '#A88050';
        ctx.lineWidth = 2;

        // Simple radial lines
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
            ctx.stroke();
        }

        ctx.restore();
    }

    getHitbox() {
        const p = 4;
        return {
            x: this.x + p,
            y: this.y + p,
            width: this.width - p * 2,
            height: this.height - p * 2
        };
    }
}

// OBSTACLE MANAGER
class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = [];
        this.spawnTimer = 0;
        this.nextSpawnDistance = CONFIG.FIRST_OBSTACLE_DELAY;
        this.currentTier = CONFIG.DIFFICULTY_TIERS[0];
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
        this.nextSpawnDistance = CONFIG.FIRST_OBSTACLE_DELAY;
        this.currentTier = CONFIG.DIFFICULTY_TIERS[0];
    }

    getDifficultyTier() {
        let tier = CONFIG.DIFFICULTY_TIERS[0];
        for (const t of CONFIG.DIFFICULTY_TIERS) {
            if (this.game.score >= t.score) tier = t;
        }
        return tier;
    }

    update(deltaTime) {
        const gameSpeed = this.game.gameSpeed;
        const groundY = (this.game.canvas.logicalHeight || this.game.canvas.height)
            - CONFIG.GROUND_Y_OFFSET;

        this.spawnTimer += gameSpeed;
        this.currentTier = this.getDifficultyTier();

        // Spawn new obstacles
        if (this.spawnTimer >= this.nextSpawnDistance) {
            this.spawnObstacle(groundY);
            this.spawnTimer = 0;

            // Calculate next spawn distance
            const reduction = (this.currentTier.speedMult - 1) * 40;
            this.nextSpawnDistance = Utils.randomInt(
                Math.max(300, CONFIG.MIN_OBSTACLE_GAP - reduction),
                Math.max(450, CONFIG.MAX_OBSTACLE_GAP - reduction)
            );
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].update(gameSpeed, deltaTime);
            if (!this.obstacles[i].active) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstacle(groundY) {
        const types = [OBSTACLE_TYPE.CACTUS, OBSTACLE_TYPE.ROCK];

        // Add tumbleweeds at higher scores
        if (this.game.score >= 1200) {
            types.push(OBSTACLE_TYPE.TUMBLEWEED);
        }

        const type = types[Utils.randomInt(0, types.length - 1)];
        const x = (this.game.canvas.logicalWidth || this.game.canvas.width) + 50;
        this.obstacles.push(new Obstacle(type, x, groundY));
    }

    draw(ctx) {
        for (const obs of this.obstacles) {
            obs.draw(ctx);
        }
    }

    checkCollisions(player) {
        const playerHitbox = player.getHitbox();
        for (const obs of this.obstacles) {
            if (obs.active && Utils.checkCollision(playerHitbox, obs.getHitbox())) {
                return true;
            }
        }
        return false;
    }
}

// WEATHER SYSTEM
class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.currentWeather = WEATHER.CLEAR;
        this.targetWeather = WEATHER.CLEAR;
        this.weatherTimer = 0;
        this.gameTime = 0;
        this.transitionProgress = 1;

        // Weather cycle
        this.cycle = [WEATHER.CLEAR, WEATHER.LOO, WEATHER.HEATWAVE, WEATHER.SANDSTORM];
        this.cycleIndex = 0;

        // Visual effect values
        this.windStrength = 0;
        this.visibility = 1;
        this.heatDistortion = 0;

        // Particles
        this.particles = [];

        // UI refs
        this.weatherIcon = document.getElementById('weather-icon');
        this.weatherText = document.getElementById('weather-text');
        this.weatherBanner = document.getElementById('weather-banner');
        this.canvas = document.getElementById('game-canvas');
    }

    reset() {
        this.currentWeather = WEATHER.CLEAR;
        this.targetWeather = WEATHER.CLEAR;
        this.weatherTimer = 0;
        this.gameTime = 0;
        this.transitionProgress = 1;
        this.cycleIndex = 0;
        this.windStrength = 0;
        this.visibility = 1;
        this.heatDistortion = 0;
        this.particles = [];
        this.updateUI();
        this.canvas.classList.remove('sandstorm', 'heatwave');
    }

    // Get intensity 
    getIntensity() {
        if (this.gameTime < CONFIG.WEATHER_GRACE_PERIOD) return 0;
        const elapsed = this.gameTime - CONFIG.WEATHER_GRACE_PERIOD;
        return Math.min(1, elapsed / CONFIG.WEATHER_RAMP_TIME);
    }

    // Get current weather effects for gameplay
    getEffects() {
        const key = this.currentWeather.toUpperCase();
        const base = CONFIG.WEATHER_EFFECTS[key] || CONFIG.WEATHER_EFFECTS.CLEAR;
        const intensity = this.getIntensity();

        // Interpolate between clear and current weather based on intensity
        return {
            jumpMod: Utils.lerp(1, base.jumpMod, intensity),
            gravityMod: Utils.lerp(1, base.gravityMod, intensity),
            windForce: base.windForce * intensity,
            speedMod: Utils.lerp(1, base.speedMod, intensity),
            visibility: Utils.lerp(1, base.visibility, intensity)
        };
    }

    update(deltaTime) {
        this.gameTime += deltaTime;
        this.weatherTimer += deltaTime;

        // Change weather after interval 
        if (this.weatherTimer >= CONFIG.WEATHER_CHANGE_INTERVAL &&
            this.gameTime > CONFIG.WEATHER_GRACE_PERIOD) {
            this.changeWeather();
            this.weatherTimer = 0;
        }

        // Smooth transition
        if (this.transitionProgress < 1) {
            this.transitionProgress += deltaTime / 3000;
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.currentWeather = this.targetWeather;
                this.updateUI();
            }
        }

        this.updateEffects(deltaTime);
        this.updateParticles();
    }

    changeWeather() {
        this.cycleIndex = (this.cycleIndex + 1) % this.cycle.length;
        const newWeather = this.cycle[this.cycleIndex];

        // Sandstorm warning (audio + visual)
        if (newWeather === WEATHER.SANDSTORM) {
            this.showBanner('⚠️ Sandstorm Warning!');
            this.game.audio.playWarning();
        }

        this.targetWeather = newWeather;
        this.transitionProgress = 0;
        this.showBanner(this.getWeatherMessage(newWeather));
    }

    getWeatherMessage(weather) {
        const messages = {
            [WEATHER.CLEAR]: '☀️ Clear Skies',
            [WEATHER.LOO]: '🌬️ Loo Winds - Strong Push!',
            [WEATHER.HEATWAVE]: '🔥 Heatwave - Heavy Jumps!',
            [WEATHER.SANDSTORM]: '🌪️ Sandstorm - Low Visibility!'
        };
        return messages[weather] || weather;
    }

    showBanner(message) {
        if (this.weatherBanner) {
            this.weatherBanner.textContent = message;
            this.weatherBanner.classList.add('active');
            setTimeout(() => this.weatherBanner.classList.remove('active'), 2500);
        }
    }

    updateEffects(deltaTime) {
        const effects = this.getEffects();

        // Smooth visual values
        this.windStrength = Utils.lerp(this.windStrength, effects.windForce, 0.05);
        this.visibility = Utils.lerp(this.visibility, effects.visibility, 0.05);

        // CSS effects
        this.canvas.classList.remove('sandstorm', 'heatwave');

        if (this.currentWeather === WEATHER.SANDSTORM && this.getIntensity() > 0.3) {
            this.canvas.classList.add('sandstorm');
        }

        if (this.currentWeather === WEATHER.HEATWAVE && this.getIntensity() > 0.3) {
            this.canvas.classList.add('heatwave');
            this.heatDistortion = Utils.lerp(this.heatDistortion, 0.5, 0.03);
        } else {
            this.heatDistortion = Utils.lerp(this.heatDistortion, 0, 0.05);
        }

        // Spawn wind particles
        if ((this.currentWeather === WEATHER.LOO ||
            this.currentWeather === WEATHER.SANDSTORM) &&
            Math.random() < 0.25 * this.getIntensity()) {
            this.spawnWindParticle();
            if (Math.random() < 0.01) this.game.audio.playWind();
        }
    }

    spawnWindParticle() {
        const w = this.game.canvas.logicalWidth || this.game.canvas.width;
        const h = this.game.canvas.logicalHeight || this.game.canvas.height;
        this.particles.push({
            x: w + 10,
            y: Utils.random(0, h),
            speed: Utils.random(12, 22),
            size: Utils.random(2, 5),
            alpha: Utils.random(0.3, 0.6)
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x -= p.speed;
            if (p.x < -20) this.particles.splice(i, 1);
        }
        // Limit particles
        if (this.particles.length > 80) {
            this.particles = this.particles.slice(-80);
        }
    }

    draw(ctx) {
        const w = this.game.canvas.logicalWidth || ctx.canvas.width;
        const h = this.game.canvas.logicalHeight || ctx.canvas.height;

        // Draw wind particles
        ctx.fillStyle = 'rgba(200, 160, 100, 0.5)';
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Visibility overlay
        if (this.visibility < 1) {
            ctx.fillStyle = `rgba(180, 150, 100, ${(1 - this.visibility) * 0.55})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Heat shimmer
        if (this.heatDistortion > 0.1) {
            const time = Date.now() * 0.003;
            ctx.save();
            ctx.globalAlpha = this.heatDistortion * 0.2;
            ctx.strokeStyle = '#FFE4B5';
            ctx.lineWidth = 2;
            for (let x = 0; x < w; x += 50) {
                const wave = Math.sin(time + x * 0.06) * 4;
                ctx.beginPath();
                ctx.moveTo(x, h - 110 + wave);
                ctx.lineTo(x, h - 80 + wave);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    updateUI() {
        const icons = {
            [WEATHER.CLEAR]: '☀️',
            [WEATHER.LOO]: '🌬️',
            [WEATHER.HEATWAVE]: '🔥',
            [WEATHER.SANDSTORM]: '🌪️'
        };
        const texts = {
            [WEATHER.CLEAR]: 'Clear',
            [WEATHER.LOO]: 'Loo',
            [WEATHER.HEATWAVE]: 'Heat',
            [WEATHER.SANDSTORM]: 'Storm'
        };
        if (this.weatherIcon) this.weatherIcon.textContent = icons[this.currentWeather];
        if (this.weatherText) this.weatherText.textContent = texts[this.currentWeather];
    }

    // Color palettes for each weather
    getPalette() {
        const palettes = {
            [WEATHER.CLEAR]: {
                skyTop: '#87CEEB',
                skyBottom: '#F5DEB3',
                sand: '#E8C98B'
            },
            [WEATHER.LOO]: {
                skyTop: '#C9A86C',
                skyBottom: '#E8C98B',
                sand: '#D4B896'
            },
            [WEATHER.HEATWAVE]: {
                skyTop: '#FF8C42',
                skyBottom: '#FFDAB9',
                sand: '#E8D4A8'
            },
            [WEATHER.SANDSTORM]: {
                skyTop: '#A08060',
                skyBottom: '#C9A86C',
                sand: '#B09070'
            }
        };
        return palettes[this.currentWeather] || palettes[WEATHER.CLEAR];
    }
}

// RENDERER
class Renderer {
    constructor(game) {
        this.game = game;
        this.scrollX = 0;
    }

    update(deltaTime) {
        this.scrollX += this.game.gameSpeed;
    }

    draw() {
        const ctx = this.game.ctx;
        const w = this.game.canvas.logicalWidth || this.game.canvas.width;
        const h = this.game.canvas.logicalHeight || this.game.canvas.height;
        const groundY = h - CONFIG.GROUND_Y_OFFSET;

        ctx.clearRect(0, 0, w, h);

        // Sky gradient
        const palette = this.game.weather.getPalette();
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, palette.skyTop);
        skyGrad.addColorStop(1, palette.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Sun
        ctx.fillStyle = CONFIG.COLORS.SUN;
        ctx.beginPath();
        ctx.arc(w * 0.82, 65, 32, 0, Math.PI * 2);
        ctx.fill();

        // Simple dunes (parallax)
        this.drawDunes(ctx, w, h, palette);

        // Ground
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
        groundGrad.addColorStop(0, palette.sand);
        groundGrad.addColorStop(1, CONFIG.COLORS.SAND_DARK);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground line
        ctx.strokeStyle = CONFIG.COLORS.GROUND_LINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();
    }

    drawDunes(ctx, w, h, palette) {
        // Far dunes
        ctx.fillStyle = CONFIG.COLORS.SAND_LIGHT;
        const offset1 = (this.scrollX * 0.08) % (w * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -offset1; x <= w + 100; x += 90) {
            const duneY = h * 0.4 + Math.sin((x + offset1) * 0.012) * 25;
            ctx.lineTo(x, duneY);
        }
        ctx.lineTo(w + 100, h);
        ctx.closePath();
        ctx.fill();

        // Near dunes
        ctx.fillStyle = palette.sand;
        const offset2 = (this.scrollX * 0.25) % (w * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -offset2; x <= w + 100; x += 70) {
            const duneY = h * 0.6 + Math.sin((x + offset2) * 0.018) * 20;
            ctx.lineTo(x, duneY);
        }
        ctx.lineTo(w + 100, h);
        ctx.closePath();
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = 'start';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('desertNomadHighScore') || '0');
        this.gameSpeed = CONFIG.INITIAL_SPEED;

        this.lastTime = 0;
        this.deltaTime = 0;

        // Subsystems
        this.audio = new AudioManager();
        this.input = new InputHandler(this);
        this.player = new Player(this);
        this.obstacles = new ObstacleManager(this);
        this.weather = new WeatherSystem(this);
        this.renderer = new Renderer(this);

        // UI
        this.scoreDisplay = document.getElementById('score');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');
        this.startScreen = document.getElementById('start-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');

        this.setupButtons();
        this.setupResize();
        this.resize();

        // Start render loop
        this.renderLoop();
    }

    setupButtons() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());

        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const muted = this.audio.toggleMute();
                soundToggle.textContent = muted ? 'OFF' : 'ON';
                soundToggle.setAttribute('aria-pressed', !muted);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.state === 'playing') this.togglePause();
            if (e.code === 'KeyP' && (this.state === 'playing' || this.state === 'paused')) {
                this.togglePause();
            }
        });
    }

    setupResize() {
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.canvas.logicalWidth = rect.width;
        this.canvas.logicalHeight = rect.height;

        if (this.player) {
            this.player.groundY = rect.height - CONFIG.GROUND_Y_OFFSET;
            if (this.player.isGrounded) {
                this.player.y = this.player.groundY - this.player.height;
            }
        }
    }

    start() {
        this.audio.init();
        this.state = 'playing';
        this.startScreen.classList.remove('active');
        this.lastTime = performance.now();
        this.gameLoop();
    }

    restart() {
        this.score = 0;
        this.gameSpeed = CONFIG.INITIAL_SPEED;
        this.player.reset();
        this.obstacles.reset();
        this.weather.reset();
        this.updateScore();
        this.gameoverScreen.classList.remove('active');
        this.state = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.pauseScreen.classList.add('active');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.pauseScreen.classList.remove('active');
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.audio.playHit();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('desertNomadHighScore', Math.floor(this.highScore).toString());
        }

        this.finalScoreDisplay.textContent = Math.floor(this.score);
        this.highScoreDisplay.textContent = Math.floor(this.highScore);
        this.gameoverScreen.classList.add('active');
    }

    gameLoop() {
        if (this.state !== 'playing') return;

        const now = performance.now();
        this.deltaTime = Math.min(now - this.lastTime, 50);
        this.lastTime = now;

        this.update(this.deltaTime);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }

    renderLoop() {
        if (this.state === 'start' || this.state === 'paused') {
            this.draw();
        }
        requestAnimationFrame(() => this.renderLoop());
    }

    update(deltaTime) {
        // Speed progression
        const tier = this.obstacles.currentTier;
        const targetSpeed = CONFIG.INITIAL_SPEED * tier.speedMult;
        this.gameSpeed = Utils.lerp(this.gameSpeed, targetSpeed, 0.01);
        this.gameSpeed += CONFIG.SPEED_INCREMENT * deltaTime;
        this.gameSpeed = Math.min(CONFIG.MAX_SPEED, this.gameSpeed);

        // Score
        this.score += this.gameSpeed * 0.1;
        this.updateScore();

        // Update subsystems
        this.renderer.update(deltaTime);
        this.weather.update(deltaTime);
        this.player.update(deltaTime);
        this.obstacles.update(deltaTime);

        // Collisions
        if (this.obstacles.checkCollisions(this.player)) {
            this.gameOver();
        }
    }

    draw() {
        this.renderer.draw();
        this.obstacles.draw(this.ctx);
        this.player.draw(this.ctx);
        this.weather.draw(this.ctx);

        // Debug overlay
        if (CONFIG.DEBUG_MODE) {
            this.drawDebug();
        }
    }

    drawDebug() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.fillStyle = '#0f0';
        ctx.font = '11px monospace';
        ctx.fillText(`Weather: ${this.weather.currentWeather}`, 20, 28);
        ctx.fillText(`Wind: ${this.weather.windStrength.toFixed(1)}`, 20, 42);
        ctx.fillText(`Intensity: ${(this.weather.getIntensity() * 100).toFixed(0)}%`, 20, 56);
        ctx.fillText(`Speed: ${this.gameSpeed.toFixed(2)}`, 20, 70);
        ctx.fillText(`FPS: ${(1000 / this.deltaTime).toFixed(0)}`, 20, 84);
    }

    updateScore() {
        this.scoreDisplay.textContent = Math.floor(this.score);
    }
}
 
// init
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
