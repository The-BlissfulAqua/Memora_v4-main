const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
app.use(bodyParser.json());
const fs = require('fs');
const path = require('path');

// Simple CORS for demo clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Ensure uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

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

// Use multer to accept multipart/form-data uploads (field name: 'file')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-z0-9._-]/gi, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});
// Limit uploads to 5MB and only allow common image types
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({ 
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: function (req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('INVALID_FILE_TYPE'));
  }
});

app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('Upload error', err && err.message);
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file too large' });
      if (err.message === 'INVALID_FILE_TYPE') return res.status(415).json({ error: 'invalid file type' });
      return res.status(400).json({ error: 'upload error', detail: err.message });
    }
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'file required' });
      const outName = file.filename;
      const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${outName}`;
      return res.json({ url: publicUrl });
    } catch (e) {
      console.error('Upload failed', e);
      return res.status(500).json({ error: 'upload failed' });
    }
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => console.log(`Demo server listening on http://localhost:${PORT}`));
