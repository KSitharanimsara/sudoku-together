// Vercel KV helper — uses environment variables auto-configured by Vercel KV binding
import { kv } from '@vercel/kv';

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 3600; // 1 hour expiry

function roomKey(code) {
  return `${ROOM_PREFIX}${code}`;
}

export async function getRoom(code) {
  return await kv.get(roomKey(code));
}

export async function setRoom(code, data) {
  await kv.set(roomKey(code), data, { ex: ROOM_TTL });
}

export async function delRoom(code) {
  await kv.del(roomKey(code));
}
