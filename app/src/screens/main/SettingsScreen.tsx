import * as Linking from 'expo-linking';
import React, { useEffect } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, PlusIcon } from '../../components/icons';
import { Avatar, Card, SectionLabel, SegButton, Toggle } from '../../components/ui';
import { fullPhone, statusLabel } from '../../lib/format';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function SettingsScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { name, phone, lang, notif, freq, children, guardians } = useStore();
  const { setLang, setNotif, setFreq, setActiveChild, logOut, refreshGuardians } = useStore();

  useEffect(() => {
    void refreshGuardians();
  }, [refreshGuardians]);

  const confirmLogout = () => {
    Alert.alert('', t.logOutConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.logOut, style: 'destructive', onPress: () => logOut() },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={styles.title}>{t.settings}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }}
      >
        <SectionLabel>{t.myAccount}</SectionLabel>
        <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 24 }}>
          <View style={styles.meAvatar}>
            <Text style={{ fontFamily: fonts.extrabold, color: colors.greenDark, fontSize: 18 }}>
              {(name || 'M').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.meName}>{name}</Text>
            <Text style={styles.mePhone}>{fullPhone(phone)}</Text>
          </View>
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{t.primary}</Text>
          </View>
        </Card>

        <SectionLabel>{t.myChildren}</SectionLabel>
        <Card style={{ overflow: 'hidden', marginBottom: 14 }}>
          {children.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => {
                setActiveChild(c.id);
                navigation.navigate('ChildDetail', { childId: c.id });
              }}
              style={[styles.childRow, i < children.length - 1 && styles.rowBorder]}
            >
              <Avatar name={c.name} avatarIndex={c.avatarIndex} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{c.name}</Text>
                <Text style={styles.childStatus}>{statusLabel(t, c)}</Text>
              </View>
              <ChevronRight />
            </Pressable>
          ))}
        </Card>
        <Pressable onPress={() => navigation.navigate('Pair')} style={styles.addChildBtn}>
          <PlusIcon color={colors.muted} size={18} />
          <Text style={styles.addChildText}>{t.addAnother}</Text>
        </Pressable>

        <SectionLabel>{t.peopleAlerts}</SectionLabel>
        <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
          <Pressable
            onPress={() => navigation.navigate('Guardians')}
            style={[styles.settingRow, styles.rowBorder]}
          >
            <Text style={{ fontSize: 19 }}>👥</Text>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.guardians}</Text>
            <Text style={styles.settingValue}>{guardians.length}</Text>
            <ChevronRight />
          </Pressable>
          <View style={[styles.settingRow, styles.rowBorder]}>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.alertArrivals}</Text>
            <Toggle on={notif.arrive} onChange={(v) => setNotif({ arrive: v })} />
          </View>
          <View style={[styles.settingRow, styles.rowBorder]}>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.alertBattery}</Text>
            <Toggle on={notif.battery} onChange={(v) => setNotif({ battery: v })} />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.alertOffline}</Text>
            <Toggle on={notif.offline} onChange={(v) => setNotif({ offline: v })} />
          </View>
        </Card>

        <SectionLabel>{t.app}</SectionLabel>
        <Card style={{ overflow: 'hidden', marginBottom: 24 }}>
          <View style={[styles.settingRow, styles.rowBorder]}>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.language}</Text>
            <View style={styles.langSeg}>
              <Pressable
                onPress={() => setLang('en')}
                style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              >
                <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
              </Pressable>
              <Pressable
                onPress={() => setLang('fr')}
                style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
              >
                <Text style={[styles.langText, lang === 'fr' && styles.langTextActive]}>Français</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL('https://wa.me/237600000000')}
            style={styles.settingRow}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
            <Text style={[styles.settingLabel, { flex: 1 }]}>{t.help}</Text>
            <ChevronRight />
          </Pressable>
        </Card>

        <SectionLabel>{t.advanced}</SectionLabel>
        <Card style={{ padding: 16, marginBottom: 24 }}>
          <Text style={styles.settingLabel}>{t.updateFreq}</Text>
          <Text style={styles.freqHint}>{t.freqSub}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['1', '5', '15'] as const).map((f) => (
              <SegButton
                key={f}
                small
                label={t.everyMin(Number(f))}
                active={freq === f}
                onPress={() => void setFreq(f)}
              />
            ))}
          </View>
        </Card>

        <Pressable onPress={confirmLogout} style={{ paddingVertical: 14 }}>
          <Text style={styles.logout}>{t.logOut}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  meAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  meName: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  mePhone: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.faint },
  primaryBadge: {
    backgroundColor: colors.greenSoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  primaryBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.greenDark },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  childName: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  childStatus: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.placeholder, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 14, marginBottom: 24,
  },
  addChildText: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  settingLabel: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  settingValue: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  langSeg: { flexDirection: 'row', backgroundColor: colors.divider, borderRadius: 10, padding: 3 },
  langBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8 },
  langBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  langText: { fontFamily: fonts.bold, fontSize: 13, color: colors.faint },
  langTextActive: { color: colors.green },
  freqHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint, marginTop: 3, marginBottom: 12 },
  logout: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.red, textAlign: 'center' },
});
