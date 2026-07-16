// End-to-end test: a simulated EELINK device (real binary protocol) connects
// to the gateway; a simulated parent uses the app API. Verifies the full
// pipeline: login → pair → live location → geofence events → alerts →
// instructions (COLLECT/FENCE) → SOS warning.
import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { createApi } from '../src/api.js';
import { Gateway } from '../src/gateway.js';
import {
  FrameParser, PID, buildPacket, encodeHardware, encodeImei, encodePosition,
  parseLogin, parsePosition, sum16,
} from '../src/protocol.js';
import { Store } from '../src/store.js';

const IMEI = '352544071677471';
const SCHOOL = { latitude: 4.0846, longitude: 9.7423 };
const AWAY = { latitude: 4.1, longitude: 9.72 };

function locationPacket(seq, pos, batteryMv = 4000) {
  return buildPacket(
    PID.LOCATION,
    seq,
    Buffer.concat([
      encodePosition({ time: Math.floor(Date.now() / 1000), ...pos, speed: 4, satellites: 9 }),
      encodeHardware({ batteryMv }),
      Buffer.alloc(14),
      Buffer.from([0x00, 0x00]),
    ]),
  );
}

class TestDevice {
  constructor(port) {
    this.socket = net.connect(port, '127.0.0.1');
    this.parser = new FrameParser();
    this.received = [];
    this.waiters = [];
    this.seq = 1;
    this.socket.on('data', (chunk) => {
      for (const p of this.parser.push(chunk)) {
        // auto-respond to instructions like a real device
        if (p.pid === PID.INSTRUCTION) {
          const head = p.content.subarray(0, 5);
          this.socket.write(
            buildPacket(PID.INSTRUCTION, p.sequence, Buffer.concat([head, Buffer.from('OK')])),
          );
        }
        this.received.push(p);
        this.waiters = this.waiters.filter((w) => {
          const match = this.received.find(w.predicate);
          if (match) w.resolve(match);
          return !match;
        });
      }
    });
  }

  wait(predicate, timeout = 4000) {
    const existing = this.received.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for packet')), timeout);
      this.waiters.push({
        predicate,
        resolve: (p) => {
          clearTimeout(timer);
          resolve(p);
        },
      });
    });
  }

  login() {
    const content = Buffer.alloc(20);
    encodeImei(IMEI).copy(content, 0);
    content[8] = 0x01;
    content.writeInt8(4, 9);
    this.socket.write(buildPacket(PID.LOGIN, this.seq++, content));
    return this.wait((p) => p.pid === PID.LOGIN);
  }

  sendLocation(pos, batteryMv) {
    this.socket.write(locationPacket(this.seq++, pos, batteryMv));
  }

  sendSos(pos) {
    const content = Buffer.concat([
      encodePosition({ time: Math.floor(Date.now() / 1000), ...pos, satellites: 9 }),
      Buffer.from([0x02]),
      Buffer.from([0x04, 0x01]),
    ]);
    this.socket.write(buildPacket(PID.WARNING, this.seq++, content));
    return this.wait((p) => p.pid === PID.WARNING);
  }

  close() {
    this.socket.destroy();
  }
}

test('protocol primitives', () => {
  // IMEI round-trip using the doc's login example bytes.
  const imeiBuf = Buffer.from('0352544071677471', 'hex');
  assert.equal(parseLogin(Buffer.concat([imeiBuf, Buffer.alloc(12)])).imei, IMEI);
  assert.deepEqual(encodeImei(IMEI), imeiBuf);

  // Position round-trip.
  const encoded = encodePosition({ time: 1700000000, latitude: 4.0951, longitude: 9.7371, speed: 5, course: 10, satellites: 9 });
  const decoded = parsePosition(encoded);
  assert.ok(Math.abs(decoded.latitude - 4.0951) < 1e-5);
  assert.ok(Math.abs(decoded.longitude - 9.7371) < 1e-5);
  assert.equal(decoded.speed, 5);

  // Position parse from the doc's location example (§5.4):
  // 02 6B 94 0D = lat, 0C 39 52 AD = lng (Shenzhen area).
  const docPos = parsePosition(
    Buffer.from('590BD94203026B940D0C3952AD002100000000' + '0001CC0001A53F0170F0AB13', 'hex'),
  );
  assert.ok(Math.abs(docPos.latitude - 22.558158) < 0.001);
  assert.ok(Math.abs(docPos.longitude - 113.935172) < 0.001);
  assert.equal(docPos.cell.mcc, 460);
  assert.equal(docPos.cell.lac, 0xa53f);

  // Frame splitter handles coalesced + split TCP chunks.
  const parser = new FrameParser();
  const a = buildPacket(PID.HEARTBEAT, 7, Buffer.from([0x01, 0x88]));
  const b = buildPacket(PID.HEARTBEAT, 8, Buffer.from([0x01, 0x88]));
  const joined = Buffer.concat([a, b]);
  const first = parser.push(joined.subarray(0, 5));
  assert.equal(first.length, 0);
  const rest = parser.push(joined.subarray(5));
  assert.equal(rest.length, 2);
  assert.equal(rest[0].sequence, 7);
  assert.equal(rest[1].sequence, 8);

  // sum16 sanity: stable and 16-bit.
  const sum = sum16(0, Buffer.from('veye'));
  assert.ok(sum >= 0 && sum <= 0xffff);
});

