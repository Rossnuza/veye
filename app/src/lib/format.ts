import type { Dict } from '../i18n';
import type { Child, LatLng } from '../types';

export function formatPhone(digits: string): string {
  return digits.replace(/(.{2})/g, '$1 ').trim();
}

export function fullPhone(digits: string): string {
  return `+237 ${formatPhone(digits) || '6 00 00 00 00'}`;
}

export function timeAgo(t: Dict, at: number): string {
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 12) return t.hoursAgo(hours);
  return t.thisMorning;
}

export function clockTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export function statusLabel(t: Dict, c: Child): string {
  if (c.status === 'lost') return t.signalLost;
  if (c.status === 'off') return t.trackerOff;
  if (c.placeKind === 'school') return t.atSchool;
  if (c.placeKind === 'home') return t.atHome;
  return t.onTheMove;
}

export function statusHeadline(t: Dict, c: Child): string {
  if (c.status === 'lost') return t.isSignalLost(c.name);
  if (c.status === 'off') return t.isTrackerOff(c.name);
  if (c.placeKind === 'school') return t.isAtSchool(c.name);
  if (c.placeKind === 'home') return t.isAtHome(c.name);
  return t.isOnTheMove(c.name);
}

export function statusSub(t: Dict, c: Child): string {
  if (c.status === 'safe') {
    const since = c.sinceAt ? `${t.since(clockTime(c.sinceAt))} · ` : '';
    return `${since}${t.updatedAgo(timeAgo(t, c.lastSeenAt))}`;
  }
  return `${t.lastSeen(timeAgo(t, c.lastSeenAt))} · ${c.place}`;
}

export function historyLabel(t: Dict, label: string): string {
  const [verb, place] = label.split(':');
  const names: Record<string, string> = {
    home: t.placeHome,
    school: t.placeSchool,
    market: t.placeMarket,
  };
  const placeName = names[place] ?? place;
  if (verb === 'left') return t.leftPlace(placeName);
  if (verb === 'arrived') return t.arrivedPlace(placeName);
  return t.stoppedAt(placeName);
}

export function durationText(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${m.toString().padStart(2, '0')} m`;
}

export function regionFor(points: LatLng[], pad = 1.6) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * pad, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * pad, 0.01),
  };
}
