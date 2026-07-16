import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon } from '../../components/icons';
import { PrimaryButton } from '../../components/ui';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function SuccessScreen({ navigation, route }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const name: string = route.params?.childName ?? '';
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
  }, [pop]);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
      <View style={{ flex: 1 }} />
      <Animated.View style={[styles.ringOuter, { transform: [{ scale: pop }] }]}>
        <View style={styles.ringInner}>
          <CheckIcon />
        </View>
      </Animated.View>
      <Text style={styles.title}>{t.connectedTo(name)}</Text>
      <Text style={styles.sub}>{t.connectedSub(name)}</Text>
      <View style={{ flex: 1 }} />
      <PrimaryButton
        title={t.seeLocation(name)}
        variant="white"
        onPress={() => {
          completeOnboarding();
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }}
        style={{ maxWidth: 320, alignSelf: 'center', paddingVertical: 18 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: colors.green, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 34,
  },
  ringOuter: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display, fontSize: 30, lineHeight: 34.5, letterSpacing: -0.5,
    color: '#fff', textAlign: 'center', marginTop: 30, marginBottom: 10,
  },
  sub: {
    fontFamily: fonts.regular, fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', maxWidth: 280,
  },
});
