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

  waveRaf = requestAnimationFrame(draw);
}

// Pausa el dibujo cuando el hero no está en pantalla (ahorra CPU/batería al bajar por la página)
let waveRaf = null;
function startWave() {
  if (waveRaf === null) waveRaf = requestAnimationFrame(draw);
}
function stopWave() {
  if (waveRaf !== null) { cancelAnimationFrame(waveRaf); waveRaf = null; }
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

if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? startWave() : stopWave();
  }).observe(canvas);
} else {
  startWave();
}

// ===== MIEMBROS: carrusel infinito, arrastrable con el mouse =====
// Duplica las tarjetas una vez para que el loop sea parejo (sin salto visible).
const miTrack = document.getElementById('miTrack');
if (miTrack) {
  const originalCards = [...miTrack.children];
  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('input').forEach((input) => (input.tabIndex = -1));
    miTrack.appendChild(clone);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 0.6; // px por frame
  let miPos = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let halfWidth = 0;

  function measure() {
    halfWidth = miTrack.scrollWidth / 2;
  }

  function normalize() {
    if (halfWidth <= 0) return;
    while (miPos <= -halfWidth) miPos += halfWidth;
    while (miPos > 0) miPos -= halfWidth;
  }

  function render() {
    miTrack.style.transform = `translateX(${miPos}px)`;
  }

  let miRaf = null;
  function tick() {
    if (!dragging && !reduceMotion) {
      miPos -= SPEED;
      normalize();
      render();
    }
    miRaf = requestAnimationFrame(tick);
  }
  function startTick() {
    if (miRaf === null) miRaf = requestAnimationFrame(tick);
  }
  function stopTick() {
    if (miRaf !== null) { cancelAnimationFrame(miRaf); miRaf = null; }
  }

  measure();
  window.addEventListener('resize', measure);

  // Pausa el carrusel cuando no está en pantalla (ahorra CPU/batería)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? startTick() : stopTick();
    }).observe(miTrack);
  } else {
    startTick();
  }

  let dragPointerId = null;
  let dragMoved = false;

  miTrack.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // en táctil se deja el scroll nativo/autoplay
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartPos = miPos;
    dragPointerId = e.pointerId;
  });

  miTrack.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!dragMoved && Math.abs(e.clientX - dragStartX) > 5) {
      dragMoved = true;
      miTrack.classList.add('dragging');
      // Capturar el puntero solo al confirmar arrastre real: hacerlo desde pointerdown
      // redirige el click resultante al propio track en vez de al elemento tocado
      // (por ejemplo los inputs .mi-proy dejarían de poder enfocarse con un click normal).
      try { miTrack.setPointerCapture(dragPointerId); } catch (err) { /* noop */ }
    }
    if (!dragMoved) return;
    miPos = dragStartPos + (e.clientX - dragStartX);
    normalize();
    render();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    miTrack.classList.remove('dragging');
    if (miTrack.hasPointerCapture && e && miTrack.hasPointerCapture(e.pointerId)) {
      miTrack.releasePointerCapture(e.pointerId);
    }
  }

  miTrack.addEventListener('pointerup', endDrag);
  miTrack.addEventListener('pointercancel', endDrag);
}

// Flip cards: solo se giran con click/teclado (no con hover)
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

