// Simple JSON-file-backed store. Good for the pilot; swap for Postgres later
// without touching the gateway or API (all access goes through this module).
import fs from 'node:fs';
import path from 'node:path';

const ZONE_RADIUS_M = { small: 100, med: 250, large: 500 };

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export class Store {
  constructor(file) {
    this.file = file;
    this.data = {
      users: [], // { id, phone, name, pushTokens: [] }
      otps: {}, // phone -> { code, expiresAt }
      tokens: {}, // token -> userId
      devices: [], // { imei, pairCode, frequency }
      children: [], // { id, imei, name, avatarIndex, guardianUserIds: [] }
      zones: [], // { id, childId, name, address, icon, center, size, alertArrive, alertLeave, on }
      track: {}, // imei -> [{ time, latitude, longitude, speed, batteryMv }]
      events: [], // { id, childId, kind, label, time, position }
      state: {}, // imei -> { lastSeenAt, batteryMv, position, zoneId, sinceAt, moving }
      alerts: [], // { id, childId, kind, message, at }
    };
    this.saveTimer = null;
    if (file && fs.existsSync(file)) {
      try {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
      } catch {
        console.error(`[store] could not parse ${file}, starting fresh`);
      }
    }
  }

  save() {
    if (!this.file) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 1));
    }, 250);
  }

  // ---- users / auth ----
  requestOtp(phone) {
    const code = process.env.DEV_OTP ?? String(Math.floor(1000 + Math.random() * 8999));
    this.data.otps[phone] = { code, expiresAt: Date.now() + 5 * 60000 };
    this.save();
    return code;
  }

  verifyOtp(phone, code) {
    const otp = this.data.otps[phone];
    if (!otp || otp.expiresAt < Date.now() || otp.code !== code) return null;
    delete this.data.otps[phone];
    let user = this.data.users.find((u) => u.phone === phone);
    if (!user) {
      user = { id: id('usr'), phone, name: '', pushTokens: [] };
      this.data.users.push(user);
    }
    const token = id('tok') + id('');
    this.data.tokens[token] = user.id;
    this.save();
    return { token, user };
  }

  userByToken(token) {
    const userId = this.data.tokens[token];
    return this.data.users.find((u) => u.id === userId) ?? null;
  }

  // ---- devices / pairing ----
  registerDevice(imei, pairCode) {
    let device = this.data.devices.find((d) => d.imei === imei);
    if (!device) {
      device = { imei, pairCode: pairCode ?? imei.slice(-6), frequency: 60 };
      this.data.devices.push(device);
      this.save();
    }
    return device;
  }

  deviceByPairCode(code) {
    return this.data.devices.find((d) => d.pairCode === code) ?? null;
  }

  pair(user, code, childName) {
    const device = this.deviceByPairCode(code);
    if (!device) return null;
    let child = this.data.children.find((c) => c.imei === device.imei);
    if (!child) {
      child = {
        id: id('chd'),
        imei: device.imei,
        name: childName,
        avatarIndex: this.data.children.length % 5,
        guardianUserIds: [user.id],
        primaryUserId: user.id,
      };
      this.data.children.push(child);
    } else if (!child.guardianUserIds.includes(user.id)) {
      child.guardianUserIds.push(user.id);
    }
    this.save();
    return child;
  }

  childrenOf(user) {
    return this.data.children.filter((c) => c.guardianUserIds.includes(user.id));
  }

  childById(childId) {
    return this.data.children.find((c) => c.id === childId) ?? null;
  }

  childByImei(imei) {
    return this.data.children.find((c) => c.imei === imei) ?? null;
  }

  // ---- live state from the gateway ----
  deviceState(imei) {
    if (!this.data.state[imei]) {
      this.data.state[imei] = {
        lastSeenAt: 0, batteryMv: 0, position: null, zoneId: null, sinceAt: 0,
        online: false, moving: false,
      };
    }
    return this.data.state[imei];
  }

  recordTrackPoint(imei, point) {
    if (!this.data.track[imei]) this.data.track[imei] = [];
    const track = this.data.track[imei];
    track.push(point);
    // keep 30 days of points at 1/min ≈ 43k — cap generously
    if (track.length > 60000) track.splice(0, track.length - 60000);
    this.save();
  }

  addEvent(childId, kind, label, position, time = Date.now()) {
    this.data.events.push({ id: id('evt'), childId, kind, label, time, position });
    this.save();
  }

  addAlert(childId, kind, message) {
    this.data.alerts.push({ id: id('alr'), childId, kind, message, at: Date.now() });
    this.save();
  }

  eventsForDay(childId, date) {
    const start = new Date(`${date}T00:00:00`).getTime();
    const end = start + 24 * 3600 * 1000;
    return this.data.events
      .filter((e) => e.childId === childId && e.time >= start && e.time < end)
      .sort((a, b) => a.time - b.time);
  }

  // ---- zones ----
  zonesOf(childId) {
    return this.data.zones.filter((z) => z.childId === childId);
  }

  createZone(zone) {
    const z = { ...zone, id: id('zon') };
    this.data.zones.push(z);
    this.save();
    return z;
  }

  updateZone(zoneId, patch) {
    const z = this.data.zones.find((x) => x.id === zoneId);
    if (z) Object.assign(z, patch);
    this.save();
    return z;
  }

  zoneRadius(zone) {
    return ZONE_RADIUS_M[zone.size] ?? 250;
  }
}
