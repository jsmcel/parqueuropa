import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import config from '../configThomas.js';

const thomasIcon = require('../assets/categories/thomas.png');

const HomeScreenThomas = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={thomasIcon} style={styles.thomasImage} />
        <Text style={styles.title}>¡Bienvenido al mundo de Thomas!</Text>
        <Text style={styles.subtitle}>Descubre los trenes del museo con Thomas y sus amigos.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CameraThomas')}
        >
          <Text style={styles.buttonText}>🚂 ¡Empezar a explorar!</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('SettingsThomas')}
        >
          <Text style={styles.settingsButtonText}>⚙️ Ajustes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  thomasImage: {
    width: 120,
    height: 120,
    marginBottom: 30,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: config.COLORS.PRIMARY,
  },
  title: {
    fontSize: 28,
    color: config.COLORS.PRIMARY,
    fontFamily: 'railway',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: config.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'railway',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  settingsButton: {
    backgroundColor: config.COLORS.LIGHT_ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: config.COLORS.PRIMARY,
    fontSize: 16,
    fontFamily: 'industrial',
    textAlign: 'center',
  },
});

export default HomeScreenThomas; 