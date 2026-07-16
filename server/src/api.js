// JSON API for the Veye app (matches app/src/data/http.ts).
import http from 'node:http';
import { batteryPercent } from './protocol.js';
import { zoneContaining } from './geofence.js';

const FRESH_MS = 5 * 60000; // location younger than this = "live"

function childDto(store, child) {
  const state = store.deviceState(child.imei);
  const battery = batteryPercent(state.batteryMv);
  let status = 'safe';
  if (!state.lastSeenAt || (!state.online && battery === 0)) status = 'off';
  else if (!state.online || Date.now() - state.lastSeenAt > FRESH_MS) status = 'lost';

  const position = state.position ?? { latitude: 0, longitude: 0 };
  const zone = state.position ? zoneContaining(store, child.id, state.position) : null;
  let placeKind = 'other';
  if (zone) {
    const n = zone.name.toLowerCase();
    if (n.includes('school') || n.includes('école') || n.includes('ecole')) placeKind = 'school';
    else if (n.includes('home') || n.includes('maison')) placeKind = 'home';
  }
  return {
    id: child.id,
    name: child.name,
    imei: child.imei,
    status,
    battery,
    position,
    place: zone ? zone.address || zone.name : `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`,
    placeKind,
    lastSeenAt: state.lastSeenAt,
    sinceAt: state.sinceAt || state.lastSeenAt,
    avatarIndex: child.avatarIndex,
  };
}

function guardianDto(store, child, user) {
  return {
    id: user.id,
    name: user.name || user.phone,
    phone: user.phone,
    primary: child.primaryUserId === user.id,
  };
}

