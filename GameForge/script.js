// =========================================
// DOM ELEMENTS
// =========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const promptInput = document.getElementById("gamePrompt");
const generateButton = document.getElementById("generateButton");
const restartButton = document.getElementById("restartButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const downloadButton = document.getElementById("downloadButton");

const emptyPreview = document.getElementById("emptyPreview");
const gameContainer = document.getElementById("gameContainer");
const gameTitle = document.getElementById("gameTitle");
const controlsText = document.getElementById("controlsText");
const codeOutput = document.getElementById("codeOutput");

const gameOverlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayButton = document.getElementById("overlayButton");

const charCount = document.getElementById("charCount");
const toast = document.getElementById("toast");


// =========================================
// GAME STATE
// =========================================

let currentGame = null;
let animationId = null;
let gameRunning = false;

const keys = {};

let generatedGames = [];

try {
    generatedGames = JSON.parse(
        localStorage.getItem("gameforge_games") || "[]"
    );

    if (!Array.isArray(generatedGames)) {
        generatedGames = [];
    }
} catch {
    generatedGames = [];
}


// =========================================
// KEYBOARD
// =========================================

window.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
    ) {
        event.preventDefault();
        generateGame();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});


// =========================================
// PROMPT
// =========================================

if (promptInput) {
    promptInput.addEventListener("input", () => {
        if (charCount) {
            charCount.textContent =
                `${promptInput.value.length} / 1000`;
        }
    });
}

document.querySelectorAll(".suggestion").forEach((button) => {
    button.addEventListener("click", () => {
        if (!promptInput) return;

        promptInput.value = button.dataset.prompt || "";

        if (charCount) {
            charCount.textContent =
                `${promptInput.value.length} / 1000`;
        }

        promptInput.focus();
    });
});


// =========================================
// NAVIGATION
// =========================================

document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {

        document
            .querySelectorAll(".nav-item")
            .forEach((item) => {
                item.classList.remove("active");
            });

        button.classList.add("active");

        document
            .querySelectorAll(".section")
            .forEach((section) => {
                section.classList.remove("active");
            });

        const sectionName = button.dataset.section;

        const targetSection =
            document.getElementById(`${sectionName}Section`);

        if (targetSection) {
            targetSection.classList.add("active");
        }

        const titles = {
            generator: "Create your game",
            games: "My Games",
            settings: "Settings"
        };

        const pageTitle =
            document.getElementById("pageTitle");

        if (pageTitle) {
            pageTitle.textContent =
                titles[sectionName] || "GameForge";
        }
    });
});


// =========================================
// GENERATOR
// =========================================

if (generateButton) {
    generateButton.addEventListener("click", generateGame);
}

async function generateGame() {

    if (!promptInput) return;

    const prompt = promptInput.value.trim();

    if (!prompt) {
        showToast("Describe the game you want to create.");
        promptInput.focus();
        return;
    }

    if (generateButton) {
        generateButton.disabled = true;

        const buttonText =
            generateButton.querySelector("span");

        if (buttonText) {
            buttonText.textContent = "Generating...";
        }
    }

    await sleep(500);

    const type = detectGameType(prompt);

    stopGame();

    currentGame = createGame(type, prompt);

    if (emptyPreview) {
        emptyPreview.style.display = "none";
    }

    if (canvas) {
        canvas.style.display = "block";
    }

    if (restartButton) {
        restartButton.disabled = false;
    }

    if (fullscreenButton) {
        fullscreenButton.disabled = false;
    }

    if (downloadButton) {
        downloadButton.disabled = false;
    }

    if (gameTitle) {
        gameTitle.textContent =
            currentGame.title;
    }

    if (controlsText) {
        controlsText.textContent =
            currentGame.controls;
    }

    if (codeOutput) {
        codeOutput.textContent =
            generateCodePreview(type);
    }

    if (gameOverlay) {
        gameOverlay.style.display = "none";
    }

    startGame();

    saveGeneratedGame(currentGame);

    if (generateButton) {
        generateButton.disabled = false;

        const buttonText =
            generateButton.querySelector("span");

        if (buttonText) {
            buttonText.textContent = "Generate Game";
        }
    }

    showToast(
        `${currentGame.title} generated successfully!`
    );
}


// =========================================
// GAME TYPE DETECTION
// =========================================

