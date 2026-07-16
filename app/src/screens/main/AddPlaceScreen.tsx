import * as Location from 'expo-location';
import React, { useRef, useState } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrosshairIcon, SearchIcon } from '../../components/icons';
import { BackButton, PrimaryButton } from '../../components/ui';
import { useActiveChild, useT } from '../../store';
import { colors, fonts } from '../../theme';
import Svg, { Circle, Path } from 'react-native-svg';

function BigPin() {
  return (
    <Svg width={38} height={46} viewBox="0 0 38 46" fill="none">
      <Path d="M19 46s15-13.5 15-27A15 15 0 1 0 4 19c0 13.5 15 27 15 27Z" fill={colors.green} />
      <Circle cx={19} cy={19} r={6} fill="#fff" />
    </Svg>
  );
}

export default function AddPlaceScreen({ navigation }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const child = useActiveChild();
  const [query, setQuery] = useState('');
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    try {
      const results = await Location.geocodeAsync(query.trim());
      if (results[0]) {
        mapRef.current?.animateToRegion(
          {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }
    } catch {
      // Geocoding unavailable — user can still position the map by hand.
    }
  };

  const useCurrent = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (pos) {
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    }
  };

  const confirm = () => {
    const r = regionRef.current;
    const center = r
      ? { latitude: r.latitude, longitude: r.longitude }
      : (child?.position ?? { latitude: 4.09, longitude: 9.74 });
    navigation.navigate('AddPlaceConfig', { center, suggestedName: query.trim() });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t.findPlace}</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder={t.searchPlace}
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      </View>
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: child?.position.latitude ?? 4.09,
            longitude: child?.position.longitude ?? 9.74,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          onRegionChangeComplete={(r) => {
            regionRef.current = r;
          }}
        />
        <View style={styles.centerPin} pointerEvents="none">
          <BigPin />
        </View>
      </View>
      <View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 14) + 6 }}>
        <Pressable onPress={useCurrent} style={styles.currentBtn}>
          <CrosshairIcon />
          <Text style={styles.currentText}>{t.useCurrent}</Text>
        </Pressable>
        <PrimaryButton title={t.confirmSpot} onPress={confirm} />
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 15, paddingVertical: 3,
  },
  searchInput: {
    flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 11,
  },
  mapCard: {
    flex: 1, marginTop: 16, marginHorizontal: 20, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  centerPin: {
    position: 'absolute', top: '50%', left: '50%', marginLeft: -19, marginTop: -46,
  },
  currentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.greenSoft, borderRadius: 14, paddingVertical: 14, marginBottom: 12,
  },
  currentText: { fontFamily: fonts.bold, fontSize: 15, color: colors.greenDark },
});
