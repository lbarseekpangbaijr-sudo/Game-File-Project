// Game state
let gameState = 'menu'; // menu, playing, paused, gameOver
let score = 0;
let highScore = 0;
let distance = 0;
let combo = 0;
let difficulty = 'medium';

// Game objects
const game = {
    player: { x: 175, y: 500, width: 50, height: 80, speed: 5, lane: 1, shield: false, shieldTime: 0, boost: false, boostTime: 0 },
    obstacles: [],
    powerups: [],
    particles: [],
    roadLines: [],
    speed: 3,
    baseSpeed: 3,
    frameCount: 0,
    lastDodge: 0,
    consecutiveDodges: 0,
    coinsCollected: 0
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context
let audioContext;

// Initialize audio context on user interaction
document.addEventListener('click', () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}, { once: true });

// Sound effects
function playSound(frequency, duration, type = 'sine') {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Initialize road lines
function initRoadLines() {
    for (let i = 0; i < 10; i++) {
        game.roadLines.push({ x: 147, y: i * 80 });
        game.roadLines.push({ x: 247, y: i * 80 });
        game.roadLines.push({ x: 347, y: i * 80 });
    }
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Draw functions
function drawCar(x, y, color, hasShield = false) {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 5, y + 85, 50, 10);
    
    // Shield effect
    if (hasShield) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + 25, y + 40, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 25, y + 40, 55, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Car body with gradient
    const gradient = ctx.createLinearGradient(x, y, x + 50, y + 80);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, -30));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, 50, 80);
    
    // Car windows
    ctx.fillStyle = 'rgba(74, 144, 226, 0.7)';
    ctx.fillRect(x + 10, y + 15, 30, 20);
    ctx.fillRect(x + 10, y + 45, 30, 20);
    
    // Headlights/taillights
    ctx.fillStyle = y < 300 ? '#ffeb3b' : '#f44336';
    ctx.fillRect(x + 5, y + 5, 10, 8);
    ctx.fillRect(x + 35, y + 5, 10, 8);
    
    // Car details (wheels)
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 5, y + 20, 5, 15);
    ctx.fillRect(x + 50, y + 20, 5, 15);
    ctx.fillRect(x - 5, y + 45, 5, 15);
    ctx.fillRect(x + 50, y + 45, 5, 15);
    
    // Wheel highlights
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 4, y + 22, 3, 5);
    ctx.fillRect(x + 51, y + 22, 3, 5);
    ctx.fillRect(x - 4, y + 47, 3, 5);
    ctx.fillRect(x + 51, y + 47, 3, 5);
}

function drawRoad() {
    // Road background with gradient
    const roadGradient = ctx.createLinearGradient(0, 0, 500, 0);
    roadGradient.addColorStop(0, '#444');
    roadGradient.addColorStop(0.5, '#555');
    roadGradient.addColorStop(1, '#444');
    ctx.fillStyle = roadGradient;
    ctx.fillRect(0, 0, 500, 600);
    
    // Grass edges with texture
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 50, 600);
    ctx.fillRect(450, 0, 50, 600);
    
    // Grass details
    ctx.fillStyle = '#3a6b1f';
    for (let i = 0; i < 30; i++) {
        ctx.fillRect(Math.random() * 40 + 5, Math.random() * 600, 2, 4);
        ctx.fillRect(Math.random() * 40 + 455, Math.random() * 600, 2, 4);
    }
    
    // Road lines with glow
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    game.roadLines.forEach(line => {
        ctx.fillRect(line.x, line.y, 6, 40);
    });
    ctx.shadowBlur = 0;
}

function drawPowerup(x, y, type) {
    ctx.save();
    ctx.translate(x + 15, y + 15);
    ctx.rotate((game.frameCount * 0.05) % (Math.PI * 2));
    
    if (type === 'shield') {
        ctx.fillStyle = '#4a90e2';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', 0, 0);
    } else if (type === 'boost') {
        ctx.fillStyle = '#f39c12';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (type === 'coin') {
        ctx.fillStyle = '#f1c40f';
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
    }
    
    ctx.restore();
    
    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = type === 'shield' ? '#4a90e2' : type === 'boost' ? '#f39c12' : '#f1c40f';
    ctx.strokeStyle = ctx.shadowColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 30, 30);
    ctx.shadowBlur = 0;
}

// Particle system
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x: x + 25,
            y: y + 40,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateParticles() {
    game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy += 0.2; // gravity
        return p.life > 0;
    });
}

function drawParticles() {
    game.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });
}

// UI Updates
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('distance').textContent = Math.floor(distance / 10);
    
    const comboBox = document.getElementById('comboBox');
    if (combo > 0) {
        comboBox.style.display = 'block';
        document.getElementById('combo').textContent = 'x' + combo;
    } else {
        comboBox.style.display = 'none';
    }
}

