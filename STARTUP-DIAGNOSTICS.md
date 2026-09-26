# Startup guidance and diagnostics

The loading/help screen and recorder are inline in `src/index.html`, outside
Angular. They work once HTML arrives, even if the main JS bundle or a lazy route
fails. After 12 seconds, or an observed startup error, the screen offers guidance
and a manual retry. Only a successful initial Angular navigation followed by two
animation frames dismisses it. No automatic reload interrupts an active order.

## Shipping

1. Update `pda-server/server.js` **and** `pda-server/client-diagnostics.js` on the
   shop PC and restart the Node server to enable acknowledgement of startup logs.
2. Check the production API address for the shop, then run `npm run deploy` in
   restaurant-app and transfer the generated server build through the normal
   shop update process. No Capacitor sync, APK build or phone reinstall is needed.

Deploying just the frontend shows the help screen, but an older backend will not
store startup reports. They remain queued until the backend supports them.

### Different repository paths on the shop PC

By default, deploy targets the sibling `pda-server/pda-app` directory. If the
backend repo has another name or location, set `PDA_SERVER_DIR` to its absolute
path (the folder containing `server.js`, not the nested `pda-app` folder).
For the shop layout, run this in PowerShell after updating `scripts/deploy.js`:

```powershell
$env:PDA_SERVER_DIR = 'C:\PersonalTest\restaurant-backend'
[Environment]::SetEnvironmentVariable('PDA_SERVER_DIR', $env:PDA_SERVER_DIR, 'User')
Set-Location 'C:\PersonalTest\pda-app'
npm run deploy
```

The first line applies to the current shell; the second persists it for future
processes. An already-open IDE may need restarting to inherit the saved setting.
Deploy prints its source, backend and destination and refuses to copy if the
backend `server.js` is missing. Verify the output targets
`C:\PersonalTest\restaurant-backend\pda-app`.

## Reading the logs

Reports go to `pda-server/logs/network-YYYY-MM.jsonl` (UTC month of server receipt).
Run `npm run analyze-network-logs` there, or
`node scripts/analyze-network-logs.js logs/network-2026-09.jsonl` for another file.
The analyzer groups startup events by device and page attempt, deduplicates event
IDs, and continues to show the existing cart errors.

Stages: `started`, `slow-start`, resource/JavaScript/Angular errors, online/offline
and visibility changes during startup, `retry-click`, and `ready`. Each report
includes device/attempt IDs, timestamps, elapsed time since the inline recorder
started, browser-reported connectivity, HTML navigation timing and bundle names.
Use `navigation.responseStart` to inspect waiting before HTML arrived; elapsed
startup time alone does not include that wait. Navigation times are relative to
the browser navigation start. Bundle names identify deployed versions.

The independent startup queue keeps the latest 80 events in localStorage, uploads
five at a time to the page's own server, and retries every 15 seconds or when
returning online/visible. Uploads time out after eight seconds. Only explicitly
acknowledged event IDs are removed. With unavailable/full storage, events stay
in memory only and will be lost if the page closes. Retransmission can produce
duplicate lines; use the event ID/analyzer when counting incidents.

`online: true` does not prove server reachability, and these browser APIs cannot
measure Wi-Fi bars, the selected Deco, packet loss or Android WebView crashes.
An attempt without a received `ready` event is incomplete evidence: it might have
been closed by the user, remain offline or have lost an event from the bounded
queue. If no HTML arrives at all, neither this screen nor its recorder can run.
Errors after initial startup are outside this recorder's scope; cart diagnostics
continue independently.

## Checks

- `npm run build`
- `node --test scripts/startup-diagnostics.test.js`
- In pda-server: `node --test scripts/client-diagnostics.test.js`
- On a test browser/device: block a main JS bundle or initial lazy chunk; expect
  guidance and retained reports. Unblock and tap retry; expect the app to open
  and the queued reports to arrive. Verify normal startup and slow startup too.
