import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanFrameIcon } from '../../components/icons';
import { BackButton, PrimaryButton } from '../../components/ui';
import { isDemo } from '../../data';
import { useStore, useT } from '../../store';
import { colors, fonts } from '../../theme';

export default function PairScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const pairChild = useStore((s) => s.pairChild);
  const [permission, requestPermission] = useCameraPermissions();
  const [pairCode, setPairCode] = useState('');
  const [childName, setChildName] = useState('');
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);
  const codeInputRef = useRef<TextInput>(null);

  const ready = childName.trim().length > 0 && pairCode.length === 6 && !busy;

  const onScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    const m = data.match(/\d{6}/);
    if (m) {
      scannedRef.current = true;
      setPairCode(m[0]);
      setTimeout(() => (scannedRef.current = false), 3000);
    }
  };

  const link = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const child = await pairChild(pairCode, childName.trim());
      navigation.navigate('Success', { childId: child.id, childName: child.name });
    } catch {
      Alert.alert('', t.pairFail, [{ text: t.tryAgain }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 14, paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ marginTop: 18 }}>
          <Text style={styles.title}>{t.pairTitle}</Text>
          <Text style={styles.sub}>{t.pairSub}</Text>
        </View>

        <View style={styles.scanner}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onScanned}
            />
          ) : (
            <Pressable style={styles.cameraOff} onPress={() => requestPermission()}>
              <Text style={styles.cameraOffText}>{t.allowCamera}</Text>
            </Pressable>
          )}
          <View style={styles.scanLine} pointerEvents="none" />
          <View style={styles.scanBorder} pointerEvents="none" />
        </View>

        {isDemo ? (
          <Pressable
            style={styles.simulate}
            onPress={() => setPairCode(String(Math.floor(100000 + Math.random() * 899999)))}
          >
            <ScanFrameIcon />
            <Text style={styles.simulateText}>Simulate scan</Text>
          </Pressable>
        ) : null}

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>{t.orType}</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable style={styles.boxes} onPress={() => codeInputRef.current?.focus()}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.box, pairCode.length === i && styles.boxActive]}>
              <Text style={styles.boxText}>{pairCode[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={codeInputRef}
          value={pairCode}
          onChangeText={(v) => setPairCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
        />

        <View style={{ marginTop: 24 }}>
          <Text style={styles.label}>{t.childNameLabel}</Text>
          <TextInput
            value={childName}
            onChangeText={setChildName}
            placeholder={t.childNamePlaceholder}
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        </View>

        <PrimaryButton title={t.linkTracker} disabled={!ready} onPress={link} style={{ marginTop: 18 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display, fontSize: 27, lineHeight: 31, letterSpacing: -0.5,
    color: colors.ink, marginBottom: 8,
  },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  scanner: {
    marginTop: 22, alignSelf: 'center', width: 200, height: 200, borderRadius: 24,
    backgroundColor: colors.ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  cameraOff: { alignItems: 'center', justifyContent: 'center', flex: 1, alignSelf: 'stretch' },
  cameraOffText: {
    fontFamily: fonts.semibold, color: 'rgba(255,255,255,0.85)', fontSize: 14,
    textAlign: 'center', paddingHorizontal: 20,
  },
  scanLine: {
    position: 'absolute', left: 14, right: 14, height: 3, top: '50%',
    backgroundColor: colors.green,
    shadowColor: colors.green, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  scanBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24,
    borderWidth: 3, borderColor: 'rgba(27,138,94,0.5)',
  },
  simulate: {
    marginTop: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenSoft, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999,
  },
  simulateText: { fontFamily: fonts.bold, fontSize: 15, color: colors.greenDark },
  orRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  boxes: { marginTop: 16, flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 42, height: 54, borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  boxActive: { borderWidth: 2, borderColor: colors.green },
  boxText: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16, fontFamily: fonts.semibold, fontSize: 18, color: colors.ink,
  },
});
