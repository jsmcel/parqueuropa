import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
// Importar CardStyleInterpolators para animaciones opcionales
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import SettingsScreen from './screens/SettingsScreen';
import SuggestionScreen from './screens/SuggestionScreen'; // Add this import
import config from './config.js';

// Stacks
const RootStack = createStackNavigator(); // Stack principal
const Tab = createBottomTabNavigator();
const CameraStackNav = createStackNavigator(); // Stack solo para el flujo de cámara

// Componente SplashScreen (sin cambios)
const CustomSplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image
      source={require('./assets/splash_ferroviaria.png')}
      style={styles.splashImage}
      resizeMode="contain"
    />
    <Text style={[styles.splashText, { fontFamily: 'railway' }]}>Guía Ferroviaria</Text>
    <Text style={[styles.splashSubtext, { fontFamily: 'industrial' }]}>Descubre la historia del ferrocarril</Text>
  </View>
);

// Stack Navigator solo para la Cámara
// ResultScreen ya no está aquí, se movió al RootStack
const CameraStack = () => (
  <CameraStackNav.Navigator screenOptions={{ headerShown: false }}>
    <CameraStackNav.Screen name="CameraCapture" component={CameraScreen} />
  </CameraStackNav.Navigator>
);

// Bottom Tab Navigator (sin cambios funcionales importantes)
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Cámara') iconName = focused ? 'camera' : 'camera-outline';
        else if (route.name === 'Ajustes') iconName = focused ? 'settings' : 'settings-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: config.COLORS.PRIMARY,
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarLabelStyle: {
        fontFamily: 'industrial',
      },
    })}
  >
    <Tab.Screen name="Inicio" component={HomeScreen} />
    {/* La pestaña Cámara ahora solo lleva al stack de la cámara */}
    <Tab.Screen name="Cámara" component={CameraStack} />
    <Tab.Screen name="Ajustes" component={SettingsScreen} />
  </Tab.Navigator>
);

// Lógica de carga de fuentes y splash (sin cambios)
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
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
        console.warn('Error loading fonts:', e);
        setFontsLoaded(true);
      }
    };
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
        AsyncStorage.getItem('alreadyLaunched').then(value => {
            const delay = value === null ? 2000 : 500;
            setTimeout(async () => {
                if (value === null) {
                   await AsyncStorage.setItem('alreadyLaunched', 'true');
                }
                await SplashScreen.hideAsync().catch(() => {});
                setIsLoading(false);
            }, delay);
        });
    }
  }, [fontsLoaded]);

  if (isLoading || !fontsLoaded) return <CustomSplashScreen />;

  // Navegador Raíz (Root Navigator)
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* Stack principal que contiene Tabs y ResultScreen */}
        <RootStack.Navigator
           screenOptions={{
               headerShown: false, // Ocultar cabecera globalmente
           }}
        >
          {/* Pantalla principal es el conjunto de Tabs */}
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          {/* Pantalla Result está al mismo nivel que las Tabs */}
          <RootStack.Screen
            name="ResultScreen"
            component={ResultScreen}
            options={{
              // Opcional: Animación modal si se desea
              // presentation: 'modal',
              // cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            }}
          />
          {/* Pantalla SuggestionScreen está al mismo nivel que las Tabs y Result */}
          <RootStack.Screen
            name="SuggestionScreen" // Or a more descriptive name like "SelectSuggestion"
            component={SuggestionScreen}
            options={{
              headerShown: true, // Or false, depending on desired UI
              title: 'Seleccionar Identificación', // Example title if header is shown
              // Optional: Add custom animations like for ResultScreen if desired
              // cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />{/* Ajusta el estilo de la barra de estado si es necesario */}
    </SafeAreaProvider>
  );
}

// Estilos (sin cambios)
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: config.COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  splashImage: {
    width: '80%',
    height: 200,
    marginBottom: 30,
  },
  splashText: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    // fontFamily: 'railway', // Aplicado inline
  },
  splashSubtext: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    // fontFamily: 'industrial', // Aplicado inline
  },
});
