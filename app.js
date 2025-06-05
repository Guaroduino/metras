// app.js: Juego de metras con Matter.js optimizado para móviles
// Configuración y variables globales
let Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events;

let engine, world, render, runner;
let playerMarble;
let targetMarbles = [];
let isDragging = false;
let dragStart = null;
let dragCurrent = null;
let dragVector = null;

// --- Pantalla de selección de modo ---
let gameMode = null; // '1p' o '2p'

function showModeSelection() {
  const container = document.getElementById('game-container');
  container.innerHTML = `
    <div id="mode-select" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100vw;height:100vh;background:#222;">
      <h1 style="color:#fff;font-size:2.2em;margin-bottom:1em;">Selecciona el modo de juego</h1>
      <button id="btn-1p" style="font-size:1.3em;padding:0.7em 2em;margin:0.5em;border-radius:10px;border:none;background:#f5e663;color:#222;font-weight:bold;">1 jugador</button>
      <button id="btn-2p" style="font-size:1.3em;padding:0.7em 2em;margin:0.5em;border-radius:10px;border:none;background:#3498db;color:#fff;font-weight:bold;">2 jugadores</button>
    </div>
  `;
  document.getElementById('btn-1p').onclick = () => { gameMode = '1p'; startGame(); };
  document.getElementById('btn-2p').onclick = () => { gameMode = '2p'; startGame(); };
}

function startGame() {
  // Limpiar pantalla y poner el canvas
  const container = document.getElementById('game-container');
  container.innerHTML = '<canvas id="game-canvas"></canvas>';
  setTimeout(init, 10); // Esperar a que el canvas esté en el DOM
}

// Ajustar tamaño del canvas al tamaño de la pantalla
function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (render) {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
  }
}
window.addEventListener('resize', resizeCanvas);

function getLimitedVector(vec, maxLength) {
  const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  if (len > maxLength) {
    const scale = maxLength / len;
    return { x: vec.x * scale, y: vec.y * scale };
  }
  return vec;
}

