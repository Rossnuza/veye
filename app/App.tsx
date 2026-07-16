import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { dataSource, isDemo } from './src/data';
import { DemoSource } from './src/data/demo';
import { useStore } from './src/store';
import { colors } from './src/theme';

import AddGuardianScreen from './src/screens/main/AddGuardianScreen';
import AddPlaceConfigScreen from './src/screens/main/AddPlaceConfigScreen';
import AddPlaceScreen from './src/screens/main/AddPlaceScreen';
import ChildDetailScreen from './src/screens/main/ChildDetailScreen';
import GuardiansScreen from './src/screens/main/GuardiansScreen';
import MainScreen from './src/screens/main/MainScreen';
import CodeScreen from './src/screens/onboarding/CodeScreen';
import NameScreen from './src/screens/onboarding/NameScreen';
import PairScreen from './src/screens/onboarding/PairScreen';
import PhoneScreen from './src/screens/onboarding/PhoneScreen';
import SuccessScreen from './src/screens/onboarding/SuccessScreen';
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const onboarded = useStore((s) => s.onboarded);
  const [hydrated, setHydrated] = React.useState(useStore.persist.hasHydrated());

  // Wait for the persisted store, then (in demo mode) re-seed the simulation
  // from it so the paired children survive an app restart.
  useEffect(() => {
    const finish = () => {
      if (isDemo) {
        const s = useStore.getState();
        (dataSource as DemoSource).hydrate(s.children, s.zones, s.guardians, s.name, s.phone);
      }
      setHydrated(true);
    };
    if (useStore.persist.hasHydrated()) {
      finish();
      return;
    }
    const unsub = useStore.persist.onFinishHydration(finish);
    return unsub;
  }, []);

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
          initialRouteName={onboarded ? 'Main' : 'Welcome'}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Phone" component={PhoneScreen} />
          <Stack.Screen name="Code" component={CodeScreen} />
          <Stack.Screen name="Name" component={NameScreen} />
          <Stack.Screen name="Pair" component={PairScreen} />
          <Stack.Screen name="Success" component={SuccessScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Main" component={MainScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="AddPlace" component={AddPlaceScreen} />
          <Stack.Screen name="AddPlaceConfig" component={AddPlaceConfigScreen} />
          <Stack.Screen name="ChildDetail" component={ChildDetailScreen} />
          <Stack.Screen name="Guardians" component={GuardiansScreen} />
          <Stack.Screen name="AddGuardian" component={AddGuardianScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
