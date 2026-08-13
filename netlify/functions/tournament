// Netlify serverless function powering live tournament rooms.
// Uses Netlify Blobs (built-in key/value storage - no third-party account needed)
// to hold shared room state that every participant's device polls every few seconds.
//
// Setup: deploy this file at netlify/functions/tournament.js in your site's repo.
// No environment variables needed - Netlify Blobs works automatically on any
// site that's connected through GitHub (not plain Netlify Drop, which can't run Functions at all).

const { getStore } = require('@netlify/blobs');

function json(obj, status) {
  return {
    statusCode: status || 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

function randomCode() {
  const words = ['RED', 'BLUE', 'GOLD', 'FAST', 'CUBE', 'SPIN', 'TURN', 'ZOOM', 'FLIP', 'SNAP'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return w + n;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return json({ error: 'Bad request body' }, 400);
  }

  const { action, roomCode, playerId } = body;
  let store;
  try {
    store = getStore('sct-tournaments');
  } catch (err) {
    return json({ error: 'Netlify Blobs is not available on this deploy: ' + err.message }, 500);
  }

  async function readRoom(code) {
    try {
      return await store.get('room:' + code, { type: 'json' });
    } catch (err) {
      return null;
    }
  }
  async function writeRoom(code, data) {
    await store.setJSON('room:' + code, data);
  }

  try {
    if (action === 'create') {
      let code;
      let tries = 0;
      do {
        code = randomCode();
        tries++;
      } while ((await readRoom(code)) && tries < 10);

      const room = {
        code,
        hostId: playerId,
        createdAt: Date.now(),
        phase: 'lobby',
        round: 0,
        totalRounds: Math.max(1, Math.min(20, body.totalRounds || 5)),
        participants: {
          [playerId]: { name: (body.name || 'Player').slice(0, 24), ready: false, joinedAt: Date.now() }
        },
        currentScramble: null,
        rounds: []
      };
      await writeRoom(code, room);
      return json(room);
    }

    if (!roomCode) return json({ error: 'Missing room code' }, 400);

    if (action === 'join') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      if (!room.participants[playerId]) {
        room.participants[playerId] = { name: (body.name || 'Player').slice(0, 24), ready: false, joinedAt: Date.now() };
        await writeRoom(roomCode, room);
      }
      return json(room);
    }

    if (action === 'getState') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      return json(room);
    }

    if (action === 'ready') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      if (room.participants[playerId]) room.participants[playerId].ready = !!body.ready;
      await writeRoom(roomCode, room);
      return json(room);
    }

    if (action === 'startRound') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      room.round += 1;
      room.phase = 'solving';
      room.currentScramble = body.scramble || '';
      room.rounds[room.round - 1] = { scramble: room.currentScramble, times: {} };
      await writeRoom(roomCode, room);
      return json(room);
    }

    if (action === 'submitTime') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      const idx = room.round - 1;
      if (room.rounds[idx] && typeof body.ms === 'number') {
        room.rounds[idx].times[playerId] = body.ms;
      }
      await writeRoom(roomCode, room);
      return json(room);
    }

    if (action === 'endRound') {
      const room = await readRoom(roomCode);
      if (!room) return json({ error: 'Room not found' }, 404);
      room.phase = room.round >= room.totalRounds ? 'finished' : 'lobby';
      await writeRoom(roomCode, room);
      return json(room);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message || 'Server error' }, 500);
  }
};
