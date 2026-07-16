import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dataSource } from './data';
import { getDict, type Dict } from './i18n';
import type { Child, Frequency, Guardian, Lang, NotifSettings, Zone } from './types';

interface VeyeState {
  // auth / profile
  onboarded: boolean;
  phone: string; // digits only, no country code
  name: string;
  lang: Lang;
  notif: NotifSettings;
  freq: Frequency;

  // live data
  children: Child[];
  activeChildId: string | null;
  zones: Zone[];
  guardians: Guardian[];

  // actions
  setPhone: (p: string) => void;
  setName: (n: string) => Promise<void>;
  setLang: (l: Lang) => void;
  setNotif: (patch: Partial<NotifSettings>) => void;
  setFreq: (f: Frequency) => Promise<void>;
  completeOnboarding: () => void;
  logOut: () => void;

  pairChild: (code: string, childName: string) => Promise<Child>;
  refreshChildren: () => Promise<void>;
  setActiveChild: (id: string) => void;
  renameChild: (id: string, name: string) => Promise<void>;
  unpairChild: (id: string) => Promise<void>;

  refreshZones: () => Promise<void>;
  addZone: (zone: Omit<Zone, 'id'>) => Promise<void>;
  toggleZone: (id: string, on: boolean) => Promise<void>;

  refreshGuardians: () => Promise<void>;
  addGuardian: (phone: string) => Promise<void>;
  removeGuardian: (id: string) => Promise<void>;
}

export const useStore = create<VeyeState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      phone: '',
      name: '',
      lang: 'en',
      notif: { arrive: true, battery: true, offline: true },
      freq: '1',
      children: [],
      activeChildId: null,
      zones: [],
      guardians: [],

      setPhone: (phone) => set({ phone }),
      setName: async (name) => {
        set({ name });
        await dataSource.setProfile(name);
      },
      setLang: (lang) => set({ lang }),
      setNotif: (patch) => set({ notif: { ...get().notif, ...patch } }),
      setFreq: async (freq) => {
        set({ freq });
        await dataSource.setFrequency(freq);
      },
      completeOnboarding: () => set({ onboarded: true }),
      logOut: () =>
        set({
          onboarded: false,
          phone: '',
          name: '',
          children: [],
          activeChildId: null,
          zones: [],
          guardians: [],
        }),

      pairChild: async (code, childName) => {
        const child = await dataSource.pair(code, childName);
        const children = await dataSource.listChildren();
        set({ children, activeChildId: child.id });
        const zones = await dataSource.listZones(child.id);
        set({ zones });
        return child;
      },
      refreshChildren: async () => {
        const children = await dataSource.listChildren();
        const { activeChildId } = get();
        const stillThere = children.some((c) => c.id === activeChildId);
        set({
          children,
          activeChildId: stillThere ? activeChildId : (children[0]?.id ?? null),
        });
      },
      setActiveChild: (id) => {
        set({ activeChildId: id });
        void get().refreshZones();
      },
      renameChild: async (id, name) => {
        set({ children: get().children.map((c) => (c.id === id ? { ...c, name } : c)) });
        await dataSource.renameChild(id, name);
      },
      unpairChild: async (id) => {
        await dataSource.unpair(id);
        await get().refreshChildren();
      },

      refreshZones: async () => {
        const { activeChildId } = get();
        if (!activeChildId) return;
        set({ zones: await dataSource.listZones(activeChildId) });
      },
      addZone: async (zone) => {
        await dataSource.createZone(zone);
        await get().refreshZones();
      },
      toggleZone: async (id, on) => {
        set({ zones: get().zones.map((z) => (z.id === id ? { ...z, on } : z)) });
        await dataSource.updateZone(id, { on });
      },

      refreshGuardians: async () => {
        const { activeChildId } = get();
        if (!activeChildId) return;
        set({ guardians: await dataSource.listGuardians(activeChildId) });
      },
      addGuardian: async (phone) => {
        const { activeChildId } = get();
        if (!activeChildId) return;
        await dataSource.addGuardian(activeChildId, phone);
        await get().refreshGuardians();
      },
      removeGuardian: async (id) => {
        const { activeChildId } = get();
        if (!activeChildId) return;
        await dataSource.removeGuardian(activeChildId, id);
        await get().refreshGuardians();
      },
    }),
    {
      name: 'veye-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        phone: s.phone,
        name: s.name,
        lang: s.lang,
        notif: s.notif,
        freq: s.freq,
        children: s.children,
        activeChildId: s.activeChildId,
        zones: s.zones,
        guardians: s.guardians,
      }),
    },
  ),
);

export function useT(): Dict {
  return getDict(useStore((s) => s.lang));
}

export function useActiveChild(): Child | null {
  return useStore((s) => s.children.find((c) => c.id === s.activeChildId) ?? null);
}