function detectGameType(prompt) {

    const text = prompt.toLowerCase();

    if (
        text.includes("snake") ||
        text.includes("worm")
    ) {
        return "snake";
    }

    if (
        text.includes("breakout") ||
        text.includes("brick") ||
        text.includes("blocks") ||
        text.includes("block breaker")
    ) {
        return "breakout";
    }

    if (
        text.includes("space") ||
        text.includes("spaceship") ||
        text.includes("shooter") ||
        text.includes("shoot enemies") ||
        text.includes("alien")
    ) {
        return "space";
    }

    return "platformer";
}


// =========================================
// GAME FACTORY
// =========================================

function createGame(type, prompt) {

    const games = {

        snake: {
            type: "snake",
            title: "Snake",
            controls: "Arrow keys / WASD",
            prompt,
            score: 0
        },

        breakout: {
            type: "breakout",
            title: "Breakout",
            controls: "A / D or ← / →",
            prompt,
            score: 0
        },

        space: {
            type: "space",
            title: "Space Shooter",
            controls: "WASD / Arrow keys + Space",
            prompt,
            score: 0
        },

        platformer: {
            type: "platformer",
            title: "2D Platformer",
            controls: "A / D or ← / → + Space",
            prompt,
            score: 0
        }
    };

    return games[type] || games.platformer;
}


// =========================================
// START GAME
// =========================================

function startGame() {

    stopGame();

    if (!currentGame || !canvas || !ctx) {
        return;
    }

    gameRunning = true;

    if (gameOverlay) {
        gameOverlay.style.display = "none";
    }

    switch (currentGame.type) {

        case "snake":
            initSnake();
            snakeLastMove = 0;
            animationId =
                requestAnimationFrame(snakeLoop);
            break;

        case "breakout":
            initBreakout();
            animationId =
                requestAnimationFrame(breakoutLoop);
            break;

        case "space":
            initSpace();
            animationId =
                requestAnimationFrame(spaceLoop);
            break;

        case "platformer":
            initPlatformer();
            animationId =
                requestAnimationFrame(platformerLoop);
            break;
    }
}


// =========================================
// STOP GAME
// =========================================

function stopGame() {

    gameRunning = false;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}


// =========================================
// SNAKE
// =========================================

let snake = [];
let food = null;

let snakeDirection = {
    x: 1,
    y: 0
};

let snakeNextDirection = {
    x: 1,
    y: 0
};

let snakeLastMove = 0;

const SNAKE_COLUMNS = 30;
const SNAKE_ROWS = 18;


function initSnake() {

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    snakeDirection = {
        x: 1,
        y: 0
    };

    snakeNextDirection = {
        x: 1,
        y: 0
    };

    currentGame.score = 0;

    spawnSnakeFood();
}


function spawnSnakeFood() {

    let position;

    do {
        position = {
            x: Math.floor(
                Math.random() * SNAKE_COLUMNS
            ),

            y: Math.floor(
                Math.random() * SNAKE_ROWS
            )
        };

    } while (
        snake.some(
            (part) =>
                part.x === position.x &&
                part.y === position.y
        )
    );

    food = position;
}


function snakeLoop(time = 0) {

    if (!gameRunning) {
        return;
    }

    if (time - snakeLastMove >= 110) {
        snakeLastMove = time;
        updateSnake();
    }

    drawSnake();

    animationId =
        requestAnimationFrame(snakeLoop);
}


function updateSnake() {

    snakeDirection = {
        ...snakeNextDirection
    };

    const head = {
        x: snake[0].x + snakeDirection.x,
        y: snake[0].y + snakeDirection.y
    };

    const hitWall =
        head.x < 0 ||
        head.x >= SNAKE_COLUMNS ||
        head.y < 0 ||
        head.y >= SNAKE_ROWS;

    const hitSelf = snake.some(
        (part) =>
            part.x === head.x &&
            part.y === head.y
    );

    if (hitWall || hitSelf) {

        endGame(
            "Game Over",
            `Score: ${currentGame.score}`
        );

        return;
    }

    snake.unshift(head);

    if (
        food &&
        head.x === food.x &&
        head.y === food.y
    ) {

        currentGame.score += 10;

        spawnSnakeFood();

    } else {
        snake.pop();
    }
}


