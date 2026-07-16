// EELINK Device Protocol V2.3 — binary codec.
// Implements the packet framing and the packages used by the Veye tracker:
//   0x01 LOGIN, 0x03 HEARTBEAT, 0x12 LOCATION, 0x14 WARNING, 0x15 REPORT,
//   0x16 MESSAGE (device→server) and 0x80 INSTRUCTION (server→device).
// Reference: "EELINK DEVICE PROTOCOL V2.3" (manufacturer document).

export const PID = {
  LOGIN: 0x01,
  HEARTBEAT: 0x03,
  LOCATION: 0x12,
  WARNING: 0x14,
  REPORT: 0x15,
  MESSAGE: 0x16,
  OBD_DATA: 0x17,
  OBD_BODY: 0x18,
  OBD_FAULT: 0x19,
  PEDOMETER: 0x1a,
  PARAMSET: 0x1b,
  INSTRUCTION: 0x80,
  BROADCAST: 0x81,
  BWLIST: 0x82,
};

export const WARNING_TYPES = {
  0x01: 'power_cut',
  0x02: 'sos',
  0x03: 'battery_low',
  0x04: 'activity',
  0x05: 'shift',
  0x08: 'gps_antenna_open',
  0x09: 'gps_antenna_short',
  0x82: 'speed',
  0x83: 'fence_in',
  0x84: 'fence_out',
  0x85: 'shock',
  0x86: 'freefall',
  0x87: 'tilt',
  0x20: 'temperature_range',
  0x21: 'humidity_range',
  0x22: 'illuminance_range',
  0x23: 'co2_range',
  0x24: 'probe_range',
  0x25: 'light_wakeup',
  0x26: 'motion_wakeup',
};

const MARK = 0x67;

// ---- Appendix A.1 checksum (used by the UDP transport variant) ----
export function sum16(seed, data) {
  let sum = seed & 0xffff;
  for (const byte of data) {
    sum = (((sum << 1) | (sum >>> 15)) + byte) & 0xffff;
  }
  return sum;
}

// ---- Framing ----
// A package: Mark(2)=0x6767, PID(1), Size(2 BE, from Sequence to end), Seq(2 BE), Content.
export function buildPacket(pid, sequence, content = Buffer.alloc(0)) {
  const size = 2 + content.length;
  const buf = Buffer.alloc(7 + content.length);
  buf[0] = MARK;
  buf[1] = MARK;
  buf[2] = pid;
  buf.writeUInt16BE(size, 3);
  buf.writeUInt16BE(sequence & 0xffff, 5);
  content.copy(buf, 7);
  return buf;
}

// Stream splitter for TCP. Feed chunks, get complete packets out.
export class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  // Returns array of { pid, sequence, content }
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const packets = [];
    for (;;) {
      // resync to mark
      let start = 0;
      while (start + 1 < this.buffer.length && !(this.buffer[start] === MARK && this.buffer[start + 1] === MARK)) {
        start++;
      }
      if (start > 0) this.buffer = this.buffer.subarray(start);
      if (this.buffer.length < 7) break;
      const size = this.buffer.readUInt16BE(3);
      const total = 5 + size; // mark(2)+pid(1)+size(2) then `size` bytes
      if (this.buffer.length < total) break;
      const pid = this.buffer[2];
      const sequence = this.buffer.readUInt16BE(5);
      const content = Buffer.from(this.buffer.subarray(7, total));
      this.buffer = this.buffer.subarray(total);
      packets.push({ pid, sequence, content });
    }
    return packets;
  }
}

// ---- Field codecs ----

// IMEI is packed as 8 bytes BCD, e.g. 0x03 0x52 0x54 ... => "352544071677471".
export function parseImei(buf) {
  let digits = '';
  for (const b of buf) {
    digits += (b >> 4).toString(16) + (b & 0x0f).toString(16);
  }
  return digits.replace(/^0+/, '') || '0';
}

export function encodeImei(imei) {
  const digits = imei.padStart(16, '0');
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = (parseInt(digits[i * 2], 10) << 4) | parseInt(digits[i * 2 + 1], 10);
  }
  return buf;
}

// Section 3.5 STATUS bits (partial — the ones we use).
export function parseStatus(word) {
  return {
    gpsFixed: !!(word & 0x0001),
    charging: !!(word & 0x0100),
    active: !!(word & 0x0200),
    gpsRunning: !!(word & 0x0400),
  };
}

