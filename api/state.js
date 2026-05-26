import { getRoom } from './kv.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.status(200).json({
    code: room.code,
    puzzle: room.puzzle,
    filled: room.filled,
    players: room.players,
    status: room.status,
    chat: room.chat,
    winner: room.winner,
    restartRequested: room.restartRequested || [],
  });
}
