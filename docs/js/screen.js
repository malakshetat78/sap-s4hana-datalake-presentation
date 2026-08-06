(function () {
  const socket = io();

  const leaderboardScreen = document.getElementById('screen-leaderboard');
  const podiumScreen = document.getElementById('screen-podium');
  const wrap = document.getElementById('leaderboard-wrap');
  const countEl = document.getElementById('player-count');
  const closeBtn = document.getElementById('close-btn');
  const resetBtn = document.getElementById('reset-btn');

  function showLeaderboard() {
    podiumScreen.classList.remove('active');
    leaderboardScreen.classList.add('active');
  }

  socket.on('leaderboard-update', ({ list, open }) => {
    if (!open) return; // podium takes over once closed
    if (list.length === 0) {
      countEl.textContent = 'Waiting for players to join…';
      wrap.innerHTML = '<p class="empty-state">Scan the QR code on the presentation to join.</p>';
      return;
    }
    countEl.textContent = `${list.length} player${list.length === 1 ? '' : 's'} in this round`;
    wrap.innerHTML = list.map(p => `
      <div class="leaderboard-row ${p.rank === 1 ? 'rank-1' : ''}">
        <div class="lb-rank">#${p.rank}</div>
        <div>
          <div class="lb-name">${escapeHtml(p.name)}</div>
          <div class="lb-detail">${p.submitted ? `${p.correctCount}/9 correct · ${(p.timeMs / 1000).toFixed(1)}s` : 'still arranging…'}</div>
        </div>
        <div class="lb-score">${p.submitted ? p.score + ' pts' : '<span class="lb-waiting">…</span>'}</div>
      </div>
    `).join('');
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  closeBtn.addEventListener('click', () => {
    if (confirm('Close the competition and reveal the podium?')) {
      socket.emit('admin-close-competition');
    }
  });
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset the round? This clears the current leaderboard.')) {
      socket.emit('admin-reset');
    }
  });

  socket.on('competition-closed', ({ podium }) => {
    revealPodium(podium);
  });

  socket.on('competition-reset', () => {
    ['slot-1', 'slot-2', 'slot-3'].forEach(id => document.getElementById(id).classList.remove('show'));
    showLeaderboard();
  });

  function revealPodium(podium) {
    leaderboardScreen.classList.remove('active');
    podiumScreen.classList.add('active');

    const slots = {
      1: document.getElementById('slot-1'),
      2: document.getElementById('slot-2'),
      3: document.getElementById('slot-3')
    };
    Object.values(slots).forEach(s => s.classList.remove('show'));
    Object.values(slots).forEach(s => {
      s.querySelector('.podium-name').textContent = '—';
      s.querySelector('.podium-score').textContent = '—';
    });

    podium.forEach((p, i) => {
      const slot = slots[i + 1];
      if (!slot) return;
      slot.querySelector('.podium-name').textContent = p.name;
      slot.querySelector('.podium-score').textContent = `${p.score} pts · ${p.correctCount}/9`;
    });

    const order = [3, 2, 1];
    order.forEach((place, i) => {
      if (!podium[place - 1]) return;
      setTimeout(() => slots[place].classList.add('show'), 600 + i * 1100);
    });
  }
})();
