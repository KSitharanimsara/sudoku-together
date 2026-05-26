const { kv } = require('@vercel/kv');

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 3600;

function roomKey(code) {
  return `${ROOM_PREFIX}${code}`;
}

async function getRoom(code) {
  return await kv.get(roomKey(code));
}

async function setRoom(code, data) {
  await kv.set(roomKey(code), data, { ex: ROOM_TTL });
}

async function delRoom(code) {
  await kv.del(roomKey(code));
}

module.exports = { getRoom, setRoom, delRoom };
