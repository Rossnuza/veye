// TCP gateway for EELINK trackers. One socket per device session.
// Flow (doc §2.3): device connects → LOGIN → we ack → HEARTBEAT/LOCATION/
// WARNING/... → we ack each. Server-initiated commands go out as 0x80
// INSTRUCTION packets.
import net from 'node:net';
import {
  FrameParser, PID, batteryPercent, buildAck, buildInstruction, buildLoginResponse,
  buildMessageResponse, buildWarningResponse, collectCommand, fenceCommand,
  clearFenceCommand, parseLocation, parseLogin, parseMessage, parseReport,
  parseWarning, parseInstructionResponse,
} from './protocol.js';
import { processPosition } from './geofence.js';

export class Gateway {
  constructor(store, { notify = () => {}, log = console.log } = {}) {
    this.store = store;
    this.notify = notify;
    this.log = log;
    this.sessions = new Map(); // imei -> { socket, sequence, uid }
    this.server = net.createServer((socket) => this.onConnection(socket));
    // Mark devices offline when nothing has been heard for a while. The
    // product flow asks for an "offline for 30 minutes" alert.
    this.sweeper = setInterval(() => this.sweepOffline(), 60000);
    this.sweeper.unref?.();
  }

  listen(port, host = '0.0.0.0') {
    return new Promise((resolve) => this.server.listen(port, host, () => resolve(this.server.address().port)));
  }

  close() {
    clearInterval(this.sweeper);
    for (const { socket } of this.sessions.values()) socket.destroy();
    return new Promise((resolve) => this.server.close(resolve));
  }

  onConnection(socket) {
    const parser = new FrameParser();
    let imei = null;
    socket.setTimeout(10 * 60000, () => socket.destroy());
    socket.on('error', () => {});
    socket.on('close', () => {
      if (imei && this.sessions.get(imei)?.socket === socket) {
        this.sessions.delete(imei);
        this.log(`[gateway] ${imei} disconnected`);
      }
    });
    socket.on('data', (chunk) => {
      let packets;
      try {
        packets = parser.push(chunk);
      } catch {
        socket.destroy();
        return;
      }
      for (const packet of packets) {
        try {
          imei = this.handlePacket(socket, packet, imei);
        } catch (err) {
          this.log(`[gateway] error handling pid=0x${packet.pid.toString(16)}: ${err.message}`);
        }
      }
    });
  }

  handlePacket(socket, { pid, sequence, content }, imei) {
    const store = this.store;

    if (pid === PID.LOGIN) {
      const login = parseLogin(content);
      imei = login.imei;
      this.sessions.set(imei, { socket, sequence: 1, uid: 1, pending: new Map() });
      store.registerDevice(imei);
      const state = store.deviceState(imei);
      state.online = true;
      state.lastSeenAt = Date.now();
      socket.write(buildLoginResponse(sequence));
      this.log(`[gateway] ${imei} logged in (app v${(login.appVer >> 8).toString(16)}.${(login.appVer & 0xff).toString(16)})`);
      // Push current settings to the device on every login.
      const device = store.data.devices.find((d) => d.imei === imei);
      this.sendCommand(imei, collectCommand(device?.frequency ?? 60));
      const child = store.childByImei(imei);
      if (child) this.syncFences(child);
      return imei;
    }

    if (!imei) {
      // Per doc §5.2 devices always login first; drop anything else.
      socket.destroy();
      return imei;
    }

    const state = store.deviceState(imei);
    state.online = true;
    state.lastSeenAt = Date.now();
    const child = store.childByImei(imei);

    switch (pid) {
      case PID.HEARTBEAT: {
        socket.write(buildAck(PID.HEARTBEAT, sequence));
        break;
      }
      case PID.LOCATION: {
        const { position, hardware } = parseLocation(content);
        // TCP location packets don't require a response (doc §5.1 note 4),
        // but acking is harmless and helps flaky networks.
        socket.write(buildAck(PID.LOCATION, sequence));
        this.ingestPosition(imei, position, hardware);
        break;
      }
      case PID.WARNING: {
        const warning = parseWarning(content);
        socket.write(buildWarningResponse(sequence));
        this.ingestPosition(imei, warning.position, null);
        this.handleWarning(child, warning);
        break;
      }
      case PID.REPORT: {
        const report = parseReport(content);
        socket.write(buildAck(PID.REPORT, sequence));
        this.ingestPosition(imei, report.position, null);
        break;
      }
      case PID.MESSAGE: {
        const message = parseMessage(content);
        socket.write(buildMessageResponse(sequence, message.number));
        this.log(`[gateway] ${imei} message: ${JSON.stringify(message.message)}`);
        break;
      }
      case PID.INSTRUCTION: {
        const res = parseInstructionResponse(content);
        const session = this.sessions.get(imei);
        const pending = session?.pending.get(res.uid);
        if (pending) {
          session.pending.delete(res.uid);
          pending.resolve(res.result);
        }
        this.log(`[gateway] ${imei} instruction result: ${JSON.stringify(res.result)}`);
        break;
      }
      case PID.PEDOMETER:
      case PID.OBD_DATA:
      case PID.OBD_BODY:
      case PID.OBD_FAULT:
      case PID.PARAMSET: {
        socket.write(buildAck(pid, sequence));
        break;
      }
      default: {
        socket.write(buildAck(pid, sequence));
      }
    }
    return imei;
  }

