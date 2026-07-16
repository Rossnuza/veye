import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, PrimaryButton } from '../../components/ui';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function NameScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const setName = useStore((s) => s.setName);
  const [value, setValue] = useState('');
  const ready = value.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 24, flex: 1 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ marginTop: 22 }}>
          <Text style={styles.step}>{t.step3}</Text>
          <Text style={styles.title}>{t.nameTitle}</Text>
          <Text style={styles.sub}>{t.nameSub}</Text>
        </View>
        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          placeholder={t.namePlaceholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          returnKeyType="done"
        />
        <View style={{ flex: 1 }} />
        <PrimaryButton
          title={t.continue}
          disabled={!ready}
          onPress={async () => {
            await setName(value.trim());
            navigation.navigate('Pair');
          }}
          style={{ marginBottom: Math.max(insets.bottom, 16) + 8 }}
        />
      </View>
    </KeyboardAvoidingView>
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
  input: {
    marginTop: 26, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, padding: 18, fontFamily: fonts.semibold, fontSize: 19, color: colors.ink,
  },
});
