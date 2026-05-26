import { getRoom, setRoom } from './kv.js';
import { checkMove } from './puzzle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, row, col, num, slot } = req.body || {};
  if (!code || row === undefined || col === undefined || num === undefined || slot === undefined) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Can't modify given cells
  if (room.puzzle[row][col] !== 0) {
    return res.status(400).json({ error: 'Cannot modify given cell' });
  }

  const key = `${row},${col}`;

  // Erase (num=0)
  if (num === 0) {
    delete room.filled[key];
    room.winner = null;
    await setRoom(code.toUpperCase(), room);
    return res.status(200).json({ ok: true, filled: room.filled });
  }

  const correct = checkMove(room.solution, row, col, num);
  room.filled[key] = { num, player: slot, ts: Date.now(), correct };

  // Check win: all non-puzzle cells filled correctly
  let done = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (room.puzzle[r][c] === 0) {
        const k = `${r},${c}`;
        const f = room.filled[k];
        if (!f || !f.correct) {
          done = false;
          break;
        }
      }
    }
    if (!done) break;
  }

  if (done) {
    room.status = 'done';
    room.winner = room.players.map(p => p ? p.name : null);
    room.restartRequested = [];
  }

  await setRoom(code.toUpperCase(), room);

  res.status(200).json({
    ok: true,
    correct,
    filled: room.filled,
    status: room.status,
    winner: room.winner,
  });
}