  ingestPosition(imei, position, hardware) {
    if (!position?.gpsValid) return;
    const store = this.store;
    const state = store.deviceState(imei);
    const timeMs = position.time * 1000;
    const point = {
      time: timeMs,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed ?? 0,
      batteryMv: hardware?.batteryMv ?? state.batteryMv,
    };
    state.position = { latitude: point.latitude, longitude: point.longitude };
    state.moving = (position.speed ?? 0) > 3;
    if (hardware?.batteryMv) {
      const prevPct = batteryPercent(state.batteryMv);
      state.batteryMv = hardware.batteryMv;
      const pct = batteryPercent(hardware.batteryMv);
      const child = store.childByImei(imei);
      if (child && prevPct > 20 && pct <= 20) {
        this.notify(child.id, 'battery', `${child.name}'s tracker battery is low. Remind them to charge tonight.`);
      }
    }
    store.recordTrackPoint(imei, point);
    const child = store.childByImei(imei);
    if (child) {
      processPosition(store, child, point, timeMs, this.notify);
    }
    store.save();
  }

  handleWarning(child, warning) {
    if (!child) return;
    switch (warning.warning) {
      case 'sos':
        this.notify(child.id, 'sos', `SOS! ${child.name} pressed the emergency button.`);
        this.store.addAlert(child.id, 'sos', 'SOS button pressed');
        break;
      case 'battery_low':
        this.notify(child.id, 'battery', `${child.name}'s tracker battery is low. Remind them to charge tonight.`);
        break;
      case 'fence_in':
      case 'fence_out':
        // Device-side fences mirror our zones; server-side geofencing already
        // produced the arrive/leave alert from the position in this packet.
        break;
      default:
        this.log(`[gateway] warning from ${child.name}: ${warning.warning}`);
    }
  }

  sweepOffline() {
    const now = Date.now();
    for (const child of this.store.data.children) {
      const state = this.store.deviceState(child.imei);
      if (state.online && now - state.lastSeenAt > 30 * 60000) {
        state.online = false;
        this.notify(child.id, 'offline', `${child.name}'s tracker has been offline for 30 minutes.`);
      }
    }
  }

  // ---- server → device ----
  isConnected(imei) {
    return this.sessions.has(imei);
  }

  sendCommand(imei, command, timeoutMs = 30000) {
    const session = this.sessions.get(imei);
    if (!session) return Promise.reject(new Error(`device ${imei} not connected`));
    const uid = session.uid++;
    const sequence = session.sequence++;
    session.socket.write(buildInstruction(sequence, uid, command));
    this.log(`[gateway] → ${imei}: ${command}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        session.pending.delete(uid);
        reject(new Error(`command timeout: ${command}`));
      }, timeoutMs);
      timer.unref?.();
      session.pending.set(uid, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
      });
    });
  }

  // Mirror the child's active zones into the device's 8 hardware fence slots
  // (doc §6.3.19) so the device itself also raises in/out-of-fence warnings.
  syncFences(child) {
    if (!this.isConnected(child.imei)) return;
    const zones = this.store.zonesOf(child.id).filter((z) => z.on).slice(0, 8);
    this.sendCommand(child.imei, clearFenceCommand(0)).catch(() => {});
    zones.forEach((zone, i) => {
      this.sendCommand(
        child.imei,
        fenceCommand(i + 1, zone.center.longitude, zone.center.latitude, this.store.zoneRadius(zone)),
      ).catch(() => {});
    });
  }

  setFrequency(imei, seconds) {
    const device = this.store.data.devices.find((d) => d.imei === imei);
    if (device) {
      device.frequency = seconds;
      this.store.save();
    }
    if (this.isConnected(imei)) {
      return this.sendCommand(imei, collectCommand(seconds));
    }
    return Promise.resolve('queued (device offline, applied on next login)');
  }
}
