import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Card, PrimaryButton, SegButton, Toggle } from '../../components/ui';
import { useActiveChild, useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';
import type { Zone } from '../../types';

const ICONS: Record<string, string> = {
  school: '🏫', école: '🏫', home: '🏠', maison: '🏠', house: '🏠',
  grandma: '💛', church: '⛪', mosque: '🕌', market: '🛒',
};

function iconFor(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(ICONS)) {
    if (lower.includes(key)) return ICONS[key];
  }
  return '📍';
}

export default function AddPlaceConfigScreen({ navigation, route }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const child = useActiveChild();
  const addZone = useStore((s) => s.addZone);
  const center = route.params?.center ?? child?.position ?? { latitude: 4.09, longitude: 9.74 };
  const [name, setName] = useState<string>(route.params?.suggestedName ?? '');
  const [size, setSize] = useState<Zone['size']>('med');
  const [arrive, setArrive] = useState(true);
  const [leave, setLeave] = useState(true);
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length > 0 && !busy;

  const save = async () => {
    if (!ready || !child) return;
    setBusy(true);
    try {
      await addZone({
        childId: child.id,
        name: name.trim(),
        address: t.newPlace,
        icon: iconFor(name),
        center,
        size,
        alertArrive: arrive,
        alertLeave: leave,
        on: true,
      });
      navigation.popToTop();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t.namePlace}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t.whatCall}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t.zonePlaceholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 24, marginBottom: 4 }]}>{t.howPrecise}</Text>
        <Text style={styles.hint}>{t.preciseSub(child?.name ?? '')}</Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <SegButton label={t.small} active={size === 'small'} onPress={() => setSize('small')} />
          <SegButton label={t.medium} active={size === 'med'} onPress={() => setSize('med')} />
          <SegButton label={t.large} active={size === 'large'} onPress={() => setSize('large')} />
        </View>

        <Text style={[styles.label, { marginTop: 26, marginBottom: 12 }]}>{t.alertWhen}</Text>
        <Card>
          <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
            <Text style={styles.toggleLabel}>{t.arrives(child?.name ?? '')}</Text>
            <Toggle on={arrive} onChange={setArrive} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t.leaves(child?.name ?? '')}</Text>
            <Toggle on={leave} onChange={setLeave} />
          </View>
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 14) + 10 }}>
        <PrimaryButton title={t.savePlace} disabled={!ready} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft, marginBottom: 8 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint, marginBottom: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    padding: 15, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
  },
  toggleLabel: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
});