function updatePowerupIndicators() {
    const container = document.getElementById('powerupIndicators');
    container.innerHTML = '';
    
    if (game.player.shield) {
        const shieldDiv = document.createElement('div');
        shieldDiv.className = 'powerup-indicator';
        shieldDiv.textContent = `🛡️ Shield: ${Math.ceil(game.player.shieldTime / 60)}s`;
        container.appendChild(shieldDiv);
    }
    
    if (game.player.boost) {
        const boostDiv = document.createElement('div');
        boostDiv.className = 'powerup-indicator boost';
        boostDiv.textContent = `⚡ Boost: ${Math.ceil(game.player.boostTime / 60)}s`;
        container.appendChild(boostDiv);
    }
}

// Game loop
function gameLoop() {
    if (gameState !== 'playing') return;
    
    game.frameCount++;
    distance++;
    
    // Update power-up timers
    if (game.player.shield && game.player.shieldTime > 0) {
        game.player.shieldTime--;
        if (game.player.shieldTime === 0) game.player.shield = false;
    }
    
    if (game.player.boost && game.player.boostTime > 0) {
        game.player.boostTime--;
        if (game.player.boostTime === 0) {
            game.player.boost = false;
            game.speed = game.baseSpeed;
        }
    }
    
    // Move road lines
    game.roadLines.forEach(line => {
        line.y += game.speed;
        if (line.y > 600) line.y = -40;
    });
    
    // Difficulty settings
    const spawnRate = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 80 : 60;
    const maxObstacles = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
    
    // Spawn obstacles
    if (game.frameCount % spawnRate === 0 && game.obstacles.length < maxObstacles) {
        const lanes = [75, 175, 275, 375];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        game.obstacles.push({
            x: lane,
            y: -100,
            width: 50,
            height: 80,
            color: ['#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'][Math.floor(Math.random() * 4)]
        });
    }
    
    // Spawn power-ups
    if (game.frameCount % 200 === 0 && Math.random() > 0.5) {
        const lanes = [75, 175, 275, 375];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const types = ['shield', 'boost', 'coin'];
        const type = types[Math.floor(Math.random() * types.length)];
        game.powerups.push({ x: lane + 10, y: -50, width: 30, height: 30, type });
    }
    
    // Move and detect dodges
    const prevCount = game.obstacles.filter(obs => obs.y > game.player.y && obs.y < game.player.y + 100).length;
    game.obstacles = game.obstacles.filter(obs => {
        obs.y += game.speed;
        return obs.y < 700;
    });
    const currCount = game.obstacles.filter(obs => obs.y > game.player.y && obs.y < game.player.y + 100).length;
    
    if (prevCount > currCount) {
        if (game.frameCount - game.lastDodge < 100) {
            game.consecutiveDodges++;
            combo = game.consecutiveDodges;
            playSound(400 + game.consecutiveDodges * 100, 0.1, 'sine');
        } else {
            game.consecutiveDodges = 1;
            combo = 1;
        }
        game.lastDodge = game.frameCount;
        score += 10 * game.consecutiveDodges;
    }
    
    // Move power-ups
    game.powerups = game.powerups.filter(pw => {
        pw.y += game.speed;
        return pw.y < 700;
    });
    
    // Check power-up collisions
    game.powerups = game.powerups.filter(pw => {
        if (game.player.x < pw.x + pw.width &&
            game.player.x + game.player.width > pw.x &&
            game.player.y < pw.y + pw.height &&
            game.player.y + game.player.height > pw.y) {
            
            if (pw.type === 'shield') {
                game.player.shield = true;
                game.player.shieldTime = 300;
                playSound(600, 0.2, 'sine');
            } else if (pw.type === 'boost') {
                game.player.boost = true;
                game.player.boostTime = 200;
                game.speed = game.baseSpeed * 1.5;
                playSound(300, 0.2, 'square');
            } else if (pw.type === 'coin') {
                game.coinsCollected++;
                score += 50;
                playSound(800, 0.1, 'sine');
            }
            createParticles(pw.x, pw.y, pw.type === 'shield' ? '#4a90e2' : pw.type === 'boost' ? '#f39c12' : '#f1c40f', 15);
            return false;
        }
        return true;
    });
    
    // Check obstacle collisions
    game.obstacles.forEach(obs => {
        if (game.player.x < obs.x + obs.width - 10 &&
            game.player.x + game.player.width > obs.x + 10 &&
            game.player.y < obs.y + obs.height - 10 &&
            game.player.y + game.player.height > obs.y + 10) {
            
            if (game.player.shield) {
                game.player.shield = false;
                game.player.shieldTime = 0;
                createParticles(obs.x, obs.y, '#4a90e2', 20);
                playSound(200, 0.3, 'sawtooth');
                game.obstacles = game.obstacles.filter(o => o !== obs);
            } else {
                createParticles(game.player.x, game.player.y, '#e74c3c', 30);
                playSound(100, 0.5, 'sawtooth');
                endGame();
            }
        }
    });
    
    // Update particles
    updateParticles();
    
    // Increase score and speed
    if (game.frameCount % 10 === 0) score++;
    if (game.frameCount % 400 === 0) {
        game.baseSpeed += 0.3;
        if (!game.player.boost) game.speed = game.baseSpeed;
    }
    
    // Reset combo
    if (game.frameCount - game.lastDodge > 200) {
        game.consecutiveDodges = 0;
        combo = 0;
    }
    
    // Draw everything
    drawRoad();
    drawParticles();
    
    game.obstacles.forEach(obs => drawCar(obs.x, obs.y, obs.color));
    game.powerups.forEach(pw => drawPowerup(pw.x, pw.y, pw.type));
    
    if (game.player.boost) {
        ctx.fillStyle = 'rgba(243, 156, 18, 0.3)';
        ctx.fillRect(game.player.x + 10, game.player.y + 80, 30, 20);
    }
    drawCar(game.player.x, game.player.y, '#27ae60', game.player.shield);
    
    updateUI();
    updatePowerupIndicators();
    
    requestAnimationFrame(gameLoop);
}

