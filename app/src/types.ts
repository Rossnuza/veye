import type { ChildStatus } from './theme';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Child {
  id: string;
  name: string;
  imei?: string;
  status: ChildStatus;
  battery: number; // 0-100
  position: LatLng;
  place: string; // human readable area name
  placeKind: 'school' | 'home' | 'other';
  lastSeenAt: number; // epoch ms of last location report
  sinceAt?: number; // epoch ms since arriving at current place
  avatarIndex: number;
}

export interface Zone {
  id: string;
  childId: string;
  name: string;
  address: string;
  icon: string;
  center: LatLng;
  size: 'small' | 'med' | 'large'; // small=100m, med=250m, large=500m
  alertArrive: boolean;
  alertLeave: boolean;
  on: boolean;
}

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  primary: boolean;
}

export interface TimelineEntry {
  id: string;
  time: number; // epoch ms
  label: string; // e.g. "Left home"
  position: LatLng;
  durationMin?: number; // stay duration in minutes
  durationPlace?: string; // e.g. "school"
}

export interface DayHistory {
  date: string; // YYYY-MM-DD
  entries: TimelineEntry[];
}

export interface NotifSettings {
  arrive: boolean;
  battery: boolean;
  offline: boolean;
}

export type Frequency = '1' | '5' | '15';
export type Lang = 'en' | 'fr';

export interface AppAlert {
  id: string;
  childId: string;
  message: string;
  at: number;
  kind: 'arrive' | 'leave' | 'battery' | 'offline' | 'online' | 'sos';
}

export const ZONE_RADIUS_M: Record<Zone['size'], number> = {
  small: 100,
  med: 250,
  large: 500,
};
