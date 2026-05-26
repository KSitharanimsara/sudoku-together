import { getRoom, setRoom } from './kv.js';
import { generatePuzzle } from './puzzle.js';

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return code;
}

export default async function handler(req, res) {
  const { puzzle, solution } = generatePuzzle();
  let code;
  // Ensure unique code
  do {
    code = genCode();
  } while (await getRoom(code));

  const room = {
    code,
    created: Date.now(),
    puzzle,
    solution,
    filled: {}, // "r,c": { num, player, ts }
    players: [null, null], // slot 0, slot 1
    chat: [],
    status: 'waiting', // waiting | playing | done
    winner: null,
    restartRequested: [],
  };

  await setRoom(code, room);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ code, puzzle });
}
