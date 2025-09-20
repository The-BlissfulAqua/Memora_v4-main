const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Simple health
app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Keep a map of client => { username, room }
const clients = new Map();

function broadcastToRoom(room, fromClient, msg) {
  for (const [client, meta] of clients.entries()) {
    if (!client || client.readyState !== WebSocket.OPEN) continue;
    if (meta.room === room && client !== fromClient) {
      client.send(JSON.stringify(msg));
    }
  }
}

wss.on('connection', (ws) => {
  clients.set(ws, { username: null, room: 'demo' });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'LOGIN') {
        const { username, password, room } = msg.payload || {};
        // Very simple auth: accept any non-empty username; password not validated for demo
        if (!username) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: 'username required' }));
          return;
        }
        clients.set(ws, { username, room: room || 'demo' });
        ws.send(JSON.stringify({ type: 'LOGIN_SUCCESS', payload: { username, room } }));
        console.log(`[demo-server] ${username} joined room ${room}`);
        return;
      }

      if (msg.type === 'ACTION') {
        const meta = clients.get(ws) || { room: 'demo' };
        // Broadcast the action to everyone else in the room
        broadcastToRoom(meta.room, ws, { type: 'ACTION', payload: msg.payload });
        return;
      }
    } catch (e) {
      console.warn('Invalid message', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => console.log(`Demo server listening on http://localhost:${PORT}`));
