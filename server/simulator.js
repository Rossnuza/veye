// EELINK device simulator — speaks the real V2.3 binary protocol over TCP.
// Use it to test the full pipeline before the physical trackers arrive:
//
//   node simulator.js --host 127.0.0.1 --port 7700 --imei 352544071677471
//
// It logs in, heartbeats, and walks a child from "home" to "school" in Douala,
// sending a location packet every few seconds. Press S+Enter to send an SOS.
import net from 'node:net';
import readline from 'node:readline';
import {
  FrameParser, PID, buildPacket, encodeHardware, encodeImei, encodePosition,
} from './src/protocol.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length),
);
const HOST = args.host ?? '127.0.0.1';
const PORT = Number(args.port ?? 7700);
const IMEI = args.imei ?? '352544071677471';
const INTERVAL = Number(args.interval ?? 5) * 1000;

// Walk: Bonamoussadi (home) → Govt Primary School, Douala.
const HOME = { latitude: 4.0951, longitude: 9.7371 };
const SCHOOL = { latitude: 4.0846, longitude: 9.7423 };
const STEPS = 40;

let sequence = 1;
let step = 0;
let batteryMv = 4100;

const socket = net.connect(PORT, HOST, () => {
  console.log(`[sim] connected to ${HOST}:${PORT} as IMEI ${IMEI}`);
  login();
});
const parser = new FrameParser();

socket.on('data', (chunk) => {
  for (const packet of parser.push(chunk)) {
    if (packet.pid === PID.LOGIN) {
      console.log('[sim] login acknowledged, streaming positions (press S+Enter for SOS)');
      setInterval(sendLocation, INTERVAL);
      setInterval(sendHeartbeat, 60000);
      sendLocation();
    } else if (packet.pid === PID.INSTRUCTION) {
      const uid = packet.content.readUInt32BE(1);
      const command = packet.content.subarray(5).toString('utf8');
      console.log(`[sim] instruction from server: ${command}`);
      // Respond OK like a real device.
      const head = Buffer.alloc(5);
      head[0] = 0x01;
      head.writeUInt32BE(uid, 1);
      const result = Buffer.from(command.startsWith('FENCE') ? 'SET FENCE OK' : 'OK', 'utf8');
      socket.write(buildPacket(PID.INSTRUCTION, packet.sequence, Buffer.concat([head, result])));
    }
  }
});
socket.on('close', () => {
  console.log('[sim] disconnected');
  process.exit(0);
});
socket.on('error', (err) => {
  console.error(`[sim] ${err.message}`);
  process.exit(1);
});

function login() {
  // IMEI(8) + Language(1) + Timezone(1) + SysVer(2) + AppVer(2) + PS fields(8)
  const content = Buffer.alloc(20);
  encodeImei(IMEI).copy(content, 0);
  content[8] = 0x01; // English
  content.writeInt8(4, 9); // GMT+1 (4 × 15 min)
  content.writeUInt16BE(0x0205, 10);
  content.writeUInt16BE(0x0205, 12);
  socket.write(buildPacket(PID.LOGIN, sequence++, content));
}

function currentPosition() {
  const t = Math.min(step / STEPS, 1);
  return {
    latitude: HOME.latitude + (SCHOOL.latitude - HOME.latitude) * t,
    longitude: HOME.longitude + (SCHOOL.longitude - HOME.longitude) * t,
  };
}

function sendLocation() {
  const pos = currentPosition();
  if (step <= STEPS) step++;
  batteryMv = Math.max(3500, batteryMv - 1);
  const moving = step <= STEPS;
  const content = Buffer.concat([
    encodePosition({
      time: Math.floor(Date.now() / 1000),
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: moving ? 5 : 0,
      course: 140,
      satellites: 9,
    }),
    encodeHardware({ batteryMv, statusWord: moving ? 0x0601 : 0x0401 }),
    Buffer.alloc(14), // sensors (none)
    Buffer.from([0x00, 0x00]), // beacons (none)
  ]);
  socket.write(buildPacket(PID.LOCATION, sequence++, content));
  console.log(`[sim] location ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)} battery=${batteryMv}mV`);
}

function sendHeartbeat() {
  const content = Buffer.alloc(2);
  content.writeUInt16BE(0x0401, 0);
  socket.write(buildPacket(PID.HEARTBEAT, sequence++, content));
}

function sendSos() {
  const pos = currentPosition();
  const content = Buffer.concat([
    encodePosition({
      time: Math.floor(Date.now() / 1000),
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: 0,
      satellites: 9,
    }),
    Buffer.from([0x02]), // SOS
    Buffer.from([0x04, 0x01]), // status
  ]);
  socket.write(buildPacket(PID.WARNING, sequence++, content));
  console.log('[sim] SOS sent!');
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (line.trim().toLowerCase() === 's') sendSos();
});
