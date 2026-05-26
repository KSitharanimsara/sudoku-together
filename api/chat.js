const { getRoom, setRoom } = require('./kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, slot, text } = req.body || {};
  if (!code || slot === undefined || !text) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const player = room.players[slot];
  if (!player) {
    return res.status(400).json({ error: 'Invalid slot' });
  }

  const msg = {
    slot,
    name: player.name,
    text: String(text).slice(0, 200),
    ts: Date.now(),
  };

  room.chat.push(msg);
  if (room.chat.length > 100) {
    room.chat = room.chat.slice(-100);
  }

  await setRoom(code.toUpperCase(), room);

  res.status(200).json({ ok: true, chat: room.chat });
};
