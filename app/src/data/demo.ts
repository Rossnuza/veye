import type { Child, DayHistory, Frequency, Guardian, TimelineEntry, Zone } from '../types';
import type { DataSource } from './source';

// ---- Demo geography (Douala, Cameroon) ----
export const PLACES = {
  home: { latitude: 4.0951, longitude: 9.7371, name: 'Bonamoussadi, Douala' },
  school: { latitude: 4.0846, longitude: 9.7423, name: 'Govt Primary School Nkwen' },
  market: { latitude: 4.0787, longitude: 9.7301, name: 'Mile 4 Market' },
  grandma: { latitude: 4.1021, longitude: 9.7519, name: "Bastos, Yaoundé" },
} as const;

let seq = 100;
const nid = () => `demo-${++seq}`;

function makeChild(
  name: string,
  status: Child['status'],
  battery: number,
  place: { latitude: number; longitude: number; name: string },
  placeKind: Child['placeKind'],
  lastSeenMinAgo: number,
  avatarIndex: number,
): Child {
  return {
    id: nid(),
    name,
    imei: `35254407${Math.floor(1000000 + Math.random() * 8999999)}`,
    status,
    battery,
    position: { latitude: place.latitude, longitude: place.longitude },
    place: place.name,
    placeKind,
    lastSeenAt: Date.now() - lastSeenMinAgo * 60000,
    sinceAt: todayAt(8, 14),
    avatarIndex,
  };
}

