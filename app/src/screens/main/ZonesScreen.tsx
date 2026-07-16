import React, { useEffect } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusIcon } from '../../components/icons';
import { Toggle } from '../../components/ui';
import { useActiveChild, useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function ZonesScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const child = useActiveChild();
  const zones = useStore((s) => s.zones);
  const toggleZone = useStore((s) => s.toggleZone);
  const refreshZones = useStore((s) => s.refreshZones);

  useEffect(() => {
    void refreshZones();
  }, [refreshZones, child?.id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={styles.title}>{t.zonesTitle}</Text>
        <Text style={styles.sub}>{t.zonesSub(child?.name ?? '')}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 }}
      >
        {zones.length === 0 ? (
          <Text style={styles.empty}>{t.zonesEmpty}</Text>
        ) : (
          zones.map((z) => (
            <View key={z.id} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: z.on ? colors.greenSoft : colors.divider }]}>
                <Text style={{ fontSize: 20 }}>{z.icon}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.zoneName}>{z.name}</Text>
                <Text style={styles.zoneAddr} numberOfLines={1}>{z.address}</Text>
              </View>
              <Toggle on={z.on} onChange={(v) => void toggleZone(z.id, v)} />
            </View>
          ))
        )}
      </ScrollView>
      <View style={[styles.addWrap, { bottom: 16 }]}>
        <Pressable
          onPress={() => navigation.navigate('AddPlace')}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <PlusIcon />
          <Text style={styles.addText}>{t.addPlace}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.muted, marginTop: 6 },
  empty: {
    fontFamily: fonts.regular, fontSize: 14.5, color: colors.faint,
    textAlign: 'center', marginTop: 30, paddingHorizontal: 20, lineHeight: 21,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff',
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  zoneName: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  zoneAddr: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  addWrap: { position: 'absolute', left: 20, right: 20 },
  addBtn: {
    backgroundColor: colors.ink, borderRadius: 18, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  addText: { fontFamily: fonts.bold, fontSize: 16.5, color: '#fff' },
});
