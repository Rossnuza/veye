import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../store';
import { colors, fonts } from '../theme';
import { NavHistoryIcon, NavHomeIcon, NavSettingsIcon, NavZonesIcon } from './icons';

export type Tab = 'home' | 'history' | 'zones' | 'settings';

export function BottomNav({
  active, onChange, zoneCount, anyOffline,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  zoneCount: number;
  anyOffline: boolean;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const items: { key: Tab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      key: 'home',
      label: t.navHome,
      icon: <NavHomeIcon active={active === 'home'} />,
      badge: anyOffline ? <View style={styles.redDot} /> : null,
    },
    { key: 'history', label: t.navHistory, icon: <NavHistoryIcon active={active === 'history'} /> },
    {
      key: 'zones',
      label: t.navZones,
      icon: <NavZonesIcon active={active === 'zones'} />,
      badge:
        zoneCount > 0 ? (
          <View style={styles.zoneBadge}>
            <Text style={styles.zoneBadgeText}>{zoneCount}</Text>
          </View>
        ) : null,
    },
    { key: 'settings', label: t.navSettings, icon: <NavSettingsIcon active={active === 'settings'} /> },
  ];
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => (
        <Pressable key={item.key} style={styles.item} onPress={() => onChange(item.key)}>
          <View>
            {item.icon}
            {item.badge}
          </View>
          <Text
            style={[
              styles.label,
              {
                color: active === item.key ? colors.green : colors.faint,
                fontFamily: active === item.key ? fonts.bold : fonts.semibold,
              },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 9,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  label: { fontSize: 10.5 },
  redDot: {
    position: 'absolute', top: -2, right: -3, width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: '#fff',
  },
  zoneBadge: {
    position: 'absolute', top: -4, right: -7, minWidth: 16, height: 16, paddingHorizontal: 4,
    borderRadius: 999, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  zoneBadgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.extrabold },
});
