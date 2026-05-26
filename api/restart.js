import { getRoom, setRoom } from './kv.js';
import { generatePuzzle } from './puzzle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, slot } = req.body || {};
  if (!code || slot === undefined) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!room.restartRequested) room.restartRequested = [];

  // If first player requests, notify other
  if (!room.restartRequested.includes(slot)) {
    room.restartRequested.push(slot);
    await setRoom(code.toUpperCase(), room);

    // If both requested, reset game
    if (room.restartRequested.length >= 2) {
      const { puzzle, solution } = generatePuzzle();
      room.puzzle = puzzle;
      room.solution = solution;
      room.filled = {};
      room.status = 'playing';
      room.winner = null;
      room.restartRequested = [];
      room.chat.push({
        slot: -1,
        name: 'System',
        text: 'New puzzle! Good luck together!',
        ts: Date.now(),
      });
    }
  }

  await setRoom(code.toUpperCase(), room);

  res.status(200).json({
    status: room.status,
    puzzle: room.puzzle,
    filled: room.filled,
    chat: room.chat,
    restartRequested: room.restartRequested,
  });
}
