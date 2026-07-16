import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, PrimaryButton } from '../../components/ui';
import { dataSource } from '../../data';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export function PhoneEntry({
  title, sub, step, cta, onSubmit, onBack,
}: {
  title: string;
  sub: string;
  step?: string;
  cta: string;
  onSubmit: (digits: string) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const ready = digits.length >= 8;
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 24, flex: 1 }}>
        <BackButton onPress={onBack} />
        <View style={{ marginTop: 22 }}>
          {step ? <Text style={styles.step}>{step}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={{ fontSize: 21 }}>🇨🇲</Text>
            <Text style={styles.prefixText}>+237</Text>
          </View>
          <TextInput
            autoFocus
            keyboardType="number-pad"
            value={digits}
            onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, 9))}
            placeholder="6 00 00 00 00"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }} />
        <PrimaryButton
          title={cta}
          disabled={!ready}
          onPress={() => ready && onSubmit(digits)}
          style={{ marginBottom: Math.max(insets.bottom, 16) + 8 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function PhoneScreen({ navigation }: any) {
  const t = useT();
  const setPhone = useStore((s) => s.setPhone);
  return (
    <PhoneEntry
      title={t.phoneTitle}
      sub={t.phoneSub}
      step={t.step1}
      cta={t.sendCode}
      onBack={() => navigation.goBack()}
      onSubmit={async (digits) => {
        setPhone(digits);
        try {
          await dataSource.requestOtp(digits);
        } catch {
          // Surfaced on the code screen if verification fails.
        }
        navigation.navigate('Code');
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  step: { fontFamily: fonts.bold, fontSize: 13, color: colors.green, letterSpacing: 0.4, marginBottom: 8 },
  title: {
    fontFamily: fonts.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.5,
    color: colors.ink, marginBottom: 8,
  },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  inputRow: {
    marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6,
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 13,
    borderRightWidth: 1.5, borderRightColor: colors.border, paddingVertical: 10,
  },
  prefixText: { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  input: {
    flex: 1, fontSize: 21, fontFamily: fonts.semibold, letterSpacing: 1,
    color: colors.ink, paddingVertical: 10,
  },
});
