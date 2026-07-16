import React, { useRef, useState } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/ui';
import { dataSource } from '../../data';
import { fullPhone } from '../../lib/format';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function CodeScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const phone = useStore((s) => s.phone);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const onChange = async (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    setCode(digits);
    setError(false);
    if (digits.length === 4 && !busy) {
      setBusy(true);
      const ok = await dataSource.verifyOtp(phone, digits).catch(() => false);
      setBusy(false);
      if (ok) {
        navigation.navigate('Name');
      } else {
        setError(true);
        setCode('');
      }
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 14 }]}>
      <View style={{ paddingHorizontal: 24, flex: 1 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ marginTop: 22 }}>
          <Text style={styles.step}>{t.step2}</Text>
          <Text style={styles.title}>{t.codeTitle}</Text>
          <Text style={styles.sub}>{t.codeSub(fullPhone(phone))}</Text>
        </View>

        <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
          {[0, 1, 2, 3].map((i) => {
            const isNext = code.length === i;
            return (
              <View key={i} style={[styles.box, isNext && styles.boxActive]}>
                <Text style={styles.boxText}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>
        {error ? <Text style={styles.error}>{t.codeWrong}</Text> : null}
        <Pressable onPress={() => setCode('')} style={{ marginTop: 22, alignSelf: 'center' }}>
          <Text style={styles.resendText}>
            {t.noCode} <Text style={styles.resendLink}>{t.resend}</Text>
          </Text>
        </Pressable>

        <TextInput
          ref={inputRef}
          autoFocus
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={styles.hiddenInput}
          maxLength={4}
        />
      </View>
    </View>
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
  boxes: { marginTop: 30, flexDirection: 'row', gap: 14, justifyContent: 'center' },
  box: {
    width: 58, height: 68, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  boxActive: { borderWidth: 2, borderColor: colors.green },
  boxText: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  error: {
    marginTop: 16, textAlign: 'center', fontFamily: fonts.semibold,
    fontSize: 14, color: colors.red,
  },
  resendText: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.muted },
  resendLink: { fontFamily: fonts.bold, color: colors.green },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
