Demo server for Memora presentation

Quick start

1. Install dependencies

```bash
cd demo-server
npm install
```

2. Start the server

```bash
npm start
```

3. Server listens on port 8081 by default. You can open `http://localhost:8081/health` to verify.

How to use in the app (presentation)

- Run the web build (`pnpm run build`) and serve the `dist/` folder from any static host (or use Vite dev server).
- Open the built app on each device (or dev server). Before loading the app, set the global `__DEMO_REALTIME_URL` to the server WebSocket address, e.g.:

```html
<script>
  window.__DEMO_REALTIME_URL = 'ws://YOUR_SERVER_IP:8081';
</script>
```

- For each device, open the console and call `realtimeService.login(username, password, 'demo')` (or provide a small login UI if you prefer). The app will forward dispatched AppActions to the server and receive remote actions.

Notes

- This server is intentionally minimal for demo purposes only (no production security). It accepts any username and does not validate passwords. Use only on trusted networks for a live demo.

ngrok and laptop fallback (recommended for presentations)

If your audience devices are not on the same Wi-Fi or you want to avoid network configuration, use ngrok to expose the demo server to the internet temporarily.

1) Install ngrok and authenticate (one-time):

```bash
# install via package manager or download from https://ngrok.com
ngrok authtoken YOUR_AUTH_TOKEN
```

2) Start the demo server on your laptop (same as quick start):

```bash
cd demo-server
npm install
npm start
```

3) Expose the server with ngrok (HTTP tunnel on port 8081):

```bash
ngrok http 8081
```

4) ngrok will print a public forwarding URL like `https://abcd-1234.ngrok.io`. To use the WebSocket from the web app, convert the URL to the ws:// or wss:// form:

```text
wss://abcd-1234.ngrok.io
```

5) In each device, set the global demo URL (or use DemoLogin):

```js
window.__DEMO_REALTIME_URL = 'wss://abcd-1234.ngrok.io';
```

Laptop LAN fallback:

- If all devices are on the same Wi-Fi, you can use your laptop's LAN IP (e.g., 192.168.1.10). Start the server as above and use:

```js
window.__DEMO_REALTIME_URL = 'ws://192.168.1.10:8081';
```

- Make sure your laptop firewall allows incoming connections on port 8081.

Security note: ngrok exposes your local server to the internet. Only share the public URL with trusted devices for the duration of the demo.
