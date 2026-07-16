# Veye ↔ EELINK tracker integration

The trackers speak the manufacturer's **EELINK DEVICE PROTOCOL V2.3** — a
binary protocol over TCP. `server/src/protocol.js` implements the codec and
`server/src/gateway.js` runs the device-facing TCP server. This document maps
the protocol onto Veye's product features.

## Transport

- TCP, device-initiated. Devices are told where to connect with the SMS
  command `SERVER,tcp://host:7700#` (doc §6.3.7).
- Every packet: `0x67 0x67` mark, PID (1 byte), size (2 bytes BE), sequence
  (2 bytes BE), content. The gateway reassembles packets from the TCP stream
  (doc §4.1) and tolerates split/coalesced chunks.
- We answer login with **protocol version 0x0001** (compatible mode,
  doc §5.2), so devices send POSITION V1 which we parse completely. Upgrading
  to V2/V3 (LTE cell + WiFi positioning) only requires extending
  `parsePosition` and responding 0x02/0x03.

## Device → server packages

| PID | Package | Veye behaviour |
| --- | --- | --- |
| 0x01 | LOGIN | Ack with server time + version + PS action 0. Auto-register unknown IMEIs. Push current `COLLECT` interval and re-sync geofences on every login. |
| 0x03 | HEARTBEAT | Ack (keeps the GPRS session alive). Refreshes "last seen". |
| 0x12 | LOCATION | Parse position (GPS block) + hardware (battery mV, status). Store track point, run geofencing, update live state. Battery % derived from voltage (3.40–4.20 V). |
| 0x14 | WARNING | Ack. `0x02 SOS` → immediate high-priority alert to all guardians. `0x03 battery low` → battery alert. `0x83/0x84 fence in/out` → covered by server-side geofencing (position included in the packet is still ingested). |
| 0x15 | REPORT | Ack + ingest position. |
| 0x16 | MESSAGE | Ack (echo phone number, empty result). Address queries can be answered here once reverse geocoding is added. |
| 0x1A/0x17–0x19/0x1B | Pedometer / OBD / Param-set | Acked, not used by the product. |

## Server → device instructions (0x80)

Commands are sent as instruction packages with a UID; the gateway tracks the
response (doc §5.13).

| App feature | Device command |
| --- | --- |
| Settings → Update frequency (1/5/15 min) | `COLLECT,<sec>,0,0,<sec>,1#` (doc §6.3.8) — applied live if the device is connected, otherwise on its next login |
| Safe places (zones) | Mirrored into the 8 hardware fence slots: `FENCE,<i>,CR,<lng>,<lat>,<radius>#` (doc §6.3.19), radius 100/250/500 m for Small/Medium/Large. The device then raises in/out-of-fence warnings even if server-side detection ever lags. |
| Locate now (future) | `WHERE?` (doc §6.4.6) |

## Position format notes (doc §3.6)

- Latitude/longitude are signed 32-bit integers in **1/500 arc-second**:
  `degrees = value / 1_800_000`.
- The 1-byte mask says which blocks follow: bit0 GPS, bit1–3 cell towers,
  bit4–6 WiFi hotspots. Only the GPS block is used for location today; cell
  info is parsed and available for future LBS fallback.
- Timestamps are UTC seconds since 1970.

## Geofencing & alerts

Server-side geofencing (`server/src/geofence.js`) is the source of truth:
every GPS point is tested against the child's active zones (haversine
distance vs. zone radius). Transitions create:

- history events (`arrived:School`, `left:Home`) that power the History tab,
- alerts (`X has arrived at school`) pushed to every guardian of that child.

An offline sweep marks a tracker offline after 30 minutes of silence and
alerts the guardians (product flow §6).

## Pairing model

Each physical tracker is registered (IMEI + 6-digit pair code, printed as a
QR/number on the back of the device) via `POST /api/admin/devices`. The
parent scans/types that code in the app; the server links their account to
the tracker's IMEI. The first parent to pair becomes the primary guardian and
can invite/remove other guardians.

## Testing without hardware

`server/simulator.js` is a faithful device: it logs in with a BCD-packed
IMEI, streams location packages (position + hardware + sensors + beacon
blocks), answers instructions with `OK`, heartbeats, and can send an SOS.
`server/test/e2e.test.js` runs the whole pipeline in CI, including byte-level
checks against the example packets printed in the manufacturer's document.
