import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinIcon } from '../../components/icons';
import { PrimaryButton } from '../../components/ui';
import { PLACES } from '../../data/demo';
import { useT } from '../../store';
import { colors, fonts } from '../../theme';

export function usePulse(duration = 2400) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

export function Pulse({ color, size }: { color: string; size: number }) {
  const v = usePulse();
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 2.2] }) }],
      }}
    />
  );
}

export default function WelcomeScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          initialRegion={{
            latitude: PLACES.school.latitude,
            longitude: PLACES.school.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        />
        <LinearGradient
          colors={['rgba(251,247,239,0)', 'rgba(251,247,239,0.85)', colors.bg]}
          locations={[0.4, 0.78, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.pinWrap} pointerEvents="none">
          <Pulse color={colors.green} size={64} />
          <View style={styles.pinCircle}>
            <PinIcon fill="#fff" dot={colors.green} size={32} />
          </View>
        </View>
      </View>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 20) + 26 }]}>
        <Text style={styles.brand}>{t.brand}</Text>
        <Text style={styles.title}>{t.welcomeTitle}</Text>
        <Text style={styles.sub}>{t.welcomeSub}</Text>
        <PrimaryButton title={t.getStarted} onPress={() => navigation.navigate('Phone')} style={{ paddingVertical: 18 }} />
        <Pressable onPress={() => navigation.navigate('Phone')} style={{ marginTop: 18 }}>
          <Text style={styles.loginText}>
            {t.haveAccount} <Text style={styles.loginLink}>{t.logIn}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { flex: 1, overflow: 'hidden' },
  pinWrap: {
    position: 'absolute', top: '42%', left: '50%', marginLeft: -32, marginTop: -32,
    width: 64, height: 64, alignItems: 'center', justifyContent: 'center',
  },
  pinCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.green, shadowOpacity: 0.4, shadowRadius: 11, shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bottom: { paddingHorizontal: 28, alignItems: 'center' },
  brand: {
    fontFamily: fonts.display, fontSize: 17, letterSpacing: 3, textTransform: 'uppercase',
    color: colors.green, marginBottom: 18,
  },
  title: {
    fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8,
    textAlign: 'center', color: colors.ink, marginBottom: 12,
  },
  sub: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, marginBottom: 30 },
  loginText: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  loginLink: { fontFamily: fonts.bold, color: colors.green },
});