test('end-to-end: device → gateway → API → app', async (t) => {
  const store = new Store(null); // in-memory
  const alerts = [];
  const gateway = new Gateway(store, {
    notify: (childId, kind, message) => {
      store.addAlert(childId, kind, message);
      alerts.push({ childId, kind, message });
    },
    log: () => {},
  });
  const api = createApi(store, gateway, { log: () => {} });
  const gwPort = await gateway.listen(0, '127.0.0.1');
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
  const apiPort = api.address().port;
  const base = `http://127.0.0.1:${apiPort}`;

  t.after(async () => {
    device.close();
    await gateway.close();
    api.close();
  });

  // Factory registers the tracker with its printed pair code.
  process.env.ADMIN_KEY = 'test-admin';
  const reg = await fetch(`${base}/api/admin/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'test-admin' },
    body: JSON.stringify({ imei: IMEI, pairCode: '482917' }),
  });
  assert.equal(reg.status, 200);

  // Device powers on and logs in.
  const device = new TestDevice(gwPort);
  const loginAck = await device.login();
  assert.equal(loginAck.content.length, 7); // Time(4) + Version(2) + PS Action(1)
  assert.equal(loginAck.content.readUInt16BE(4), 0x0001);

  // Device receives a COLLECT instruction on login.
  const collect = await device.wait((p) => p.pid === PID.INSTRUCTION);
  assert.match(collect.content.subarray(5).toString(), /^COLLECT,60/);

  // Parent signs up on the app.
  process.env.DEV_OTP = '1234';
  await fetch(`${base}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '671234567' }),
  });
  const verify = await (
    await fetch(`${base}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '671234567', code: '1234' }),
    })
  ).json();
  assert.ok(verify.token);
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${verify.token}` };

  await fetch(`${base}/api/me`, { method: 'PATCH', headers: auth, body: JSON.stringify({ name: 'Marie' }) });

  // Wrong pair code fails; right one pairs.
  const bad = await fetch(`${base}/api/pair`, {
    method: 'POST', headers: auth, body: JSON.stringify({ code: '000000', childName: 'Lina' }),
  });
  assert.equal(bad.status, 404);
  const child = await (
    await fetch(`${base}/api/pair`, {
      method: 'POST', headers: auth, body: JSON.stringify({ code: '482917', childName: 'Lina' }),
    })
  ).json();
  assert.equal(child.name, 'Lina');

  // Parent adds a "School" zone → device gets FENCE instructions.
  const zone = await (
    await fetch(`${base}/api/children/${child.id}/zones`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'School', address: 'Govt Primary School', icon: '🏫',
        center: SCHOOL, size: 'med', alertArrive: true, alertLeave: true,
      }),
    })
  ).json();
  assert.ok(zone.id);
  await device.wait((p) => p.pid === PID.INSTRUCTION && p.content.subarray(5).toString().startsWith('FENCE,1,CR'));

  // Device reports positions: outside the zone, then at school.
  device.sendLocation(AWAY, 4000);
  await new Promise((r) => setTimeout(r, 150));
  device.sendLocation(SCHOOL, 3980);
  await new Promise((r) => setTimeout(r, 250));

  // App sees the live location + status.
  const children = await (await fetch(`${base}/api/children`, { headers: auth })).json();
  assert.equal(children.length, 1);
  assert.equal(children[0].status, 'safe');
  assert.ok(Math.abs(children[0].position.latitude - SCHOOL.latitude) < 1e-4);
  assert.equal(children[0].placeKind, 'school');
  assert.ok(children[0].battery > 50);

  // Arrival alert fired.
  assert.ok(alerts.some((a) => a.kind === 'arrive' && a.message.includes('Lina')));

  // History shows the arrival with the right label token.
  const today = new Date().toISOString().slice(0, 10);
  const history = await (
    await fetch(`${base}/api/children/${child.id}/history?date=${today}`, { headers: auth })
  ).json();
  assert.ok(history.entries.some((e) => e.label === 'arrived:School'));

  // Leaving school → departure alert.
  device.sendLocation(AWAY, 3970);
  await new Promise((r) => setTimeout(r, 250));
  assert.ok(alerts.some((a) => a.kind === 'leave'));

  // SOS button.
  await device.sendSos(AWAY);
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(alerts.some((a) => a.kind === 'sos'));

  // Update frequency setting → COLLECT,300 goes to the device.
  const freqRes = await (
    await fetch(`${base}/api/settings/frequency`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ freq: '5' }),
    })
  ).json();
  assert.equal(freqRes.ok, true);
  await device.wait((p) => p.pid === PID.INSTRUCTION && p.content.subarray(5).toString().startsWith('COLLECT,300'));

  // Guardians: add + list.
  await fetch(`${base}/api/children/${child.id}/guardians`, {
    method: 'POST', headers: auth, body: JSON.stringify({ phone: '+237 6 99 88 77 66' }),
  });
  const guardians = await (
    await fetch(`${base}/api/children/${child.id}/guardians`, { headers: auth })
  ).json();
  assert.equal(guardians.length, 2);
  assert.equal(guardians.filter((g) => g.primary).length, 1);
});
