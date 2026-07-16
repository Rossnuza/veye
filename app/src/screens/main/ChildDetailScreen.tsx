import React, { useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, BackButton, Card } from '../../components/ui';
import { statusLabel } from '../../lib/format';
import { useStore, useT } from '../../store';
import { batteryColor, colors, fonts } from '../../theme';

export default function ChildDetailScreen({ navigation, route }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const childId: string = route.params?.childId;
  const child = useStore((s) => s.children.find((c) => c.id === childId));
  const renameChild = useStore((s) => s.renameChild);
  const unpairChild = useStore((s) => s.unpairChild);
  const [name, setName] = useState(child?.name ?? '');

  if (!child) return <View style={styles.root} />;

  const commitName = () => {
    const n = name.trim();
    if (n && n !== child.name) void renameChild(child.id, n);
  };

  const confirmUnpair = () => {
    Alert.alert('', t.unpairConfirm(child.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.unpair,
        style: 'destructive',
        onPress: async () => {
          await unpairChild(child.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton onPress={() => { commitName(); navigation.goBack(); }} />
        <Text style={styles.headerTitle}>{t.editChild}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Avatar name={name || child.name} avatarIndex={child.avatarIndex} size={80} fontSize={32} />
        </View>
        <Text style={styles.label}>{t.nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={commitName}
          style={styles.input}
        />
        <Card style={{ marginTop: 18, padding: 16 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.trackerBattery}</Text>
            <Text style={[styles.infoValue, { color: batteryColor(child.battery, child.status) }]}>
              {child.status === 'off' ? t.off : `${child.battery}%`}
            </Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={styles.infoLabel}>{t.statusLabel}</Text>
            <Text style={[styles.infoValue, { color: colors.ink }]}>{statusLabel(t, child)}</Text>
          </View>
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 14) + 10 }}>
        <Pressable onPress={confirmUnpair} style={styles.unpairBtn}>
          <Text style={styles.unpairText}>{t.unpair}</Text>
        </Pressable>
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
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    padding: 15, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  infoValue: { fontFamily: fonts.bold, fontSize: 14 },
  unpairBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.redBorder,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  unpairText: { fontFamily: fonts.bold, fontSize: 16, color: colors.red },
});
