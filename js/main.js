document.addEventListener('DOMContentLoaded', () => {
    try {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error("Canvas not found");
        const ctx = canvas.getContext('2d');

        // Game Constants
        const GAME_WIDTH = 800;
        const GAME_HEIGHT = 450;
        const GRAVITY = 0.6;
        const GROUND_Y = 380; // Player runs on this line

        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;

        // Asset Loading
        const assets = {
            runner: new Image(),
            donut: new Image(),
            boss: new Image(),
            bg: new Image()
        };
        assets.runner.src = 'assets/runner.png';
        assets.donut.src = 'assets/donut.png';
        assets.boss.src = 'assets/boss.png';
        assets.bg.src = 'assets/bg.png';

        // Game State
        let gameState = 'START'; // START, PLAYING, BOSS, GAMEOVER, VICTORY
        let score = 0;
        let distance = 0;
        let frames = 0;
        let bossFightTriggered = false;

        // Input Handling
        const keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false,
            Space: false
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') keys.Space = true;
            if (keys.hasOwnProperty(e.key) || ['w', 'a', 's', 'd'].includes(e.key)) {
                keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                keys.Space = false;
                if (player) player.canShoot = true; // reset trigger
            }
            if (keys.hasOwnProperty(e.key) || ['w', 'a', 's', 'd'].includes(e.key)) {
                keys[e.key] = false;
            }
        });

        // UI Elements
        const ui = {
            score: document.getElementById('score'),
            health: document.getElementById('health'),
            bossHealthContainer: document.getElementById('boss-health-container'),
            bossHealthFill: document.getElementById('boss-health-fill'),
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            startBtn: document.getElementById('start-btn'),
            restartBtns: document.querySelectorAll('.restart-btn')
        };

        // Check critical UI elements
        if (!ui.startBtn) console.error("Start button not found!");

        // Classes

        class Player {
            constructor() {
                this.width = 64;
                this.height = 64;
                this.x = 100;
                this.y = GROUND_Y - this.height;
                this.vx = 0;
                this.vy = 0;
                this.speed = 5;
                this.jumpPower = -15;
                this.grounded = true;
                this.health = 100;
                this.canShoot = true;
                this.projectiles = [];
                this.color = '#00f'; // Fallback
            }

            update() {
                // Movement
                if (keys.ArrowLeft || keys.a) this.vx = -this.speed;
                else if (keys.ArrowRight || keys.d) this.vx = this.speed;
                else this.vx = 0;

                if ((keys.ArrowUp || keys.w) && this.grounded) {
                    this.vy = this.jumpPower;
                    this.grounded = false;
                }

                // Apply Physics
                this.vy += GRAVITY;
                this.x += this.vx;
                this.y += this.vy;

                // Boundaries
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > GAME_WIDTH) this.x = GAME_WIDTH - this.width;

                // Ground Collision
                if (this.y + this.height > GROUND_Y) {
                    this.y = GROUND_Y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }

                // Shooting
                if (keys.Space && this.canShoot) {
                    this.shoot();
                    this.canShoot = false;
                }

                // Update Projectiles
                this.projectiles.forEach((p, index) => {
                    p.update();
                    if (p.markedForDeletion) this.projectiles.splice(index, 1);
                });
            }

            draw(ctx) {
                // Draw Projectiles
                this.projectiles.forEach(p => p.draw(ctx));

                // Draw Player
                if (assets.runner.complete && assets.runner.naturalWidth !== 0) {
                    ctx.drawImage(assets.runner, this.x, this.y, this.width, this.height);
                } else {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
            }

            shoot() {
                this.projectiles.push(new Projectile(this.x + this.width, this.y + this.height / 2, 10, 0));
            }
        }

        class Projectile {
            constructor(x, y, vx, vy, isEnemy = false) {
                this.x = x;
                this.y = y;
                this.vx = vx;
                this.vy = vy;
                this.radius = 6;
                this.color = isEnemy ? '#ff0000' : '#fff';
                this.markedForDeletion = false;
                this.isEnemy = isEnemy;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x > GAME_WIDTH || this.x < 0 || this.y > GAME_HEIGHT || this.y < 0) {
                    this.markedForDeletion = true;
                }
            }

            draw(ctx) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.closePath();
            }
        }

        class Enemy {
            constructor() {
                this.width = 50;
                this.height = 50;
                this.x = GAME_WIDTH + Math.random() * 200;
                this.y = GROUND_Y - 50; // Fixed height on ground
                this.speed = Math.random() * 2 + 3;
                this.markedForDeletion = false;
                this.angle = 0;
            }

            update() {
                this.x -= this.speed;
                this.angle += 0.1;

                if (this.x + this.width < 0) this.markedForDeletion = true;
            }

            draw(ctx) {
                if (assets.donut.complete && assets.donut.naturalWidth !== 0) {
                    ctx.save();
                    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                    ctx.rotate(this.angle);
                    ctx.drawImage(assets.donut, -this.width / 2, -this.height / 2, this.width, this.height);
                    ctx.restore();
                } else {
                    ctx.fillStyle = 'pink';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
            }
        }

        class Boss {
            constructor() {
                this.width = 150;
                this.height = 150;
                this.x = GAME_WIDTH + 100;
                this.y = GROUND_Y - this.height - 20;
                this.targetX = GAME_WIDTH - 200;
                this.health = 800;
                this.maxHealth = 800;
                this.active = false;
                this.dy = 0;
                this.angle = 0;
                this.attackTimer = 0;
                this.state = 'ENTERING'; // ENTERING, IDLE, ATTACK
            }

            update(player) {
                if (!this.active) return;

                switch (this.state) {
                    case 'ENTERING':
                        if (this.x > this.targetX) {
                            this.x -= 2;
                        } else {
                            this.state = 'IDLE';
                        }
                        break;
                    case 'IDLE':
                        this.y = (GROUND_Y - this.height - 20) + Math.sin(frames * 0.05) * 50;
                        this.attackTimer++;
                        if (this.attackTimer > 100) {
                            this.state = 'ATTACK';
                            this.attackTimer = 0;
                            this.shootAt(player);
                        }
                        break;
                    case 'ATTACK':
                        // Return to idle quickly after shooting
                        this.state = 'IDLE';
                        break;
                }

            }

            draw(ctx) {
                if (!this.active) return;

                if (assets.boss.complete && assets.boss.naturalWidth !== 0) {
                    ctx.drawImage(assets.boss, this.x, this.y, this.width, this.height);
                } else {
                    ctx.fillStyle = 'purple';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
            }

            shootAt(player) {
                // Simple aiming logic
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let angle = Math.atan2(dy, dx);
                let speed = 7;
                let vx = Math.cos(angle) * speed;
                let vy = Math.sin(angle) * speed;

                enemyProjectiles.push(new Projectile(this.x, this.y + this.height / 2, vx, vy, true));
            }
        }

        class Background {
            constructor() {
                this.x = 0;
                this.width = GAME_WIDTH; // Assumption: aspect ratio fits or we scale
                this.speed = 2;
            }

            update() {
                if (gameState === 'PLAYING') {
                    this.x -= this.speed;
                    if (this.x <= -this.width) this.x = 0;
                }
            }

            draw(ctx) {
                if (assets.bg.complete && assets.bg.naturalWidth !== 0) {
                    // Draw twice for infinite scroll
                    ctx.drawImage(assets.bg, this.x, 0, this.width, GAME_HEIGHT);
                    ctx.drawImage(assets.bg, this.x + this.width, 0, this.width, GAME_HEIGHT);
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
                }
            }
        }

        // Global Entities
        let player;
        let bg;
        let enemies = [];
        let enemyProjectiles = [];
        let boss;
        let loopId;

        function init() {
            try {
                player = new Player();
                bg = new Background();
                boss = new Boss();
                enemies = [];
                enemyProjectiles = [];
                score = 0;
                distance = 0;
                frames = 0;
                bossFightTriggered = false;

                // UI Reset
                updateHealthUI();
                ui.bossHealthContainer.style.display = 'none';
            } catch (e) {
                console.error("Error in init:", e);
                alert("Error initializing game: " + e.message);
            }
        }

        function updateHealthUI() {
            if (ui.health) ui.health.innerText = Math.max(0, player.health);
            if (ui.score) ui.score.innerText = Math.floor(score);
            if (ui.bossHealthFill) {
                let bossPct = (boss.health / boss.maxHealth) * 100;
                ui.bossHealthFill.style.width = `${bossPct}%`;
            }
        }


        function checkCollisions() {
            // Player vs Enemies
            enemies.forEach(enemy => {
                if (isColliding(player, enemy)) {
                    player.health -= 20; // Ouch
                    enemy.markedForDeletion = true;
                    updateHealthUI();
                }
            });

            // Player vs Enemy Projectiles
            enemyProjectiles.forEach(p => {
                // Approx rect for projectile
                let pRect = { x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 };
                if (isColliding(player, pRect)) {
                    player.health -= 10;
                    p.markedForDeletion = true;
                    updateHealthUI();
                }
            });

            // Player Projectiles vs Boss
            player.projectiles.forEach(p => {
                let pRect = { x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 };

                if (boss.active && isColliding(boss, pRect)) {
                    boss.health -= 10;
                    p.markedForDeletion = true;
                    updateHealthUI();
                }

                // P projectiles vs Enemies
                enemies.forEach(enemy => {
                    if (isColliding(enemy, pRect)) {
                        enemy.markedForDeletion = true; // One shot kills small donuts
                        p.markedForDeletion = true;
                        score += 100;
                        updateHealthUI();
                    }
                });
            });

            if (player.health <= 0) {
                setGameOver();
            }

            if (boss.active && boss.health <= 0) {
                setVictory();
            }
        }

        function isColliding(rect1, rect2) {
            return (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        }

        function update() {
            if (!player) return;
            player.update();
            bg.update();

            // Level Progression
            distance += 1;
            score += 0.1;

            // Boss Trigger (e.g. at distance 2000 approx 30s)
            if (distance > 2000 && !bossFightTriggered) {
                bossFightTriggered = true;
                boss.active = true;
                ui.bossHealthContainer.style.display = 'block';
                gameState = 'BOSS';
            }

            if (gameState === 'PLAYING') {
                // Spawn Enemies
                if (frames % 60 === 0 && Math.random() > 0.3) {
                    enemies.push(new Enemy());
                }
            } else if (gameState === 'BOSS') {
                boss.update(player);
                // Occasionally spawn helper donuts during boss? maybe too hard.
            }

            // Update Entities
            enemies.forEach((e, i) => {
                e.update();
                if (e.markedForDeletion) enemies.splice(i, 1);
            });

            enemyProjectiles.forEach((p, i) => {
                p.update();
                if (p.markedForDeletion) enemyProjectiles.splice(i, 1);
            });

            checkCollisions();
            updateHealthUI();
            frames++;
        }

        function draw() {
            ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            bg.draw(ctx);

            player.draw(ctx);

            enemies.forEach(e => e.draw(ctx));
            enemyProjectiles.forEach(p => p.draw(ctx));

            if (boss.active) boss.draw(ctx);
        }

        function gameLoop() {
            if (gameState === 'PLAYING' || gameState === 'BOSS') {
                try {
                    update();
                    draw();
                    loopId = requestAnimationFrame(gameLoop);
                } catch (e) {
                    console.error(e);
                    alert("Game Loop Error: " + e.message);
                    gameState = 'ERROR';
                }
            }
        }

        function startGame() {
            console.log("Starting game...");
            init();
            gameState = 'PLAYING';
            if (ui.startScreen) ui.startScreen.style.display = 'none';
            if (ui.gameOverScreen) ui.gameOverScreen.style.display = 'none';
            if (ui.victoryScreen) ui.victoryScreen.style.display = 'none';

            if (loopId) cancelAnimationFrame(loopId);
            gameLoop();
        }

        function setGameOver() {
            gameState = 'GAMEOVER';
            if (ui.gameOverScreen) ui.gameOverScreen.style.display = 'flex';
        }

        function setVictory() {
            gameState = 'VICTORY';
            if (ui.victoryScreen) ui.victoryScreen.style.display = 'flex';
        }

        // Event Listeners for UI
        if (ui.startBtn) {
            ui.startBtn.addEventListener('click', startGame);
        } else {
            console.error("Start button not attached");
        }

        ui.restartBtns.forEach(btn => btn.addEventListener('click', startGame));

    } catch (e) {
        console.error("Global Error:", e);
        alert("Global Game Error: " + e.message);
    }
});
