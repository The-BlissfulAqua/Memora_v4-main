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
  // Allow the ngrok skip-browser-warning header so free ngrok tunnels don't return the warning HTML
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Ensure uploads directory exists and serve it statically with no-cache headers (demo)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

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
    const rand = require('crypto').randomBytes(4).toString('hex');
    const out = `${Date.now()}_${rand}_${safeName}`;
    console.log(`[demo-server] naming upload: original="${file.originalname}" => "${out}" mime=${file.mimetype}`);
    cb(null, out);
  }
});
// Limit uploads to 5MB and only allow common image types
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({ 
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: function (req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
      console.log(`[demo-server] accepting mime=${file.mimetype} for originalname=${file.originalname}`);
      cb(null, true);
    } else {
      console.warn(`[demo-server] rejecting invalid mime=${file.mimetype} for originalname=${file.originalname}`);
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

app.post('/upload', (req, res) => {
  // wrap multer to add diagnostic logs for the request
  console.log('[demo-server] POST /upload headers=', JSON.stringify(req.headers));
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.warn('[demo-server] Upload error', err && err.message);
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file too large' });
      if (err.message === 'INVALID_FILE_TYPE') return res.status(415).json({ error: 'invalid file type' });
      return res.status(400).json({ error: 'upload error', detail: err.message });
    }
    try {
      const file = req.file;
      if (!file) {
        console.warn('[demo-server] no file found on request');
        return res.status(400).json({ error: 'file required' });
      }
      console.log(`[demo-server] received file: field=${file.fieldname} original=${file.originalname} saved=${file.filename} size=${file.size} bytes mime=${file.mimetype}`);
      const outName = file.filename;
      // Respect proxy-forwarded proto/host when available (ngrok, reverse proxies)
      const proto = (req.headers['x-forwarded-proto'] || req.protocol).toString().split(',')[0];
      const host = (req.headers['x-forwarded-host'] || req.headers['host'] || req.get('host')).toString().split(',')[0];
      const publicUrl = `${proto}://${host}/uploads/${outName}`;
      console.log('[demo-server] uploaded', outName, 'publicUrl=', publicUrl);
      // Perform a quick GET verification to ensure the uploaded file is reachable before returning URL
      try {
        const client = publicUrl.startsWith('https:') ? require('https') : require('http');
        const verifyTimeoutMs = 3000;
        const maxAttempts = 3;

        async function verifyUrl(url) {
          const attemptDelay = (n) => new Promise(r => setTimeout(r, 200 * n));
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              console.log('[demo-server] verification attempt', attempt, 'for', url);
              // propagate ngrok skip header when present so ngrok won't return its browser warning HTML
              const extraHeaders = {};
              if (req.headers['ngrok-skip-browser-warning']) extraHeaders['ngrok-skip-browser-warning'] = req.headers['ngrok-skip-browser-warning'];

              // try HEAD first to avoid downloading body
              const headOk = await new Promise((resolve) => {
                const reqHead = client.request(url, { method: 'HEAD', timeout: verifyTimeoutMs, headers: extraHeaders }, (resp) => {
                  const status = resp.statusCode || 0;
                  const ct = (resp.headers['content-type'] || '').toString();
                  console.log('[demo-server] HEAD status', status, 'content-type=', ct);
                  console.log('[demo-server] HEAD headers', JSON.stringify(resp.headers || {}));
                  // consume headers and end
                  resp.on('data', () => {});
                  resp.on('end', () => {
                    if (status >= 200 && status < 400 && ct.startsWith('image/')) resolve(true);
                    else resolve(false);
                  });
                });
                reqHead.on('error', (err) => { console.warn('[demo-server] HEAD error', err && err.message); resolve(false); });
                reqHead.setTimeout(verifyTimeoutMs, () => { console.warn('[demo-server] HEAD timed out for', url); reqHead.abort(); resolve(false); });
                reqHead.end();
              });
              if (headOk) return true;

              // If HEAD didn't confirm, try GET and inspect content-type and a small body snippet for diagnostics
              const getOk = await new Promise((resolve) => {
                const req2 = client.get(url, { timeout: verifyTimeoutMs, headers: extraHeaders }, (resp) => {
                  const status = resp.statusCode || 0;
                  const ct = (resp.headers['content-type'] || '').toString();
                  console.log('[demo-server] GET status', status, 'content-type=', ct);
                  console.log('[demo-server] GET headers', JSON.stringify(resp.headers || {}));
                  // If it's an image and status OK, accept
                  if (status >= 200 && status < 400 && ct.startsWith('image/')) {
                    resp.on('data', () => {});
                    resp.on('end', () => resolve(true));
                    return;
                  }

                  // Otherwise capture a small portion of the body for debugging (don't buffer large bodies)
                  const chunks = [];
                  let collected = 0;
                  const MAX_COLLECT = 1024; // 1KB snippet
                  resp.on('data', (chunk) => {
                    try {
                      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                      if (collected < MAX_COLLECT) {
                        const toCollect = Math.min(MAX_COLLECT - collected, buf.length);
                        chunks.push(buf.slice(0, toCollect));
                        collected += toCollect;
                      }
                    } catch (e) {
                      // ignore
                    }
                  });
                  resp.on('end', () => {
                    const bodyBuf = Buffer.concat(chunks);
                    const asText = bodyBuf.toString('utf8').replace(/\s+/g, ' ').slice(0, 512);
                    const headHex = bodyBuf.slice(0, 16).toString('hex');
                    console.warn('[demo-server] GET verification: non-image response body snippet (utf8):', asText);
                    console.warn('[demo-server] GET verification: non-image head hex:', headHex);
                    resolve(false);
                  });
                });
                req2.on('error', (err) => { console.warn('[demo-server] GET error', err && err.message); resolve(false); });
                req2.setTimeout(verifyTimeoutMs, () => { console.warn('[demo-server] GET timed out for', url); req2.abort(); resolve(false); });
              });
              if (getOk) return true;
            } catch (e) {
              console.warn('[demo-server] verification exception', e && e.message);
            }
            // backoff before retry
            await attemptDelay(attempt);
          }
          return false;
        }

        const isVerified = await verifyUrl(publicUrl);
        console.log('[demo-server] verification result for', outName, 'verified=', isVerified);
        return res.json({ url: publicUrl, filename: outName, size: file.size, mime: file.mimetype, verified: !!isVerified });
      } catch (verErr) {
        console.warn('[demo-server] verification failed', verErr && verErr.message);
        return res.json({ url: publicUrl, filename: outName, size: file.size, mime: file.mimetype, verified: false });
      }
    } catch (e) {
      console.error('[demo-server] Upload failed', e);
      return res.status(500).json({ error: 'upload failed' });
    }
  });
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => console.log(`Demo server listening on http://localhost:${PORT}`));