function todayAt(h: number, m: number): number {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function dateAt(date: string, h: number, m: number): number {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export class DemoSource implements DataSource {
  children: Child[] = [];
  zones: Zone[] = [];
  guardians: Guardian[] = [];
  userName = '';
  userPhone = '';

  private seeded = false;

  // Restore simulation state from the app's persisted store after a restart.
  hydrate(
    children: Child[],
    zones: Zone[],
    guardians: Guardian[],
    userName: string,
    userPhone: string,
  ) {
    if (this.seeded || children.length === 0) return;
    this.children = children.map((c) => ({ ...c }));
    this.zones = zones.map((z) => ({ ...z }));
    this.guardians = guardians.length
      ? guardians.map((g) => ({ ...g }))
      : [{ id: nid(), name: userName || 'You', phone: userPhone, primary: true }];
    this.userName = userName;
    this.userPhone = userPhone;
    this.seeded = true;
  }

  private seed(childName: string) {
    // The freshly paired child + two extra demo children so the child
    // switcher / multi-child flows can be exercised, mirroring the design.
    const main = makeChild(childName, 'safe', 82, PLACES.school, 'school', 2, 0);
    const noah = makeChild('Noah', 'lost', 54, PLACES.market, 'other', 18, 1);
    const aya = makeChild('Aya', 'off', 0, PLACES.home, 'home', 8 * 60, 2);
    this.children = [main, noah, aya];
    this.zones = [
      {
        id: nid(), childId: main.id, name: 'School', address: PLACES.school.name, icon: '🏫',
        center: { latitude: PLACES.school.latitude, longitude: PLACES.school.longitude },
        size: 'med', alertArrive: true, alertLeave: true, on: true,
      },
      {
        id: nid(), childId: main.id, name: 'Home', address: PLACES.home.name, icon: '🏠',
        center: { latitude: PLACES.home.latitude, longitude: PLACES.home.longitude },
        size: 'med', alertArrive: true, alertLeave: true, on: true,
      },
      {
        id: nid(), childId: main.id, name: "Grandma's house", address: PLACES.grandma.name, icon: '💛',
        center: { latitude: PLACES.grandma.latitude, longitude: PLACES.grandma.longitude },
        size: 'large', alertArrive: true, alertLeave: false, on: false,
      },
    ];
    this.guardians = [
      { id: nid(), name: this.userName || 'You', phone: this.userPhone, primary: true },
      { id: nid(), name: 'Paul', phone: '+237 6 99 88 77 66', primary: false },
    ];
    this.seeded = true;
  }

  // ---- auth ----
  async requestOtp(phone: string) {
    this.userPhone = phone;
  }
  async verifyOtp(_phone: string, code: string) {
    return code.length === 4; // demo: any 4-digit code is accepted
  }
  async setProfile(name: string) {
    this.userName = name;
  }

  // ---- pairing ----
  async pair(code: string, childName: string): Promise<Child> {
    if (code.length !== 6) throw new Error('bad-code');
    if (!this.seeded) {
      this.seed(childName);
      return this.children[0];
    }
    const extra = makeChild(
      childName, 'safe', 100, PLACES.home, 'home', 0,
      this.children.length % 5,
    );
    this.children.push(extra);
    return extra;
  }

  async listChildren(): Promise<Child[]> {
    // Simulate live updates: safe children keep reporting.
    const now = Date.now();
    for (const c of this.children) {
      if (c.status === 'safe' && now - c.lastSeenAt > 60000) {
        c.lastSeenAt = now - Math.floor(Math.random() * 30000);
        c.position = {
          latitude: c.position.latitude + (Math.random() - 0.5) * 0.0004,
          longitude: c.position.longitude + (Math.random() - 0.5) * 0.0004,
        };
      }
    }
    return this.children.map((c) => ({ ...c, position: { ...c.position } }));
  }

  async renameChild(childId: string, name: string) {
    const c = this.children.find((x) => x.id === childId);
    if (c) c.name = name;
  }

  async unpair(childId: string) {
    this.children = this.children.filter((x) => x.id !== childId);
    this.zones = this.zones.filter((z) => z.childId !== childId);
  }

  // ---- history ----
  async getHistory(childId: string, date: string): Promise<DayHistory> {
    const child = this.children.find((x) => x.id === childId);
    const isToday = date === new Date().toISOString().slice(0, 10);
    const dow = new Date(`${date}T12:00:00`).getDay();
    if (!child || child.status === 'off' || dow === 0 || dow === 6) {
      return { date, entries: [] }; // weekends / off tracker: nothing recorded
    }
    const mk = (
      h: number, m: number, label: TimelineEntry['label'],
      lat: number, lng: number, durationMin?: number, durationPlace?: string,
    ): TimelineEntry => ({
      id: `${date}-${h}-${m}`,
      time: dateAt(date, h, m),
      label,
      position: { latitude: lat, longitude: lng },
      durationMin,
      durationPlace,
    });
    const entries = [
      mk(7, 42, 'left:home', PLACES.home.latitude, PLACES.home.longitude),
      mk(8, 15, 'arrived:school', PLACES.school.latitude, PLACES.school.longitude, 380, 'school'),
      mk(14, 35, 'left:school', PLACES.school.latitude, PLACES.school.longitude),
      mk(15, 5, 'stopped:market', PLACES.market.latitude, PLACES.market.longitude, 15, 'market'),
      mk(15, 30, 'arrived:home', PLACES.home.latitude, PLACES.home.longitude),
    ];
    const cutoff = isToday ? Date.now() : Infinity;
    return { date, entries: entries.filter((e) => e.time <= cutoff) };
  }

  // ---- zones ----
  async listZones(childId: string): Promise<Zone[]> {
    return this.zones.filter((z) => z.childId === childId).map((z) => ({ ...z }));
  }
  async createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
    const z = { ...zone, id: nid() };
    this.zones.push(z);
    return { ...z };
  }
  async updateZone(zoneId: string, patch: Partial<Zone>) {
    const z = this.zones.find((x) => x.id === zoneId);
    if (z) Object.assign(z, patch);
  }

  // ---- guardians ----
  async listGuardians(_childId: string): Promise<Guardian[]> {
    return this.guardians.map((g) => ({ ...g }));
  }
  async addGuardian(_childId: string, phone: string): Promise<Guardian> {
    const g = { id: nid(), name: 'Invited', phone, primary: false };
    this.guardians.push(g);
    return { ...g };
  }
  async removeGuardian(_childId: string, guardianId: string) {
    this.guardians = this.guardians.filter((g) => g.id !== guardianId);
  }

  async setFrequency(_freq: Frequency) {
    // In production this sends a COLLECT instruction to the tracker (see server/).
  }
}
