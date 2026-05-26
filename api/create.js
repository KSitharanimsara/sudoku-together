const { getRoom, setRoom } = require('./kv');
const { generatePuzzle } = require('./puzzle');

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return code;
}

module.exports = async function handler(req, res) {
  const { puzzle, solution } = generatePuzzle();
  let code;
  do {
    code = genCode();
  } while (await getRoom(code));

  const room = {
    code,
    created: Date.now(),
    puzzle,
    solution,
    filled: {},
    players: [null, null],
    chat: [],
    status: 'waiting',
    winner: null,
    restartRequested: [],
  };

  await setRoom(code, room);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ code, puzzle });
};