// Section 3.6 POSITION (V1). Time(4) + Mask(1) + optional blocks.
// Mask: bit0 GPS block, bit1 BSID0, bit2 BSID1, bit3 BSID2, bit4-6 BSS0-2, bit7 EXT.
// Lat/Lng are signed 32-bit in 1/500 arc-second => degrees = value / 1_800_000.
export function parsePosition(buf, offset = 0) {
  const time = buf.readUInt32BE(offset);
  const mask = buf[offset + 4];
  let o = offset + 5;
  const pos = { time, mask, gpsValid: false };
  if (mask & 0x01) {
    pos.gpsValid = true;
    pos.latitude = buf.readInt32BE(o) / 1800000;
    pos.longitude = buf.readInt32BE(o + 4) / 1800000;
    pos.altitude = buf.readInt16BE(o + 8);
    pos.speed = buf.readUInt16BE(o + 10);
    pos.course = buf.readUInt16BE(o + 12);
    pos.satellites = buf[o + 14];
    o += 15;
  }
  if (mask & 0x02) {
    pos.cell = {
      mcc: buf.readUInt16BE(o),
      mnc: buf.readUInt16BE(o + 2),
      lac: buf.readUInt16BE(o + 4),
      cid: buf.readUInt32BE(o + 6),
      rxlev: buf[o + 10],
    };
    o += 11;
  }
  if (mask & 0x04) o += 7; // BSID1: LAC(2)+CI(4)+RxLev(1)
  if (mask & 0x08) o += 7; // BSID2
  if (mask & 0x10) o += 7; // BSS0: BSSID(6)+RSSI(1)
  if (mask & 0x20) o += 7; // BSS1
  if (mask & 0x40) o += 7; // BSS2
  // bit7 (EXT) belongs to POSITION V2/V3. We log in as a V1 server, so the
  // device only ever sends V1 positions (doc §5.2 note 1).
  pos.byteLength = o - offset;
  return pos;
}

export function encodePosition(pos) {
  const gps = pos.gpsValid !== false;
  const buf = Buffer.alloc(5 + (gps ? 15 : 0));
  buf.writeUInt32BE(pos.time ?? Math.floor(Date.now() / 1000), 0);
  buf[4] = gps ? 0x01 : 0x00;
  if (gps) {
    buf.writeInt32BE(Math.round(pos.latitude * 1800000), 5);
    buf.writeInt32BE(Math.round(pos.longitude * 1800000), 9);
    buf.writeInt16BE(Math.round(pos.altitude ?? 0), 13);
    buf.writeUInt16BE(Math.round(pos.speed ?? 0), 15);
    buf.writeUInt16BE(Math.round(pos.course ?? 0), 17);
    buf[19] = pos.satellites ?? 8;
  }
  return buf;
}

// Section 3.7 HARDWARE (20 bytes).
export function parseHardware(buf, offset = 0) {
  return {
    status: parseStatus(buf.readUInt16BE(offset)),
    statusWord: buf.readUInt16BE(offset),
    batteryMv: buf.readUInt16BE(offset + 2),
    ain0: buf.readUInt16BE(offset + 4),
    ain1: buf.readUInt16BE(offset + 6),
    mileage: buf.readUInt32BE(offset + 8),
    gsmCounter: buf.readUInt16BE(offset + 12),
    gpsCounter: buf.readUInt16BE(offset + 14),
    steps: buf.readUInt16BE(offset + 16),
    walkTime: buf.readUInt16BE(offset + 18),
  };
}

export function encodeHardware(hw = {}) {
  const buf = Buffer.alloc(20);
  buf.writeUInt16BE(hw.statusWord ?? 0x0401, 0); // GPS fixed + GPS running
  buf.writeUInt16BE(hw.batteryMv ?? 4000, 2);
  buf.writeUInt32BE(hw.mileage ?? 0, 8);
  buf.writeUInt16BE(hw.steps ?? 0, 16);
  return buf;
}

// Battery voltage → percentage. Single Li-ion cell: 3.40V empty, 4.20V full.
export function batteryPercent(mv) {
  if (!mv) return 0;
  const pct = Math.round(((mv - 3400) / (4200 - 3400)) * 100);
  return Math.max(0, Math.min(100, pct));
}

// ---- Package parsers (device → server) ----