function drawSnake() {

    const cellWidth =
        canvas.width / SNAKE_COLUMNS;

    const cellHeight =
        canvas.height / SNAKE_ROWS;

    ctx.fillStyle = "#07120e";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    snake.forEach((part, index) => {

        ctx.fillStyle =
            index === 0
                ? "#ffffff"
                : "#7c5cff";

        ctx.fillRect(
            part.x * cellWidth + 2,
            part.y * cellHeight + 2,
            cellWidth - 4,
            cellHeight - 4
        );
    });

    if (food) {

        ctx.fillStyle = "#42e695";

        ctx.beginPath();

        ctx.arc(
            food.x * cellWidth + cellWidth / 2,
            food.y * cellHeight + cellHeight / 2,
            Math.min(cellWidth, cellHeight) / 3,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawScore();
}


// =========================================
// SNAKE CONTROLS
// =========================================

window.addEventListener("keydown", (event) => {

    if (
        !currentGame ||
        currentGame.type !== "snake"
    ) {
        return;
    }

    const key =
        event.key.toLowerCase();

    if (
        (key === "arrowup" || key === "w") &&
        snakeDirection.y !== 1
    ) {

        snakeNextDirection = {
            x: 0,
            y: -1
        };
    }

    if (
        (key === "arrowdown" || key === "s") &&
        snakeDirection.y !== -1
    ) {

        snakeNextDirection = {
            x: 0,
            y: 1
        };
    }

    if (
        (key === "arrowleft" || key === "a") &&
        snakeDirection.x !== 1
    ) {

        snakeNextDirection = {
            x: -1,
            y: 0
        };
    }

    if (
        (key === "arrowright" || key === "d") &&
        snakeDirection.x !== -1
    ) {

        snakeNextDirection = {
            x: 1,
            y: 0
        };
    }
});


// =========================================
// BREAKOUT
// =========================================

let paddle = null;
let ball = null;
let bricks = [];


function initBreakout() {

    paddle = {
        x: canvas.width / 2 - 80,
        y: canvas.height - 45,
        width: 160,
        height: 12,
        speed: 8
    };

    ball = {
        x: canvas.width / 2,
        y: canvas.height - 80,
        radius: 8,
        dx: 4,
        dy: -4
    };

    bricks = [];

    for (let row = 0; row < 5; row++) {

        for (let col = 0; col < 10; col++) {

            bricks.push({
                x: 70 + col * 80,
                y: 60 + row * 30,
                width: 65,
                height: 20,
                alive: true
            });
        }
    }

    currentGame.score = 0;
}


function breakoutLoop() {

    if (!gameRunning) {
        return;
    }

    updateBreakout();
    drawBreakout();

    animationId =
        requestAnimationFrame(breakoutLoop);
}


function updateBreakout() {

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        paddle.x -= paddle.speed;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        paddle.x += paddle.speed;
    }

    paddle.x = Math.max(
        0,
        Math.min(
            canvas.width - paddle.width,
            paddle.x
        )
    );

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (
        ball.x - ball.radius <= 0 ||
        ball.x + ball.radius >= canvas.width
    ) {
        ball.dx *= -1;
    }

    if (ball.y - ball.radius <= 0) {
        ball.dy *= -1;
    }

    if (
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <=
            paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <=
            paddle.x + paddle.width &&
        ball.dy > 0
    ) {

        ball.dy *= -1;

        const hitPosition =
            (ball.x - paddle.x) /
            paddle.width;

        ball.dx =
            (hitPosition - 0.5) * 8;
    }

    for (const brick of bricks) {

        if (!brick.alive) {
            continue;
        }

        if (
            ball.x + ball.radius > brick.x &&
            ball.x - ball.radius <
                brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius <
                brick.y + brick.height
        ) {

            brick.alive = false;

            ball.dy *= -1;

            currentGame.score += 10;

            break;
        }
    }

    if (
        ball.y - ball.radius >
        canvas.height
    ) {

        endGame(
            "Game Over",
            `Score: ${currentGame.score}`
        );

        return;
    }

    if (
        bricks.every(
            (brick) => !brick.alive
        )
    ) {

        endGame(
            "You Win!",
            `Final score: ${currentGame.score}`
        );
    }
}


function drawBreakout() {

    ctx.fillStyle = "#090b12";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    bricks.forEach((brick, index) => {

        if (!brick.alive) {
            return;
        }

        ctx.fillStyle =
            index % 2 === 0
                ? "#7c5cff"
                : "#9a83ff";

        ctx.fillRect(
            brick.x,
            brick.y,
            brick.width,
            brick.height
        );
    });

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
    );

    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        ball.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    drawScore();
}