// ===== PROYECTOS: carrusel 3 en 3 + ficha modal =====
const proyectos = [
  {
    nombre: 'Proyecto #1',
    lineas: 'Desarrollo web, IA...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2', 'Autor 3'],
    tecnologias: [['bi-filetype-html', 'HTML5'], ['bi-filetype-css', 'CSS3'], ['bi-filetype-js', 'JS']],
  },
  {
    nombre: 'Proyecto #2',
    lineas: 'IoT, Sistemas embebidos...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2'],
    tecnologias: [['bi-cpu', 'IoT'], ['bi-git', 'Git']],
  },
  {
    nombre: 'Proyecto #3',
    lineas: 'Visión artificial, Robótica...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2', 'Autor 3'],
    tecnologias: [['bi-filetype-py', 'Python'], ['bi-gpu-card', 'CV']],
  },
  {
    nombre: 'Proyecto #4',
    lineas: 'Desarrollo móvil, UX...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2'],
    tecnologias: [['bi-phone', 'Móvil'], ['bi-palette', 'UX']],
  },
  {
    nombre: 'Proyecto #5',
    lineas: 'Ciberseguridad, Redes...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2', 'Autor 3'],
    tecnologias: [['bi-shield-lock', 'Sec'], ['bi-hdd-network', 'Redes']],
  },
  {
    nombre: 'Proyecto #6',
    lineas: 'Datos, Machine Learning...',
    resumen: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    objetivos: ['Objetivo 1...', 'Objetivo 2...', 'Objetivo 3...'],
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: ['documento.pdf', 'resultados.xlsx'],
    imagenes: ['assets/placeholder.jpg', 'assets/placeholder.jpg'],
    autores: ['Autor 1', 'Autor 2'],
    tecnologias: [['bi-bar-chart', 'Datos'], ['bi-robot', 'ML']],
  },
];

const prTrack = document.getElementById('prTrack');
const prViewport = document.querySelector('.pr-viewport');
const prPrev = document.getElementById('prPrev');
const prNext = document.getElementById('prNext');
const prDots = document.getElementById('prDots');
let prPage = 0;
let prTimer = null;
let prSyncingScroll = false;

function prPerView() {
  return window.innerWidth <= 900 ? 1 : 3;
}
function prMaxPage() {
  return Math.max(0, Math.ceil(proyectos.length / prPerView()) - 1);
}

