(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dotsWrap = document.getElementById('nav-dots');
  const prevBtn = document.querySelector('.nav-prev');
  const nextBtn = document.querySelector('.nav-next');
  let current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'nav-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goTo(index) {
    if (index < 0 || index >= slides.length) return;
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;

    if (slides[current].classList.contains('slide--roadmap')) {
      const grid = document.getElementById('phase-grid');
      grid.classList.remove('animate');
      // force reflow so the entrance animation replays every time this slide is entered
      void grid.offsetWidth;
      requestAnimationFrame(() => grid.classList.add('animate'));
    }
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => goTo(parseInt(el.dataset.goto, 10)));
  });

  goTo(0);

  // ---- 9-phase roadmap: interactive flip cards (no backend needed) ----
  const grid = document.getElementById('phase-grid');
  grid.innerHTML = window.PHASES.map((p, i) => `
    <button class="phase-tile" type="button" data-id="${p.id}" aria-expanded="false" style="transition-delay:${i * 0.06}s">
      <div class="phase-tile-inner">
        <div class="phase-tile-face phase-tile-front">
          <span class="tile-num">${p.id}</span>
          <h4>${p.title}</h4>
          <span class="tile-hint">Tap to reveal</span>
        </div>
        <div class="phase-tile-face phase-tile-back">
          <p>${p.blurb}</p>
        </div>
      </div>
    </button>
  `).join('');

  grid.querySelectorAll('.phase-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const flipped = tile.classList.toggle('flipped');
      tile.setAttribute('aria-expanded', String(flipped));
    });
  });

  // ---- load a live QR code for the game (only present when served by the local Node app) ----
  fetch('api/qr').then(r => {
    if (!r.ok) throw new Error('no local game server');
    return r.json();
  }).then(({ url, dataUrl }) => {
    const img = document.getElementById('qr-img');
    img.src = dataUrl;
    img.style.display = 'block';
    document.getElementById('qr-placeholder').style.display = 'none';
    document.getElementById('qr-url').textContent = url;
  }).catch(() => {
    document.getElementById('qr-url').textContent =
      'This challenge runs live during the presentation — your host will display the join code on screen.';
  });
})();
