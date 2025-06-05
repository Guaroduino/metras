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
let dragVector = null;
let launcherLine = null; // Para dibujar la línea del lanzador

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

function drawLauncher() {
  if (!isDragging || !dragStart) return;
  const ctx = render.context;
  ctx.save();
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(playerMarble.position.x, playerMarble.position.y);
  ctx.lineTo(render.mouse.position.x, render.mouse.position.y);
  ctx.stroke();
  ctx.restore();
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

  // Crear paredes
  const wallThickness = 40;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const walls = [
    Bodies.rectangle(w/2, -wallThickness/2, w, wallThickness, { isStatic: true }), // top
    Bodies.rectangle(w/2, h+wallThickness/2, w, wallThickness, { isStatic: true }), // bottom
    Bodies.rectangle(-wallThickness/2, h/2, wallThickness, h, { isStatic: true }), // left
    Bodies.rectangle(w+wallThickness/2, h/2, wallThickness, h, { isStatic: true }) // right
  ];
  World.add(world, walls);

  // Crear metra del jugador
  playerMarble = Bodies.circle(w * 0.2, h * 0.5, 28, {
    label: 'playerMarble',
    restitution: 0.9,
    render: { fillStyle: '#f5e663', strokeStyle: '#fff', lineWidth: 2 }
  });
  World.add(world, playerMarble);

  // Crear metras objetivo
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
  for (let i = 0; i < 6; i++) {
    let radius = 18 + Math.random() * 12;
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
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    },
    collisionFilter: {
      mask: 0x0001
    }
  });
  World.add(world, mouseConstraint);

  // Solo permitir arrastrar la metra del jugador
  Events.on(mouseConstraint, 'startdrag', function(event) {
    if (event.body === playerMarble) {
      isDragging = true;
      dragStart = { x: playerMarble.position.x, y: playerMarble.position.y };
    }
  });
  Events.on(mouseConstraint, 'enddrag', function(event) {
    if (isDragging && event.body === playerMarble) {
      isDragging = false;
      // Calcular vector de lanzamiento
      const dragEnd = mouse.position;
      dragVector = {
        x: dragStart.x - dragEnd.x,
        y: dragStart.y - dragEnd.y
      };
      // Aplicar fuerza proporcional
      const forceScale = 0.0025;
      Body.setVelocity(playerMarble, { x: 0, y: 0 });
      Body.applyForce(playerMarble, playerMarble.position, {
        x: dragVector.x * forceScale,
        y: dragVector.y * forceScale
      });
    }
  });

  // Eventos touch para móviles (drag tipo resorte)
  render.canvas.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left);
    const y = (touch.clientY - rect.top);
    // Detectar si el touch es sobre la metra del jugador
    const dx = x - playerMarble.position.x;
    const dy = y - playerMarble.position.y;
    if (Math.sqrt(dx*dx + dy*dy) <= playerMarble.circleRadius + 10) {
      isDragging = true;
      dragStart = { x: playerMarble.position.x, y: playerMarble.position.y };
      render.mouse.position.x = x;
      render.mouse.position.y = y;
      e.preventDefault();
    }
  }, { passive: false });
  render.canvas.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const rect = render.canvas.getBoundingClientRect();
    render.mouse.position.x = (touch.clientX - rect.left);
    render.mouse.position.y = (touch.clientY - rect.top);
    e.preventDefault();
  }, { passive: false });
  render.canvas.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    const dragEnd = render.mouse.position;
    dragVector = {
      x: dragStart.x - dragEnd.x,
      y: dragStart.y - dragEnd.y
    };
    const forceScale = 0.0025;
    Body.setVelocity(playerMarble, { x: 0, y: 0 });
    Body.applyForce(playerMarble, playerMarble.position, {
      x: dragVector.x * forceScale,
      y: dragVector.y * forceScale
    });
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

window.addEventListener('DOMContentLoaded', init);
