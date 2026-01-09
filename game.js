'use strict';

const CONFIG = {
    GRAVITY: 0.6,              
    JUMP_FORCE: -14,           
    DOUBLE_JUMP_FORCE: -11,    
    GROUND_Y_OFFSET: 100,      
    COYOTE_TIME: 100,         
    INITIAL_SPEED: 4,          
    MAX_SPEED: 14,             
    SPEED_INCREMENT: 0.0003,   

    DIFFICULTY_TIERS: [
        { score: 0, speedMult: 1.0, label: 'Calm' },
        { score: 500, speedMult: 1.1, label: 'Easy' },
        { score: 1500, speedMult: 1.25, label: 'Medium' },
        { score: 3000, speedMult: 1.45, label: 'Hard' },
        { score: 5000, speedMult: 1.7, label: 'Expert' }
    ],

    // PLAYER DIMENSIONS
    PLAYER_X: 100,             // Fixed X position
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 70,
    DUCK_HEIGHT: 35,

    // Collision hitbox padding 
    HITBOX_PADDING: 12,       

    // OBSTACLES 
    MIN_OBSTACLE_GAP: 450,     
    MAX_OBSTACLE_GAP: 750,  
    OBSTACLE_WARNING_DISTANCE: 500, 

    FIRST_OBSTACLE_DELAY: 200, 

    RECOVERY_GAP_AFTER_HARD: 200, 

    // WEATHER SYSTEM
    WEATHER_CHANGE_INTERVAL: 2000,   
    WEATHER_TRANSITION_DURATION: 3000, 
    WEATHER_GRACE_PERIOD: 1000,       

    WEATHER_BASE_WIND: 1.5,            
    WEATHER_BASE_SANDSTORM: 3,        

    TARGET_FPS: 60,
    PARALLAX_LAYERS: 3,
    DEBUG_MODE: false,  

    // Colors 
    COLORS: {
        SKY_TOP: '#87CEEB',
        SKY_BOTTOM: '#F5DEB3',
        SAND_LIGHT: '#F4E4C1',
        SAND_MEDIUM: '#E8C98B',
        SAND_DARK: '#C9A86C',
        OCHRE: '#CC8B3C',
        BURNT_ORANGE: '#D4652F',
        DUNE_SHADOW: '#8B6E4E',
        PLAYER: '#2D1F14',
        OBSTACLE: '#1A120B',
        CACTUS: '#2D5016',
        SUN: '#FFD93D'
    }
};

// Weather states enum
const WEATHER = {
    CLEAR: 'clear',
    WINDY: 'windy',
    HEATWAVE: 'heatwave',
    SANDSTORM: 'sandstorm'
};

// Obstacle types enum
const OBSTACLE_TYPE = {
    CACTUS: 'cactus',
    ROCK: 'rock',
    SNAKE: 'snake',
    SCORPION: 'scorpion',
    QUICKSAND: 'quicksand',
    TUMBLEWEED: 'tumbleweed'
};

// UTILITY FUNCTIONS
const Utils = {
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    lerp: (start, end, t) => start + (end - start) * t,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

    // Collision detection (AABB)
    checkCollision: (a, b) => {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    },

    // Easing functions
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2
};

// AUDIO MANAGER
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
        this.muted = false;
        this.lastWindPlayTime = 0;
        this.windPlayInterval = 300; 
    }

    init() {
        if (!this.initialized) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.initialized = true;
            } catch (e) {
                console.warn('AudioContext not supported');
                this.enabled = false;
            }
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Generates a simple beep/tone
    playTone(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.enabled || !this.ctx || this.muted) return;

        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    }

    playJump() {
        this.playTone(400, 0.15, 'sine', 0.08);
        setTimeout(() => this.playTone(500, 0.1, 'sine', 0.05), 50);
    }

    playLand() {
        this.playTone(150, 0.1, 'triangle', 0.1);
    }

    playHit() {
        this.playTone(100, 0.3, 'sawtooth', 0.15);
        this.playTone(80, 0.2, 'square', 0.1);
    }

    playWarning() {
        this.playTone(600, 0.1, 'square', 0.05);
    }

    playWindAmbient(intensity) {
        if (!this.enabled || !this.ctx || this.muted) return;

        // Throttle wind sounds to prevent audio spam
        const now = Date.now();
        if (now - this.lastWindPlayTime < this.windPlayInterval) return;
        this.lastWindPlayTime = now;

        // Create noise-like sound for wind
        const duration = 0.5;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80 + intensity * 50, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(intensity * 0.02, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    }
}

// INPUT HANDLER like Keyboard & Touch
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.touchStartY = 0;
        this.touchStartTime = 0;

        this.bindEvents();
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Touch events
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Mouse click as fallback for touch
        canvas.addEventListener('mousedown', () => this.handleTap());

        // Mobile control buttons
        const jumpBtn = document.getElementById('jump-btn');
        const duckBtn = document.getElementById('duck-btn');

        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleJump();
            }, { passive: false });
            jumpBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleJump();
            });
        }

        if (duckBtn) {
            duckBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDuck(true);
            }, { passive: false });
            duckBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDuck(false);
            }, { passive: false });
            duckBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleDuck(true);
            });
            duckBtn.addEventListener('mouseup', () => {
                this.handleDuck(false);
            });
            duckBtn.addEventListener('mouseleave', () => {
                this.handleDuck(false);
            });
        }
    }

    handleKeyDown(e) {
        if (this.keys[e.code]) return; 

        this.keys[e.code] = true;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.handleJump();
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                this.handleDuck(true);
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;

        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.handleDuck(false);
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchEndY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;

        if (deltaTime < 300) {
            if (deltaY > 50) {
                this.handleDuck(true);
                setTimeout(() => this.handleDuck(false), 500);
            } else {
                this.handleTap();
            }
        }
    }

    handleTap() {
        if (this.game.state === 'gameover') {
            this.game.restart();
        } else if (this.game.state === 'playing') {
            this.handleJump();
        }
    }

    handleJump() {
        if (this.game.state === 'playing') {
            this.game.player.jump();
        }
    }

    handleDuck(isDucking) {
        if (this.game.state === 'playing') {
            this.game.player.duck(isDucking);
        }
    }

    isDown(code) {
        return this.keys[code] === true;
    }
}

// PLAYER CLASS
class Player {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.x = CONFIG.PLAYER_X;
        this.y = 0;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.velocityY = 0;
        this.velocityX = 0;

