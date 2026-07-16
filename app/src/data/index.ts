import Constants from 'expo-constants';
import { DemoSource } from './demo';
import { HttpSource } from './http';
import type { DataSource } from './source';

// If app.json → expo.extra.apiUrl is set, the app talks to the real Veye
// server (which speaks the EELINK protocol to the physical trackers).
// Otherwise it runs on the built-in demo simulation so the whole product can
// be tested in Expo Go before the hardware arrives.
const apiUrl: string = (Constants.expoConfig?.extra?.apiUrl as string) ?? '';

export const dataSource: DataSource = apiUrl ? new HttpSource(apiUrl) : new DemoSource();
export const isDemo = !apiUrl;