// =========================================
// SPACE SHOOTER
// =========================================

let spaceship = null;
let enemies = [];
let bullets = [];
let lastShot = 0;


function initSpace() {

    spaceship = {
        x: canvas.width / 2 - 21,
        y: canvas.height - 70,
        width: 42,
        height: 35,
        speed: 6
    };

    enemies = [];
    bullets = [];

    currentGame.score = 0;

    for (let i = 0; i < 7; i++) {

        enemies.push({
            x: 60 + i * 120,
            y: 60 + Math.random() * 100,
            width: 35,
            height: 28,
            speed: 1 + Math.random() * 0.7
        });
    }

    lastShot = 0;
}


function spaceLoop(time = 0) {

    if (!gameRunning) {
        return;
    }

    updateSpace(time);
    drawSpace();

    animationId =
        requestAnimationFrame(spaceLoop);
}


function updateSpace(time) {

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        spaceship.x -= spaceship.speed;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        spaceship.x += spaceship.speed;
    }

    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        spaceship.y -= spaceship.speed;
    }

    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        spaceship.y += spaceship.speed;
    }

    spaceship.x = Math.max(
        0,
        Math.min(
            canvas.width - spaceship.width,
            spaceship.x
        )
    );

    spaceship.y = Math.max(
        0,
        Math.min(
            canvas.height - spaceship.height,
            spaceship.y
        )
    );

    if (
        keys[" "] &&
        time - lastShot > 250
    ) {

        bullets.push({
            x:
                spaceship.x +
                spaceship.width / 2,

            y: spaceship.y,

            speed: 9
        });

        lastShot = time;
    }

    bullets.forEach((bullet) => {
        bullet.y -= bullet.speed;
    });

    bullets = bullets.filter(
        (bullet) => bullet.y > -20
    );

    enemies.forEach((enemy) => {

        enemy.y += enemy.speed;

        if (
            enemy.y >
            canvas.height + 40
        ) {

            enemy.y = -40;

            enemy.x =
                Math.random() *
                (canvas.width - enemy.width);
        }

        const playerCollision =
            spaceship.x <
                enemy.x + enemy.width &&
            spaceship.x + spaceship.width >
                enemy.x &&
            spaceship.y <
                enemy.y + enemy.height &&
            spaceship.y + spaceship.height >
                enemy.y;

        if (playerCollision) {

            endGame(
                "Game Over",
                `Score: ${currentGame.score}`
            );
        }
    });

    bullets.forEach((bullet) => {

        enemies.forEach((enemy) => {

            if (
                bullet.x > enemy.x &&
                bullet.x <
                    enemy.x + enemy.width &&
                bullet.y > enemy.y &&
                bullet.y <
                    enemy.y + enemy.height
            ) {

                enemy.y = -40;

                enemy.x =
                    Math.random() *
                    (canvas.width - enemy.width);

                bullet.y = -100;

                currentGame.score += 10;
            }
        });
    });
}


function drawSpace() {

    ctx.fillStyle = "#03050d";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Stars
    for (let i = 0; i < 70; i++) {

        const x =
            (i * 127) %
            canvas.width;

        const y =
            (i * 73) %
            canvas.height;

        ctx.fillStyle =
            "rgba(255,255,255,0.5)";

        ctx.fillRect(
            x,
            y,
            2,
            2
        );
    }

    // Spaceship
    ctx.fillStyle = "#7c5cff";

    ctx.beginPath();

    ctx.moveTo(
        spaceship.x +
            spaceship.width / 2,
        spaceship.y
    );

    ctx.lineTo(
        spaceship.x,
        spaceship.y +
            spaceship.height
    );

    ctx.lineTo(
        spaceship.x +
            spaceship.width,
        spaceship.y +
            spaceship.height
    );

    ctx.closePath();
    ctx.fill();

    // Bullets
    ctx.fillStyle = "#42e695";

    bullets.forEach((bullet) => {

        ctx.fillRect(
            bullet.x - 2,
            bullet.y,
            4,
            12
        );
    });

    // Enemies
    enemies.forEach((enemy) => {

        ctx.fillStyle = "#ff5577";

        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height
        );
    });

    drawScore();
}


// =========================================
// PLATFORMER
// =========================================