function drawLauncher() {
  if (!isDragging || !dragStart || !dragCurrent) return;
  const ctx = render.context;
  ctx.save();
  // Limitar el resorte visual
  const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.35;
  let visualVec = { x: dragCurrent.x - dragStart.x, y: dragCurrent.y - dragStart.y };
  visualVec = getLimitedVector(visualVec, maxDist);
  const endX = dragStart.x + visualVec.x;
  const endY = dragStart.y + visualVec.y;
  // Línea principal del resorte
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(playerMarble.position.x, playerMarble.position.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  // Círculo en el punto de agarre
  ctx.beginPath();
  ctx.arc(endX, endY, 16, 0, 2 * Math.PI);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Cambios en la lógica de lanzamiento para 2 jugadores
let currentPlayer = 1;
let player1Marble, player2Marble;

function switchPlayer() {
  if (gameMode !== '2p') return;
  currentPlayer = currentPlayer === 1 ? 2 : 1;
}

// Inicialización del juego
function init() {
  engine = Engine.create();
  world = engine.world;

  // Crear renderizador en el canvas personalizado
  const canvas = document.getElementById('game-canvas');
  render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      background: '#333',
      pixelRatio: window.devicePixelRatio
    }
  });
  Render.run(render);

  runner = Runner.create();
  Runner.run(runner, engine);

  // --- Ajustes proporcionales ---
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minDim = Math.min(w, h);
  const wallThickness = Math.max(16, Math.round(minDim * 0.04)); // 4% del lado menor, mínimo 16px
  const playerRadius = Math.max(18, Math.round(minDim * 0.07)); // 7% del lado menor, mínimo 18px
  const targetMin = Math.max(10, Math.round(minDim * 0.045)); // 4.5% del lado menor, mínimo 10px
  const targetMax = Math.max(16, Math.round(minDim * 0.08)); // 8% del lado menor, mínimo 16px

  // Crear paredes
  const walls = [
    Bodies.rectangle(w/2, -wallThickness/2, w, wallThickness, { isStatic: true }), // top
    Bodies.rectangle(w/2, h+wallThickness/2, w, wallThickness, { isStatic: true }), // bottom
    Bodies.rectangle(-wallThickness/2, h/2, wallThickness, h, { isStatic: true }), // left
    Bodies.rectangle(w+wallThickness/2, h/2, wallThickness, h, { isStatic: true }) // right
  ];
  World.add(world, walls);

  // Crear metra(s) del jugador
  if (gameMode === '2p') {
    player1Marble = Bodies.circle(w * 0.2, h * 0.5, playerRadius, {
      label: 'player1Marble',
      restitution: 0.9,
      render: { fillStyle: '#f5e663', strokeStyle: '#fff', lineWidth: 2 }
    });
    player2Marble = Bodies.circle(w * 0.8, h * 0.5, playerRadius, {
      label: 'player2Marble',
      restitution: 0.9,
      render: { fillStyle: '#3498db', strokeStyle: '#fff', lineWidth: 2 }
    });
    World.add(world, [player1Marble, player2Marble]);
    playerMarble = currentPlayer === 1 ? player1Marble : player2Marble;
  } else {
    playerMarble = Bodies.circle(w * 0.2, h * 0.5, playerRadius, {
      label: 'playerMarble',
      restitution: 0.9,
      render: { fillStyle: '#f5e663', strokeStyle: '#fff', lineWidth: 2 }
    });
    World.add(world, playerMarble);
  }

  // Crear metras objetivo
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
  for (let i = 0; i < 6; i++) {
    let radius = targetMin + Math.random() * (targetMax - targetMin);
    let x = w * (0.5 + 0.3 * Math.cos((i/6)*2*Math.PI));
    let y = h * (0.5 + 0.3 * Math.sin((i/6)*2*Math.PI));
    let marble = Bodies.circle(x, y, radius, {
      label: 'targetMarble',
      restitution: 0.9,
      render: { fillStyle: colors[i % colors.length], strokeStyle: '#fff', lineWidth: 2 }
    });
    targetMarbles.push(marble);
  }
  World.add(world, targetMarbles);

  // Mouse/touch constraint solo para la metra del jugador
  const mouse = Mouse.create(render.canvas);
  // --- Lógica personalizada de resorte ---
  // Desktop: mouse
  render.canvas.addEventListener('mousedown', function(e) {
    if (gameMode === '2p') playerMarble = currentPlayer === 1 ? player1Marble : player2Marble;
    const rect = render.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - playerMarble.position.x;
    const dy = y - playerMarble.position.y;
    if (Math.sqrt(dx*dx + dy*dy) <= playerMarble.circleRadius + 10) {
      isDragging = true;
      dragStart = { x: playerMarble.position.x, y: playerMarble.position.y };
      dragCurrent = { x, y };
      e.preventDefault();
    }
  });
  render.canvas.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const rect = render.canvas.getBoundingClientRect();
    dragCurrent = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.preventDefault();
  });
  render.canvas.addEventListener('mouseup', function(e) {
    if (!isDragging) return;
    isDragging = false;
    const forceScale = 0.0025;
    let vec = { x: dragStart.x - dragCurrent.x, y: dragStart.y - dragCurrent.y };
    const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.35;
    vec = getLimitedVector(vec, maxDist);
    dragVector = vec;
    Body.setVelocity(playerMarble, { x: 0, y: 0 });
    Body.applyForce(playerMarble, playerMarble.position, {
      x: dragVector.x * forceScale,
      y: dragVector.y * forceScale
    });
    dragStart = null;
    dragCurrent = null;
    if (gameMode === '2p') {
      setTimeout(() => {
        switchPlayer();
        playerMarble = currentPlayer === 1 ? player1Marble : player2Marble;
      }, 600);
    }
    e.preventDefault();
  });
  // Mobile: touch
  render.canvas.addEventListener('touchstart', function(e) {
    if (gameMode === '2p') playerMarble = currentPlayer === 1 ? player1Marble : player2Marble;
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    const dx = x - playerMarble.position.x;
    const dy = y - playerMarble.position.y;
    if (Math.sqrt(dx*dx + dy*dy) <= playerMarble.circleRadius + 10) {
      isDragging = true;
      dragStart = { x: playerMarble.position.x, y: playerMarble.position.y };
      dragCurrent = { x, y };
      e.preventDefault();
    }
  }, { passive: false });
  render.canvas.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    dragCurrent = {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
    e.preventDefault();
  }, { passive: false });
  render.canvas.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    const forceScale = 0.0025;
    let vec = { x: dragStart.x - dragCurrent.x, y: dragStart.y - dragCurrent.y };
    const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.35;
    vec = getLimitedVector(vec, maxDist);
    dragVector = vec;
    Body.setVelocity(playerMarble, { x: 0, y: 0 });
    Body.applyForce(playerMarble, playerMarble.position, {
      x: dragVector.x * forceScale,
      y: dragVector.y * forceScale
    });
    dragStart = null;
    dragCurrent = null;
    if (gameMode === '2p') {
      setTimeout(() => {
        switchPlayer();
        playerMarble = currentPlayer === 1 ? player1Marble : player2Marble;
      }, 600);
    }
    e.preventDefault();
  }, { passive: false });

  // Detección de colisiones
  Events.on(engine, 'collisionStart', function(event) {
    let pairs = event.pairs;
    pairs.forEach(pair => {
      let labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes('playerMarble') && labels.includes('targetMarble')) {
        let target = pair.bodyA.label === 'targetMarble' ? pair.bodyA : pair.bodyB;
        // Eliminar la metra objetivo
        World.remove(world, target);
        targetMarbles = targetMarbles.filter(m => m !== target);
        // Verificar victoria
        if (targetMarbles.length === 0) {
          setTimeout(() => alert('¡Ganaste!'), 300);
        }
      }
    });
  });

  // Control de gravedad por acelerómetro
  if (window.DeviceOrientationEvent) {
    function handleOrientation(event) {
      // gamma: izquierda/derecha, beta: adelante/atrás
      let gamma = event.gamma || 0;
      let beta = event.beta || 0;
      // Normalizar valores a rango [-1, 1]
      engine.world.gravity.x = Math.max(-1, Math.min(1, gamma / 45));
      engine.world.gravity.y = Math.max(-1, Math.min(1, beta / 45));
    }
    // Solicitar permiso en iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      }).catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  // Dibujo del lanzador en cada frame
  (function renderLoop() {
    requestAnimationFrame(renderLoop);
    drawLauncher();
  })();

  resizeCanvas();
}

// Mostrar pantalla de selección al cargar
window.addEventListener('DOMContentLoaded', showModeSelection);
