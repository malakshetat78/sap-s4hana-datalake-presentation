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
  let introActive = !!document.getElementById('intro-video-wrap');

  function goTo(index) {
    if (introActive) return; // block nav until the intro video hands off
    if (index < 0 || index >= slides.length) return;
    const leaving = slides[current];
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;

    // pause any cutscene video we're navigating away from
    const leavingVideo = leaving.querySelector('video');
    if (leavingVideo && !leavingVideo.paused) leavingVideo.pause();

    if (slides[current].classList.contains('slide--roadmap')) {
      const grid = document.getElementById('phase-grid');
      grid.classList.remove('animate');
      // force reflow so the entrance animation replays every time this slide is entered
      void grid.offsetWidth;
      requestAnimationFrame(() => grid.classList.add('animate'));
    }

    if (slides[current].classList.contains('slide--video')) {
      playSceneVideo(slides[current]);
    }
  }

  function playSceneVideo(slideEl) {
    const video = slideEl.querySelector('video');
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.play().catch(() => {
      // autoplay with sound blocked — fall back to muted, offer an unmute button
      video.muted = true;
      video.play().catch(() => {});
    });
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

  // video-2 auto-advances into the Roadmap section once it finishes
  const video2 = document.getElementById('video-2');
  if (video2) {
    video2.addEventListener('ended', () => goTo(current + 1));
    document.getElementById('skip-video-2').addEventListener('click', () => {
      video2.pause();
      goTo(current + 1);
    });
    document.getElementById('unmute-video-2').addEventListener('click', (e) => {
      video2.muted = !video2.muted;
      e.currentTarget.textContent = video2.muted ? '🔇' : '🔊';
    });
  }

  // ---- intro video (video-1): plays once on load, then jumps straight into
  // the Opening section — the title slide (index 0) is skipped in the auto
  // flow but stays reachable manually via the Previous arrow ----
  const introWrap = document.getElementById('intro-video-wrap');
  const introVideo = document.getElementById('intro-video');

  function finishIntro() {
    introActive = false;
    if (introWrap) {
      introWrap.classList.add('hide');
      setTimeout(() => introWrap.remove(), 650);
    }
    goTo(1);
  }

  if (introVideo) {
    introVideo.addEventListener('ended', finishIntro, { once: true });
    introVideo.addEventListener('error', finishIntro, { once: true });
    introVideo.play().catch(finishIntro);

    document.getElementById('skip-intro').addEventListener('click', () => {
      introVideo.pause();
      finishIntro();
    });
    document.getElementById('unmute-intro').addEventListener('click', (e) => {
      introVideo.muted = !introVideo.muted;
      e.currentTarget.textContent = introVideo.muted ? '🔇' : '🔊';
    });
  } else {
    introActive = false;
    goTo(0);
  }

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
    // no local game server reachable (e.g. viewing the public deck) — show a
    // real, always-working QR that opens this presentation on a phone instead
    // of a dead placeholder
    const img = document.getElementById('qr-img');
    img.src = 'deck-qr.png';
    img.style.display = 'block';
    document.getElementById('qr-placeholder').style.display = 'none';
    document.getElementById('qr-url').textContent =
      'Scan to open this presentation on your phone. The live drag-and-drop challenge runs during the presentation — your host will show the join code then.';
  });
})();
