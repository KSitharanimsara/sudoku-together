import { getRoom, setRoom } from './kv.js';
import { generatePuzzle } from './puzzle.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, name } = req.body || {};
  if (!code || !name) {
    return res.status(400).json({ error: 'Missing code or name' });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Assign player slot
  let slot = -1;
  if (!room.players[0]) slot = 0;
  else if (!room.players[1]) slot = 1;

  if (slot === -1) {
    return res.status(400).json({ error: 'Room full' });
  }

  room.players[slot] = { name, joined: Date.now() };

  if (room.players[0] && room.players[1]) {
    room.status = 'playing';
  }

  await setRoom(code.toUpperCase(), room);

  res.status(200).json({
    slot,
    name,
    room: code.toUpperCase(),
    puzzle: room.puzzle,
    players: room.players,
    status: room.status,
    filled: room.filled,
    chat: room.chat,
  });
}
