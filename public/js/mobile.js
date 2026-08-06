(function () {
  const socket = io();

  const screens = {
    name: document.getElementById('screen-name'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    closed: document.getElementById('screen-closed')
  };
  function showScreen(key) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[key].classList.add('active');
  }

  const nameInput = document.getElementById('name-input');
  const startBtn = document.getElementById('start-btn');
  const stack = document.getElementById('card-stack');
  const timerEl = document.getElementById('timer');
  const submitBtn = document.getElementById('submit-btn');

  nameInput.addEventListener('input', () => {
    startBtn.disabled = nameInput.value.trim().length === 0;
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) startBtn.click();
  });

  const phases = window.PHASES;
  let order = [];
  let timerHandle = null;
  let startTime = 0;
  let playerName = '';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(ms) {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  function renderStack() {
    stack.innerHTML = order.map((p, i) => `
      <div class="phase-card" data-id="${p.id}">
        <span class="card-index">${i + 1}</span>
        <span class="card-title">${p.title}</span>
        <span class="card-handle">&#8942;&#8942;</span>
      </div>
    `).join('');
    Array.from(stack.children).forEach(card => card.addEventListener('pointerdown', onPointerDown));
  }

  let dragEl = null, startY = 0, baseTop = 0, pointerId = null;

  function onPointerDown(e) {
    const card = e.currentTarget;
    pointerId = e.pointerId;
    card.setPointerCapture(pointerId);
    dragEl = card;
    const rect = card.getBoundingClientRect();
    startY = e.clientY;
    baseTop = rect.top;
    card.classList.add('dragging');
    card.style.position = 'fixed';
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    card.style.width = rect.width + 'px';
    card.style.zIndex = 1000;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragEl) return;
    const dy = e.clientY - startY;
    dragEl.style.top = (baseTop + dy) + 'px';

    const siblings = Array.from(stack.children).filter(c => c !== dragEl);
    const dragCenter = baseTop + dy + dragEl.offsetHeight / 2;
    let target = null;
    for (const sib of siblings) {
      const r = sib.getBoundingClientRect();
      if (dragCenter < r.top + r.height / 2) { target = sib; break; }
    }
    if (target) {
      if (target.previousSibling !== dragEl) stack.insertBefore(dragEl, target);
    } else if (stack.lastElementChild !== dragEl) {
      stack.appendChild(dragEl);
    }
  }

  function onPointerUp() {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    dragEl.style.position = '';
    dragEl.style.left = '';
    dragEl.style.top = '';
    dragEl.style.width = '';
    dragEl.style.zIndex = '';
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    const idToPhase = new Map(phases.map(p => [String(p.id), p]));
    order = Array.from(stack.children).map(c => idToPhase.get(c.dataset.id));
    Array.from(stack.children).forEach((c, i) => { c.querySelector('.card-index').textContent = i + 1; });
    dragEl = null;
  }

  startBtn.addEventListener('click', () => {
    playerName = nameInput.value.trim();
    if (!playerName) return;
    socket.emit('join', { name: playerName });
    order = shuffle(phases);
    renderStack();
    showScreen('game');
    startTime = Date.now();
    timerHandle = setInterval(() => {
      timerEl.textContent = formatTime(Date.now() - startTime);
    }, 100);
  });

  submitBtn.addEventListener('click', () => {
    if (!timerHandle) return;
    clearInterval(timerHandle);
    timerHandle = null;
    const timeMs = Date.now() - startTime;
    submitBtn.disabled = true;
    socket.emit('submit', { order: order.map(p => p.id), timeMs });
    document.getElementById('result-detail').textContent = 'Calculating your result…';
    showScreen('result');
  });

  socket.on('submit-ack', ({ correctCount, total, rank }) => {
    document.getElementById('result-pill').textContent = rank ? `Rank #${rank}` : 'Submitted';
    document.getElementById('result-title').textContent = correctCount === total ? 'Perfect order!' : 'Nice work!';
    document.getElementById('result-detail').textContent = `${correctCount} of ${total} phases correctly placed.`;
  });

  socket.on('closed', () => showScreen('closed'));
  socket.on('competition-closed', () => {
    if (!screens.result.classList.contains('active')) showScreen('closed');
  });
})();