if (prTrack) {
  proyectos.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'pr-card' + (i % 2 === 1 ? ' dark' : '');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.nombre}: toca para saber más`);
    card.dataset.i = i;
    card.innerHTML = `
      <div class="pr-card-media"><img src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy" /></div>
      <div class="pr-card-body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
        <span class="pr-more">Toca para saber más</span>
      </div>`;
    prTrack.appendChild(card);
  });

  function prRenderDots() {
    prDots.innerHTML = '';
    for (let i = 0; i <= prMaxPage(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir a página ${i + 1}`);
      if (i === prPage) b.classList.add('active');
      b.addEventListener('click', () => { prGo(i); prStart(); });
      prDots.appendChild(b);
    }
  }

  const PR_GAP = 24;

  // Fija el ancho de cada card en píxeles (en vez de depender del % de calc() en CSS, que se
  // resuelve contra el ancho del propio track y puede no coincidir exacto con el visor).
  // Así el ancho de las cards y el desplazamiento del carrusel usan siempre la misma referencia,
  // sin desajustes de subpíxel que cortaran el borde de alguna card.
  function prSizeCards() {
    const perView = prPerView();
    const viewportWidth = prViewport.getBoundingClientRect().width;
    const cardWidth = (viewportWidth - PR_GAP * (perView - 1)) / perView;
    [...prTrack.children].forEach((card) => {
      card.style.flex = `0 0 ${cardWidth}px`;
    });
  }

  function prGo(page) {
    prPage = (page + prMaxPage() + 1) % (prMaxPage() + 1);
    const viewportWidth = prViewport.getBoundingClientRect().width;
    prSyncingScroll = true;
    prViewport.scrollTo({ left: prPage * viewportWidth, behavior: 'smooth' });
    prDots.querySelectorAll('button').forEach((d, j) =>
      d.classList.toggle('active', j === prPage)
    );
  }

  // Si el usuario arrastra/hace scroll manual en el carrusel, mantiene los puntos sincronizados
  // con la página real que quedó a la vista.
  let prScrollTimer = null;
  prViewport.addEventListener('scroll', () => {
    if (prSyncingScroll) {
      clearTimeout(prScrollTimer);
      prScrollTimer = setTimeout(() => { prSyncingScroll = false; }, 400);
      return;
    }
    clearTimeout(prScrollTimer);
    prScrollTimer = setTimeout(() => {
      const viewportWidth = prViewport.getBoundingClientRect().width;
      const page = Math.round(prViewport.scrollLeft / viewportWidth);
      prPage = Math.max(0, Math.min(prMaxPage(), page));
      prDots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('active', j === prPage));
    }, 120);
  });

  function prStart() {
    prStop();
    prTimer = setInterval(() => prGo(prPage + 1), 6000);
  }
  function prStop() {
    if (prTimer) clearInterval(prTimer);
  }

  prPrev.addEventListener('click', () => { prGo(prPage - 1); prStart(); });
  prNext.addEventListener('click', () => { prGo(prPage + 1); prStart(); });

  // El scroll nativo no se arrastra con el mouse en escritorio (solo con dedo/trackpad), así que
  // se agrega arrastre manual moviendo scrollLeft directamente (sin transform, no reintroduce el
  // bug de clipping). Al soltar, ajusta a la página más cercana.
  let prDragging = false;
  let prDragMoved = false;
  let prDragStartX = 0;
  let prDragStartScroll = 0;
  let prDragPointerId = null;

  prViewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // en táctil ya funciona el scroll nativo
    prDragging = true;
    prDragMoved = false;
    prDragStartX = e.clientX;
    prDragStartScroll = prViewport.scrollLeft;
    prDragPointerId = e.pointerId;
  });

  prViewport.addEventListener('pointermove', (e) => {
    if (!prDragging) return;
    const delta = e.clientX - prDragStartX;
    if (!prDragMoved && Math.abs(delta) > 5) {
      prDragMoved = true;
      prViewport.classList.add('dragging');
      prStop();
      // El puntero solo se captura una vez confirmado el arrastre real. Capturarlo desde
      // pointerdown (como antes) hace que el navegador redirija el pointerup/click resultante
      // al propio viewport en vez de a la card tocada, y closest('.pr-card') nunca la encuentra:
      // por eso ningún click, ni siquiera uno normal sin arrastre, abría la ficha.
      try { prViewport.setPointerCapture(prDragPointerId); } catch (err) { /* noop */ }
    }
    if (prDragMoved) prViewport.scrollLeft = prDragStartScroll - delta;
  });

  function prEndDrag() {
    if (!prDragging) return;
    prDragging = false;
    if (prDragMoved) {
      prViewport.classList.remove('dragging');
      const viewportWidth = prViewport.getBoundingClientRect().width;
      const page = Math.round(prViewport.scrollLeft / viewportWidth);
      prGo(Math.max(0, Math.min(prMaxPage(), page)));
      prStart();
    }
  }
  prViewport.addEventListener('pointerup', prEndDrag);
  prViewport.addEventListener('pointercancel', prEndDrag);

  const prCarousel = document.querySelector('.pr-carousel');
  if (prCarousel) {
    prCarousel.addEventListener('mouseenter', prStop);
    prCarousel.addEventListener('mouseleave', prStart);
  }
  document.addEventListener('visibilitychange', () => {
    document.hidden ? prStop() : prStart();
  });

  // ResizeObserver en vez de solo "resize": también se dispara con el tamaño real ya calculado
  // la primera vez que el visor se mide (no depende de que el layout esté listo en el instante
  // exacto en que corre este script, que era la causa de que a veces las cards quedaran en 0px).
  function prResetToFirstPage() {
    // Al cambiar el ancho de las cards, el scrollLeft en píxeles ya no corresponde a la misma
    // página: se resetea al instante (sin animación) a la primera página.
    prSizeCards();
    prRenderDots();
    prPage = 0;
    prSyncingScroll = true;
    prViewport.scrollLeft = 0;
    prDots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('active', j === 0));
  }

  if ('ResizeObserver' in window) {
    let prResizeTimer = null;
    new ResizeObserver(() => {
      clearTimeout(prResizeTimer);
      prResizeTimer = setTimeout(prResetToFirstPage, 50);
    }).observe(prViewport);
  } else {
    prSizeCards();
    window.addEventListener('resize', prResetToFirstPage);
  }

  prRenderDots();
  prGo(0);
  prStart();

  // ---- Modal ficha ----
  const prModal = document.getElementById('prModal');
  const prClose = document.getElementById('prClose');
  const prGalImg = document.getElementById('prGalImg');
  let fichaIndex = 0;
  let galIndex = 0;

  function prOpenFicha(i) {
    fichaIndex = i;
    galIndex = 0;
    prFillFicha();
    prModal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    prClose.focus();
  }
  function prCloseFicha() {
    prModal.hidden = true;
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    prStop();
    prStart();
  }
  function prFillFicha() {
    const p = proyectos[fichaIndex];
    document.getElementById('prNombre').textContent = p.nombre;
    document.getElementById('prLineas').textContent = p.lineas;
    document.getElementById('prResumen').textContent = p.resumen;
    document.getElementById('prPart').textContent = p.participacion;
    document.getElementById('prObjetivos').innerHTML =
      p.objetivos.map((o) => `<li>${o}</li>`).join('');
    document.getElementById('prAnexo1').textContent = p.anexos[0] || '';
    document.getElementById('prAnexo2').textContent = p.anexos[1] || '';
    prShowGalImage();
    document.getElementById('prAutores').innerHTML = p.autores
      .map((a) => `<span title="${a}"><i class="bi bi-person-circle"></i></span>`)
      .join('');
    document.getElementById('prTec').innerHTML = p.tecnologias
      .map(([icon, label]) => `<span title="${label}"><i class="bi ${icon}"></i><small>${label}</small></span>`)
      .join('');
  }

  function prShowGalImage() {
    const p = proyectos[fichaIndex];
    const total = p.imagenes.length;
    galIndex = (galIndex + total) % total;
    prGalImg.classList.add('gal-fade');
    setTimeout(() => {
      prGalImg.src = p.imagenes[galIndex];
      prGalImg.alt = `${p.nombre} - imagen ${galIndex + 1}`;
      prGalImg.onload = () => prGalImg.classList.remove('gal-fade');
      setTimeout(() => prGalImg.classList.remove('gal-fade'), 300);
    }, 150);
    document.getElementById('prGalCount').textContent = `${galIndex + 1} / ${total}`;
    const dotsWrap = document.getElementById('prGalDots');
    // Solo se reconstruyen los puntos si cambia el total de imágenes (otra ficha). Si no,
    // se reutilizan los mismos botones y solo se alterna "active" para que la transición
    // CSS se vea (recrearlos en cada cambio de imagen la impedía, al no existir un estado
    // "antes" del que animar).
    if (dotsWrap.children.length !== total) {
      dotsWrap.innerHTML = '';
      p.imagenes.forEach((_, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Ver imagen ${k + 1}`);
        b.addEventListener('click', () => { galIndex = k; prShowGalImage(); });
        dotsWrap.appendChild(b);
      });
    }
    [...dotsWrap.children].forEach((b, k) => b.classList.toggle('active', k === galIndex));
    const showArrows = total > 1;
    document.getElementById('prGalPrev').style.display = showArrows ? '' : 'none';
    document.getElementById('prGalNext').style.display = showArrows ? '' : 'none';
    dotsWrap.style.display = showArrows ? '' : 'none';
  }

  prTrack.addEventListener('click', (e) => {
    if (prDragMoved) { prDragMoved = false; return; } // fue un arrastre, no un click
    const card = e.target.closest('.pr-card');
    if (card) prOpenFicha(Number(card.dataset.i));
  });
  prTrack.addEventListener('keydown', (e) => {
    const card = e.target.closest('.pr-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      prOpenFicha(Number(card.dataset.i));
    }
  });
  prClose.addEventListener('click', prCloseFicha);
  prModal.addEventListener('click', (e) => {
    if (e.target === prModal) prCloseFicha();
  });
  document.addEventListener('keydown', (e) => {
    if (!prModal.hidden && e.key === 'Escape') prCloseFicha();
  });
  document.getElementById('prGalPrev').addEventListener('click', () => {
    galIndex -= 1;
    prShowGalImage();
  });
  document.getElementById('prGalNext').addEventListener('click', () => {
    galIndex += 1;
    prShowGalImage();
  });
}

// ===== PARTICIPACIONES: tarjetas + modal detalle =====
// Para llegar a "1 / 5" agrega más rutas en "imagenes" (máx. recomendado 5).
// Foto 6 (visor) → assets/part-detalle.jpg — es la primera foto del modal.
const participaciones = [
  {
    titulo: 'EDESI 2026',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    imagenes: ['assets/part-detalle.jpg', 'assets/part-edesi.jpg'],
  },
  {
    titulo: 'ENISI 2026',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    imagenes: ['assets/part-detalle.jpg', 'assets/part-enisi.jpg'],
  },
  {
    titulo: 'RedCOLSI',
    descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    imagenes: ['assets/part-detalle.jpg', 'assets/part-redcolsi.jpg'],
  },
];

const paModal = document.getElementById('paModal');
const paClose = document.getElementById('paClose');
const paImg = document.getElementById('paImg');
const paCount = document.getElementById('paCount');
let paIndex = 0;
let paGal = 0;

if (paModal && paImg) {
  paImg.onerror = () => {
    if (!paImg.src.endsWith('assets/placeholder.jpg')) paImg.src = 'assets/placeholder.jpg';
  };

  function paShow() {
    const p = participaciones[paIndex];
    const total = p.imagenes.length;
    paGal = (paGal + total) % total;
    paImg.classList.add('pa-fade');
    setTimeout(() => {
      paImg.src = p.imagenes[paGal];
      paImg.alt = `${p.titulo} - foto ${paGal + 1}`;
      paImg.onload = () => paImg.classList.remove('pa-fade');
      setTimeout(() => paImg.classList.remove('pa-fade'), 300);
    }, 150);
    paCount.textContent = `${paGal + 1} / ${total}`;
    const multi = total > 1;
    document.getElementById('paPrev').style.display = multi ? '' : 'none';
    document.getElementById('paNext').style.display = multi ? '' : 'none';
  }

  function paOpen(i) {
    paIndex = i;
    paGal = 0;
    const p = participaciones[paIndex];
    document.getElementById('paModalTitle').textContent = p.titulo;
    document.getElementById('paDesc').textContent = p.descripcion;
    paShow();
    paModal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    paClose.focus();
  }

  function paCloseModal() {
    paModal.hidden = true;
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }

  document.querySelectorAll('.pa-card').forEach((card) => {
    card.addEventListener('click', () => paOpen(Number(card.dataset.i)));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        paOpen(Number(card.dataset.i));
      }
    });
  });

  paClose.addEventListener('click', paCloseModal);
  paModal.addEventListener('click', (e) => {
    if (e.target === paModal) paCloseModal();
  });
  document.addEventListener('keydown', (e) => {
    if (paModal.hidden) return;
    if (e.key === 'Escape') paCloseModal();
    if (e.key === 'ArrowLeft') { paGal -= 1; paShow(); }
    if (e.key === 'ArrowRight') { paGal += 1; paShow(); }
  });
  document.getElementById('paPrev').addEventListener('click', () => { paGal -= 1; paShow(); });
  document.getElementById('paNext').addEventListener('click', () => { paGal += 1; paShow(); });
}

// ===== UBICACIÓN: recentrar el mapa al entrar a la sección =====
const ubMap = document.getElementById('ubMap');
const ubSection = document.getElementById('ubicacion');
if (ubMap && ubSection && 'IntersectionObserver' in window) {
  const ubSrc = ubMap.getAttribute('src');
  let ubFirstEntry = true;
  let ubInside = false;
  new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (visible && !ubInside) {
      // Al volver a la sección, recarga el mapa centrado en la universidad
      if (!ubFirstEntry) ubMap.src = ubSrc;
      ubFirstEntry = false;
    }
    ubInside = visible;
  }, { threshold: 0.25 }).observe(ubSection);
}

// ===== CONTACTO: correo (placeholder hasta tener el real) =====
// TODO: reemplazar por el correo real del semillero
const CONTACT_EMAIL = 'contacto@worldtech.edu.co';
const ctMail = document.getElementById('ctMail');
if (ctMail) {
  ctMail.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Contacto WorldTech')}`;
}
