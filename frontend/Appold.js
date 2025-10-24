import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import config from './config';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const CustomSplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image
      // Asegúrate que esta ruta es correcta en tu proyecto
      source={require('./assets/splash_ferroviaria.png')}
      style={styles.splashImage}
      resizeMode="contain"
    />
    {/* // <-- NUEVO: Aplicar fuente personalizada al splash --> */}
    <Text style={[styles.splashText, { fontFamily: 'railway' }]}>Guía Ferroviaria</Text>
    <Text style={[styles.splashSubtext, { fontFamily: 'industrial' }]}>Descubre la historia del ferrocarril</Text>
  </View>
);

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
      // --- CAMBIO: Ocultar cabecera ---
      headerShown: false,
       // Aplicar fuente a las etiquetas del tab (si es visible y deseado)
       tabBarLabelStyle: {
         fontFamily: 'industrial', // O 'railway'
       },
    })}
  >
    {/* // <-- CAMBIO: Opciones de cabecera eliminadas de las pantallas Tab --> */}
    <Tab.Screen name="Inicio" component={HomeScreen} />
    <Tab.Screen name="Cámara" component={CameraScreen} />
    <Tab.Screen name="Ajustes" component={SettingsScreen} />
  </Tab.Navigator>
);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          // Asegúrate que estas rutas son correctas
          'railway': require('./assets/fonts/Railway.ttf'),
          'industrial': require('./assets/fonts/Industrial.ttf'),
        });
        setFontsLoaded(true); // <-- MOVIDO: Marcar fuentes como cargadas solo si tiene éxito
      } catch (e) {
        console.warn('Error loading fonts:', e);
         setFontsLoaded(true); // Marcar como cargado incluso si falla para no bloquear la app
      } finally {
        // Ya no se necesita hideAsync aquí si lo hacemos después del timeout
        // await SplashScreen.hideAsync().catch(() => {});
      }
    };
    prepare();
  }, []);

  useEffect(() => {
    // Ocultar splash después de cargar fuentes Y un pequeño delay
    if (fontsLoaded) {
        AsyncStorage.getItem('alreadyLaunched').then(value => {
            if (value === null) {
            AsyncStorage.setItem('alreadyLaunched', 'true');
            }
            // Ocultar splash después de un timeout corto O inmediatamente si ya lanzó antes
            const delay = value === null ? 2000 : 500; // Menos delay si ya se vio el splash
            setTimeout(async () => {
                await SplashScreen.hideAsync().catch(() => {});
                setIsLoading(false);
            }, delay);
        });
    }
  }, [fontsLoaded]); // <-- Ejecutar cuando fontsLoaded cambie

  // Mostrar splash personalizado mientras isLoading o las fuentes no estén listas
  if (isLoading || !fontsLoaded) return <CustomSplashScreen />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* // <-- CAMBIO: screenOptions ya aplicaba headerShown: false --> */}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          {/* // <-- CAMBIO: Opciones de cabecera eliminadas de ResultScreen --> */}
          <Stack.Screen name="Result" component={ResultScreen}/>
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
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
    width: '80%',
    height: 200,
    marginBottom: 30,
  },
  splashText: {
    fontSize: 28,
    // fontWeight: 'bold', // La fuente 'railway' puede tener su propio peso
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  splashSubtext: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    // fontFamily: 'industrial', // Aplicado directamente en el componente
  },
});