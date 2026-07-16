import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dataSource } from '../../data';
import { clockTime, durationText, historyLabel, regionFor } from '../../lib/format';
import { useActiveChild, useT } from '../../store';
import { colors, fonts } from '../../theme';
import type { DayHistory } from '../../types';

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function HistoryScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const child = useActiveChild();
  const [selected, setSelected] = useState(isoDaysAgo(0));
  const [history, setHistory] = useState<DayHistory | null>(null);
  const [activeStop, setActiveStop] = useState(0);
  const mapRef = useRef<MapView>(null);
  const chipsScrolled = useRef(false);

  const days = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const iso = isoDaysAgo(29 - i);
        const d = new Date(`${iso}T12:00:00`);
        const dows = t.navHome === 'Accueil' ? DOW_FR : DOW_EN;
        return { iso, dow: i === 29 ? t.today : dows[d.getDay()], day: String(d.getDate()) };
      }),
    [t],
  );

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setHistory(null);
    dataSource.getHistory(child.id, selected).then((h) => {
      if (!alive) return;
      setHistory(h);
      setActiveStop(h.entries.length > 1 ? 1 : 0);
      if (h.entries.length > 0) {
        mapRef.current?.animateToRegion(regionFor(h.entries.map((e) => e.position)), 400);
      }
    });
    return () => {
      alive = false;
    };
  }, [child?.id, selected]);

  const entries = history?.entries ?? [];

  const focusStop = (i: number) => {
    setActiveStop(i);
    const e = entries[i];
    if (e) {
      mapRef.current?.animateToRegion(
        { ...e.position, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        350,
      );
    }
  };

  if (!child) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={styles.title}>{t.journey(child.name)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginTop: 14 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 9 }}
          ref={(r) => {
            if (r && !chipsScrolled.current) {
              chipsScrolled.current = true;
              setTimeout(() => r.scrollToEnd({ animated: false }), 0);
            }
          }}
        >
          {days.map((d) => {
            const sel = d.iso === selected;
            return (
              <Pressable
                key={d.iso}
                onPress={() => setSelected(d.iso)}
                style={[styles.dateChip, sel && { backgroundColor: colors.green }]}
              >
                <Text style={[styles.dateDow, sel && { color: 'rgba(255,255,255,0.75)' }]}>{d.dow}</Text>
                <Text style={[styles.dateDay, sel && { color: '#fff' }]}>{d.day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            ...child.position,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          {entries.length > 1 ? (
            <Polyline
              coordinates={entries.map((e) => e.position)}
              strokeColor={colors.green}
              strokeWidth={4}
              lineDashPattern={[2, 9]}
            />
          ) : null}
          {entries.map((e, i) => (
            <Marker key={e.id} coordinate={e.position} anchor={{ x: 0.5, y: 0.5 }} onPress={() => focusStop(i)}>
              <View
                style={[
                  styles.node,
                  i === activeStop && styles.nodeActive,
                ]}
              />
            </Marker>
          ))}
        </MapView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}
      >
        {entries.length === 0 ? (
          <Text style={styles.empty}>{history ? t.noHistory : ' '}</Text>
        ) : (
          entries.map((e, i) => {
            const active = i === activeStop;
            return (
              <Pressable
                key={e.id}
                onPress={() => focusStop(i)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.dot, active && styles.dotActive]} />
                  {i < entries.length - 1 ? <View style={styles.lineDown} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <View style={styles.rowHead}>
                    <Text style={styles.place}>{historyLabel(t, e.label)}</Text>
                    <Text style={styles.time}>{clockTime(e.time)}</Text>
                  </View>
                  {e.durationMin ? (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {t.atFor(
                          e.durationPlace === 'school' ? t.placeSchool : e.durationPlace === 'market' ? t.placeMarket : (e.durationPlace ?? ''),
                          durationText(e.durationMin),
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  dateChip: {
    width: 60, paddingVertical: 9, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateDow: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  dateDay: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 1 },
  mapCard: {
    height: 230, marginHorizontal: 20, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  node: {
    width: 15, height: 15, borderRadius: 8, backgroundColor: colors.green,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  nodeActive: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.amber },
  empty: {
    fontFamily: fonts.regular, fontSize: 14.5, color: colors.faint,
    textAlign: 'center', marginTop: 28, paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', gap: 14, paddingRight: 14, borderRadius: 14, marginBottom: 2 },
  rowActive: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green, marginTop: 3,
  },
  dotActive: { backgroundColor: colors.amber },
  lineDown: { width: 2, flex: 1, minHeight: 26, backgroundColor: colors.line, marginTop: 2 },
  rowHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
  },
  place: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  time: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.faint },
  durationBadge: {
    alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.divider,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
  },
  durationText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
});
