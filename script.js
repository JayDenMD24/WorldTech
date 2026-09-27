// Onda de partículas estilo referencia (puntos blancos sobre negro)
const canvas = document.getElementById('wave');
const ctx = canvas.getContext('2d');

let w, h, t = 0;
let dots = [];

function resize() {
  w = canvas.width = canvas.offsetWidth;
  h = canvas.height = canvas.offsetHeight;
  buildDots();
}

function buildDots() {
  dots = [];
  const gapX = Math.max(10, w / 160);
  const gapY = Math.max(10, h / 90);
  for (let y = 0; y < h + gapY; y += gapY) {
    for (let x = 0; x < w + gapX; x += gapX) {
      dots.push({ x, y, bx: x, by: y });
    }
  }
}

function waveHeight(x, y, time) {
  const nx = x / w - 0.5;
  const ny = y / h - 0.5;
  // Varias ondas superpuestas para el efecto fluido de la referencia
  return (
    Math.sin(nx * 6 + time * 0.9) * 46 +
    Math.sin(nx * 11 - time * 0.6 + ny * 4) * 26 +
    Math.cos(ny * 7 + time * 0.4) * 18
  );
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  t += 0.012;

  // Atenuar hacia arriba: la onda vive en la mitad inferior como en la imagen
  for (const d of dots) {
    const depth = d.by / h; // 0 arriba, 1 abajo
    const mask = Math.max(0, (depth - 0.18) / 0.82); // aparece desde ~18% altura
    const dy = waveHeight(d.bx, d.by, t) * mask;
    const y = d.by + dy;

    // Brillo según cresta de la onda
    const glow = Math.min(1, Math.abs(dy) / 60);
    const alpha = 0.08 + mask * 0.5 + glow * 0.35;
    const size = 0.6 + mask * 1.1 + glow * 0.8;

    ctx.beginPath();
    ctx.arc(d.bx, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fill();
  }

  // Línea de cresta brillante (el hilo blanco de la referencia)
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const yBase = h * 0.42;
    const y = yBase + waveHeight(x, yBase, t) * 0.9;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  requestAnimationFrame(draw);
}

// Menú móvil
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

window.addEventListener('resize', resize);
resize();
draw();
