import type { Child, DayHistory, Frequency, Guardian, Zone } from '../types';

// Both the demo simulation and the real HTTP backend implement this interface,
// so the app is wired identically in demo mode and in production.
export interface DataSource {
  requestOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
  setProfile(name: string): Promise<void>;

  pair(code: string, childName: string): Promise<Child>;
  listChildren(): Promise<Child[]>;
  renameChild(childId: string, name: string): Promise<void>;
  unpair(childId: string): Promise<void>;

  getHistory(childId: string, date: string): Promise<DayHistory>;

  listZones(childId: string): Promise<Zone[]>;
  createZone(zone: Omit<Zone, 'id'>): Promise<Zone>;
  updateZone(zoneId: string, patch: Partial<Zone>): Promise<void>;

  listGuardians(childId: string): Promise<Guardian[]>;
  addGuardian(childId: string, phone: string): Promise<Guardian>;
  removeGuardian(childId: string, guardianId: string): Promise<void>;

  setFrequency(freq: Frequency): Promise<void>;
}
