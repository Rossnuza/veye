import React, { useEffect } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusIcon, TrashIcon } from '../../components/icons';
import { BackButton } from '../../components/ui';
import { useActiveChild, useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function GuardiansScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const child = useActiveChild();
  const guardians = useStore((s) => s.guardians);
  const removeGuardian = useStore((s) => s.removeGuardian);
  const refreshGuardians = useStore((s) => s.refreshGuardians);

  useEffect(() => {
    void refreshGuardians();
  }, [refreshGuardians]);

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('', t.removeGuardianConfirm(name), [
      { text: t.cancel, style: 'cancel' },
      { text: t.remove, style: 'destructive', onPress: () => void removeGuardian(id) },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t.guardians}</Text>
      </View>
      <Text style={styles.sub}>{t.guardiansSub(child?.name ?? '')}</Text>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 }}
      >
        {guardians.length === 0 ? (
          <Text style={styles.empty}>{t.guardiansEmpty}</Text>
        ) : (
          guardians.map((g) => (
            <View key={g.id} style={styles.row}>
              <View style={styles.gAvatar}>
                <Text style={{ fontFamily: fonts.extrabold, color: colors.muted, fontSize: 16 }}>
                  {(g.name.replace(/[^A-Za-z]/g, '').charAt(0) || 'G').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.gName}>{g.primary ? t.you(g.name.replace(/^You \(|\)$/g, '')) : g.name}</Text>
                <Text style={styles.gPhone}>{g.phone}</Text>
              </View>
              {g.primary ? (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>{t.primary}</Text>
                </View>
              ) : (
                <Pressable hitSlop={8} onPress={() => confirmRemove(g.id, g.name)}>
                  <TrashIcon />
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 14) + 12 }}>
        <Pressable
          onPress={() => navigation.navigate('AddGuardian')}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <PlusIcon />
          <Text style={styles.addText}>{t.addGuardian}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4, color: colors.ink },
  sub: {
    fontFamily: fonts.regular, fontSize: 14.5, color: colors.muted,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  empty: {
    fontFamily: fonts.regular, fontSize: 14.5, color: colors.faint,
    textAlign: 'center', marginTop: 30, lineHeight: 21,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFE9DC',
    alignItems: 'center', justifyContent: 'center',
  },
  gName: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  gPhone: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  primaryBadge: {
    backgroundColor: colors.greenSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  primaryBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.greenDark },
  addBtn: {
    backgroundColor: colors.ink, borderRadius: 18, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  addText: { fontFamily: fonts.bold, fontSize: 16.5, color: '#fff' },
});
