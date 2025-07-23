// === Doom MS-DOS Mini Remake ===

class DoomGame {
    constructor(container) {
        this.width = 320;
        this.height = 200;
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.tabIndex = 1;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.hud = document.createElement('div');
        this.hud.id = 'hud';
        this.container.appendChild(this.hud);

        // Raycasting parameters
        this.map = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,1,0,1,1,1,0,1,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        this.mapWidth = this.map[0].length;
        this.mapHeight = this.map.length;
        this.blockSize = 1;

        // Player
        this.player = {
            x: 2.5,
            y: 2.5,
            dir: Math.PI / 4,
            fov: Math.PI / 3,
            speed: 2.5, // units per second
            rotSpeed: 2.7, // radians per second
            health: 100,
            ammo: 25
        };
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false
        };
        this.lastShot = 0;

        // Enemies (stationary for simplicity)
        this.enemies = [
            { x: 7.5, y: 3.5, alive: true },
            { x: 12.5, y: 10.5, alive: true }
        ];

        this.lastFrame = performance.now();
        this.running = true;
        this.message = '';
        this.messageTimer = 0;

        this.addInputListeners();
        this.render(); // Start immediately
    }

    addInputListeners() {
        this.canvas.addEventListener('keydown', (e) => this.onKeyDown(e));
        this.canvas.addEventListener('keyup',   (e) => this.onKeyUp(e));
        this.canvas.focus();
        this.container.addEventListener('mousedown', () => this.canvas.focus());
        window.addEventListener('blur', () => this.resetKeys());
    }

    resetKeys() {
        this.keys.left = this.keys.right = this.keys.up = this.keys.down = this.keys.shoot = false;
    }

    onKeyDown(e) {
        switch(e.code) {
            case 'ArrowLeft': case 'KeyA': this.keys.left = true;  break;
            case 'ArrowRight':case 'KeyD': this.keys.right = true; break;
            case 'ArrowUp':   case 'KeyW': this.keys.up = true;    break;
            case 'ArrowDown': case 'KeyS': this.keys.down = true;  break;
            case 'Space':
            case 'ControlLeft':
                this.keys.shoot = true;
                break;
        }
    }
    onKeyUp(e) {
        switch(e.code) {
            case 'ArrowLeft': case 'KeyA': this.keys.left = false;  break;
            case 'ArrowRight':case 'KeyD': this.keys.right = false; break;
            case 'ArrowUp':   case 'KeyW': this.keys.up = false;    break;
            case 'ArrowDown': case 'KeyS': this.keys.down = false;  break;
            case 'Space':
            case 'ControlLeft':
                this.keys.shoot = false;
                break;
        }
    }

    render() {
        // Game loop
        if (!this.running) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastFrame) / 1000, 0.07);
        this.lastFrame = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.render());
    }

    update(dt) {
        // Movement
        let {x, y, dir, speed, rotSpeed} = this.player;
        if(this.keys.left)  this.player.dir -= rotSpeed * dt;
        if(this.keys.right) this.player.dir += rotSpeed * dt;

        let moveStep = 0;
        if (this.keys.up) moveStep += speed * dt;
        if (this.keys.down) moveStep -= speed * dt;
        if (moveStep !== 0) {
            const nx = x + Math.cos(dir) * moveStep;
            const ny = y + Math.sin(dir) * moveStep;
            if(this.map[Math.floor(y)][Math.floor(nx)] === 0) this.player.x = nx;
            if(this.map[Math.floor(ny)][Math.floor(x)] === 0) this.player.y = ny;
        }

        // Shooting
        if (this.keys.shoot && now() - this.lastShot > 250 && this.player.ammo > 0) {
            this.lastShot = now();
            this.player.ammo--;
            // Shoot: raycast for enemy
            for (let i = 0; i < this.enemies.length; ++i) {
                const enemy = this.enemies[i];
                if (!enemy.alive) continue;
                const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
                let angleDiff = Math.abs(this.normalizeAngle(angleToEnemy - this.player.dir));
                if (angleDiff < 0.09) {
                    const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                    if (dist < 6.0) {
                        enemy.alive = false;
                        this.message = 'ENEMY KILLED!';
                        this.messageTimer = 0.8;
                        break;
                    }
                }
            }
        }
        // Message timer
        if (this.message) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0) {
                this.message = '';
            }
        }
    }

    normalizeAngle(a) {
        while (a < -Math.PI) a += Math.PI * 2;
        while (a > Math.PI) a -= Math.PI * 2;
        return a;
    }

    draw() {
        // Raycast walls
        this.ctx.clearRect(0,0,this.width,this.height);
        const ctx = this.ctx;
        const {x: px, y: py, dir: pdir, fov} = this.player;
        const numRays = this.width;
        const maxDepth = 16;

        for(let col = 0; col < numRays; ++col) {
            const rayAngle = (pdir - fov/2) + (col/numRays)*fov;
            let d = 0, hit = false, wallType = 0;
            let rx = px, ry = py;
            for (d = 0; d < maxDepth; d += 0.03) {
                rx = px + Math.cos(rayAngle) * d;
                ry = py + Math.sin(rayAngle) * d;
                const mx = Math.floor(rx), my = Math.floor(ry);
                if (mx < 0 || mx >= this.mapWidth || my < 0 || my >= this.mapHeight) break;
                const cell = this.map[my][mx];
                if (cell !== 0) {
                    hit = true;
                    wallType = cell;
                    break;
                }
            }
            if (hit) {
                // Simple wall coloring
                let shade = Math.max(30, 160 - d*20);
                let wallColor = `rgb(${shade},${Math.floor(shade*0.7)},${shade*0.4})`;
                // Simple shading for sides
                if (Math.abs(Math.sin(rayAngle)) > 0.9) wallColor = `rgb(${shade*0.7},${Math.floor(shade*0.55)},${shade*0.25})`;

                const wallHeight = Math.min(this.height, (this.height * 1.3) / (d+0.2));
                ctx.fillStyle = wallColor;
                ctx.fillRect(col, (this.height/2 - wallHeight/2), 1, wallHeight);

                // Floor and ceiling (simple color bands)
                ctx.fillStyle = '#191621';
                ctx.fillRect(col, (this.height/2 + wallHeight/2), 1, this.height/2 - wallHeight/2);
                ctx.fillStyle = '#303850';
                ctx.fillRect(col, 0, 1, (this.height/2 - wallHeight/2));
            } else {
                ctx.fillStyle = '#191621';
                ctx.fillRect(col, this.height/2, 1, this.height/2);
                ctx.fillStyle = '#303850';
                ctx.fillRect(col, 0, 1, this.height/2);
            }
        }

        // Draw enemies (fake sprite scaling)
        for (let i = 0; i < this.enemies.length; ++i) {
            const enemy = this.enemies[i];
            if (!enemy.alive) continue;
            const dx = enemy.x - px;
            const dy = enemy.y - py;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) - pdir;
            if (angle > -fov/2 && angle < fov/2) {
                const size = Math.min(80, 260/dist);
                const xScreen = Math.floor((0.5 + angle/fov) * this.width - size/2);
                const yScreen = Math.floor(this.height/2 - size/2);
                // Simple: dark red circle as "enemy"
                ctx.beginPath();
                ctx.arc(xScreen+size/2, yScreen+size*0.68, size/2.2, 0, 2*Math.PI);
                ctx.fillStyle = '#b00';
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
                // Eyes
                ctx.beginPath();
                ctx.arc(xScreen+size/2-size/6, yScreen+size*0.7, size/18, 0, 2*Math.PI);
                ctx.arc(xScreen+size/2+size/6, yScreen+size*0.7, size/18, 0, 2*Math.PI);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(xScreen+size/2-size/6, yScreen+size*0.7, size/38, 0, 2*Math.PI);
                ctx.arc(xScreen+size/2+size/6, yScreen+size*0.7, size/38, 0, 2*Math.PI);
                ctx.fillStyle = '#000';
                ctx.fill();
            }
        }

        // Weapon "hand" (simple rectangle for pistol!)
        ctx.fillStyle = '#574433';
        ctx.fillRect(this.width/2-18, this.height-38, 36, 28);
        ctx.fillStyle = '#c8b38b';
        ctx.fillRect(this.width/2-6, this.height-38, 12, 18);
        // Muzzle flash (if shooting)
        if (now() - this.lastShot < 100) {
            ctx.beginPath();
            ctx.arc(this.width/2, this.height-38, 16, 0, Math.PI*2);
            ctx.fillStyle = '#ffffcc';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Message
        if (this.message) {
            ctx.font = 'bold 20px monospace';
            ctx.fillStyle = '#ff0';
            ctx.textAlign = 'center';
            ctx.fillText(this.message, this.width/2, 38);
        }

        // HUD
        this.hud.innerHTML =
            `<span>HEALTH: <span style="color:${this.player.health>30?'#0f0':'#f00'}">${this.player.health}</span></span>
            <span>AMMO: <span style="color:${this.player.ammo>0?'#fc4':'#f00'}">${this.player.ammo}</span></span>
            <span>ENEMIES: <span style="color:#b00">${this.enemies.filter(e=>e.alive).length}</span></span>`;
    }
}

// Menu and Initialization
function initGame() {
    const container = document.getElementById('gameContainer');
    container.innerHTML = '';

    const title = document.createElement('div');
    title.id = 'doomTitle';
    title.textContent = 'DOOM MS-DOS';
    container.appendChild(title);

    const btn = document.createElement('button');
    btn.className = 'menuBtn';
    btn.textContent = 'START GAME';
    btn.onclick = () => {
        container.innerHTML = '';
        const game = new DoomGame(container);
    };
    container.appendChild(btn);

    // Show controls
    const controls = document.createElement('div');
    controls.style.color = "#fff";
    controls.style.marginTop = "14px";
    controls.style.textAlign = "center";
    controls.innerHTML = `
        <b>CONTROLS:</b><br>
        <span style="font-size:1.08em;">
        Move: <b>WASD / Arrow keys</b><br>
        Shoot: <b>Space or Ctrl</b><br>
        </span>
    `;
    container.appendChild(controls);
}

// Utility for time (ms)
function now() { return performance.now(); }

window.addEventListener('DOMContentLoaded', initGame);