        this.isGrounded = true;
        this.isDucking = false;
        this.canDoubleJump = true;
        this.wasGrounded = true;

        // Animation state
        this.runFrame = 0;
        this.frameTimer = 0;
        this.jumpSquash = 1;

        // Quicksand state
        this.inQuicksand = false;
        this.quicksandTimer = 0;

        // Allows late jumps for a short grace period
        this.timeSinceGrounded = 0;
        this.coyoteTimeActive = false;

        // Position Y based on ground 
        const canvasHeight = this.game.canvas.logicalHeight || this.game.canvas.height;
        this.groundY = canvasHeight - CONFIG.GROUND_Y_OFFSET;
        this.y = this.groundY - this.height;
    }

    jump() {
        if (this.inQuicksand) {
            // Escape quicksand with a smaller jump
            this.inQuicksand = false;
            this.velocityY = CONFIG.JUMP_FORCE * 0.7;
            this.isGrounded = false;
            this.coyoteTimeActive = false;
            this.game.audio.playJump();
            return;
        }

        // Check if player can perform a ground jump
        const canGroundJump = this.isGrounded || this.coyoteTimeActive;

        if (canGroundJump) {
            // First jump (or coyote time jump)
            this.velocityY = CONFIG.JUMP_FORCE;
            this.isGrounded = false;
            this.coyoteTimeActive = false; 
            this.canDoubleJump = true;
            this.jumpSquash = 0.7;
            this.game.audio.playJump();
            this.game.onTutorialJump(); 
        } else if (this.canDoubleJump) {
            // Double jump
            this.velocityY = CONFIG.DOUBLE_JUMP_FORCE;
            this.canDoubleJump = false;
            this.jumpSquash = 0.8;
            this.game.audio.playJump();
        }
    }

    duck(isDucking) {
        if (this.isDucking === isDucking) return;

        this.isDucking = isDucking;

        if (isDucking) {
            // Shrink hitbox when ducking
            const heightDiff = this.height - CONFIG.DUCK_HEIGHT;
            this.height = CONFIG.DUCK_HEIGHT;
            this.y += heightDiff; 
            this.game.onTutorialDuck(); 
        } else {
            // Stand back up
            this.height = CONFIG.PLAYER_HEIGHT;
            this.y = this.calculateGroundedY();
        }
    }

    calculateGroundedY() {
        return this.groundY - this.height;
    }

    update(deltaTime) {
        const weather = this.game.weather;

        // Update ground position (in case of resize)
        this.groundY = (this.game.canvas.logicalHeight || this.game.canvas.height) - CONFIG.GROUND_Y_OFFSET;

        // Apply gravity with weather modifiers
        let gravity = CONFIG.GRAVITY;
        if (weather.currentWeather === WEATHER.WINDY) {
            gravity *= 0.8; // Even floatier jumps in wind (was 0.85)
        }

        if (!this.isGrounded) {
            this.velocityY += gravity;

            // Track coyote time: how long since we left the ground
            this.timeSinceGrounded += deltaTime;

            // Coyote time is active only in the first few ms after leaving ground
            // and only if we haven't already jumped (velocityY would be negative)
            if (this.timeSinceGrounded <= CONFIG.COYOTE_TIME && this.velocityY >= 0) {
                this.coyoteTimeActive = true;
            } else {
                this.coyoteTimeActive = false;
            }

            // Wind horizontal drift (scaled by weather intensity factor)
            // Weather effects are reduced early game via weatherIntensity
            const weatherIntensity = weather.getIntensityScale();

            if (weather.currentWeather === WEATHER.WINDY) {
                // Reduced wind drift: was windStrength * 0.5
                this.velocityX = weather.windStrength * 0.3 * weatherIntensity;
            } else if (weather.currentWeather === WEATHER.SANDSTORM) {
                // Reduced sandstorm push: was -windStrength * 2
                this.velocityX = -weather.windStrength * 0.8 * weatherIntensity;
            } else {
                this.velocityX = 0;
            }
        }

        // Apply velocities
        this.y += this.velocityY;
        this.x += this.velocityX;

        // Keep player in bounds horizontally
        this.x = Utils.clamp(this.x, 50, CONFIG.PLAYER_X + 50);

        // Ground collision
        const groundedY = this.calculateGroundedY();
        if (this.y >= groundedY) {
            this.y = groundedY;
            this.velocityY = 0;

            if (!this.isGrounded) {
                // Just landed
                this.game.audio.playLand();
                this.jumpSquash = 1.2;
            }

            this.isGrounded = true;
            this.timeSinceGrounded = 0; // Reset coyote timer when grounded
            this.coyoteTimeActive = false;
            this.x = Utils.lerp(this.x, CONFIG.PLAYER_X, 0.1); // Return to position
        }

        // Quicksand effect
        if (this.inQuicksand) {
            this.quicksandTimer += deltaTime;
            // Slowly sink and slow down
        }

        // Squash and stretch animation
        this.jumpSquash = Utils.lerp(this.jumpSquash, 1, 0.15);

        // Running animation
        if (this.isGrounded && !this.isDucking) {
            this.frameTimer += deltaTime * this.game.gameSpeed;
            if (this.frameTimer > 100) {
                this.runFrame = (this.runFrame + 1) % 4;
                this.frameTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Apply squash/stretch
        ctx.translate(centerX, this.y + this.height);
        ctx.scale(1 / this.jumpSquash, this.jumpSquash);
        ctx.translate(-centerX, -(this.y + this.height));

        // Draw silhouette style character
        ctx.fillStyle = CONFIG.COLORS.PLAYER;

        if (this.isDucking) {
            // Ducking pose - rolled/crouched
            this.drawDuckingPose(ctx);
        } else {
            // Standing/running pose
            this.drawRunningPose(ctx);
        }

        ctx.restore();

        // Draw dust particles when running
        if (this.isGrounded && !this.isDucking) {
            this.drawDust(ctx);
        }
    }

    drawRunningPose(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Body (simplified human/traveler form)
        ctx.beginPath();

        // Head
        const headRadius = w * 0.25;
        const headY = y + headRadius + 5;
        ctx.arc(x + w / 2, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Neck and body
        ctx.fillRect(x + w * 0.35, headY + headRadius - 5, w * 0.3, h * 0.4);

        // Cloak/robe (triangular shape)
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + h * 0.35);
        ctx.lineTo(x + w * 0.8, y + h * 0.35);
        ctx.lineTo(x + w * 0.75, y + h);
        ctx.lineTo(x + w * 0.25, y + h);
        ctx.closePath();
        ctx.fill();

        // Legs (animated)
        const legOffset = Math.sin(this.runFrame * Math.PI / 2) * 8;
        ctx.fillRect(x + w * 0.3, y + h - 20, 8, 20);
        ctx.fillRect(x + w * 0.55, y + h - 20 + legOffset * 0.5, 8, 20 - legOffset * 0.5);

        // Walking stick
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.PLAYER;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.8, y + h * 0.4);
        ctx.lineTo(x + w * 0.9, y + h + 5);
        ctx.stroke();
        ctx.restore();
    }

    drawDuckingPose(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Rolled/crouched shape
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head peeking
        ctx.beginPath();
        ctx.arc(x + w * 0.3, y + h * 0.3, h * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDust(ctx) {
        // Simple dust particles behind player
        ctx.fillStyle = 'rgba(200, 168, 108, 0.4)';
        const dustX = this.x - 10;
        const dustY = this.y + this.height - 5;

        for (let i = 0; i < 3; i++) {
            const size = Utils.random(2, 5);
            const offsetX = Utils.random(-20, -5);
            const offsetY = Utils.random(-10, 5);
            ctx.beginPath();
            ctx.arc(dustX + offsetX - i * 8, dustY + offsetY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getHitbox() {
        // Collision hitbox is smaller than visual sprite for fairness
        const padding = CONFIG.HITBOX_PADDING;
        return {
            x: this.x + padding,
            y: this.y + padding,
            width: this.width - padding * 2,
            height: this.height - padding * 2
        };
    }
}

// OBSTACLE CLASS 
class Obstacle {
    constructor(type, x, groundY, gameSpeed) {
        this.type = type;
        this.x = x;
        this.groundY = groundY;
        this.active = true;
        this.warned = false;

        // Set properties based on type
        this.initByType(type, gameSpeed);
    }

    initByType(type, gameSpeed) {
        switch (type) {
            case OBSTACLE_TYPE.CACTUS:
                this.width = 30;
                this.height = Utils.randomInt(50, 80);
                this.y = this.groundY - this.height;
                this.speedMultiplier = 1;
                this.canJumpOver = true;
                this.canDuckUnder = false;
                break;

            case OBSTACLE_TYPE.ROCK:
                this.width = Utils.randomInt(40, 60);
                this.height = Utils.randomInt(25, 40);
                this.y = this.groundY - this.height;
                this.speedMultiplier = 1;
                this.canJumpOver = true;
                this.canDuckUnder = false;
                break;

            case OBSTACLE_TYPE.SNAKE:
                this.width = 50;
                this.height = 15;
                this.y = this.groundY - this.height;
                this.speedMultiplier = 1.3; // Moves faster
                this.animFrame = 0;
                this.canJumpOver = true;
                this.canDuckUnder = false;
                break;

            case OBSTACLE_TYPE.SCORPION:
                this.width = 35;
                this.height = 20;
                this.y = this.groundY - this.height;
                this.speedMultiplier = 1.1;
                this.animFrame = 0;
                this.canJumpOver = true;
                this.canDuckUnder = false;
                break;

            case OBSTACLE_TYPE.QUICKSAND:
                this.width = 100;
                this.height = 10;
                this.y = this.groundY - 5;
                this.speedMultiplier = 1;
                this.canJumpOver = true;
                this.canDuckUnder = false;
                this.isHazardZone = true;
                this.cachedGradient = null; // Will be created on first draw
                this.animTime = 0; // For deterministic animation
                break;

            case OBSTACLE_TYPE.TUMBLEWEED:
                this.width = 40;
                this.height = 40;
                // Flying tumbleweed - must duck
                this.y = this.groundY - Utils.randomInt(45, 70);
                this.speedMultiplier = 0.8;
                this.rotation = 0;
                this.canJumpOver = false;
                this.canDuckUnder = true;
                break;
        }
    }

    update(gameSpeed, deltaTime) {
        // Move obstacle toward player
        this.x -= gameSpeed * this.speedMultiplier;

        // Animate moving obstacles
        if (this.type === OBSTACLE_TYPE.SNAKE || this.type === OBSTACLE_TYPE.SCORPION) {
            this.animFrame += deltaTime * 0.01;
        }

        // Update quicksand animation time (deterministic, pauses when game pauses)
        if (this.type === OBSTACLE_TYPE.QUICKSAND) {
            this.animTime += deltaTime * 0.005;
        }

        if (this.type === OBSTACLE_TYPE.TUMBLEWEED) {
            this.rotation += gameSpeed * 0.1;
            // Slight bounce
            this.y += Math.sin(this.animFrame || 0) * 0.5;
            this.animFrame = (this.animFrame || 0) + 0.1;
        }

        // Deactivate if off screen
        if (this.x + this.width < -50) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();

        switch (this.type) {
            case OBSTACLE_TYPE.CACTUS:
                this.drawCactus(ctx);
                break;
            case OBSTACLE_TYPE.ROCK:
                this.drawRock(ctx);
                break;
            case OBSTACLE_TYPE.SNAKE:
                this.drawSnake(ctx);
                break;
            case OBSTACLE_TYPE.SCORPION:
                this.drawScorpion(ctx);
                break;
            case OBSTACLE_TYPE.QUICKSAND:
                this.drawQuicksand(ctx);
                break;
            case OBSTACLE_TYPE.TUMBLEWEED:
                this.drawTumbleweed(ctx);
                break;
        }

        // Warning shadow for incoming obstacles
        if (!this.warned && this.x < CONFIG.OBSTACLE_WARNING_DISTANCE && this.x > 200) {
            this.drawWarningShadow(ctx);
        }

        ctx.restore();
    }

    drawCactus(ctx) {
        ctx.fillStyle = CONFIG.COLORS.CACTUS;

        // Main trunk
        const trunkWidth = this.width * 0.5;
        ctx.fillRect(
            this.x + (this.width - trunkWidth) / 2,
            this.y,
            trunkWidth,
            this.height
        );

        // Arms
        if (this.height > 55) {
            // Left arm
            ctx.fillRect(this.x, this.y + this.height * 0.3, this.width * 0.35, 10);
            ctx.fillRect(this.x, this.y + this.height * 0.15, 10, this.height * 0.2);

            // Right arm
            ctx.fillRect(this.x + this.width * 0.65, this.y + this.height * 0.5, this.width * 0.35, 10);
            ctx.fillRect(this.x + this.width - 10, this.y + this.height * 0.35, 10, this.height * 0.2);
        }
    }

    drawRock(ctx) {
        ctx.fillStyle = CONFIG.COLORS.DUNE_SHADOW;

        // Jagged rock shape
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.3);
        ctx.lineTo(this.x + this.width * 0.4, this.y);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.2);
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Highlight
        ctx.fillStyle = CONFIG.COLORS.SAND_DARK;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.3, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width * 0.4, this.y + this.height * 0.2);
        ctx.lineTo(this.x + this.width * 0.6, this.y + this.height * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    drawSnake(ctx) {
        ctx.fillStyle = CONFIG.COLORS.BURNT_ORANGE;

        // Wavy snake body
        const segments = 5;
        const segWidth = this.width / segments;
        const waveOffset = Math.sin(this.animFrame) * 3;

        for (let i = 0; i < segments; i++) {
            const segY = this.y + Math.sin(this.animFrame + i) * 3;
            ctx.beginPath();
            ctx.ellipse(
                this.x + i * segWidth + segWidth / 2,
                segY + this.height / 2,
                segWidth / 2 + 2,
                this.height / 2,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Head
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width - 5, this.y + this.height / 2 + waveOffset, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawScorpion(ctx) {
        ctx.fillStyle = CONFIG.COLORS.OBSTACLE;

        // Body
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height * 0.6, this.width * 0.35, this.height * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail (curved)
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.3, this.y + this.height * 0.5);
        const tailWave = Math.sin(this.animFrame * 2) * 3;
        ctx.quadraticCurveTo(
            this.x - 10 + tailWave, this.y + this.height * 0.3,
            this.x + 5, this.y - 5
        );
        ctx.lineWidth = 4;
        ctx.strokeStyle = CONFIG.COLORS.OBSTACLE;
        ctx.stroke();

        // Stinger
        ctx.fillStyle = CONFIG.COLORS.BURNT_ORANGE;
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Claws
        ctx.strokeStyle = CONFIG.COLORS.OBSTACLE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.7, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width + 5, this.y + this.height * 0.3);
        ctx.stroke();
    }

    drawQuicksand(ctx) {
        // Cache gradient for performance (created once per obstacle)
        if (!this.cachedGradient) {
            this.cachedGradient = ctx.createLinearGradient(0, 0, 0, this.height + 20);
            this.cachedGradient.addColorStop(0, 'rgba(139, 110, 78, 0.3)');
            this.cachedGradient.addColorStop(1, 'rgba(139, 110, 78, 0.8)');
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.cachedGradient;
        ctx.fillRect(0, 0, this.width, this.height + 15);
        ctx.restore();

        // Bubbling effect (uses deterministic animTime instead of Date.now())
        ctx.fillStyle = 'rgba(100, 80, 50, 0.5)';
        const bubbleOffset = Math.sin(this.animTime) * 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.3, this.y + bubbleOffset, 4, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.7, this.y + 5 - bubbleOffset, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTumbleweed(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        ctx.strokeStyle = CONFIG.COLORS.OCHRE;
        ctx.lineWidth = 2;

        // Tangled branches
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const radius = this.width * 0.4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            ctx.stroke();

            // Sub-branches
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
            ctx.lineTo(Math.cos(angle + 0.3) * radius * 0.8, Math.sin(angle + 0.3) * radius * 0.8);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawWarningShadow(ctx) {
        // Subtle shadow on ground to telegraph incoming obstacle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width / 2,
            this.groundY + 5,
            this.width * 0.8,
            8,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    getHitbox() {
        // Different hitboxes for different types
        let padding = 5;
        if (this.type === OBSTACLE_TYPE.QUICKSAND) {
            padding = 10; // More forgiving
        }
        return {
            x: this.x + padding,
            y: this.y + padding,
            width: this.width - padding * 2,
            height: this.height - padding * 2
        };
    }
}

// OBSTACLE MANAGER 
class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = [];
        this.spawnTimer = 0;
        // First obstacle is delayed to give new players time to learn controls
        this.nextSpawnDistance = CONFIG.FIRST_OBSTACLE_DELAY;
        this.difficulty = 1;
        this.currentTier = CONFIG.DIFFICULTY_TIERS[0];

        // Track last obstacle for anti-stacking logic
        this.lastObstacleType = null;
        this.lastWasHard = false;
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
        // First obstacle is delayed to give new players time to learn controls
        this.nextSpawnDistance = CONFIG.FIRST_OBSTACLE_DELAY;
        this.difficulty = 1;
        this.currentTier = CONFIG.DIFFICULTY_TIERS[0];
        this.lastObstacleType = null;
        this.lastWasHard = false;
    }

    // This creates a step-based progression instead of linear
    getDifficultyTier() {
        const score = this.game.score;
        let tier = CONFIG.DIFFICULTY_TIERS[0];

        for (const t of CONFIG.DIFFICULTY_TIERS) {
            if (score >= t.score) {
                tier = t;
            }
        }

        return tier;
    }

    update(deltaTime) {
        const gameSpeed = this.game.gameSpeed;
        const groundY = (this.game.canvas.logicalHeight || this.game.canvas.height) - CONFIG.GROUND_Y_OFFSET;

        // Update spawn timer based on distance traveled
        this.spawnTimer += gameSpeed;

        // Update difficulty tier (step-based, not linear)
        this.currentTier = this.getDifficultyTier();

        // Calculate difficulty factor from tier
        this.difficulty = this.currentTier.speedMult;

        // Spawn new obstacles (but respect tutorial state)
        if (this.spawnTimer >= this.nextSpawnDistance && this.game.shouldSpawnObstacles()) {
            this.spawnObstacle(groundY);
            this.spawnTimer = 0;

            // Calculate next spawn distance
            // - Minimum gaps stay reasonable even at high difficulty
            const difficultyReduction = (this.difficulty - 1) * 50; // Gentle reduction
            const minGap = Math.max(350, CONFIG.MIN_OBSTACLE_GAP - difficultyReduction);
            const maxGap = Math.max(500, CONFIG.MAX_OBSTACLE_GAP - difficultyReduction);

            // Add recovery gap after hard obstacles (quicksand, tumbleweed)
            // This prevents frustrating back-to-back hard sections
            const recoveryBonus = this.lastWasHard ? CONFIG.RECOVERY_GAP_AFTER_HARD : 0;

            this.nextSpawnDistance = Utils.randomInt(minGap, maxGap) + recoveryBonus;
        }

        // Update all obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(gameSpeed, deltaTime);

            // Remove inactive obstacles (object pooling - return to pool)
            if (!obstacle.active) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstacle(groundY) {
        // Choose obstacle type based on difficulty and randomness
        const types = this.getAvailableTypes();
        let type = types[Utils.randomInt(0, types.length - 1)];

        // Anti-stacking: prevent same hard obstacle back-to-back
        // This ensures variety and recovery time
        const hardTypes = [OBSTACLE_TYPE.QUICKSAND, OBSTACLE_TYPE.TUMBLEWEED, OBSTACLE_TYPE.SCORPION];
        const isHardType = hardTypes.includes(type);

        if (isHardType && this.lastWasHard) {
            // Force an easy obstacle after a hard one
            type = Math.random() > 0.5 ? OBSTACLE_TYPE.CACTUS : OBSTACLE_TYPE.ROCK;
        }

        this.lastObstacleType = type;
        this.lastWasHard = hardTypes.includes(type);

        const x = (this.game.canvas.logicalWidth || this.game.canvas.width) + 50;
        const obstacle = new Obstacle(type, x, groundY, this.game.gameSpeed);

        this.obstacles.push(obstacle);
    }

    getAvailableTypes() {
        // Obstacle unlocking is now score-based for predictable progression
        const score = this.game.score;
        const types = [OBSTACLE_TYPE.CACTUS, OBSTACLE_TYPE.ROCK];

        // Snake
        if (score >= 500) {
            types.push(OBSTACLE_TYPE.SNAKE);
        }

        if (score >= 1500) {
            types.push(OBSTACLE_TYPE.SCORPION);
        }

        if (score >= 2000) {
            types.push(OBSTACLE_TYPE.TUMBLEWEED);
        }

        if (score >= 3500) {
            types.push(OBSTACLE_TYPE.QUICKSAND);
        }

        // Weather-based obstacle adjustments
        if (this.game.weather.currentWeather === WEATHER.SANDSTORM) {
            types.push(OBSTACLE_TYPE.TUMBLEWEED);
            types.push(OBSTACLE_TYPE.TUMBLEWEED); // More tumbleweeds in sandstorm
        }

        return types;
    }

    draw(ctx) {
        for (const obstacle of this.obstacles) {
            obstacle.draw(ctx);
        }
    }

    checkCollisions(player) {
        const playerHitbox = player.getHitbox();

        for (const obstacle of this.obstacles) {
            if (!obstacle.active) continue;

            const obstacleHitbox = obstacle.getHitbox();

            if (Utils.checkCollision(playerHitbox, obstacleHitbox)) {
                // Special handling for quicksand
                if (obstacle.type === OBSTACLE_TYPE.QUICKSAND) {
                    if (player.isGrounded) {
                        player.inQuicksand = true;
                        return false; // Not a fatal collision
                    }
                } else {
                    return true; // Collision detected
                }
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
        this.transitionProgress = 1;

        // Weather effect properties
        this.windStrength = 0;
        this.visibility = 1;
        this.heatIntensity = 0;

        // Particle systems for weather effects
        this.particles = [];

        // UI elements
        this.weatherIcon = document.getElementById('weather-icon');
        this.weatherText = document.getElementById('weather-text');
        this.weatherBanner = document.getElementById('weather-banner');
        this.weatherAnnouncement = document.getElementById('weather-announcement');
        this.canvas = document.getElementById('game-canvas');

        // Reduced motion preference
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.reducedEffects = false; // User toggle from settings
    }

    reset() {
        this.currentWeather = WEATHER.CLEAR;
        this.targetWeather = WEATHER.CLEAR;
        this.weatherTimer = 0;
        this.transitionProgress = 1;
        this.windStrength = 0;
        this.visibility = 1;
        this.heatIntensity = 0;
        this.particles = [];
        this.gameTime = 0; // Track total game time for intensity scaling
        this.updateUI();
        this.canvas.classList.remove('sandstorm', 'heatwave');
    }

    // Get weather intensity scale based on game time
    getIntensityScale() {
        const gracePeriod = CONFIG.WEATHER_GRACE_PERIOD; // 10000ms

        // During grace period: no weather effects at all
        if (this.gameTime < gracePeriod) {
            return 0;
        }

        // Ramp up from 0 to 1 over the next 35 seconds
        const rampDuration = 35000;
        const timeSinceGrace = this.gameTime - gracePeriod;

        return Math.min(1, timeSinceGrace / rampDuration);
    }

    update(deltaTime) {
        // Track total game time for intensity scaling
        this.gameTime += deltaTime;

        // Update weather change timer
        this.weatherTimer += deltaTime;

        // Check if it's time to change weather
        // But only after grace period - keeps early game calm
        if (this.weatherTimer >= CONFIG.WEATHER_CHANGE_INTERVAL &&
            this.gameTime > CONFIG.WEATHER_GRACE_PERIOD) {
            this.changeWeather();
            this.weatherTimer = 0;
        }

        // Handle weather transition
        if (this.transitionProgress < 1) {
            this.transitionProgress += deltaTime / CONFIG.WEATHER_TRANSITION_DURATION;
            this.transitionProgress = Math.min(1, this.transitionProgress);

            if (this.transitionProgress >= 1) {
                this.currentWeather = this.targetWeather;
                this.updateUI();
            }
        }

        // Update weather effects based on current state
        this.updateWeatherEffects(deltaTime);

        // Update particles
        this.updateParticles(deltaTime);
    }

    changeWeather() {
        const weathers = Object.values(WEATHER);
        let newWeather;

        // Don't repeat the same weather
        do {
            newWeather = weathers[Utils.randomInt(0, weathers.length - 1)];
        } while (newWeather === this.currentWeather);

        this.targetWeather = newWeather;
        this.transitionProgress = 0;

        // Show weather announcement banner
        this.showWeatherAnnouncement(newWeather);
    }

    showWeatherAnnouncement(weather) {
        const messages = {
            [WEATHER.CLEAR]: 'Clear skies ahead',
            [WEATHER.WINDY]: 'Wind picking up!',
            [WEATHER.HEATWAVE]: 'Heat wave incoming!',
            [WEATHER.SANDSTORM]: 'Sandstorm approaching!'
        };

        const message = messages[weather];

        // Visual banner (if not reduced motion)
        if (this.weatherBanner && !this.shouldReduceEffects()) {
            this.weatherBanner.textContent = message;
            this.weatherBanner.classList.add('active');
            setTimeout(() => {
                this.weatherBanner.classList.remove('active');
            }, 2500);
        }

        // Screen reader announcement
        if (this.weatherAnnouncement) {
            this.weatherAnnouncement.textContent = message;
        }
    }

    shouldReduceEffects() {
        return this.prefersReducedMotion || this.reducedEffects;
    }

    setReducedEffects(enabled) {
        this.reducedEffects = enabled;
    }

    updateWeatherEffects(deltaTime) {
        const weather = this.transitionProgress >= 1 ? this.currentWeather : this.targetWeather;
        const t = Utils.easeInOutSine(this.transitionProgress);

        // Get intensity scale: 0 during grace period, ramps to 1 over 45 seconds
        // This makes early-game weather gentle and late-game weather challenging
        const intensity = this.getIntensityScale();

        switch (weather) {
            case WEATHER.CLEAR:
                this.windStrength = Utils.lerp(this.windStrength, 0, 0.05);
                this.visibility = Utils.lerp(this.visibility, 1, 0.05);
                this.heatIntensity = Utils.lerp(this.heatIntensity, 0, 0.05);
                this.canvas.classList.remove('sandstorm', 'heatwave');
                break;

            case WEATHER.WINDY:
                // Wind strength scales with intensity (base: 1.5, max: 3)
                // Early game: gentle breeze. Late game: strong gusts.
                const targetWind = CONFIG.WEATHER_BASE_WIND + (CONFIG.WEATHER_BASE_WIND * intensity);
                this.windStrength = Utils.lerp(this.windStrength, targetWind, 0.05);
                this.visibility = Utils.lerp(this.visibility, 0.9, 0.05);
                this.heatIntensity = Utils.lerp(this.heatIntensity, 0, 0.05);
                this.canvas.classList.remove('sandstorm', 'heatwave');
                this.spawnWindParticles();
                break;

            case WEATHER.HEATWAVE:
                this.windStrength = Utils.lerp(this.windStrength, 0.5, 0.05);
                this.visibility = Utils.lerp(this.visibility, 0.95, 0.05);
                // Heat intensity also scales - less distortion early
                this.heatIntensity = Utils.lerp(this.heatIntensity, intensity, 0.05);
                this.canvas.classList.remove('sandstorm');
                // Only add heatwave effect if not reducing effects
                if (!this.shouldReduceEffects()) {
                    this.canvas.classList.add('heatwave');
                } else {
                    this.canvas.classList.remove('heatwave');
                }
                break;

            case WEATHER.SANDSTORM:
                // Sandstorm push scales with intensity (base: 3, max: 6)
                // Early game: mild sandstorm. Late game: severe.
                const targetSandstorm = CONFIG.WEATHER_BASE_SANDSTORM + (CONFIG.WEATHER_BASE_SANDSTORM * intensity);
                this.windStrength = Utils.lerp(this.windStrength, targetSandstorm, 0.03);
                // Visibility also scales - not as blinding early on
                const targetVisibility = Utils.lerp(0.7, 0.4, intensity);
                this.visibility = Utils.lerp(this.visibility, targetVisibility, 0.03);
                this.heatIntensity = Utils.lerp(this.heatIntensity, 0.3 * intensity, 0.05);
                this.canvas.classList.remove('heatwave');
                // Only add sandstorm shake if not reducing effects
                if (!this.shouldReduceEffects()) {
                    this.canvas.classList.add('sandstorm');
                } else {
                    this.canvas.classList.remove('sandstorm');
                }
                this.spawnSandParticles();
                break;
        }

        // Play wind ambient sound occasionally (only when wind is strong enough)
        if (this.windStrength > 2 && Math.random() < 0.02) {
            this.game.audio.playWindAmbient(this.windStrength / 6);
        }
    }

    spawnWindParticles() {
        if (Math.random() < 0.3) {
            this.particles.push({
                x: (this.game.canvas.logicalWidth || this.game.canvas.width) + 10,
                y: Utils.random(0, this.game.canvas.logicalHeight || this.game.canvas.height),
                speedX: -Utils.random(8, 15),
                speedY: Utils.random(-1, 1),
                size: Utils.random(1, 3),
                alpha: Utils.random(0.3, 0.6),
                type: 'wind'
            });
        }
    }

    spawnSandParticles() {
        for (let i = 0; i < 3; i++) {
            if (Math.random() < 0.5) {
                this.particles.push({
                    x: (this.game.canvas.logicalWidth || this.game.canvas.width) + Utils.random(0, 50),
                    y: Utils.random(0, this.game.canvas.logicalHeight || this.game.canvas.height),
                    speedX: -Utils.random(10, 20),
                    speedY: Utils.random(-2, 2),
                    size: Utils.random(2, 5),
                    alpha: Utils.random(0.4, 0.8),
                    type: 'sand'
                });
            }
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;

            // Remove off-screen particles
            if (p.x < -20) {
                this.particles.splice(i, 1);
            }
        }

        // Limit particle count
        if (this.particles.length > 100) {
            this.particles = this.particles.slice(-100);
        }
    }

    draw(ctx) {
        // Draw weather particles
        for (const p of this.particles) {
            if (p.type === 'wind') {
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + 20, p.y);
                ctx.stroke();
            } else if (p.type === 'sand') {
                ctx.fillStyle = `rgba(200, 168, 108, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw visibility overlay for sandstorm
        if (this.visibility < 1) {
            const alpha = (1 - this.visibility) * 0.6;
            ctx.fillStyle = `rgba(200, 168, 108, ${alpha})`;
            ctx.fillRect(0, 0, this.game.canvas.logicalWidth || ctx.canvas.width, this.game.canvas.logicalHeight || ctx.canvas.height);
        }

        // Heat distortion effect (rendered via canvas)
        if (this.heatIntensity > 0) {
            this.drawHeatDistortion(ctx);
        }
    }

    drawHeatDistortion(ctx) {
        // Simple heat shimmer lines
        const intensity = this.heatIntensity * 0.3;
        ctx.strokeStyle = `rgba(255, 200, 100, ${intensity * 0.1})`;
        ctx.lineWidth = 2;

        const groundY = (this.game.canvas.logicalHeight || this.game.canvas.height) - CONFIG.GROUND_Y_OFFSET;
        for (let x = 0; x < (this.game.canvas.logicalWidth || this.game.canvas.width); x += 30) {
            const wave = Math.sin(Date.now() * 0.003 + x * 0.05) * 5;
            ctx.beginPath();
            ctx.moveTo(x, groundY + 10);
            ctx.lineTo(x + wave, groundY + 30);
            ctx.stroke();
        }
    }

    updateUI() {
        const icons = {
            [WEATHER.CLEAR]: '☀️',
            [WEATHER.WINDY]: '💨',
            [WEATHER.HEATWAVE]: '🌡️',
            [WEATHER.SANDSTORM]: '🌪️'
        };

        const texts = {
            [WEATHER.CLEAR]: 'Clear',
            [WEATHER.WINDY]: 'Windy',
            [WEATHER.HEATWAVE]: 'Heat Wave',
            [WEATHER.SANDSTORM]: 'Sandstorm'
        };

        this.weatherIcon.textContent = icons[this.currentWeather];
        this.weatherText.textContent = texts[this.currentWeather];
    }
}

// Renderer for desert environment with parallax dunes, sun, and dynamic sky
class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;

        // Parallax scrolling layers
        this.layers = [
            { speed: 0.1, y: 0.3, color: '#DEB887' },  // Far dunes
            { speed: 0.3, y: 0.5, color: '#D2A66A' },  // Mid dunes
            { speed: 0.6, y: 0.7, color: '#C9A86C' }   // Near dunes
        ];

        this.scrollX = 0;
        this.sunY = 0;
    }

    update(deltaTime) {
        // Update scroll position for parallax
        this.scrollX += this.game.gameSpeed;

        // Subtle sun movement
        this.sunY = Math.sin(Date.now() * 0.0001) * 10;
    }

    draw() {
        const ctx = this.ctx;
        const w = this.game.canvas.logicalWidth || this.game.canvas.width;
        const h = this.game.canvas.logicalHeight || this.game.canvas.height;
        const groundY = h - CONFIG.GROUND_Y_OFFSET;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw sky gradient
        this.drawSky(ctx, w, h);

        // Draw sun
        this.drawSun(ctx, w);

        // Draw parallax dune layers
        this.drawDunes(ctx, w, h, groundY);

        // Draw ground
        this.drawGround(ctx, w, h, groundY);
    }

    drawSky(ctx, w, h) {
        const weather = this.game.weather;
        let topColor = CONFIG.COLORS.SKY_TOP;
        let bottomColor = CONFIG.COLORS.SKY_BOTTOM;

        // Adjust sky colors based on weather
        if (weather.currentWeather === WEATHER.SANDSTORM) {
            topColor = '#B8A070';
            bottomColor = '#D4B896';
        } else if (weather.currentWeather === WEATHER.HEATWAVE) {
            topColor = '#FFB347';
            bottomColor = '#FFDAB9';
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    drawSun(ctx, w) {
        const sunX = w * 0.8;
        const sunBaseY = 80 + this.sunY;

        // Sun glow
        const glowGradient = ctx.createRadialGradient(sunX, sunBaseY, 20, sunX, sunBaseY, 80);
        glowGradient.addColorStop(0, 'rgba(255, 217, 61, 0.6)');
        glowGradient.addColorStop(0.5, 'rgba(255, 217, 61, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 217, 61, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(sunX, sunBaseY, 80, 0, Math.PI * 2);
        ctx.fill();

        // Sun body
        ctx.fillStyle = CONFIG.COLORS.SUN;
        ctx.beginPath();
        ctx.arc(sunX, sunBaseY, 35, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDunes(ctx, w, h, groundY) {
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const offset = (this.scrollX * layer.speed) % (w * 0.5);
            const baseY = h * layer.y;

            ctx.fillStyle = layer.color;
            ctx.beginPath();
            ctx.moveTo(0, h);

            // Create wavy dune silhouettes
            for (let x = -offset; x <= w + 100; x += 100) {
                const duneHeight = 30 + Math.sin((x + offset) * 0.01 + i) * 20;
                ctx.lineTo(x, baseY + Math.sin((x + offset) * 0.02) * duneHeight);
            }

            ctx.lineTo(w + 100, h);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawGround(ctx, w, h, groundY) {
        // Main ground
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, h);
        groundGradient.addColorStop(0, CONFIG.COLORS.SAND_MEDIUM);
        groundGradient.addColorStop(0.3, CONFIG.COLORS.SAND_DARK);
        groundGradient.addColorStop(1, CONFIG.COLORS.DUNE_SHADOW);

        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground line highlight
        ctx.strokeStyle = CONFIG.COLORS.OCHRE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Scrolling ground texture (simple dots/pebbles)
        const offset = (this.scrollX * 0.8) % 50;
        ctx.fillStyle = 'rgba(139, 110, 78, 0.3)';

        for (let x = -offset; x < w + 50; x += 50) {
            const y = groundY + 20 + Math.sin(x * 0.1) * 5;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Controller Class - Main Game Logic
class Game {
    constructor() {
        // Get canvas and context
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.state = 'start'; // start, playing, paused, gameover
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.gameSpeed = CONFIG.INITIAL_SPEED;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;

        // Initialize subsystems
        this.audio = new AudioManager();
        this.input = new InputHandler(this);
        this.player = new Player(this);
        this.obstacles = new ObstacleManager(this);
        this.weather = new WeatherSystem(this);
        this.renderer = new Renderer(this);

        // UI Elements
        this.scoreDisplay = document.getElementById('score');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');

        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');

        // Buttons
        this.setupButtons();
        this.setupSettingsToggles();

        // Resize handling
        this.setupResize();
        this.resize();

        // Tutorial state
        this.tutorialComplete = this.loadTutorialState();
        this.tutorialStep = 0; // 0 = waiting for jump, 1 = waiting for duck, 2 = complete

        // Focus the start button for accessibility
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.focus();

        // Start render loop (but not game logic)
        this.renderLoop();
    }

    setupButtons() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === 'playing') this.togglePause();
            }
            if (e.code === 'Space') {
                if (this.state === 'start') {
                    e.preventDefault();
                    this.start();
                } else if (this.state === 'gameover') {
                    e.preventDefault();
                    this.restart();
                }
            }
            // P key for pause
            if (e.code === 'KeyP') {
                if (this.state === 'playing' || this.state === 'paused') {
                    this.togglePause();
                }
            }
        });
    }

    setupSettingsToggles() {
        const soundToggle = document.getElementById('sound-toggle');
        const effectsToggle = document.getElementById('effects-toggle');

        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const muted = this.audio.toggleMute();
                soundToggle.textContent = muted ? 'OFF' : 'ON';
                soundToggle.setAttribute('aria-pressed', !muted);
            });
        }

        if (effectsToggle) {
            effectsToggle.addEventListener('click', () => {
                const currentlyReduced = this.weather.reducedEffects;
                this.weather.setReducedEffects(!currentlyReduced);
                effectsToggle.textContent = !currentlyReduced ? 'ON' : 'OFF';
                effectsToggle.setAttribute('aria-pressed', !currentlyReduced);
            });
        }
    }

    setupResize() {
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // Get container dimensions
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();

        // Set canvas size with device pixel ratio for sharpness
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Scale context to match
        this.ctx.scale(dpr, dpr);

        // Store logical dimensions
        this.canvas.logicalWidth = rect.width;
        this.canvas.logicalHeight = rect.height;

        // Update player ground position
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
        // Reset game state
        this.score = 0;
        this.gameSpeed = CONFIG.INITIAL_SPEED;

        // Reset subsystems
        this.player.reset();
        this.obstacles.reset();
        this.weather.reset();

        // Reset UI
        this.updateScore();
        this.gameoverScreen.classList.remove('active');

        // Start game
        this.state = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.pauseScreen.classList.add('active');
            // Focus resume button for accessibility
            const resumeBtn = document.getElementById('resume-btn');
            if (resumeBtn) resumeBtn.focus();
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

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        // Show game over screen
        this.finalScoreDisplay.textContent = Math.floor(this.score);
        this.highScoreDisplay.textContent = Math.floor(this.highScore);
        this.gameoverScreen.classList.add('active');

        // Focus restart button for accessibility
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.focus();
    }

    gameLoop() {
        if (this.state !== 'playing') return;

        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time to prevent huge jumps
        this.deltaTime = Math.min(this.deltaTime, 50);

        this.update(this.deltaTime);
        this.draw();

        this.frameCount++;
        requestAnimationFrame(() => this.gameLoop());
    }

    renderLoop() {
        // Always render, even when not playing (for start screen)
        if (this.state === 'start' || this.state === 'paused') {
            this.draw();
        }
        requestAnimationFrame(() => this.renderLoop());
    }

    update(deltaTime) {
        // Get current difficulty tier for step-based speed scaling
        const tier = this.obstacles.currentTier;

        // Calculate target speed based on tier multiplier
        // Base speed is from CONFIG, then multiplied by tier factor
        // Example: at score 0 = 4 * 1.0 = 4, at score 500 = 4 * 1.1 = 4.4
        const targetSpeed = CONFIG.INITIAL_SPEED * tier.speedMult;

        // Smoothly lerp toward target speed (feels better than sudden jumps)
        this.gameSpeed = Utils.lerp(this.gameSpeed, targetSpeed, 0.01);
        this.gameSpeed += CONFIG.SPEED_INCREMENT * deltaTime;
        this.gameSpeed = Math.min(CONFIG.MAX_SPEED, this.gameSpeed);

        // Update score (distance traveled)
        this.score += this.gameSpeed * 0.1;
        this.updateScore();

        // Update subsystems
        this.renderer.update(deltaTime);
        this.weather.update(deltaTime);
        this.player.update(deltaTime);
        this.obstacles.update(deltaTime);

        // Check collisions
        if (this.obstacles.checkCollisions(this.player)) {
            this.gameOver();
        }
    }

    draw() {
        const ctx = this.ctx;

        // Draw background and environment
        this.renderer.draw();

        // Draw game objects
        this.obstacles.draw(ctx);
        this.player.draw(ctx);

        // Draw weather effects on top
        this.weather.draw(ctx);

        // Debug overlay (enable in CONFIG.DEBUG_MODE)
        if (CONFIG.DEBUG_MODE) {
            this.drawDebugInfo(ctx);
        }
    }

    // Debug information overlay
    drawDebugInfo(ctx) {
        const tier = this.obstacles.currentTier;
        const weatherIntensity = this.weather.getIntensityScale();

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 220, 100);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#00FF00';

        const lines = [
            `Speed: ${this.gameSpeed.toFixed(2)} / ${CONFIG.MAX_SPEED}`,
            `Tier: ${tier.label} (x${tier.speedMult})`,
            `Weather: ${this.weather.currentWeather} (${(weatherIntensity * 100).toFixed(0)}%)`,
            `Wind: ${this.weather.windStrength.toFixed(1)}`,
            `Score: ${Math.floor(this.score)}m`
        ];

        lines.forEach((line, i) => {
            ctx.fillText(line, 20, 28 + i * 16);
        });

        ctx.restore();
    }

    updateScore() {
        this.scoreDisplay.textContent = Math.floor(this.score);
    }

    loadHighScore() {
        const saved = localStorage.getItem('desertNomadHighScore');
        return saved ? parseInt(saved, 10) : 0;
    }

    saveHighScore() {
        localStorage.setItem('desertNomadHighScore', Math.floor(this.highScore).toString());
    }

    loadTutorialState() {
        return localStorage.getItem('desertNomadTutorial') === 'complete';
    }

    saveTutorialState() {
        localStorage.setItem('desertNomadTutorial', 'complete');
    }

    onTutorialJump() {
        if (!this.tutorialComplete && this.tutorialStep === 0) {
            this.tutorialStep = 1;
            this.tutorialComplete = true;
            this.saveTutorialState();
        }
    }

    onTutorialDuck() {
        if (!this.tutorialComplete) {
            this.tutorialStep = 1;
            this.tutorialComplete = true;
            this.saveTutorialState();
        }
    }

    // Check if obstacles should spawn
    shouldSpawnObstacles() {
        if (!this.tutorialComplete && this.tutorialStep === 0) {
            return false;
        }
        return true;
    }
}
 // init
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
