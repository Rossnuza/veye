// Veye server: EELINK tracker gateway (TCP) + app API (HTTP).
//
//   node src/index.js
//
//   GATEWAY_PORT  TCP port trackers connect to        (default 7700)
//   API_PORT      HTTP port the app connects to       (default 8080)
//   DB_FILE       JSON persistence file               (default ./data/veye.json)
//   DEV_OTP       fixed OTP code for testing          (e.g. 1234)
//   ADMIN_KEY     key for POST /api/admin/devices
//
// Point the trackers at this host with the SMS command:
//   SERVER,tcp://your.host.com:7700#
import { Gateway } from './gateway.js';
import { createApi } from './api.js';
import { makeNotifier } from './push.js';
import { Store } from './store.js';

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 7700);
const API_PORT = Number(process.env.API_PORT ?? 8080);
const DB_FILE = process.env.DB_FILE ?? new URL('../data/veye.json', import.meta.url).pathname;

const store = new Store(DB_FILE);
const notify = makeNotifier(store);
const gateway = new Gateway(store, { notify });
const api = createApi(store, gateway);

const gwPort = await gateway.listen(GATEWAY_PORT);
console.log(`[veye] EELINK gateway listening on tcp://0.0.0.0:${gwPort}`);
api.listen(API_PORT, () => {
  console.log(`[veye] app API listening on http://0.0.0.0:${API_PORT}`);
  console.log('[veye] register a tracker: POST /api/admin/devices {"imei":"...","pairCode":"482917"}');
});
