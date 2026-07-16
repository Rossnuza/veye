import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { avatarPalette, colors, fonts } from '../theme';
import { BackIcon } from './icons';

export function PrimaryButton({
  title, onPress, disabled, icon, style, variant = 'green',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'green' | 'dark' | 'white';
}) {
  const bg = disabled ? '#DBD5C9' : variant === 'dark' ? colors.ink : variant === 'white' ? '#fff' : colors.green;
  const fg = variant === 'white' ? colors.green : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg, opacity: pressed ? 0.88 : 1 },
        !disabled && styles.btnShadow,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.primaryBtnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: on ? colors.green : colors.track }]}
    >
      <View style={[styles.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

export function Avatar({
  name, avatarIndex, size = 46, fontSize,
}: {
  name: string;
  avatarIndex: number;
  size?: number;
  fontSize?: number;
}) {
  const pal = avatarPalette[avatarIndex % avatarPalette.length];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: pal.color,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.extrabold, color: pal.ink, fontSize: fontSize ?? size * 0.4 }}>
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </Text>
    </View>
  );
}

export function BackButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.backBtn, style]}>
      <BackIcon />
    </Pressable>
  );
}

export function ScreenTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.screenTitle, style]}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function SegButton({
  label, active, onPress, small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segBtn,
        small && { paddingVertical: 11, borderRadius: 11 },
        { backgroundColor: active ? colors.green : small ? colors.divider : '#fff' },
        !active && !small && styles.segShadow,
      ]}
    >
      <Text
        style={[
          styles.segText,
          small && { fontSize: 12.5 },
          { color: active ? '#fff' : colors.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  btnShadow: {
    shadowColor: colors.green,
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 17 },
  toggle: { width: 48, height: 28, borderRadius: 999, padding: 3, justifyContent: 'center' },
  knob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  screenTitle: {
    fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink,
  },
  sectionLabel: {
    fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
    color: colors.faint, marginHorizontal: 4, marginBottom: 8, marginTop: 6,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 7,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
  segBtn: { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  segShadow: {
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segText: { fontFamily: fonts.bold, fontSize: 14.5 },
});
