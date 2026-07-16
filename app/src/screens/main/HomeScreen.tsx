import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatteryIcon, ChevronDown, PinIcon, SendIcon } from '../../components/icons';
import { Avatar, StatusPill } from '../../components/ui';
import { statusHeadline, statusLabel, statusSub, timeAgo } from '../../lib/format';
import { useActiveChild, useStore, useT } from '../../store';
import { avatarPalette, batteryColor, colors, fonts, statusColors } from '../../theme';
import { Pulse } from '../onboarding/WelcomeScreen';

function ChildSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const children = useStore((s) => s.children);
  const activeChildId = useStore((s) => s.activeChildId);
  const setActiveChild = useStore((s) => s.setActiveChild);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>{t.yourChildren}</Text>
        {children.map((c) => {
          const active = c.id === activeChildId;
          const sc = statusColors[c.status];
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                setActiveChild(c.id);
                onClose();
              }}
              style={[styles.switchRow, active && styles.switchRowActive]}
            >
              <Avatar name={c.name} avatarIndex={c.avatarIndex} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchName}>{c.name}</Text>
                <Text style={[styles.switchStatus, { color: sc.pillColor }]}>{statusLabel(t, c)}</Text>
              </View>
              {active ? (
                <View style={styles.switchCheck}>
                  <Text style={{ color: '#fff', fontFamily: fonts.extrabold, fontSize: 13 }}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.name);
  const child = useActiveChild();
  const refreshChildren = useStore((s) => s.refreshChildren);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [gotoBusy, setGotoBusy] = useState(false);
  const mapRef = useRef<MapView>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const id = setInterval(() => void refreshChildren(), 15000);
    void refreshChildren();
    return () => clearInterval(id);
  }, [fade, refreshChildren]);

  useEffect(() => {
    if (child) {
      mapRef.current?.animateToRegion(
        { ...child.position, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        450,
      );
    }
  }, [child?.id, child?.position.latitude, child?.position.longitude]);

  if (!child) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const sc = statusColors[child.status];
  const pal = avatarPalette[child.avatarIndex % avatarPalette.length];
  const bColor = batteryColor(child.battery, child.status);
  const bLabel = child.status === 'off' ? t.off : `${child.battery}%`;

  const goToChild = async () => {
    setGotoBusy(true);
    try {
      // Per product flow: hand off to Google Maps with the child as destination.
      let origin = '';
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getLastKnownPositionAsync();
        if (pos) origin = `&origin=${pos.coords.latitude},${pos.coords.longitude}`;
      }
      const dest = `${child.position.latitude},${child.position.longitude}`;
      await new Promise((r) => setTimeout(r, 1200)); // show "how old is this location" confirm
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`,
      );
    } finally {
      setGotoBusy(false);
    }
  };

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setSwitcherOpen(true)}>
          <Text style={styles.greeting}>{t.hi(name || '👋')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }}>
            <Text style={styles.childName}>{child.name}</Text>
            <ChevronDown />
          </View>
        </Pressable>
        <View style={styles.batteryPill}>
          <BatteryIcon color={bColor} fillWidth={Math.max(2, Math.round((child.battery / 100) * 14))} />
          <Text style={[styles.batteryText, { color: bColor }]}>{bLabel}</Text>
        </View>
      </View>

      {/* hero status card */}
      <View style={styles.hero}>
        <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
          {child.status === 'safe' ? <Pulse color={colors.green} size={62} /> : null}
          <View style={[styles.heroAvatarRing, { shadowColor: sc.ring, borderColor: sc.ring }]}>
            <Avatar name={child.name} avatarIndex={child.avatarIndex} size={56} fontSize={25} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <StatusPill label={statusLabel(t, child)} bg={sc.pillBg} color={sc.pillColor} />
          <Text style={styles.heroHeadline}>{statusHeadline(t, child)}</Text>
          <Text style={styles.heroSub}>{statusSub(t, child)}</Text>
        </View>
      </View>

      {/* offline banner */}
      {child.status !== 'safe' ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {t.offlineBanner(child.name, timeAgo(t, child.lastSeenAt), child.place)}
          </Text>
        </View>
      ) : null}

      {/* map */}
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...child.position, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        >
          <Marker coordinate={child.position} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>
              {child.status === 'lost' ? <View style={styles.lostRing} /> : null}
              <View
                style={[
                  styles.mapAvatar,
                  { backgroundColor: pal.color, shadowColor: '#000' },
                  { borderColor: '#fff' },
                ]}
              >
                <Text style={{ fontFamily: fonts.extrabold, color: pal.ink, fontSize: 18 }}>
                  {child.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </Marker>
        </MapView>
        <View style={styles.placeChip}>
          <PinIcon fill={sc.ring} dot="#fff" size={16} />
          <Text style={styles.placeText} numberOfLines={1}>{child.place}</Text>
        </View>
      </View>

      {/* go button */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
        <Pressable
          onPress={goToChild}
          disabled={gotoBusy}
          style={({ pressed }) => [styles.goBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <SendIcon />
          <Text style={styles.goBtnText}>{t.goTo(child.name)}</Text>
        </Pressable>
      </View>

      <ChildSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      {/* goto confirm overlay */}
      <Modal visible={gotoBusy} transparent animationType="fade">
        <View style={styles.confirmScrim}>
          <View style={styles.confirmCard}>
            <ActivityIndicator size="large" color={colors.green} style={{ marginBottom: 18 }} />
            <Text style={styles.confirmTitle}>{t.openingDirections(child.name)}</Text>
            <Text style={styles.confirmSub}>{t.lastSeen(timeAgo(t, child.lastSeenAt))}</Text>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: { fontFamily: fonts.regular, fontSize: 13, color: '#8A857B' },
  childName: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.4, color: colors.ink },
  batteryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  batteryText: { fontFamily: fonts.bold, fontSize: 13 },
  hero: {
    marginTop: 16, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 15,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroAvatarRing: { borderWidth: 3, borderRadius: 32, padding: 0 },
  heroHeadline: {
    fontFamily: fonts.display, fontSize: 21, lineHeight: 24, letterSpacing: -0.3, color: colors.ink,
  },
  heroSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 5 },
  offlineBanner: {
    marginTop: 10, marginHorizontal: 20, backgroundColor: colors.amberSoft,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  offlineText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.amberInk },
  mapCard: {
    flex: 1, marginTop: 14, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lostRing: {
    position: 'absolute', width: 78, height: 78, borderRadius: 39,
    borderWidth: 2, borderColor: colors.grey, borderStyle: 'dashed',
  },
  mapAvatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  placeChip: {
    position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  placeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, flex: 1 },
  goBtn: {
    backgroundColor: colors.green, borderRadius: 18, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  goBtnText: { fontFamily: fonts.bold, fontSize: 17, color: '#fff' },
  scrim: { flex: 1, backgroundColor: 'rgba(20,18,16,0.4)' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 10,
  },
  grabber: {
    width: 38, height: 5, borderRadius: 99, backgroundColor: colors.line,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13,
    marginBottom: 8, borderRadius: 16,
  },
  switchRowActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  switchName: { fontFamily: fonts.bold, fontSize: 16.5, color: colors.ink },
  switchStatus: { fontFamily: fonts.regular, fontSize: 13, marginTop: 1 },
  switchCheck: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmScrim: {
    flex: 1, backgroundColor: 'rgba(20,18,16,0.55)', alignItems: 'center',
    justifyContent: 'center', padding: 40,
  },
  confirmCard: {
    backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 28,
    alignItems: 'center', maxWidth: 300,
  },
  confirmTitle: {
    fontFamily: fonts.display, fontSize: 19, color: colors.ink,
    textAlign: 'center', marginBottom: 6,
  },
  confirmSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
