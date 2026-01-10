'use strict';
const CONFIG = {
    GRAVITY: 0.55,
    JUMP_FORCE: -13,
    DOUBLE_JUMP_FORCE: -10,
    GROUND_Y_OFFSET: 100,
    COYOTE_TIME: 120,

    INITIAL_SPEED: 3.5,
    MAX_SPEED: 12,
    SPEED_INCREMENT: 0.00015,

    // Difficulty tiers based on score
    DIFFICULTY_TIERS: [
        { score: 0, speedMult: 1.0, label: 'Calm' },       // 0-1000: Learn basics
        { score: 1000, speedMult: 1.1, label: 'Easy' },    // 1000-2500: Gentle rise
        { score: 2500, speedMult: 1.2, label: 'Medium' },  // 2500-4500: Building skill
        { score: 4500, speedMult: 1.35, label: 'Hard' },   // 4500-7000: Real challenge
        { score: 7000, speedMult: 1.5, label: 'Expert' }   // 7000+: Endgame
    ],

    // Player dimensions
    PLAYER_X: 100,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 60,
    DUCK_HEIGHT: 30,
    HITBOX_PADDING: 10,

    // Stickman visual settings
    STICKMAN: {
        HEAD_RADIUS: 8,
        LINE_WIDTH: 3,
        COLOR: '#1A1208',
        LEG_LENGTH: 20,
        ARM_LENGTH: 15
    },

    // OBSTACLE SPAWNING 
    MIN_OBSTACLE_GAP: 550,
    MAX_OBSTACLE_GAP: 900,
    FIRST_OBSTACLE_DELAY: 500,

    EARLY_GAME_DURATION: 30000,
    EARLY_GAME_GAP_BONUS: 150,
    EARLY_GAME_SPEED_MULT: 0.85,

    MAX_CONSECUTIVE_HARD: 1,
    RECOVERY_GAP_AFTER_HARD: 200,

    WEATHER_CHANGE_INTERVAL: 28000,
    WEATHER_GRACE_PERIOD: 10000,
    WEATHER_RAMP_TIME: 35000,

    WEATHER_EFFECTS: {
        CLEAR: {
            jumpMod: 1.0,
            gravityMod: 1.0,
            windForce: 0,
            speedMod: 1.0,
            visibility: 1.0
        },
        LOO: {
            jumpMod: 0.97,          
            gravityMod: 0.95,       
            windForce: 2.5,         
            speedMod: 1.05,        
            visibility: 0.9         
        },
        HEATWAVE: {
            jumpMod: 0.9,           
            gravityMod: 1.08,       
            windForce: 0.3,
            speedMod: 0.8,       
            visibility: 0.95        
        },
        SANDSTORM: {
            jumpMod: 0.95,          
            gravityMod: 1.0,
            windForce: 3.5,        
            speedMod: 0.75,      
            visibility: 0.65        
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
        SUN: '#FFD93D',
        SUN_GLOW: 'rgba(255, 217, 61, 0.3)',
        SHADOW: 'rgba(139, 69, 19, 0.15)',
        DUST: 'rgba(210, 180, 140, 0.6)',
        SILHOUETTE: 'rgba(139, 115, 85, 0.25)'
    },

    // Visual effects settings
    VISUALS: {
        DUST_PARTICLES_MAX: 30,
        DUST_SPAWN_RATE: 0.3,
        CAMERA_SHAKE_INTENSITY: 2,
        CAMERA_SHAKE_DECAY: 0.92,
        PLAYER_SHADOW_OFFSET: 3,
        PLAYER_SHADOW_BLUR: 4,
        SUN_GLOW_RADIUS: 50,
        GROUND_NOISE_AMPLITUDE: 3
    },

    // Debug mode 
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

        // Visual effects
        this.dustParticles = [];
        this.landingImpact = 0;

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
        const dt = deltaTime / 16.67;

        this.animTime += deltaTime * 0.001;

        this.groundY = (this.game.canvas.logicalHeight || this.game.canvas.height)
            - CONFIG.GROUND_Y_OFFSET;

        const gravity = CONFIG.GRAVITY * effects.gravityMod;

        if (!this.isGrounded) {
            this.velocityY += gravity * dt;
            this.timeSinceGrounded += deltaTime;
            this.velocityX = effects.windForce * 0.35;
        } else {
            this.velocityX = 0;
            this.timeSinceGrounded = 0;
        }

        this.y += this.velocityY * dt;
        this.x += this.velocityX * dt;
        this.x = Utils.clamp(this.x, 50, CONFIG.PLAYER_X + 60);

        // Ground collision with landing effects
        const groundedY = this.groundY - this.height;
        if (this.y >= groundedY) {
            if (!this.isGrounded && this.velocityY > 2) {
                this.stretchFactor = 1 + Math.min(0.25, this.velocityY / 25);
                this.landingImpact = Math.min(1, this.velocityY / 15);
                this.game.audio.playLand();
                // Spawn landing dust burst
                this.spawnDustBurst(5);
            }
            this.y = groundedY;
            this.velocityY = 0;
            this.isGrounded = true;
            this.x = Utils.lerp(this.x, CONFIG.PLAYER_X, 0.08);
        }

        // Run cycle with running dust
        if (this.isGrounded && !this.isDucking) {
            const runSpeed = this.game.gameSpeed * effects.speedMod;
            this.runCycle += deltaTime * runSpeed * 0.005;

            // Spawn running dust particles
            if (Math.random() < CONFIG.VISUALS.DUST_SPAWN_RATE * (runSpeed / 5)) {
                this.spawnDustParticle();
            }
        }

        // Wind lean
        const targetLean = effects.windForce * 0.02;
        this.leanAngle = Utils.lerp(this.leanAngle, targetLean, 0.08);

        // Animation recovery
        this.jumpBend = Utils.lerp(this.jumpBend, 0, 0.15);
        this.stretchFactor = Utils.lerp(this.stretchFactor, 1, 0.12);
        this.landingImpact = Utils.lerp(this.landingImpact, 0, 0.15);

        // Update dust particles
        this.updateDustParticles(deltaTime);
    }

    spawnDustParticle() {
        if (this.dustParticles.length >= CONFIG.VISUALS.DUST_PARTICLES_MAX) return;
        this.dustParticles.push({
            x: this.x + this.width / 2 + Utils.random(-5, 5),
            y: this.groundY - 2,
            vx: Utils.random(-0.5, -1.5),
            vy: Utils.random(-0.3, -0.8),
            size: Utils.random(2, 4),
            alpha: Utils.random(0.3, 0.5),
            life: 1
        });
    }

    spawnDustBurst(count) {
        for (let i = 0; i < count; i++) {
            if (this.dustParticles.length >= CONFIG.VISUALS.DUST_PARTICLES_MAX) break;
            this.dustParticles.push({
                x: this.x + this.width / 2 + Utils.random(-10, 10),
                y: this.groundY - 2,
                vx: Utils.random(-2, 2),
                vy: Utils.random(-1, -2),
                size: Utils.random(3, 6),
                alpha: Utils.random(0.4, 0.7),
                life: 1
            });
        }
    }

    updateDustParticles(deltaTime) {
        const decay = 0.02 * (deltaTime / 16.67);
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const p = this.dustParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // Slight gravity
            p.life -= decay;
            p.alpha *= 0.97;
            if (p.life <= 0 || p.alpha < 0.05) {
                this.dustParticles.splice(i, 1);
            }
        }
    }

    // DRAW - Render the stickman with shadow and dust
    draw(ctx) {
        const cfg = CONFIG.STICKMAN;

        // Draw dust particles behind player
        this.drawDustParticles(ctx);

        // Draw player shadow on ground
        this.drawShadow(ctx);

        ctx.save();

        // Apply body lean
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;
        ctx.translate(centerX, centerY);
        ctx.rotate(this.leanAngle);
        ctx.translate(-centerX, -centerY);

        // Apply stretch (jump/land feedback)
        ctx.translate(centerX, centerY);
        ctx.scale(1 / this.stretchFactor, this.stretchFactor);
        ctx.translate(-centerX, -centerY);

        // Draw with slight shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = CONFIG.VISUALS.PLAYER_SHADOW_BLUR;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

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

    drawShadow(ctx) {
        // Ellipse shadow on ground - scales with height
        const shadowY = this.groundY;
        const centerX = this.x + this.width / 2;
        const heightAboveGround = shadowY - (this.y + this.height);
        const shadowScale = Math.max(0.3, 1 - heightAboveGround / 150);
        const shadowWidth = 20 * shadowScale;
        const shadowHeight = 6 * shadowScale;
        const shadowAlpha = 0.25 * shadowScale;

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(centerX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawDustParticles(ctx) {
        if (this.dustParticles.length === 0) return;

        ctx.save();
        for (const p of this.dustParticles) {
            ctx.fillStyle = CONFIG.COLORS.DUST;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
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

        // 4. LEGS 
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

    // DRAW DUCKING POSE
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

    draw(ctx, visibility = 1) {
        // Draw ground shadow first
        this.drawGroundShadow(ctx);

        // Safety glow for low visibility
        if (visibility < 0.75) {
            ctx.save();
            ctx.shadowColor = '#FFCC00';
            ctx.shadowBlur = 8 * (1 - visibility);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

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

        if (visibility < 0.75) {
            ctx.restore();
        }
    }

    drawGroundShadow(ctx) {
        const shadowY = this.groundY;
        const centerX = this.x + this.width / 2;
        const shadowWidth = this.width * 0.6;
        const shadowHeight = 4;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(centerX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawCactus(ctx) {
        const { x, y, width: w, height: h } = this;

        // Cactus with slight gradient
        const cactusGrad = ctx.createLinearGradient(x, y, x + w, y);
        cactusGrad.addColorStop(0, '#2D5A1A');
        cactusGrad.addColorStop(0.5, CONFIG.COLORS.CACTUS);
        cactusGrad.addColorStop(1, '#2D5A1A');
        ctx.fillStyle = cactusGrad;

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

        // Rock with subtle gradient
        const rockGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        rockGrad.addColorStop(0, '#9A8465');
        rockGrad.addColorStop(0.5, CONFIG.COLORS.ROCK);
        rockGrad.addColorStop(1, '#6B5A45');
        ctx.fillStyle = rockGrad;

        // Simple polygon rock
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.8, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // Subtle highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.5, y + 2);
        ctx.lineTo(x + w * 0.3, y + h * 0.4);
        ctx.lineTo(x + w * 0.15, y + h * 0.3);
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

        // Tracking for fair spawning
        this.lastObstacleType = null;
        this.consecutiveHardCount = 0;
        this.totalSpawned = 0;
        this.gameStartTime = 0;

        // Stats for debug validation
        this.spawnStats = {
            rock: 0,
            cactus: 0,
            tumbleweed: 0
        };
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
        this.nextSpawnDistance = CONFIG.FIRST_OBSTACLE_DELAY;
        this.currentTier = CONFIG.DIFFICULTY_TIERS[0];
        this.lastObstacleType = null;
        this.consecutiveHardCount = 0;
        this.totalSpawned = 0;
        this.gameStartTime = Date.now();
        this.spawnStats = { rock: 0, cactus: 0, tumbleweed: 0 };
    }

    getDifficultyTier() {
        let tier = CONFIG.DIFFICULTY_TIERS[0];
        for (const t of CONFIG.DIFFICULTY_TIERS) {
            if (this.game.score >= t.score) tier = t;
        }
        return tier;
    }

    // Check if we're in early game (first 30 seconds)
    isEarlyGame() {
        const elapsed = Date.now() - this.gameStartTime;
        return elapsed < CONFIG.EARLY_GAME_DURATION;
    }

    // Get game phase for debug display
    getGamePhase() {
        const elapsed = Date.now() - this.gameStartTime;
        if (elapsed < CONFIG.EARLY_GAME_DURATION) return 'EARLY';
        if (this.game.score < 2500) return 'MID';
        return 'LATE';
    }

    update(deltaTime) {
        // Apply early game speed modifier for obstacles
        let effectiveSpeed = this.game.gameSpeed;
        if (this.isEarlyGame()) {
            effectiveSpeed *= CONFIG.EARLY_GAME_SPEED_MULT;
        }

        const groundY = (this.game.canvas.logicalHeight || this.game.canvas.height)
            - CONFIG.GROUND_Y_OFFSET;

        this.spawnTimer += effectiveSpeed;
        this.currentTier = this.getDifficultyTier();

        // Spawn new obstacles when timer exceeds gap
        if (this.spawnTimer >= this.nextSpawnDistance) {
            this.spawnObstacle(groundY);
            this.spawnTimer = 0;
            this.calculateNextSpawnDistance();
        }

        // Update all obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].update(effectiveSpeed, deltaTime);
            if (!this.obstacles[i].active) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    // SPAWN DISTANCE CALCULATION
    calculateNextSpawnDistance() {
        // Base gap from config
        let minGap = CONFIG.MIN_OBSTACLE_GAP;
        let maxGap = CONFIG.MAX_OBSTACLE_GAP;

        // 1. Early game bonus
        if (this.isEarlyGame()) {
            minGap += CONFIG.EARLY_GAME_GAP_BONUS;
            maxGap += CONFIG.EARLY_GAME_GAP_BONUS;
        }

        // 2. Difficulty reduction 
        const reduction = Math.min(100, (this.currentTier.speedMult - 1) * 30);
        minGap = Math.max(450, minGap - reduction);  // Never below 450
        maxGap = Math.max(650, maxGap - reduction);  // Never below 650

        // 3. Recovery gap after difficult obstacles
        if (this.isHardObstacle(this.lastObstacleType)) {
            minGap += CONFIG.RECOVERY_GAP_AFTER_HARD;
        }

        this.nextSpawnDistance = Utils.randomInt(minGap, maxGap);
    }

    // OBSTACLE TYPE DETERMINATION
    getAvailableObstacleTypes() {
        const score = this.game.score;
        const types = [];

        // ROCKS: Always available - the easiest obstacle (simple jump)
        types.push(OBSTACLE_TYPE.ROCK);

        // CACTI: Introduce after score 800 (player understands jumping)
        if (score >= 800) {
            types.push(OBSTACLE_TYPE.CACTUS);
        }

        // TUMBLEWEEDS: Introduce after score 3000 (requires ducking skill)
        // Also requires NOT being in early game phase
        if (score >= 3000 && !this.isEarlyGame()) {
            types.push(OBSTACLE_TYPE.TUMBLEWEED);
        }

        return types;
    }

    // Determine if an obstacle type is "hard" (requires specific reaction)
    isHardObstacle(type) {
        // Tumbleweeds require ducking - a different input than jumping
        // Tall cacti require well-timed jumps
        return type === OBSTACLE_TYPE.TUMBLEWEED;
    }

    spawnObstacle(groundY) {
        const availableTypes = this.getAvailableObstacleTypes();

        // Select type, but prevent back-to-back hard obstacles
        let selectedType = availableTypes[Utils.randomInt(0, availableTypes.length - 1)];

        // FAIRNESS CHECK: Prevent consecutive hard obstacles
        if (this.isHardObstacle(selectedType) && this.consecutiveHardCount >= CONFIG.MAX_CONSECUTIVE_HARD) {
            // Force an easier obstacle
            const easyTypes = availableTypes.filter(t => !this.isHardObstacle(t));
            if (easyTypes.length > 0) {
                selectedType = easyTypes[Utils.randomInt(0, easyTypes.length - 1)];
            }
        }

        // Track consecutive hard obstacles
        if (this.isHardObstacle(selectedType)) {
            this.consecutiveHardCount++;
        } else {
            this.consecutiveHardCount = 0;
        }

        // Create and spawn the obstacle
        const x = (this.game.canvas.logicalWidth || this.game.canvas.width) + 50;
        const obstacle = new Obstacle(selectedType, x, groundY);

        // During early game, reduce height of tall cacti for easier jumps
        if (this.isEarlyGame() && selectedType === OBSTACLE_TYPE.CACTUS) {
            obstacle.height = Math.min(obstacle.height, 50);
            obstacle.y = groundY - obstacle.height;
        }

        this.obstacles.push(obstacle);

        // Update tracking
        this.lastObstacleType = selectedType;
        this.totalSpawned++;
        this.spawnStats[selectedType]++;
    }

    draw(ctx) {
        // Pass current visibility to obstacles for safety glow effect
        const visibility = this.game.weather ? this.game.weather.visibility : 1;
        for (const obs of this.obstacles) {
            obs.draw(ctx, visibility);
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

    // Get current spawn rate for debug display
    getSpawnRate() {
        const elapsed = (Date.now() - this.gameStartTime) / 1000;
        if (elapsed < 1) return 0;
        return (this.totalSpawned / elapsed).toFixed(2);
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

        // This prevents frustrating extended low-visibility periods
        if (this.shouldEndSandstorm()) {
            this.cycleIndex = 0; // Return to clear weather
            this.targetWeather = WEATHER.CLEAR;
            this.transitionProgress = 0;
            this.sandstormStartTime = null;
            this.showBanner('☀️ Sandstorm Passed - Visibility Restored!');
            this.weatherTimer = 0;
        }
        // Change weather after interval 
        else if (this.weatherTimer >= CONFIG.WEATHER_CHANGE_INTERVAL &&
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

        // Sandstorm warning 
        if (newWeather === WEATHER.SANDSTORM) {
            this.showBanner('⚠️ Sandstorm Warning!');
            this.game.audio.playWarning();
            // Start sandstorm duration timer 
            this.sandstormStartTime = Date.now();
        }

        this.targetWeather = newWeather;
        this.transitionProgress = 0;
        this.showBanner(this.getWeatherMessage(newWeather));
    }

    // Check if sandstorm should end early (15 second max duration)
    shouldEndSandstorm() {
        if (this.currentWeather !== WEATHER.SANDSTORM) return false;
        if (!this.sandstormStartTime) return false;
        const elapsed = Date.now() - this.sandstormStartTime;
        return elapsed > 15000; // 15 second max sandstorm duration
    }

    getWeatherMessage(weather) {
        // Gentler, encouraging messages
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

        // Draw wind streaks (horizontal lines for wind visualization)
        if (this.windStrength > 0.5) {
            this.drawWindStreaks(ctx, w, h);
        }

        // Draw wind particles
        ctx.fillStyle = 'rgba(200, 160, 100, 0.5)';
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Sandstorm layered overlay (fade-in/out effect)
        if (this.visibility < 1) {
            // Bottom layer - ground dust
            const dustAlpha = (1 - this.visibility) * 0.4;
            const dustGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
            dustGrad.addColorStop(0, `rgba(180, 150, 100, 0)`);
            dustGrad.addColorStop(1, `rgba(180, 150, 100, ${dustAlpha})`);
            ctx.fillStyle = dustGrad;
            ctx.fillRect(0, 0, w, h);

            // Top layer - overall visibility reduction
            ctx.fillStyle = `rgba(160, 130, 90, ${(1 - this.visibility) * 0.35})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Heat shimmer - ground-only wavy effect
        if (this.heatDistortion > 0.1) {
            const time = Date.now() * 0.002;
            ctx.save();
            ctx.globalAlpha = this.heatDistortion * 0.15;
            ctx.strokeStyle = '#FFE4B5';
            ctx.lineWidth = 1.5;

            // Draw wavy heat lines near ground
            for (let x = 0; x < w; x += 40) {
                const wave = Math.sin(time + x * 0.04) * 3;
                const wave2 = Math.sin(time * 1.5 + x * 0.06) * 2;
                ctx.beginPath();
                ctx.moveTo(x, h - 115 + wave);
                ctx.quadraticCurveTo(x + 20, h - 100 + wave2, x + 40, h - 115 + wave);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    drawWindStreaks(ctx, w, h) {
        const intensity = this.windStrength / 5;
        const time = Date.now() * 0.001;

        ctx.save();
        ctx.strokeStyle = `rgba(210, 180, 140, ${intensity * 0.3})`;
        ctx.lineWidth = 1;

        // Draw horizontal wind streaks
        for (let i = 0; i < 12; i++) {
            const y = (h * 0.2) + (i / 12) * (h * 0.6);
            const xOffset = (time * 200 + i * 100) % (w + 100);
            const length = 30 + Math.sin(i) * 20;

            ctx.beginPath();
            ctx.moveTo(w - xOffset, y);
            ctx.lineTo(w - xOffset - length, y + Math.sin(time + i) * 2);
            ctx.stroke();
        }
        ctx.restore();
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

// ENHANCED RENDERER with visual polish
class Renderer {
    constructor(game) {
        this.game = game;
        this.scrollX = 0;
        this.cameraShake = 0;
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;

        // Pre-generate distant silhouette positions for consistency
        this.silhouettes = [];
        for (let i = 0; i < 8; i++) {
            this.silhouettes.push({
                x: i * 180 + Utils.random(0, 80),
                type: Utils.randomInt(0, 2), // 0=rock, 1=fort, 2=dune
                height: Utils.random(20, 45),
                width: Utils.random(30, 60)
            });
        }
    }

    update(deltaTime) {
        this.scrollX += this.game.gameSpeed;

        // Update camera shake from player landing
        if (this.game.player && this.game.player.landingImpact > 0.1) {
            this.cameraShake = this.game.player.landingImpact * CONFIG.VISUALS.CAMERA_SHAKE_INTENSITY;
        }

        // Decay camera shake
        this.cameraShake *= CONFIG.VISUALS.CAMERA_SHAKE_DECAY;
        if (this.cameraShake < 0.1) this.cameraShake = 0;

        // Random shake offset
        if (this.cameraShake > 0) {
            this.cameraOffsetX = (Math.random() - 0.5) * this.cameraShake * 2;
            this.cameraOffsetY = (Math.random() - 0.5) * this.cameraShake;
        } else {
            this.cameraOffsetX = 0;
            this.cameraOffsetY = 0;
        }
    }

    draw() {
        const ctx = this.game.ctx;
        const w = this.game.canvas.logicalWidth || this.game.canvas.width;
        const h = this.game.canvas.logicalHeight || this.game.canvas.height;
        const groundY = h - CONFIG.GROUND_Y_OFFSET;

        ctx.save();

        // Apply camera shake
        if (this.cameraShake > 0) {
            ctx.translate(this.cameraOffsetX, this.cameraOffsetY);
        }

        ctx.clearRect(-10, -10, w + 20, h + 20);

        // Sky gradient
        const palette = this.game.weather.getPalette();
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, palette.skyTop);
        skyGrad.addColorStop(1, palette.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Sun with glow effect
        this.drawSun(ctx, w);

        // Distant silhouettes (very far background)
        this.drawDistantSilhouettes(ctx, w, h);

        // 3-layer parallax dunes
        this.drawDunes(ctx, w, h, palette);

        // Ground with subtle texture
        this.drawGround(ctx, w, h, groundY, palette);

        ctx.restore();
    }

    drawSun(ctx, w) {
        const sunX = w * 0.82;
        const sunY = 65;
        const sunRadius = 32;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, CONFIG.VISUALS.SUN_GLOW_RADIUS);
        glowGrad.addColorStop(0, CONFIG.COLORS.SUN_GLOW);
        glowGrad.addColorStop(1, 'rgba(255, 217, 61, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, CONFIG.VISUALS.SUN_GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Sun core
        ctx.fillStyle = CONFIG.COLORS.SUN;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDistantSilhouettes(ctx, w, h) {
        ctx.fillStyle = CONFIG.COLORS.SILHOUETTE;

        const baseY = h * 0.38;
        const offset = (this.scrollX * 0.03) % (w * 1.5);

        for (const sil of this.silhouettes) {
            const x = ((sil.x - offset) % (w + 200)) - 100;

            ctx.beginPath();
            if (sil.type === 0) {
                // Rock silhouette
                ctx.moveTo(x, baseY);
                ctx.lineTo(x + sil.width * 0.3, baseY - sil.height);
                ctx.lineTo(x + sil.width * 0.7, baseY - sil.height * 0.8);
                ctx.lineTo(x + sil.width, baseY);
            } else if (sil.type === 1) {
                // Fort/tower silhouette
                ctx.moveTo(x, baseY);
                ctx.lineTo(x, baseY - sil.height * 0.6);
                ctx.lineTo(x + sil.width * 0.2, baseY - sil.height * 0.6);
                ctx.lineTo(x + sil.width * 0.2, baseY - sil.height);
                ctx.lineTo(x + sil.width * 0.4, baseY - sil.height);
                ctx.lineTo(x + sil.width * 0.4, baseY - sil.height * 0.6);
                ctx.lineTo(x + sil.width, baseY - sil.height * 0.3);
                ctx.lineTo(x + sil.width, baseY);
            } else {
                // Distant dune
                ctx.moveTo(x, baseY);
                ctx.quadraticCurveTo(x + sil.width * 0.5, baseY - sil.height, x + sil.width, baseY);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    drawDunes(ctx, w, h, palette) {
        // Far dunes (slowest parallax)
        ctx.fillStyle = 'rgba(244, 228, 193, 0.7)';
        const offset1 = (this.scrollX * 0.05) % (w * 0.6);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -offset1; x <= w + 150; x += 120) {
            const duneY = h * 0.35 + Math.sin((x + offset1) * 0.008) * 30;
            ctx.lineTo(x, duneY);
        }
        ctx.lineTo(w + 150, h);
        ctx.closePath();
        ctx.fill();

        // Mid dunes
        ctx.fillStyle = CONFIG.COLORS.SAND_LIGHT;
        const offset2 = (this.scrollX * 0.12) % (w * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -offset2; x <= w + 100; x += 90) {
            const duneY = h * 0.45 + Math.sin((x + offset2) * 0.012) * 25;
            ctx.lineTo(x, duneY);
        }
        ctx.lineTo(w + 100, h);
        ctx.closePath();
        ctx.fill();

        // Near dunes (fastest parallax)
        ctx.fillStyle = palette.sand;
        const offset3 = (this.scrollX * 0.25) % (w * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -offset3; x <= w + 100; x += 70) {
            const duneY = h * 0.58 + Math.sin((x + offset3) * 0.018) * 20;
            ctx.lineTo(x, duneY);
        }
        ctx.lineTo(w + 100, h);
        ctx.closePath();
        ctx.fill();
    }

    drawGround(ctx, w, h, groundY, palette) {
        // Ground gradient
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
        groundGrad.addColorStop(0, palette.sand);
        groundGrad.addColorStop(1, CONFIG.COLORS.SAND_DARK);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Subtle ground texture (small pebbles/variation)
        const noiseOffset = (this.scrollX * 0.8) % 100;
        ctx.fillStyle = 'rgba(139, 115, 85, 0.08)';
        for (let x = -noiseOffset; x < w + 50; x += 25) {
            const y = groundY + 5 + Math.sin(x * 0.3) * CONFIG.VISUALS.GROUND_NOISE_AMPLITUDE;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ground line with slight variation
        ctx.strokeStyle = CONFIG.COLORS.GROUND_LINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= w; x += 30) {
            const variation = Math.sin((x + this.scrollX * 0.5) * 0.05) * 1;
            ctx.lineTo(x, groundY + variation);
        }
        ctx.stroke();
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

        if (CONFIG.DEBUG_MODE) {
            this.drawDebug();
        }
    }

    // DEBUG INFO
    drawDebug() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(10, 10, 140, 35);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`DISTANCE`, 20, 28);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${Math.floor(this.score)}m`, 95, 36);
    }

    updateScore() {
        this.scoreDisplay.textContent = Math.floor(this.score);
    }
}

// init
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
