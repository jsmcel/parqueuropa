import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { TenantProvider } from './core/shared/context/TenantContext.js';
import { TriggerModeProvider } from './core/shared/context/TriggerModeContext.js';
import { PlaybackProvider } from './core/shared/context/PlaybackContext.js';
import { setApiConfig } from './core/shared/services/apiService.js';
import {
  getTenantDescriptor,
  detectTenantId,
  DEFAULT_TENANT_ID,
} from './tenants/index.js';

import Type1HomeScreen from './core/type1/screens/HomeScreen.js';
import Type1CameraScreen from './core/type1/screens/CameraScreen.js';
import Type2HomeScreen from './core/type2/screens/HomeScreen.js';
import GpsMapScreen from './core/type2/screens/GpsMapScreen.js';
import ResultScreen from './core/shared/screens/ResultScreen.js';
import SettingsScreen from './core/shared/screens/SettingsScreen.js';
import SuggestionScreen from './core/shared/screens/SuggestionScreen.js';

SplashScreen.preventAutoHideAsync().catch(() => {});

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const CameraStackNav = createStackNavigator();

const CameraStack = () => (
  <CameraStackNav.Navigator screenOptions={{ headerShown: false }}>
    <CameraStackNav.Screen name="CameraCapture" component={Type1CameraScreen} />
  </CameraStackNav.Navigator>
);

const getInitialTenant = () => {
  const explicitTenant =
    process.env.EXPO_PUBLIC_TENANT_ID ||
    process.env.EXPO_PUBLIC_TENANT ||
    undefined;

  const hasBrowserLocation =
    typeof window !== 'undefined' &&
    typeof window.location === 'object' &&
    window.location !== null;

  const hostname = hasBrowserLocation ? window.location.hostname : undefined;
  const searchString = hasBrowserLocation ? window.location.search : undefined;

  const tenantId = detectTenantId({
    explicitTenantId: explicitTenant,
    hostname,
    searchString,
  });

  return getTenantDescriptor(tenantId ?? DEFAULT_TENANT_ID);
};

const CustomSplashScreen = ({ config }) => {
  const colors = config?.COLORS || {};
  const splashImage =
    config?.ASSETS?.splashImage ||
    config?.ASSETS?.splashLogo ||
    config?.ASSETS?.heroBanner;

  return (
    <View style={[styles.splashContainer, { backgroundColor: colors.PRIMARY || '#0c2340' }]}>
      {splashImage ? (
        <Image source={splashImage} style={styles.splashImage} resizeMode="contain" />
      ) : null}
      <Text style={[styles.splashText, { fontFamily: 'railway' }]}>
        {config?.APP_NAME || 'Audio Guide'}
      </Text>
      <Text style={[styles.splashSubtext, { fontFamily: 'industrial' }]}>
        {config?.SPLASH_SUBTITLE || 'Preparando la experiencia'}
      </Text>
    </View>
  );
};

const MainTabs = ({ tenant }) => {
  const isType1 = tenant.type === 'type1';
  const colors = tenant.config.COLORS || {};

  const screenOptions = ({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName = 'home-outline';
      if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
      else if (route.name === 'Camara') iconName = focused ? 'camera' : 'camera-outline';
      else if (route.name === 'Mapa') iconName = focused ? 'map' : 'map-outline';
      else if (route.name === 'Ajustes') iconName = focused ? 'settings' : 'settings-outline';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: colors.PRIMARY || '#1a3c6e',
    tabBarInactiveTintColor: '#8c8c8c',
    headerShown: false,
    tabBarLabelStyle: {
      fontFamily: 'industrial',
    },
  });

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Inicio" component={isType1 ? Type1HomeScreen : Type2HomeScreen} />
      {isType1 ? (
        <Tab.Screen
          name="Camara"
          component={CameraStack}
          options={{ title: 'Cámara' }}
        />
      ) : (
        <Tab.Screen
          name="Mapa"
          component={GpsMapScreen}
          options={{ title: 'Mapa' }}
        />
      )}
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const getStatusBarStyle = (hexColor) => {
  if (!hexColor) return 'auto';
  const color = hexColor.replace('#', '');
  const fullHex = color.length === 3
    ? color.split('').map((c) => c + c).join('')
    : color.padEnd(6, 'f');

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.6 ? 'light' : 'dark';
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  const tenantDescriptor = useMemo(() => getInitialTenant(), []);
  const colors = tenantDescriptor.config.COLORS || {};

  useEffect(() => {
    setApiConfig({
      config: tenantDescriptor.config,
      tenantId: tenantDescriptor.id,
      // Use APP_API_URL when running native shells (hostname unavailable)
      explicitApiUrl: tenantDescriptor.config.APP_API_URL,
    });
  }, [tenantDescriptor]);

  useEffect(() => {
    const prepare = async () => {
      try {
        const defaultFonts = {
          railway: require('./core/shared/assets/fonts/Railway.ttf'),
          industrial: require('./core/shared/assets/fonts/Industrial.ttf'),
        };

        const tenantFonts =
          tenantDescriptor?.config?.FONT_FILES ||
          Object.fromEntries(
            Object.entries(tenantDescriptor?.config?.FONTS || {}).filter(
              ([, value]) => typeof value !== 'string'
            )
          );

        await Font.loadAsync({
          ...defaultFonts,
          ...tenantFonts,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Error loading fonts:', error);
        setFontsLoaded(true);
      }
    };
    prepare();
  }, [tenantDescriptor]);

  useEffect(() => {
    if (!fontsLoaded) return;

    AsyncStorage.getItem('alreadyLaunched').then((value) => {
      const delay = value === null ? 2000 : 500;
      setTimeout(async () => {
        if (value === null) {
          await AsyncStorage.setItem('alreadyLaunched', 'true');
        }
        await SplashScreen.hideAsync().catch(() => {});
        setSplashFinished(true);
      }, delay);
    });
  }, [fontsLoaded]);

  const shouldRenderApp = fontsLoaded && splashFinished;

  if (!shouldRenderApp) {
    return <CustomSplashScreen config={tenantDescriptor.config} />;
  }

  return (
    <TenantProvider value={tenantDescriptor}>
      <TriggerModeProvider>
        <PlaybackProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="MainTabs">
                  {(props) => <MainTabs {...props} tenant={tenantDescriptor} />}
                </RootStack.Screen>
                <RootStack.Screen name="ResultScreen" component={ResultScreen} />
                <RootStack.Screen
                  name="SuggestionScreen"
                  component={SuggestionScreen}
                  options={{ headerShown: true, title: 'Seleccionar identificacion' }}
                />
              </RootStack.Navigator>
            </NavigationContainer>
            <StatusBar style={getStatusBarStyle(colors.PRIMARY)} />
          </SafeAreaProvider>
        </PlaybackProvider>
      </TriggerModeProvider>
    </TenantProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  splashImage: {
    width: '75%',
    height: 220,
    marginBottom: 24,
  },
  splashText: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  splashSubtext: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
