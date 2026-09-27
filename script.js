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

// Lenis smooth scroll (solo si el CDN cargó y sin reduced-motion)
let lenis = null;
if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    smoothTouch: false,
  });
  function lenisRaf(time) {
    lenis.raf(time);
    requestAnimationFrame(lenisRaf);
  }
  requestAnimationFrame(lenisRaf);
}

// Menú móvil
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});
// Anclas con Lenis (con fallback nativo)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    navLinks.classList.remove('open');
    if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  });
});

window.addEventListener('resize', resize);
resize();
draw();

// Flip cards: tap / teclado (hover lo maneja CSS)
document.querySelectorAll('.flip-card').forEach((card) => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.classList.toggle('flipped');
    }
  });
});

// Objetivos: rotación automática con fade
const objetivos = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.',
];
const objTexto = document.getElementById('objTexto');
const objDots = document.getElementById('objDots');
let objIndex = 0;
let objTimer = null;

if (objTexto && objDots) {
  objetivos.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Ver objetivo ${i + 1}`);
    if (i === 0) {
      dot.classList.add('active');
      dot.setAttribute('aria-selected', 'true');
    }
    dot.addEventListener('click', () => {
      if (i === objIndex) return;
      showObjetivo(i);
      startObjetivos(); // reinicia el conteo automático
    });
    objDots.appendChild(dot);
  });
  const dots = objDots.querySelectorAll('button');

  function showObjetivo(i) {
    objIndex = i;
    objTexto.classList.add('fade-out');
    setTimeout(() => {
      objTexto.textContent = objetivos[objIndex];
      objTexto.classList.remove('fade-out');
      dots.forEach((d, j) => {
        d.classList.toggle('active', j === objIndex);
        j === objIndex
          ? d.setAttribute('aria-selected', 'true')
          : d.removeAttribute('aria-selected');
      });
    }, 400);
  }

  function startObjetivos() {
    stopObjetivos();
    objTimer = setInterval(() => {
      showObjetivo((objIndex + 1) % objetivos.length);
    }, 5000);
  }

  function stopObjetivos() {
    if (objTimer) clearInterval(objTimer);
  }

  // Pausa al pasar el mouse sobre la caja
  const objBox = objTexto.closest('.obj-box');
  if (objBox) {
    objBox.addEventListener('mouseenter', stopObjetivos);
    objBox.addEventListener('mouseleave', startObjetivos);
  }

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopObjetivos() : startObjetivos();
  });

  startObjetivos();
}
