# Demo server — local and ngrok setup

This project includes a tiny demo WebSocket relay server (`demo-server/`) used for multi-device presentations (Patient / Caregiver / Family). The server accepts simple action broadcasts and is intentionally minimal for demo purposes.

Below are quick steps to run it locally and expose it via ngrok so remote devices can connect.

## Run locally

1. Open a terminal and install dependencies:

```bash
cd demo-server
npm install
```

2. Start the server (default port 8081):

```bash
npm start
```

3. Verify it's running:

```bash
curl http://localhost:8081/health
# should return OK
```

4. In the web app, set the demo realtime URL before the app loads or use the in-app DemoLogin (top-right small widget):

```html
<script>
  window.__DEMO_REALTIME_URL = 'ws://YOUR_LAPTOP_IP:8081';
</script>
```

Or in the browser console for each device:

```js
window.__DEMO_REALTIME_URL = 'ws://YOUR_LAPTOP_IP:8081';
```

Make sure your firewall allows incoming connections to port 8081.

## Expose via ngrok (recommended when devices are not on the same LAN)

1. Install and authenticate ngrok (one-time):

```bash
# download from https://ngrok.com and then
ngrok authtoken YOUR_AUTH_TOKEN
```

2. Start the demo server locally (see "Run locally").

3. Start an ngrok HTTP tunnel for port 8081:

```bash
ngrok http 8081
```

4. ngrok will print a public URL, e.g. `https://abcd-1234.ngrok.io`. Use the `wss://` prefix when setting the demo URL in the app:

```js
window.__DEMO_REALTIME_URL = 'wss://abcd-1234.ngrok.io';
```

5. Use the app's DemoLogin or open the app on the devices and set the demo URL in each device to the ngrok URL.

## Notes and troubleshooting
- The demo server is intentionally insecure and accepts any username/password. Use only for demos on trusted devices.
- If a device fails to connect, check browser console/network tab and ensure no corporate firewall blocks WebSocket traffic.
- If you see mixed-content errors when using https pages, ensure you use `wss://` with ngrok's `https://` forwarding URL.

## Files
- `demo-server/server.js` — minimal Node + ws/Express relay
- `demo-server/README.md` — quick reference included in the demo-server folder

If you'd like, I can add a small helper script to automatically print the ngrok URL into the app (via a tiny HTTP endpoint) to make connecting devices easier during demos.

## Detailed tips for reliable ngrok demos

- Use the `--host-header` option if your demo server depends on Host: headers. For example:

```bash
ngrok http 8081 --host-header=localhost:8081
```

- If your local server is listening on a different port (e.g., 3000), start ngrok for that port:

```bash
ngrok http 3000
```

- Always copy the `https://` URL from ngrok's output (not the `http://`) and replace `https://` with `wss://` when using WebSocket secure connections.

- On mobile devices behind strict corporate networks or captive portals, ngrok may still fail. Use devices on a mobile hotspot for the most reliable demo.

## Quick checklist for multi-device demos

1. Start the demo server locally and verify `/health` responds.
2. Start `ngrok http 8081` and copy the `https://` forwarding URL.
3. Set `window.__DEMO_REALTIME_URL = 'wss://xxxx.ngrok.io'` in each device's browser console or the app Demo Login field.
4. Connect each device with a distinct role (Patient / Caregiver / Family) using the DemoLogin UI.
5. Verify real-time actions propagate between devices (e.g., create a reminder or trigger SOS).

If you want, I can add an optional small script in `demo-server/` which prints the ngrok forwarding URL directly into the server logs by calling the ngrok API (requires ngrok authtoken and npm package) — tell me if you'd like that.

## Using the provided ngrok helper (`demo-server/print-ngrok.js`)

I added a lightweight helper script `demo-server/print-ngrok.js` that queries the local ngrok agent's API (at `http://127.0.0.1:4040/api/tunnels`) and prints active tunnels. This is helpful to quickly copy the public forwarding URL into the app without opening ngrok's web UI.

Typical terminal workflow (recommended):

1. Open Terminal A — start the demo server:

```bash
cd demo-server
npm install   # first-time only
npm start     # runs server.js (listens on port 8081)
```

2. Open Terminal B — start ngrok and keep it running:

```bash
ngrok http 8081
```

3. Open Terminal C (or reuse A/B) — run the helper to print active tunnels:

```bash
# from the repo root
cd demo-server
npm run print-ngrok
```

The helper will attempt to read `http://127.0.0.1:4040/api/tunnels` and print any `https://` forwarding URLs. If it prints "No active ngrok tunnels found", make sure ngrok is running in Terminal B.

Notes:
- The helper does not start ngrok for you — it only reads the local ngrok API. Starting ngrok in Terminal B is a separate step.
- You can run the helper in the same terminal where ngrok is running, but you will usually want to keep ngrok running in its own terminal so the tunnel remains active.
- If you prefer a single-terminal flow, start the server in the background (e.g., `npm start &`) and then start ngrok, but I recommend separate terminals for clarity and stability.

Example minimal sequence (single-machine demo):

Terminal A:
```bash
cd demo-server
npm start
```

Terminal B:
```bash
ngrok http 8081
```

Terminal C (optional helper output):
```bash
cd demo-server
npm run print-ngrok
# copy the printed https://xxxx.ngrok.io and set the demo URL in the app
```

If you'd like, I can extend the helper to automatically set `window.__DEMO_REALTIME_URL` in the web app by serving a tiny endpoint (requires adding a static script or changing your index.html), or even to attempt to start ngrok automatically (requires your ngrok authtoken and embedding the ngrok npm client). Tell me which option you'd like and I'll implement it.

---

## Building & testing a Capacitor Android APK (short guide)

If you want to run a native build of this web app on Android devices (useful for camera, microphone, and AR features), follow these steps. These commands match the Capacitor version used by this project (v7.x).

1) Make sure you have node/npm and Android Studio installed.

2) Install project dependencies and build the web app:

```sh
npm install
npm run build
```

3) Add and sync the Android platform (if not already present):

```sh
npx cap add android
npx cap sync android
```

4) Optional: install Local Notifications plugin (for reminders inside native app):

```sh
npm install @capacitor/local-notifications@^7.0.3
npx cap sync android
```

5) Open the Android project and build the APK:

```sh
npx cap open android
# then in Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
```

6) Or use the command line to assemble a debug APK:

```sh
npx cap copy android
cd android
./gradlew assembleDebug
# result: android/app/build/outputs/apk/debug/app-debug.apk
```

AndroidManifest snippets (ensure these permissions exist in `android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

Notes specific to demo-server usage in native builds
- When testing with the local `demo-server` behind ngrok, the web view inside the APK must be able to reach the ngrok URL. If you use programmatic verification or fetches that include special headers (we use `ngrok-skip-browser-warning` to avoid free-ngrok HTML interstitials), the demo server already accepts that header, but ensure that any proxies or corporate networks don't strip headers.

If you'd like, I can add a small `build:android` npm script and a short `docs/ANDROID_BUILD.md` that includes one-click commands for CI or local builds.