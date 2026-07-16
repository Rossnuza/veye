import type { Child, DayHistory, Frequency, Guardian, Zone } from '../types';
import type { DataSource } from './source';

// Client for the Veye server (see server/ in this repo). The server exposes a
// small JSON API on top of the EELINK device gateway.
export class HttpSource implements DataSource {
  private token: string | null = null;
  private phone = '';

  constructor(private baseUrl: string) {}

  private async req<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`api-${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async requestOtp(phone: string) {
    this.phone = phone;
    await this.req('/api/auth/request-otp', 'POST', { phone });
  }

  async verifyOtp(phone: string, code: string) {
    try {
      const r = await this.req<{ token: string }>('/api/auth/verify', 'POST', { phone, code });
      this.token = r.token;
      return true;
    } catch {
      return false;
    }
  }

  async setProfile(name: string) {
    await this.req('/api/me', 'PATCH', { name });
  }

  async pair(code: string, childName: string): Promise<Child> {
    return await this.req<Child>('/api/pair', 'POST', { code, childName });
  }

  async listChildren(): Promise<Child[]> {
    return await this.req<Child[]>('/api/children');
  }

  async renameChild(childId: string, name: string) {
    await this.req(`/api/children/${childId}`, 'PATCH', { name });
  }

  async unpair(childId: string) {
    await this.req(`/api/children/${childId}`, 'DELETE');
  }

  async getHistory(childId: string, date: string): Promise<DayHistory> {
    return await this.req<DayHistory>(`/api/children/${childId}/history?date=${date}`);
  }

  async listZones(childId: string): Promise<Zone[]> {
    return await this.req<Zone[]>(`/api/children/${childId}/zones`);
  }

  async createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
    return await this.req<Zone>(`/api/children/${zone.childId}/zones`, 'POST', zone);
  }

  async updateZone(zoneId: string, patch: Partial<Zone>) {
    await this.req(`/api/zones/${zoneId}`, 'PATCH', patch);
  }

  async listGuardians(childId: string): Promise<Guardian[]> {
    return await this.req<Guardian[]>(`/api/children/${childId}/guardians`);
  }

  async addGuardian(childId: string, phone: string): Promise<Guardian> {
    return await this.req<Guardian>(`/api/children/${childId}/guardians`, 'POST', { phone });
  }

  async removeGuardian(childId: string, guardianId: string) {
    await this.req(`/api/children/${childId}/guardians/${guardianId}`, 'DELETE');
  }

  async setFrequency(freq: Frequency) {
    await this.req('/api/settings/frequency', 'PATCH', { freq });
  }
}
