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
    clone.querySelectorAll('input, textarea').forEach((input) => (input.tabIndex = -1));
    miTrack.appendChild(clone);
  });

  // Las áreas de proyecto muestran el nombre completo: se autoajustan en alto
  function miGrowAreas() {
    miTrack.querySelectorAll('textarea.mi-proy').forEach((ta) => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
    // Cabeceras a la misma altura para que el contenido quede alineado entre fichas
    const heads = miTrack.querySelectorAll('.mi-card-head');
    heads.forEach((h) => { h.style.minHeight = ''; });
    let maxH = 0;
    heads.forEach((h) => { maxH = Math.max(maxH, h.offsetHeight); });
    heads.forEach((h) => { h.style.minHeight = maxH + 'px'; });
  }

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
  miGrowAreas();
  window.addEventListener('resize', measure);
  window.addEventListener('resize', miGrowAreas);
  window.addEventListener('load', miGrowAreas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(miGrowAreas);

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
  'Conectar a estudiantes de todas las facultades para abordar problemáticas reales combinando la tecnología con los conocimientos de cada disciplina.',
  'Crear prototipos y soluciones tecnológicas que resuelvan necesidades concretas en la universidad, la región y la industria.',
  'Capacitar a los miembros en liderazgo, formulación de proyectos, desarrollo de software y metodologías de investigación.',
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

  // La caja toma el alto del objetivo más largo (sin espacio sobrante y sin saltos al rotar)
  function fitObjetivos() {
    const actual = objTexto.textContent;
    objTexto.style.minHeight = '';
    let max = 0;
    objetivos.forEach((t) => {
      objTexto.textContent = t;
      max = Math.max(max, objTexto.offsetHeight);
    });
    objTexto.textContent = actual;
    objTexto.style.minHeight = max + 'px';
  }
  fitObjetivos();
  window.addEventListener('resize', fitObjetivos);
  window.addEventListener('load', fitObjetivos);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitObjetivos);

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
    nombre: 'SISTEMA DE CONTROL DE ASISTENCIA UNIVERSITARIA MEDIENTE TECNOLOGIAS NFC',
    lineas: 'Desarrollo web, IA, IoT, NFC',
    resumen: 'Este proyecto desarrolla un prototipo funcional para automatizar la asistencia académica en la Universidad del Sinú mediante tarjetas NFC, lectura con Arduino (PN532) e interfaz en Tkinter. Al validar la tarjeta, el sistema identifica al estudiante en tiempo real, guarda el registro en SQLite y permite consultar asistencias filtradas por código, salón y clase, quedando pendiente únicamente la modernización visual de la interfaz.',
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: [
      { nombre: 'Documento del proyecto (PDF)', url: 'assets/proyecto-nfc.pdf' },
      { nombre: 'Video demostrativo (YouTube)', url: 'https://www.youtube.com/watch?v=l2ntAK18uuY' },
    ],
    imagenes: ['assets/poster-julian.jpg'],
    autores: [{ nombre: 'Julian David Lopez Ricardo', foto: 'assets/foto-Julian.jpg' }],
    tecnologias: [['bi-cpu', 'Arduino'], ['bi-broadcast', 'NFC'], ['bi-database', 'Base de datos'], ['bi-robot', 'IA']],
  },
  {
    nombre: 'APLICACIÓN DE TECNOLOGÍAS EMERGENTES (IOT, BLOCKCHAIN Y ERP) PARA EL MONITOREO INTELIGENTE Y EL BIENESTAR ANIMAL EN EL FORTALECIMIENTO DEL SECTOR AGROPECUARIO EN CÓRDOBA.',
    lineas: 'IoT, Desarrollo de software, ERP, IA',
    resumen: 'Este proyecto propone modernizar la ganadería en Córdoba mediante la integración de IoT, Blockchain, ERP y Machine Learning. A través del monitoreo en tiempo real de variables fisiológicas y de comportamiento en el ganado bovino, el sistema permite la detección temprana de enfermedades, la predicción de eventos productivos y la gestión transparente de datos, mejorando el bienestar animal y la competitividad de los productores locales.',
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: [
      { nombre: 'Documento del proyecto (PDF)', url: 'assets/proyecto-iot.pdf' },
      { nombre: 'Video demostrativo (YouTube)', url: 'https://www.youtube.com/watch?v=8yE7gNAbgCk' },
    ],
    imagenes: ['assets/poster-marcfran.jpg'],
    autores: [{ nombre: 'Marfranc Javier Hernández Guzman', foto: 'assets/marfranc-foto1.jpg' }],
    tecnologias: [['bi-broadcast', 'LoRa'], ['bi-lock', 'HTTPS'], ['bi-gear', 'ERP'], ['bi-database', 'Bases de datos']],
  },
  {
    nombre: 'CORCIPRO (CÓRDOBA CIBER PROTEGIDA). DISEÑO DE UN SISTEMA DE SEGURIDAD CIBERNÉTICA COLABORATIVO PARA LAS PEQUEÑAS Y MEDIANAS EMPRESAS (PYMES) EN CÓRDOBA, 2026.',
    lineas: 'Desarrollo Web, ciberseguridad, IA, gestion de datos',
    resumen: 'CORCIPRO es un plan de seguridad cibernética colaborativo diseñado para proteger y fortalecer a las PYMEs de Córdoba frente a las amenazas digitales. Ante la falta de recursos técnicos y económicos del sector, el proyecto promueve la cooperación empresarial, la formación en seguridad digital y la creación de redes de respuesta conjunta, construyendo un ecosistema regional más resiliente y competitivo.',
    participacion: 'EDESI 2026, ENISI 2026',
    anexos:  [
      { nombre: 'Documento del proyecto (PDF)', url: 'assets/proyecto-corcipro.pdf' },
      { nombre: 'Video demostrativo (YouTube)', url: 'https://youtu.be/M1pITN-tSmo' },
    ],
    imagenes: ['assets/poster-CORCIPRO.jpg'],
    autores: [{ nombre: 'Daniel José Escobar Soto', foto: 'assets/daniel-foto.jpg' }],
    tecnologias: [['bi-database', 'Base de datos'], ['bi-plug', 'APIs'], ['bi-robot', 'IA'], ['bi-cloud', 'Infraestructura en la nube']],
  },
  {
    nombre: 'HOUSECRAB. DESARROLLO DE UNA APLICACIÓN MÓVIL ORIENTADA AL REGISTRO Y BÚSQUEDA DE RESIDENCIAS PARA ESTUDIANTES DE LA UNIVERSIDAD DEL SINÚ EN LA CIUDAD DE MONTERÍA, CÓRDOBA.',
    lineas: 'Desarrollo móvil, UX...',
    resumen: 'El proyecto consiste en el desarrollo de una aplicación móvil que facilite a los estudiantes de la Universidad del Sinú la búsqueda de residencias en la ciudad de Montería, Córdoba donde puedan alojarse de forma segura durante su formación académica, además de ayudar a los dueños de los domicilios en el registro y promoción de estos dentro de la comunidad estudiantil.',
    participacion: 'EDESI 2026, ENISI 2026',
    anexos:  [
      { nombre: 'Documento del proyecto (PDF)', url: 'assets/proyecto-housecrab.pdf' },
      { nombre: 'Video demostrativo (YouTube)', url: 'https://www.youtube.com/watch?v=Op6RVkOC70g' },
    ],
    imagenes: ['assets/poster-medrano.jpg'],
    autores: [{ nombre: 'José Daniel Medrano Domínguez', foto: 'assets/medrano-foto.jpg' }],
    tecnologias: [['bi-phone', 'Móvil'], ['bi-palette', 'UX']],
  },
  {
    nombre: 'U$COINS: CREANDO UNA CULTURA DE INCENTIVOS EN LA EDUCACIÓN SUPERIOR ',
    lineas: 'Desarrollo Web, seguridad informatica, Gamificacion.',
    resumen: 'El proyecto U$COINS desarrolla una moneda virtual para mejorar el rendimiento académico y la participación estudiantil en la universidad, permitiendo a los estudiantes ganar y redimir créditos mediante su carnet estudiantil. Vinculado al semillero WorldTech, este proyecto promueve la investigación aplicada y el desarrollo tecnológico, integrando U$COINS en prácticas, tesis y consultorías, y permitiendo a los estudiantes aplicar conocimientos teóricos y desarrollar habilidades relevantes para su futura carrera.',
    participacion: 'EDESI 2026, ENISI 2026',
    anexos: [
      { nombre: 'Documento del proyecto (PDF)', url: 'assets/proyecto-uscoins.pdf' },
      { nombre: 'Video demostrativo (YouTube)', url: 'https://www.youtube.com/watch?v=gZQ1o-kjOkM' },
    ],
    imagenes: ['assets/uscoins-1.jpg'],
    autores: [{ nombre: 'Andres Arturo Padilla Herrera', foto: 'assets/miembro-andres.jpg' }],
    tecnologias: [['bi-database', 'Base de datos'], ['bi-key', 'JSON Web Tokens'], ['bi-shield-lock', 'HttpOnly']],
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
  const prCard = prModal.querySelector('.pr-modal-card');
  // Contenido de la ficha en un contenedor propio para poder escalarlo y evitar el scroll
  const prFit = document.createElement('div');
  prFit.className = 'pr-fit';
  [...prCard.children].forEach((k) => { if (!k.classList.contains('pr-close')) prFit.appendChild(k); });
  prCard.appendChild(prFit);
  function prFitFicha() {
    prFit.style.zoom = 1;
    if (prModal.hidden || window.innerWidth <= 900) return; // en móvil la ficha se desplaza
    const cs = getComputedStyle(prCard);
    const avail = prCard.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4;
    const h = prFit.offsetHeight;
    if (h > avail) prFit.style.zoom = Math.max(0.55, avail / h).toFixed(3);
  }
  window.addEventListener('resize', prFitFicha);
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
    prCard.scrollTop = 0;
    prFitFicha();
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
    // Anexos: acepta { nombre, url } o texto simple (sin enlace)
    ['prAnexo1', 'prAnexo2'].forEach((id, k) => {
      const a = document.getElementById(id);
      const anexo = p.anexos[k];
      if (!anexo) { a.textContent = ''; a.removeAttribute('href'); return; }
      if (typeof anexo === 'string') {
        a.textContent = anexo;
        a.removeAttribute('href');
        a.removeAttribute('target');
        return;
      }
      a.textContent = anexo.nombre;
      a.href = anexo.url;
      if (/^https?:\/\//i.test(anexo.url)) {
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
    prShowGalImage();
    document.getElementById('prAutores').innerHTML = p.autores
      .map((a) => {
        if (typeof a === 'string') return `<span title="${a}"><i class="bi bi-person-circle"></i></span>`;
        return `<span class="pr-autor" title="${a.nombre}"><img src="${a.foto}" alt="Foto de ${a.nombre}" loading="lazy" onerror="this.style.display='none'" /><small>${a.nombre}</small></span>`;
      })
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
    descripcion: 'El semillero de investigación WorldTech representó con éxito a la Universidad del Sinú en el Encuentro Departamental de Semilleros de Investigación (EDESI) de la red RedCOLSI, consolidándose como un referente en innovación tecnológica y desarrollo regional. Los estudiantes investigadores demostraron el impacto de la investigación formativa en la resolución de problemáticas reales, fortaleciendo el compromiso del semillero con la excelencia académica y el desarrollo científico del departamento.',
    // La foto 5 va primera: es la portada de la tarjeta y la primera del visor
    imagenes: ['assets/edesi-5.jpg', 'assets/edesi-1.jpg', 'assets/edesi-2.jpg', 'assets/edesi-3.jpg', 'assets/edesi-4.jpg'],
  },
  {
    titulo: 'ENISI 2026',
    descripcion: 'El semillero de investigación WorldTech de la Universidad del Sinú destacó en el Encuentro Institucional de Semilleros de Investigación (ENISI), presentando un abanico de proyectos tecnológicos orientados a resolver problemáticas reales del entorno regional y académico, con propuestas innovadoras en áreas como automatización con tecnologías NFC, monitoreo ganadero mediante IoT y tecnologías emergentes, los estudiantes investigadores revalidaron el compromiso de WorldTech con la investigación formativa, la excelencia académica y el desarrollo científico desde las aulas.',
    imagenes: ['assets/enisi-1.jpg', 'assets/enisi-2.jpg', 'assets/enisi-3.jpg', 'assets/enisi-4.jpg', 'assets/enisi-5.jpg', 'assets/enisi-6.jpg', 'assets/enisi-7.jpg'],
  },
];

const paModal = document.getElementById('paModal');
const paDescEl = document.getElementById('paDesc');
// Reduce la letra de la descripción (hasta un mínimo legible) para que quepa sin scroll
function paFitDesc() {
  if (!paDescEl) return;
  let size = 13;
  paDescEl.style.fontSize = size + 'px';
  while (paDescEl.scrollHeight > paDescEl.clientHeight + 1 && size > 10.5) {
    size -= 0.5;
    paDescEl.style.fontSize = size + 'px';
  }
}
window.addEventListener('resize', () => { if (paModal && !paModal.hidden) paFitDesc(); });
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
    paDescEl.scrollTop = 0;
    paFitDesc();
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
