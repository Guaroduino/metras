// Configuración inicial
const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Events = Matter.Events;

// Variables globales
let engine, world, render;
let playerMarble, targetMarbles = [];
let isDragging = false;
let dragStart = null;
let dragCurrent = null;
let gameStarted = false;

// Configuración del juego
const config = {
    wallThickness: 20,
    playerRadius: 15,
    targetRadius: 12,
    forceMultiplier: 0.001,
    maxDragDistance: 200,
    friction: 0.1,
    restitution: 0.6
};

// Inicialización
function init() {
    // Crear motor y mundo
    engine = Engine.create({
        timing: {
            timeScale: 1
        }
    });
    world = engine.world;
    engine.gravity.y = 0;
    engine.gravity.x = 0;

    // Configurar renderer
    const canvas = document.getElementById('game-canvas');
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: '#2a2a2a',
            pixelRatio: 1
        }
    });

    // Crear paredes
    createWalls();
    
    // Crear metras
    createMarbles();

    // Iniciar renderer
    Render.run(render);
    Engine.run(engine);

    // Eventos táctiles
    setupTouchEvents();
}

function createWalls() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const walls = [
        // Pared superior
        Bodies.rectangle(w/2, -config.wallThickness/2, w, config.wallThickness, {
            isStatic: true,
            render: { fillStyle: '#666' }
        }),
        // Pared inferior
        Bodies.rectangle(w/2, h + config.wallThickness/2, w, config.wallThickness, {
            isStatic: true,
            render: { fillStyle: '#666' }
        }),
        // Pared izquierda
        Bodies.rectangle(-config.wallThickness/2, h/2, config.wallThickness, h, {
            isStatic: true,
            render: { fillStyle: '#666' }
        }),
        // Pared derecha
        Bodies.rectangle(w + config.wallThickness/2, h/2, config.wallThickness, h, {
            isStatic: true,
            render: { fillStyle: '#666' }
        })
    ];
    World.add(world, walls);
}

function createMarbles() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Crear metra del jugador
    playerMarble = Bodies.circle(w * 0.2, h * 0.5, config.playerRadius, {
        restitution: config.restitution,
        friction: config.friction,
        render: {
            fillStyle: '#4CAF50',
            strokeStyle: '#fff',
            lineWidth: 2
        }
    });
    World.add(world, playerMarble);

    // Crear metras objetivo
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12'];
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = w * 0.5 + Math.cos(angle) * w * 0.2;
        const y = h * 0.5 + Math.sin(angle) * h * 0.2;
        
        const marble = Bodies.circle(x, y, config.targetRadius, {
            restitution: config.restitution,
            friction: config.friction,
            render: {
                fillStyle: colors[i],
                strokeStyle: '#fff',
                lineWidth: 2
            }
        });
        targetMarbles.push(marble);
    }
    World.add(world, targetMarbles);
}

function setupTouchEvents() {
    const canvas = render.canvas;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    if (!gameStarted) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (render.canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (render.canvas.height / rect.height);
    
    const dx = x - playerMarble.position.x;
    const dy = y - playerMarble.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= config.playerRadius * 2) {
        isDragging = true;
        dragStart = { x: playerMarble.position.x, y: playerMarble.position.y };
        dragCurrent = { x, y };
    }
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    dragCurrent = {
        x: (touch.clientX - rect.left) * (render.canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (render.canvas.height / rect.height)
    };
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    isDragging = false;
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        // Limitar la distancia máxima de lanzamiento
        const maxDistance = config.maxDragDistance;
        const scale = Math.min(1, maxDistance / distance);
        
        const force = {
            x: dx * scale * config.forceMultiplier,
            y: dy * scale * config.forceMultiplier
        };
        
        Body.setVelocity(playerMarble, { x: 0, y: 0 });
        Body.applyForce(playerMarble, playerMarble.position, force);
    }
    
    dragStart = null;
    dragCurrent = null;
}

function drawLauncher() {
    if (!isDragging || !dragStart || !dragCurrent) return;
    
    const ctx = render.context;
    ctx.save();
    
    // Dibujar línea de dirección
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragCurrent.x, dragCurrent.y);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Dibujar círculo en el punto de agarre
    ctx.beginPath();
    ctx.arc(dragCurrent.x, dragCurrent.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
    
    ctx.restore();
}

// Loop de renderizado
function renderLoop() {
    requestAnimationFrame(renderLoop);
    drawLauncher();
}

// Iniciar juego
document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    gameStarted = true;
    init();
    renderLoop();
});

// Manejar redimensionamiento
window.addEventListener('resize', () => {
    if (render) {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
    }
}); 