// Game control
function startGame() {
    game.player = { x: 175, y: 500, width: 50, height: 80, speed: 5, lane: 1, shield: false, shieldTime: 0, boost: false, boostTime: 0 };
    game.obstacles = [];
    game.powerups = [];
    game.particles = [];
    game.baseSpeed = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    game.speed = game.baseSpeed;
    game.frameCount = 0;
    game.lastDodge = 0;
    game.consecutiveDodges = 0;
    game.coinsCollected = 0;
    score = 0;
    distance = 0;
    combo = 0;
    
    gameState = 'playing';
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    gameLoop();
}

function pauseGame() {
    gameState = 'paused';
    document.getElementById('pauseScreen').style.display = 'flex';
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pauseScreen').style.display = 'none';
    gameLoop();
}

function endGame() {
    gameState = 'gameOver';
    if (score > highScore) highScore = score;
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance / 10);
    document.getElementById('finalCoins').textContent = game.coinsCollected;
    document.getElementById('newHighScore').style.display = score === highScore && score > 0 ? 'block' : 'none';
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function showMenu() {
    gameState = 'menu';
    document.getElementById('menuScreen').style.display = 'flex';
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    drawRoad();
    drawCar(game.player.x, game.player.y, '#27ae60');
}

// Controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
        return;
    }
    
    if (gameState !== 'playing') return;
    
    const lanes = [75, 175, 275, 375];
    
    if (e.key === 'ArrowLeft' && game.player.lane > 0) {
        game.player.lane--;
        game.player.x = lanes[game.player.lane];
        playSound(300, 0.05, 'square');
    }
    if (e.key === 'ArrowRight' && game.player.lane < 3) {
        game.player.lane++;
        game.player.x = lanes[game.player.lane];
        playSound(300, 0.05, 'square');
    }
    if (e.key === 'ArrowUp' && game.player.y > 0) {
        game.player.y -= game.player.speed * 15;
    }
    if (e.key === 'ArrowDown' && game.player.y < 520) {
        game.player.y += game.player.speed * 15;
    }
});

// Touch controls
let touchStart = null;

canvas.addEventListener('touchstart', (e) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const touch = e.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
});

canvas.addEventListener('touchmove', (e) => {
    if (!touchStart || gameState !== 'playing') return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const lanes = [75, 175, 275, 375];
    
    if (Math.abs(deltaX) > 50) {
        if (deltaX > 0 && game.player.lane < 3) {
            game.player.lane++;
            game.player.x = lanes[game.player.lane];
            playSound(300, 0.05, 'square');
        } else if (deltaX < 0 && game.player.lane > 0) {
            game.player.lane--;
            game.player.x = lanes[game.player.lane];
            playSound(300, 0.05, 'square');
        }
        touchStart = { x: touch.clientX, y: touch.clientY };
    }
    
    if (Math.abs(deltaY) > 50) {
        if (deltaY < 0 && game.player.y > 0) {
            game.player.y -= 30;
        } else if (deltaY > 0 && game.player.y < 520) {
            game.player.y += 30;
        }
        touchStart = { x: touch.clientX, y: touch.clientY };
    }
});

canvas.addEventListener('touchend', () => {
    touchStart = null;
});

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('pauseMenuBtn').addEventListener('click', showMenu);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('gameoverMenuBtn').addEventListener('click', showMenu);

// Difficulty selection
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.difficulty;
    });
});

// Initialize
initRoadLines();
drawRoad();
drawCar(game.player.x, game.player.y, '#27ae60');
updateUI();