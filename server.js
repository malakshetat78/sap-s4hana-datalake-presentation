const express = require('express');
const http = require('http');
const os = require('os');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/docs'));
app.get('/mobile', (req, res) => res.sendFile(__dirname + '/docs/mobile.html'));
app.get('/screen', (req, res) => res.sendFile(__dirname + '/docs/screen.html'));

// ---------------------------------------------------------------------------
// The 9 roadmap phases — single source of truth, shared by the deck,
// the mobile game and the scoring logic.
// ---------------------------------------------------------------------------
const PHASES = [
  { id: 1, title: 'Prepare SAP S/4HANA', blurb: "Get the SAP S/4HANA system ready and confirm it's set up for connectivity" },
  { id: 2, title: 'Configure SAP Integration Suite', blurb: 'Connect SAP to AWS and move data through SAP Integration Suite' },
  { id: 3, title: 'AWS Glue', blurb: 'Clean and prepare the data using AWS Glue' },
  { id: 4, title: 'AWS Glue Data Catalog', blurb: 'Organize the data into a unified, easily accessible catalog' },
  { id: 5, title: 'Amazon Athena', blurb: 'Query the data directly without complex tooling' },
  { id: 6, title: 'Amazon QuickSight', blurb: 'Build interactive dashboards to visualize the results' },
  { id: 7, title: 'Amazon SageMaker', blurb: 'Train machine learning models on the data' },
  { id: 8, title: 'Amazon Bedrock', blurb: 'Generate AI-powered insights using generative AI' },
  { id: 9, title: 'Monitoring & Production Deployment', blurb: 'Monitor the system and deploy it into a real production environment' }
];
const CORRECT_ORDER = PHASES.map(p => p.id);

function localIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

app.get('/api/qr', async (req, res) => {
  const ip = localIp();
  const url = `http://${ip}:${PORT}/mobile`;
  try {
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#0B1F3A', light: '#FFFFFFFF' } });
    res.json({ url, dataUrl });
  } catch (e) {
    res.status(500).json({ error: 'qr generation failed' });
  }
});

// ---------------------------------------------------------------------------
// Live game state (in-memory — single session at a time, reset by admin)
// ---------------------------------------------------------------------------
let players = new Map(); // socketId -> { name, correctCount, timeMs, score, submittedAt }
let competitionOpen = true;
let lastPodium = null;

function scoreSubmission(order, timeMs) {
  const correctCount = order.reduce((acc, id, idx) => acc + (id === CORRECT_ORDER[idx] ? 1 : 0), 0);
  const seconds = timeMs / 1000;
  const speedBonus = Math.max(0, Math.round(100 - seconds)); // up to 100 pts for very fast, fades to 0 after ~100s
  const score = correctCount * 100 + speedBonus;
  return { correctCount, speedBonus, score };
}

function leaderboardPayload() {
  return Array.from(players.values())
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));
}

function broadcastLeaderboard() {
  io.emit('leaderboard-update', { list: leaderboardPayload(), open: competitionOpen });
}

io.on('connection', (socket) => {
  socket.emit('leaderboard-update', { list: leaderboardPayload(), open: competitionOpen });
  if (!competitionOpen && lastPodium) {
    socket.emit('competition-closed', { podium: lastPodium });
  }

  socket.on('join', ({ name }) => {
    if (!competitionOpen) {
      socket.emit('closed');
      return;
    }
    players.set(socket.id, {
      name: String(name || 'Guest').slice(0, 24),
      correctCount: 0,
      timeMs: 0,
      score: 0,
      submitted: false
    });
    broadcastLeaderboard();
  });

  socket.on('submit', ({ order, timeMs }) => {
    if (!competitionOpen) {
      socket.emit('closed');
      return;
    }
    const existing = players.get(socket.id);
    if (!existing || existing.submitted) return;
    const { correctCount, score } = scoreSubmission(order, timeMs);
    players.set(socket.id, { ...existing, correctCount, timeMs, score, submitted: true });
    broadcastLeaderboard();
    const rank = leaderboardPayload().find(p => p.name === existing.name)?.rank;
    socket.emit('submit-ack', { correctCount, total: PHASES.length, rank });
  });

  socket.on('admin-close-competition', () => {
    competitionOpen = false;
    lastPodium = leaderboardPayload().slice(0, 3);
    io.emit('competition-closed', { podium: lastPodium });
  });

  socket.on('admin-reset', () => {
    players = new Map();
    competitionOpen = true;
    lastPodium = null;
    io.emit('competition-reset');
    broadcastLeaderboard();
  });

  socket.on('disconnect', () => {
    // keep the score on the board even if the phone disconnects after submitting
    if (players.has(socket.id) && !players.get(socket.id).submitted) {
      players.delete(socket.id);
      broadcastLeaderboard();
    }
  });
});

server.listen(PORT, () => {
  console.log(`SAP S/4HANA -> AWS Data Lake presentation running:`);
  console.log(`  Deck:        http://localhost:${PORT}/`);
  console.log(`  Big screen:  http://localhost:${PORT}/screen`);
  console.log(`  Mobile game: http://${localIp()}:${PORT}/mobile  (scan the QR code on the deck's game slide)`);
});
