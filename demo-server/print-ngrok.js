// print-ngrok.js
// Reads the local ngrok API and prints active forwarding tunnels (https) to the console.
// Requires ngrok to be running locally (the ngrok agent exposes a local API at http://127.0.0.1:4040)

const http = require('http');

const NGROK_API = process.env.NGROK_API_URL || 'http://127.0.0.1:4040/api/tunnels';

function fetchNgrokTunnels() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.tunnels || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

(async () => {
  try {
    const tunnels = await fetchNgrokTunnels();
    if (!tunnels || tunnels.length === 0) {
      console.log('No active ngrok tunnels found at http://127.0.0.1:4040. Start ngrok and try again.');
      process.exit(1);
    }

    console.log('Active ngrok tunnels:');
    tunnels.forEach(t => {
      console.log(`- name: ${t.name} -> ${t.public_url} (${t.proto})`);
    });
  } catch (e) {
    console.error('Could not read ngrok API:', e.message || e);
    process.exit(2);
  }
})();