let player = null;
let platforms = [];
let coins = [];


function initPlatformer() {

    player = {
        x: 100,
        y: 350,
        width: 30,
        height: 40,
        vx: 0,
        vy: 0,
        speed: 5,
        jump: 12,
        grounded: false
    };

    platforms = [

        {
            x: 0,
            y: 460,
            width: 900,
            height: 40
        },

        {
            x: 150,
            y: 370,
            width: 170,
            height: 20
        },

        {
            x: 400,
            y: 300,
            width: 180,
            height: 20
        },

        {
            x: 670,
            y: 220,
            width: 160,
            height: 20
        }
    ];

    coins = [

        {
            x: 220,
            y: 330,
            collected: false
        },

        {
            x: 470,
            y: 260,
            collected: false
        },

        {
            x: 740,
            y: 180,
            collected: false
        }
    ];

    currentGame.score = 0;
}


function platformerLoop() {

    if (!gameRunning) {
        return;
    }

    updatePlatformer();
    drawPlatformer();

    animationId =
        requestAnimationFrame(platformerLoop);
}


function updatePlatformer() {

    player.vx = 0;

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        player.vx = -player.speed;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        player.vx = player.speed;
    }

    if (
        (
            keys[" "] ||
            keys["w"] ||
            keys["arrowup"]
        ) &&
        player.grounded
    ) {

        player.vy = -player.jump;

        player.grounded = false;
    }

    player.vy += 0.6;

    player.x += player.vx;
    player.y += player.vy;

    player.grounded = false;

    platforms.forEach((platform) => {

        const horizontalCollision =
            player.x <
                platform.x + platform.width &&
            player.x + player.width >
                platform.x;

        const verticalCollision =
            player.y + player.height >=
                platform.y &&
            player.y + player.height <=
                platform.y + 20 &&
            player.vy >= 0;

        if (
            horizontalCollision &&
            verticalCollision
        ) {

            player.y =
                platform.y -
                player.height;

            player.vy = 0;

            player.grounded = true;
        }
    });

    player.x = Math.max(
        0,
        Math.min(
            canvas.width - player.width,
            player.x
        )
    );

    if (player.y > canvas.height) {

        endGame(
            "Game Over",
            "You fell off the map."
        );

        return;
    }

    coins.forEach((coin) => {

        if (coin.collected) {
            return;
        }

        const collision =
            player.x <
                coin.x + 15 &&
            player.x + player.width >
                coin.x &&
            player.y <
                coin.y + 15 &&
            player.y + player.height >
                coin.y;

        if (collision) {

            coin.collected = true;

            currentGame.score += 25;
        }
    });

    if (
        coins.length > 0 &&
        coins.every(
            (coin) => coin.collected
        )
    ) {

        endGame(
            "You Win!",
            `Final score: ${currentGame.score}`
        );
    }
}