export function parseLogin(content) {
  return {
    imei: parseImei(content.subarray(0, 8)),
    language: content[8],
    timezone: content.readInt8(9), // in 15-minute units
    sysVer: content.readUInt16BE(10),
    appVer: content.readUInt16BE(12),
  };
}

export function parseLocation(content) {
  const pos = parsePosition(content, 0);
  let hardware = null;
  if (content.length >= pos.byteLength + 20) {
    hardware = parseHardware(content, pos.byteLength);
  }
  return { position: pos, hardware };
}

export function parseWarning(content) {
  const pos = parsePosition(content, 0);
  const warningCode = content[pos.byteLength];
  const statusWord = content.readUInt16BE(pos.byteLength + 1);
  return {
    position: pos,
    warningCode,
    warning: WARNING_TYPES[warningCode] ?? `unknown_0x${warningCode.toString(16)}`,
    status: parseStatus(statusWord),
  };
}

export function parseReport(content) {
  const pos = parsePosition(content, 0);
  return {
    position: pos,
    reportType: content[pos.byteLength],
    status: parseStatus(content.readUInt16BE(pos.byteLength + 1)),
  };
}

export function parseMessage(content) {
  const pos = parsePosition(content, 0);
  const number = content
    .subarray(pos.byteLength, pos.byteLength + 21)
    .toString('utf8')
    .replace(/\0+.*$/, '');
  const message = content.subarray(pos.byteLength + 21).toString('utf8');
  return { position: pos, number, message };
}

export function parseInstructionResponse(content) {
  return {
    type: content[0],
    uid: content.readUInt32BE(1),
    result: content.subarray(5).toString('utf8'),
  };
}

// ---- Response/instruction builders (server → device) ----

// §5.2: Time(4) + Version(2) + PS Action(1). Version 0x0001 = compatible mode,
// so the device sends POSITION V1 which we fully parse.
export function buildLoginResponse(sequence, now = new Date()) {
  const content = Buffer.alloc(7);
  content.writeUInt32BE(Math.floor(now.getTime() / 1000), 0);
  content.writeUInt16BE(0x0001, 4);
  content[6] = 0x00; // no param-set upload requested
  return buildPacket(PID.LOGIN, sequence, content);
}

export function buildAck(pid, sequence) {
  return buildPacket(pid, sequence, Buffer.alloc(0));
}

// §5.5: warning response may carry a text that the device forwards by SMS to
// its managers. We ack with empty content (no SMS side-channel).
export function buildWarningResponse(sequence, text = '') {
  return buildPacket(PID.WARNING, sequence, Buffer.from(text, 'utf8'));
}

// §5.7: echo the phone number, empty result = simple acknowledge.
export function buildMessageResponse(sequence, number, result = '') {
  const num = Buffer.alloc(21);
  num.write(number ?? '', 'utf8');
  return buildPacket(PID.MESSAGE, sequence, Buffer.concat([num, Buffer.from(result, 'utf8')]));
}

// §5.13: Type(1)=0x01 command, UID(4), Content = device command string.
export function buildInstruction(sequence, uid, command) {
  const head = Buffer.alloc(5);
  head[0] = 0x01;
  head.writeUInt32BE(uid >>> 0, 1);
  return buildPacket(PID.INSTRUCTION, sequence, Buffer.concat([head, Buffer.from(command, 'utf8')]));
}

// ---- Device commands (§6) used by Veye ----

// §6.3.8 COLLECT — location collection strategy. We use the time strategy:
// same interval whether idle or active, send immediately (quantity 1).
export function collectCommand(intervalSeconds) {
  return `COLLECT,${intervalSeconds},0,0,${intervalSeconds},1#`;
}

// §6.3.4 HBT — heartbeat timer in minutes.
export function hbtCommand(minutes) {
  return `HBT,${minutes}#`;
}

// §6.3.19 FENCE — round bidirectional fence at index (1-8).
export function fenceCommand(index, longitude, latitude, radiusMeters) {
  return `FENCE,${index},CR,${longitude.toFixed(6)},${latitude.toFixed(6)},${Math.round(radiusMeters)}#`;
}

export function clearFenceCommand(index = 0) {
  return `FENCE,${index}#`;
}

// §6.4.6 WHERE — ask the device to report its position now.
export function whereCommand() {
  return 'WHERE?';
}
