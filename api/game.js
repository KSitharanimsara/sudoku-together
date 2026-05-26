// Game state stored in memory (Vercel KV would be better but this works for demo)
const rooms = new Map();

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function valid(b, r, c, n) {
  for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
  const br = r / 3 | 0, bc = c / 3 | 0;
  for (let rr = br * 3; rr < br * 3 + 3; rr++)
    for (let cc = bc * 3; cc < bc * 3 + 3; cc++)
      if (b[rr][cc] === n) return false;
  return true;
}

function solve(b) {
  let br = -1, bc = -1, bn = 10;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!b[r][c]) {
    let cnt = 0;
    for (let n = 1; n <= 9; n++) if (valid(b, r, c, n)) cnt++;
    if (!cnt) return false;
    if (cnt < bn) { bn = cnt; br = r; bc = c; }
  }
  if (br < 0) return true;
  for (const n of shuffle([1,2,3,4,5,6,7,8,9]))
    if (valid(b, br, bc, n)) { b[br][bc] = n; if (solve(b)) return true; b[br][bc] = 0; }
  return false;
}

function genPuzzle() {
  const b = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let box = 0; box < 9; box += 3) {
    const nums = shuffle([1,2,3,4,5,6,7,8,9]);
    let idx = 0;
    for (let r = box; r < box + 3; r++) for (let c = box; c < box + 3; c++) b[r][c] = nums[idx++];
  }
  solve(b);
  const sol = b.map(r => [...r]);
  const pos = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) pos.push({ r, c });
  const sh = shuffle(pos);
  let removed = 0;
  for (const { r, c } of sh) {
    if (removed >= 44) break;
    const backup = b[r][c];
    b[r][c] = 0;
    const test = b.map(row => [...row]);
    let sols = 0;
    function bt(bd) {
      if (sols > 1) return;
      for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) if (!bd[rr][cc]) {
        for (let nn = 1; nn <= 9; nn++) if (valid(bd, rr, cc, nn)) { bd[rr][cc] = nn; bt(bd); bd[rr][cc] = 0; }
        return;
      }
      sols++;
    }
    bt(test);
    if (sols !== 1) b[r][c] = backup;
    else removed++;
  }
  return { puzzle: b, solution: sol, empty: b.flat().filter(v => !v).length };
}

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.random() * chars.length | 0];
  } while (rooms.has(code));
  return code;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      case 'create': return createRoom(req, res);
      case 'join': return joinRoom(req, res);
      case 'poll': return pollRoom(req, res);
      case 'move': return makeMove(req, res);
      case 'chat': return handleChat(req, res);
      case 'start': return startGame(req, res);
      case 'restart': return restartGame(req, res);
      case 'leave': return leaveRoom(req, res);
      default: return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

function createRoom(req, res) {
  const name = (req.body?.name || '').trim().slice(0, 30);
  if (!name) return res.status(400).json({ error: 'Name required' });
  const code = makeCode();
  const { puzzle, solution, empty } = genPuzzle();
  rooms.set(code, {
    code, puzzle, solution, empty,
    players: [{ name, joinedAt: Date.now() }],
    filled: {}, chat: [], events: [],
    started: false, done: false, createdAt: Date.now()
  });
  pushEvent(code, { type: 'player-joined', name, players: [{ name }] });
  res.json({ ok: true, code, puzzle, solution, empty, players: [{ name }] });
}

function joinRoom(req, res) {
  const name = (req.body?.name || '').trim().slice(0, 30);
  const code = (req.body?.code || '').toUpperCase().trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (!code) return res.status(400).json({ error: 'Code required' });

  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.players.length >= 2) return res.status(400).json({ error: 'Room full' });
  if (room.players.some(p => p.name === name)) return res.status(400).json({ error: 'Name taken' });

  room.players.push({ name, joinedAt: Date.now() });
  pushEvent(code, { type: 'player-joined', name, players: room.players.map(p => ({ name: p.name })) });

  res.json({
    ok: true, code: room.code,
    puzzle: room.puzzle, solution: room.solution, empty: room.empty,
    filled: room.filled, chat: room.chat, events: room.events,
    started: room.started, done: room.done,
    players: room.players.map(p => ({ name: p.name }))
  });
}

function pollRoom(req, res) {
  const code = (req.query.code || '').toUpperCase().trim();
  const since = parseInt(req.query.since) || 0;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const events = room.events.filter(e => e.ts > since);
  res.json({
    events,
    started: room.started,
    done: room.done,
    filled: room.filled,
    players: room.players.map(p => ({ name: p.name })),
    chat: room.chat.slice(-20),
    ts: Date.now()
  });
}

function makeMove(req, res) {
  const code = (req.body?.code || '').toUpperCase().trim();
  const { row, col, val, by } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!room.started) return res.status(400).json({ error: 'Not started' });
  if (room.done) return res.status(400).json({ error: 'Game done' });
  if (row < 0 || row > 8 || col < 0 || col > 8 || val < 1 || val > 9) return res.status(400).json({ error: 'Invalid' });
  if (room.puzzle[row][col] !== 0) return res.status(400).json({ error: 'Given cell' });
  if (room.solution[row][col] !== val) return res.status(400).json({ error: 'Wrong answer' });

  const key = row + ',' + col;
  if (room.filled[key]) return res.status(400).json({ error: 'Already filled' });
  room.filled[key] = { val, by };
  const cnt = Object.keys(room.filled).length;
  const done = cnt >= room.empty;
  if (done) room.done = true;

  pushEvent(code, { type: 'fill', row, col, val, by, filled: cnt, total: room.empty, done });
  if (done) pushEvent(code, { type: 'done' });
  res.json({ ok: true, filled: cnt, total: room.empty, done });
}

function handleChat(req, res) {
  const code = (req.body?.code || '').toUpperCase().trim();
  const { text, by } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const msg = { id: Date.now().toString(36), from: by, text: (text || '').trim().slice(0, 500), at: Date.now() };
  room.chat.push(msg);
  if (room.chat.length > 100) room.chat = room.chat.slice(-50);
  pushEvent(code, { type: 'chat', msg });
  res.json({ ok: true });
}

function startGame(req, res) {
  const code = (req.body?.code || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.started) return res.status(400).json({ error: 'Already started' });
  if (room.players.length < 2) return res.status(400).json({ error: 'Need 2 players' });
  room.started = true;
  pushEvent(code, { type: 'start', t: Date.now() });
  res.json({ ok: true });
}

function restartGame(req, res) {
  const code = (req.body?.code || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { puzzle, solution, empty } = genPuzzle();
  room.puzzle = puzzle; room.solution = solution; room.empty = empty;
  room.filled = {}; room.chat = []; room.events = [];
  room.started = false; room.done = false;
  pushEvent(code, { type: 'restart', puzzle, solution, empty, players: room.players.map(p => ({ name: p.name })) });
  res.json({ ok: true });
}

function leaveRoom(req, res) {
  const code = (req.body?.code || '').toUpperCase().trim();
  const { name } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.players = room.players.filter(p => p.name !== name);
  pushEvent(code, { type: 'player-left', name, players: room.players.map(p => ({ name: p.name })) });
  if (room.players.length === 0) rooms.delete(code);
  res.json({ ok: true });
}

function pushEvent(code, event) {
  const room = rooms.get(code);
  if (!room) return;
  room.events.push({ ...event, ts: Date.now() });
  if (room.events.length > 100) room.events = room.events.slice(-50);
}