function drawPlatformer() {

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#11162e"
    );

    gradient.addColorStop(
        1,
        "#080a12"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    platforms.forEach((platform) => {

        ctx.fillStyle = "#7c5cff";

        ctx.fillRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height
        );
    });

    coins.forEach((coin) => {

        if (coin.collected) {
            return;
        }

        ctx.fillStyle = "#ffd166";

        ctx.beginPath();

        ctx.arc(
            coin.x,
            coin.y,
            9,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );

    drawScore();
}


// =========================================
// SCORE
// =========================================

function drawScore() {

    if (!currentGame) {
        return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";

    ctx.fillText(
        `SCORE: ${currentGame.score}`,
        20,
        30
    );
}


// =========================================
// GAME OVER
// =========================================

function endGame(title, message) {

    gameRunning = false;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (overlayTitle) {
        overlayTitle.textContent = title;
    }

    if (overlayMessage) {
        overlayMessage.textContent = message;
    }

    if (gameOverlay) {
        gameOverlay.style.display = "grid";
    }
}


// =========================================
// RESTART
// =========================================

if (restartButton) {
    restartButton.addEventListener("click", () => {

        if (!currentGame) {
            return;
        }

        startGame();
    });
}

if (overlayButton) {
    overlayButton.addEventListener("click", () => {

        if (!currentGame) {
            return;
        }

        startGame();
    });
}


// =========================================
// FULLSCREEN
// =========================================

if (fullscreenButton) {

    fullscreenButton.addEventListener(
        "click",
        async () => {

            try {

                if (!document.fullscreenElement) {

                    if (gameContainer) {
                        await gameContainer.requestFullscreen();
                    }

                } else {

                    await document.exitFullscreen();
                }

            } catch {
                showToast(
                    "Fullscreen is not available."
                );
            }
        }
    );
}


// =========================================
// GENERATED CODE PREVIEW
// =========================================

function generateCodePreview(type) {

    const code = {

        snake: `// GameForge generated Snake game

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const snake = [];
let food;
let score = 0;

function update() {
    // Snake movement
    // Collision detection
    // Food collection
}

function draw() {
    // Draw snake
    // Draw food
    // Draw score
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();`,

        breakout: `// GameForge generated Breakout game

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const paddle = {};
const ball = {};
const bricks = [];

function update() {
    // Paddle movement
    // Ball physics
    // Brick collisions
}

function draw() {
    // Draw paddle
    // Draw ball
    // Draw bricks
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();`,

        space: `// GameForge generated Space Shooter

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const player = {};
const enemies = [];
const bullets = [];

function update() {
    // Player movement
    // Shooting
    // Enemy movement
    // Collision detection
}

function draw() {
    // Draw spaceship
    // Draw enemies
    // Draw bullets
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();`,

        platformer: `// GameForge generated 2D Platformer

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const player = {};
const platforms = [];
const coins = [];

function update() {
    // Gravity
    // Player movement
    // Jumping
    // Platform collision
}

function draw() {
    // Draw player
    // Draw platforms
    // Draw coins
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();`
    };

    return code[type] || code.platformer;
}


// =========================================
// SAVE GAMES
// =========================================

function saveGeneratedGame(game) {

    const savedGame = {

        id: Date.now(),

        title: game.title,

        type: game.type,

        prompt: game.prompt,

        date: new Date().toLocaleDateString()
    };

    generatedGames.unshift(savedGame);

    generatedGames =
        generatedGames.slice(0, 20);

    try {

        localStorage.setItem(
            "gameforge_games",
            JSON.stringify(generatedGames)
        );

    } catch {

        console.warn(
            "Could not save games to localStorage."
        );
    }

    renderGames();
}


function renderGames() {

    const grid =
        document.getElementById("gamesGrid");

    if (!grid) {
        return;
    }

    if (!generatedGames.length) {

        grid.innerHTML = `
            <div class="no-games">
                <div>🎮</div>
                <h4>No games yet</h4>
                <p>
                    Generate your first game
                    to see it here.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML =
        generatedGames
            .map((game) => {

                return `
                    <div class="game-card">
                        <div class="game-card-icon">
                            🎮
                        </div>

                        <div>
                            <h4>
                                ${escapeHtml(game.title)}
                            </h4>

                            <p>
                                ${escapeHtml(game.date)}
                            </p>
                        </div>
                    </div>
                `;
            })
            .join("");
}


// =========================================
// DOWNLOAD
// =========================================

if (downloadButton) {

    downloadButton.addEventListener("click", () => {

        if (!currentGame) {
            return;
        }

        const code =
            generateCodePreview(
                currentGame.type
            );

        const blob =
            new Blob(
                [code],
                {
                    type: "text/javascript"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${currentGame.type}-game.js`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

        showToast(
            "Game code downloaded."
        );
    });
}


// =========================================
// THEME
// =========================================

const themeButton =
    document.getElementById("themeButton");

if (themeButton) {

    themeButton.addEventListener(
        "click",
        () => {

            showToast(
                "Theme controls will be added soon."
            );
        }
    );
}


// =========================================
// SETTINGS
// =========================================

const animationsToggle =
    document.getElementById(
        "animationsToggle"
    );

if (animationsToggle) {

    animationsToggle.addEventListener(
        "change",
        () => {

            document.body.style.setProperty(
                "--animation-speed",
                animationsToggle.checked
                    ? "1"
                    : "0"
            );

            showToast(
                animationsToggle.checked
                    ? "Animations enabled."
                    : "Animations disabled."
            );
        }
    );
}


// =========================================
// HELPERS
// =========================================

function sleep(ms) {

    return new Promise(
        (resolve) => setTimeout(resolve, ms)
    );
}


function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================
// INITIALIZE
// =========================================

renderGames();

if (charCount && promptInput) {
    charCount.textContent =
        `${promptInput.value.length} / 1000`;
}