export function createApi(store, gateway, { log = console.log } = {}) {
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

  // ---- auth ----
  route('POST', /^\/api\/auth\/request-otp$/, async (req) => {
    const { phone } = req.body;
    if (!phone) throw httpError(400, 'phone required');
    const code = store.requestOtp(phone);
    // SMS provider integration point (MTN Cameroon SMS API / Twilio):
    log(`[api] OTP for ${phone}: ${code}`);
    return { ok: true };
  });

  route('POST', /^\/api\/auth\/verify$/, async (req) => {
    const { phone, code } = req.body;
    const result = store.verifyOtp(phone, code);
    if (!result) throw httpError(401, 'invalid code');
    return { token: result.token };
  });

  route('PATCH', /^\/api\/me$/, async (req) => {
    req.user.name = String(req.body.name ?? '').slice(0, 60);
    store.save();
    return { ok: true };
  });

  route('POST', /^\/api\/push-token$/, async (req) => {
    const { token } = req.body;
    if (token && !req.user.pushTokens.includes(token)) {
      req.user.pushTokens.push(token);
      store.save();
    }
    return { ok: true };
  });

  // ---- pairing / children ----
  route('POST', /^\/api\/pair$/, async (req) => {
    const { code, childName } = req.body;
    const child = store.pair(req.user, String(code ?? ''), String(childName ?? '').slice(0, 60));
    if (!child) throw httpError(404, 'tracker not found');
    return childDto(store, child);
  });

  route('GET', /^\/api\/children$/, async (req) => {
    return store.childrenOf(req.user).map((c) => childDto(store, c));
  });

  route('PATCH', /^\/api\/children\/([^/]+)$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    if (req.body.name) child.name = String(req.body.name).slice(0, 60);
    store.save();
    return { ok: true };
  });

  route('DELETE', /^\/api\/children\/([^/]+)$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    store.data.children = store.data.children.filter((c) => c.id !== child.id);
    store.data.zones = store.data.zones.filter((z) => z.childId !== child.id);
    store.save();
    return { ok: true };
  });

  // ---- history ----
  route('GET', /^\/api\/children\/([^/]+)\/history$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    const date = req.query.date ?? new Date().toISOString().slice(0, 10);
    const events = store.eventsForDay(child.id, date);
    const entries = events.map((e, i) => {
      let durationMin;
      let durationPlace;
      if (e.kind === 'arrived') {
        const leave = events.slice(i + 1).find((x) => x.kind === 'left');
        const until = leave ? leave.time : Math.min(Date.now(), new Date(`${date}T23:59:59`).getTime());
        durationMin = Math.round((until - e.time) / 60000);
        durationPlace = e.label.split(':')[1];
        if (durationMin < 3) durationMin = undefined;
      }
      return {
        id: e.id,
        time: e.time,
        label: e.label,
        position: e.position,
        durationMin,
        durationPlace,
      };
    });
    return { date, entries };
  });

  // ---- zones ----
  route('GET', /^\/api\/children\/([^/]+)\/zones$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    return store.zonesOf(child.id);
  });

  route('POST', /^\/api\/children\/([^/]+)\/zones$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    const { name, address, icon, center, size, alertArrive, alertLeave, on } = req.body;
    if (!name || !center) throw httpError(400, 'name and center required');
    const zone = store.createZone({
      childId: child.id,
      name: String(name).slice(0, 60),
      address: String(address ?? '').slice(0, 120),
      icon: String(icon ?? '📍').slice(0, 4),
      center,
      size: ['small', 'med', 'large'].includes(size) ? size : 'med',
      alertArrive: alertArrive !== false,
      alertLeave: alertLeave !== false,
      on: on !== false,
    });
    gateway.syncFences(child);
    return zone;
  });

  route('PATCH', /^\/api\/zones\/([^/]+)$/, async (req, [zoneId]) => {
    const zone = store.data.zones.find((z) => z.id === zoneId);
    if (!zone) throw httpError(404, 'zone not found');
    const child = requireChild(store, req.user, zone.childId);
    const patch = {};
    for (const key of ['name', 'address', 'icon', 'size', 'alertArrive', 'alertLeave', 'on']) {
      if (key in req.body) patch[key] = req.body[key];
    }
    store.updateZone(zoneId, patch);
    gateway.syncFences(child);
    return { ok: true };
  });

  // ---- guardians ----
  route('GET', /^\/api\/children\/([^/]+)\/guardians$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    return child.guardianUserIds
      .map((uid) => store.data.users.find((u) => u.id === uid))
      .filter(Boolean)
      .map((u) => guardianDto(store, child, u));
  });

  route('POST', /^\/api\/children\/([^/]+)\/guardians$/, async (req, [childId]) => {
    const child = requireChild(store, req.user, childId);
    if (child.primaryUserId !== req.user.id) throw httpError(403, 'only the primary parent can add guardians');
    const phone = String(req.body.phone ?? '');
    if (!phone) throw httpError(400, 'phone required');
    let invited = store.data.users.find((u) => u.phone === phone);
    if (!invited) {
      invited = { id: `usr_${Date.now().toString(36)}`, phone, name: '', pushTokens: [] };
      store.data.users.push(invited);
    }
    if (!child.guardianUserIds.includes(invited.id)) child.guardianUserIds.push(invited.id);
    store.save();
    // SMS invite link integration point:
    log(`[api] guardian invite for ${phone} → child ${child.name}`);
    return guardianDto(store, child, invited);
  });

  route('DELETE', /^\/api\/children\/([^/]+)\/guardians\/([^/]+)$/, async (req, [childId, guardianId]) => {
    const child = requireChild(store, req.user, childId);
    if (child.primaryUserId !== req.user.id) throw httpError(403, 'only the primary parent can remove guardians');
    if (guardianId === child.primaryUserId) throw httpError(400, 'cannot remove the primary parent');
    child.guardianUserIds = child.guardianUserIds.filter((id) => id !== guardianId);
    store.save();
    return { ok: true };
  });

  // ---- settings ----
  route('PATCH', /^\/api\/settings\/frequency$/, async (req) => {
    const freq = { 1: 60, 5: 300, 15: 900 }[req.body.freq];
    if (!freq) throw httpError(400, 'freq must be 1, 5 or 15');
    const results = [];
    for (const child of store.childrenOf(req.user)) {
      results.push(
        await gateway.setFrequency(child.imei, freq).catch((err) => err.message),
      );
    }
    return { ok: true, results };
  });

  // ---- device admin (register trackers as they arrive from the factory) ----
  route('POST', /^\/api\/admin\/devices$/, async (req) => {
    if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
      throw httpError(403, 'admin key required (set ADMIN_KEY env var)');
    }
    const { imei, pairCode } = req.body;
    if (!imei) throw httpError(400, 'imei required');
    const device = store.registerDevice(String(imei), pairCode ? String(pairCode) : undefined);
    return device;
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    try {
      const body = await readBody(req);
      for (const { method, pattern, handler } of routes) {
        if (req.method !== method) continue;
        const match = url.pathname.match(pattern);
        if (!match) continue;
        const ctx = {
          body,
          headers: req.headers,
          query: Object.fromEntries(url.searchParams),
          user: null,
        };
        const isPublic = url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/admin/');
        if (!isPublic) {
          const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
          ctx.user = store.userByToken(token);
          if (!ctx.user) throw httpError(401, 'not authenticated');
        }
        const result = await handler(ctx, match.slice(1));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) log(`[api] error: ${err.stack}`);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return server;
}

function requireChild(store, user, childId) {
  const child = store.childById(childId);
  if (!child || !child.guardianUserIds.includes(user.id)) throw httpError(404, 'child not found');
  return child;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(httpError(413, 'body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(httpError(400, 'invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
