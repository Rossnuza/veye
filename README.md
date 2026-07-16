# Veye — Know where your child is. Always.

Veye is a child-tracking product for parents in Cameroon: a small GPS tracker
the child carries, and this app that shows the parent where their child is,
right now, on a map.

This repository contains the complete product:

| Folder | What it is |
| --- | --- |
| `app/` | The parent mobile app (Android + iOS, built with Expo / React Native) |
| `server/` | The backend: speaks the **EELINK V2.3 protocol** to the physical trackers and serves the app |
| `docs/` | How the app, server, and tracker fit together |

---

## Try the app today (no tracker needed)

The app has a built-in **demo mode**: a simulated child moving around Douala.
Every screen works — onboarding, live map, journey history, safe places,
guardians, settings, English/French.

You need a computer with [Node.js](https://nodejs.org) (version 20 or newer)
and the **Expo Go** app on your phone (free, in the App Store / Play Store).

```bash
cd app
npm install
npx expo start --tunnel
```

A QR code appears in the terminal. Scan it with your phone
(iPhone: Camera app → tap the banner; Android: Expo Go → "Scan QR code").
The app opens on your phone.

Walkthrough:

1. **Get started** → enter any phone number (8–9 digits).
2. Enter **any 4-digit code** (demo mode accepts anything).
3. Enter your first name.
4. On the pairing screen tap **Simulate scan** (or type any 6 digits),
   enter your child's name, tap **Link tracker**.
5. You're in. Explore the map, History, Zones, and Settings tabs.
   The child switcher (tap the name at the top) shows two extra demo
   children, including a "signal lost" and a "tracker off" state.

## When the physical trackers arrive

The tracker speaks the EELINK V2.3 protocol over TCP (see
`docs/DEVICE_PROTOCOL_INTEGRATION.md`). The steps are:

1. **Run the server** on a machine with a public address:

   ```bash
   cd server
   ADMIN_KEY=choose-a-secret npm start
   ```

   The tracker gateway listens on TCP port **7700**, the app API on **8080**.

2. **Insert the SIM** (MTN Cameroon, per the product brief) into the tracker
   and point it at your server by sending it these SMS commands
   (from the manufacturer's command set):

   ```
   APN,internet#             (MTN Cameroon APN)
   SERVER,tcp://YOUR-HOST:7700#
   ```

3. **Register each tracker** with the pair code you'll print on it:

   ```bash
   curl -X POST http://YOUR-HOST:8080/api/admin/devices \
     -H "X-Admin-Key: choose-a-secret" -H "Content-Type: application/json" \
     -d '{"imei":"862123456789012","pairCode":"482917"}'
   ```

   (If an unregistered tracker connects, it is auto-registered with the last
   6 digits of its IMEI as pair code.)

4. **Point the app at the server**: in `app/app.json`, set
   `expo.extra.apiUrl` to `"http://YOUR-HOST:8080"` and restart the app.
   Demo mode switches off automatically and everything — pairing, live map,
   history, safe-place alerts, SOS, update frequency — flows through the
   real tracker.

### Test the whole pipeline without hardware

The repo includes a **device simulator** that speaks the same binary protocol
a real tracker uses:

```bash
cd server
npm start                  # terminal 1 — the server
npm run simulate           # terminal 2 — a fake tracker walking to school
```

Type `s` + Enter in the simulator to send an SOS. Run the automated
end-to-end test with `npm test`.

## Where things stand

Done and tested:

- Full parent app matching the approved design (16 screens, EN + FR)
- EELINK V2.3 gateway: login, heartbeat, location, warnings (incl. SOS and
  low battery), server→device instructions (update frequency, geofences)
- Server-side safe zones with arrive/leave alerts, journey history, guardians
  with shared access, pair-code device registration
- Automated end-to-end test: simulated tracker → gateway → API → app data

Integration points left open (marked in the code, each is a small job):

- **SMS delivery** for the login code and guardian invites — the server
  currently prints them to its log. Hook up MTN's SMS API or Twilio in
  `server/src/api.js`.
- **Push notifications** — wired to Expo's push service; tokens are sent
  once the app runs as a development/store build (Expo Go can't receive
  remote pushes). In-app alerts work everywhere.
- **Reverse geocoding** ("near Mile 4 Market" instead of coordinates) —
  one function in `server/src/api.js` once you pick a maps provider.
- **App store builds** — when you're ready to publish, `eas build` produces
  the Android/iOS binaries (needs a free Expo account).
