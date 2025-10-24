import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import HomeScreenThomas from './screens/HomeScreenThomas';
import CameraScreenThomas from './screens/CameraScreenThomas';
import ResultScreenThomas from './screens/ResultScreenThomas';
import SettingsScreenThomas from './screens/SettingsScreen';
import config from './configThomas.js';

const RootStack = createStackNavigator();

const CustomSplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image
      source={require('./assets/categories/thomas.png')}
      style={styles.splashImage}
      resizeMode="contain"
    />
    <Text style={[styles.splashText, { fontFamily: 'railway' }]}>Thomas & Friends</Text>
    <Text style={[styles.splashSubtext, { fontFamily: 'industrial' }]}>¡Explora el museo con Thomas!</Text>
  </View>
);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AppThomas() {
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          'railway': require('./assets/fonts/Railway.ttf'),
          'industrial': require('./assets/fonts/Industrial.ttf'),
        });
        setFontsLoaded(true);
      } catch (e) {
        setFontsLoaded(true);
      }
    };
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
        AsyncStorage.getItem('alreadyLaunchedThomas').then(value => {
            const delay = value === null ? 2000 : 500;
            setTimeout(async () => {
                if (value === null) {
                   await AsyncStorage.setItem('alreadyLaunchedThomas', 'true');
                }
                await SplashScreen.hideAsync().catch(() => {});
                setIsLoading(false);
            }, delay);
        });
    }
  }, [fontsLoaded]);

  if (isLoading || !fontsLoaded) return <CustomSplashScreen />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="HomeThomas" component={HomeScreenThomas} />
          <RootStack.Screen name="CameraThomas" component={CameraScreenThomas} />
          <RootStack.Screen name="ResultThomas" component={ResultScreenThomas} />
          <RootStack.Screen name="SettingsThomas" component={SettingsScreenThomas} />
        </RootStack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: config.COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  splashImage: {
    width: 120,
    height: 120,
    marginBottom: 30,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: config.COLORS.PRIMARY,
  },
  splashText: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  splashSubtext: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
}); 