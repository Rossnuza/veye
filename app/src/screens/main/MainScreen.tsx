import React, { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { BottomNav, type Tab } from '../../components/BottomNav';
import { useStore } from '../../store';
import { colors } from '../../theme';
import HistoryScreen from './HistoryScreen';
import HomeScreen from './HomeScreen';
import SettingsScreen from './SettingsScreen';
import ZonesScreen from './ZonesScreen';

export default function MainScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('home');
  const zones = useStore((s) => s.zones);
  const children = useStore((s) => s.children);
  const refreshChildren = useStore((s) => s.refreshChildren);

  useEffect(() => {
    void refreshChildren();
  }, [refreshChildren]);

  // Android back button: return to the Home tab before leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab]);

  const anyOffline = children.some((c) => c.status === 'off');
  const zoneCount = zones.filter((z) => z.on).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' ? <HomeScreen /> : null}
        {tab === 'history' ? <HistoryScreen /> : null}
        {tab === 'zones' ? <ZonesScreen navigation={navigation} /> : null}
        {tab === 'settings' ? <SettingsScreen navigation={navigation} /> : null}
      </View>
      <BottomNav active={tab} onChange={setTab} zoneCount={zoneCount} anyOffline={anyOffline} />
    </View>
  );
}
