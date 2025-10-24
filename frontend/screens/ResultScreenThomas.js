import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  SafeAreaView,
  BackHandler,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Divider } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import config from '../configThomas.js';
import AudioPlayerThomas from '../components/AudioPlayerThomas';
import { getAudioFileUrl } from '../services/apiService.js';

const { width } = Dimensions.get('window');
const placeholderLarge = require('../assets/placeholder_large.png');
const MAX_HISTORY_ITEMS = 15;

const ResultScreenThomas = ({ route, navigation }) => {
  const { recognitionResult, imageUri: routeImageUri, audioMode: initialAudioMode } = route.params || {};
  const { pieceName, confidence, userSelected } = recognitionResult || {};

  const [displayImageUri, setDisplayImageUri] = useState(routeImageUri || null);
  const [selectedMode, setSelectedMode] = useState(initialAudioMode || 'thomas');
  const [audioUrl, setAudioUrl] = useState('');
  const [autoPlayPref, setAutoPlayPref] = useState(true);
  const [audioError, setAudioError] = useState(null);
  
  // Animaciones para el modo Thomas
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  
  // Ref para el AudioPlayer
  const audioPlayerRef = useRef(null);

  // --- Animaciones de entrada ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // --- Animación de rebote para el botón Thomas ---
  const animateBounce = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  // --- Detener audio cuando se presiona el botón de retroceso ---
  useEffect(() => {
    const backAction = async () => {
      if (audioPlayerRef.current) {
        console.log("ResultScreenThomas: Back button pressed, stopping audio");
        await audioPlayerRef.current.stop();
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // --- Detener audio cuando la pantalla pierde el foco ---
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (audioPlayerRef.current) {
          console.log("ResultScreenThomas: Screen losing focus, stopping audio");
          audioPlayerRef.current.stop();
        }
      };
    }, [])
  );

  // --- Cargar URI de Imagen ---
  useEffect(() => {
    if (routeImageUri) {
        setDisplayImageUri(routeImageUri);
    } else if (pieceName && !routeImageUri) {
        console.warn("ResultScreenThomas: No imageUri passed, potentially from history. Image might be missing.");
        setDisplayImageUri(null);
    }
  }, [routeImageUri, pieceName]);

  // --- Cargar Preferencias ---
  useEffect(() => {
    const loadPrefs = async () => {
      const savedAutoPlay = await AsyncStorage.getItem('autoPlayAudio');
      setAutoPlayPref(savedAutoPlay !== null ? savedAutoPlay === 'true' : true);
      if (!initialAudioMode) {
        const savedMode = await AsyncStorage.getItem('selectedAudioMode');
        setSelectedMode(savedMode || 'thomas');
      }
    };
    loadPrefs();
  }, [initialAudioMode]);

  // --- Construir URL de Audio (solo modo Thomas, sin fallback) ---
  useEffect(() => {
    if (pieceName) {
      const tenantId = config.TENANT_ID || 'default';
      const url = getAudioFileUrl(tenantId, pieceName, 'THOMAS');
      if (url) {
        setAudioUrl(url);
        setAudioError(null);
        console.log(`ResultScreenThomas: Setting audio URL to ${url}`);
      } else {
        setAudioUrl('');
        setAudioError('No se pudo encontrar el audio Thomas.');
        console.warn("ResultScreenThomas: Failed to build audio URL for Thomas.");
      }
    } else {
      setAudioUrl('');
      console.warn("ResultScreenThomas: No pieceName available to build audio URL.");
    }
  }, [pieceName]);

  // --- Guardar en Historial ---
  useEffect(() => {
    const saveToHistory = async () => {
      if (pieceName && displayImageUri) {
        console.log(`ResultScreenThomas: Attempting to save '${pieceName}' to history.`);
        try {
          const currentHistoryString = await AsyncStorage.getItem('recognitionHistory');
          let history = currentHistoryString ? JSON.parse(currentHistoryString) : [];
          const newEntry = {
            pieceName: pieceName,
            imageUri: displayImageUri,
            timestamp: Date.now(),
          };
          const filteredHistory = history.filter(item => item.pieceName !== pieceName);
          const updatedHistory = [newEntry, ...filteredHistory];
          const limitedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
          await AsyncStorage.setItem('recognitionHistory', JSON.stringify(limitedHistory));
          console.log(`ResultScreenThomas: Saved '${pieceName}'. History size: ${limitedHistory.length}`);
        } catch (error) {
          console.error('ResultScreenThomas: Error saving to history:', error);
        }
      } else {
         console.log("ResultScreenThomas: Skipping history save (missing pieceName or displayImageUri).");
      }
    };
    saveToHistory();
  }, [pieceName, displayImageUri]);

  // --- Handlers ---
  const handleModeChange = (mode) => {
    if (mode === selectedMode) return;
    animateBounce();
    setSelectedMode(mode);
  };

  const handleAudioError = useCallback((error) => {
      console.error("ResultScreenThomas: Received error from AudioPlayer:", error.message);
      if (!error.message?.includes('Network') && !error.message?.includes('interrupted')) {
          setAudioError(`¡Ups! Hubo un problema: ${error.message}`);
      } else if (error.message?.includes('Network')) {
          setAudioError("¡No se pudo conectar! Revisa tu internet.");
      } else {
          setAudioError(null);
      }
  }, []);

  const handleShare = async () => {
    if (!pieceName) return;
    try {
      await Share.share({
        message: `¡Descubrí la pieza "${pieceName}" en el Museo del Ferrocarril con Thomas & Friends! 🚂 #MuseoFerrocarril #ThomasAndFriends`,
        title: `🚂 Pieza: ${pieceName}`
      });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert("¡Ups!", "No se pudo compartir la información.");
    }
  };

  // --- Handler para volver a Inicio ---
  const handleGoHome = async () => {
      if (audioPlayerRef.current) {
          console.log("ResultScreenThomas: Stopping audio before navigating home");
          await audioPlayerRef.current.stop();
      }
      navigation.navigate('HomeThomas');
  };

  // --- Render ---
  if (!pieceName) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
              <Ionicons name="train" size={80} color={config.COLORS.PRIMARY} />
              <Text style={styles.errorTitle}>¡No se encontró información!</Text>
              <Text style={styles.errorText}>No se recibió un nombre de pieza válido. ¡Inténtalo de nuevo!</Text>
              <Button
                title="🚂 Volver"
                buttonStyle={styles.errorButton}
                titleStyle={styles.errorButtonTitle}
                onPress={() => navigation.goBack()}
              />
            </Animated.View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Imagen y Overlay con animación */}
        <Animated.View style={[styles.imageContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {displayImageUri ? (
              <Image
                 source={{ uri: displayImageUri }}
                 style={styles.pieceImage}
                 resizeMode="cover"
                 defaultSource={placeholderLarge}
              />
          ) : (
              <View style={styles.imagePlaceholder}>
                  <Ionicons name="train" size={100} color={config.COLORS.LIGHT_ACCENT} />
                  <Text style={styles.placeholderText}>🚂 ¡Aquí va la imagen!</Text>
              </View>
          )}
           <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.overlayButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           {confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceText}>🎯 {Math.round(confidence * 100)}%</Text>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{marginLeft: 4}}/>
              </View>
           )}
        </Animated.View>

        {/* Contenedor Principal de Información */}
        <Animated.View style={[styles.infoContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>🚂 {pieceName}</Text>
          {userSelected && (
            <Text style={styles.userSelectedText}>
              (¡Identificación seleccionada por ti!)
            </Text>
          )}
          <Divider style={styles.divider} color={config.COLORS.LIGHT_ACCENT}/>

          {/* Selector de modo con animación */}
          <View style={styles.audioModesContainer}>
            <Text style={styles.sectionTitle}>🎵 Modo de Audio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioModeSelector}
            >
              {(config.AUDIO_MODES || []).map(mode => (
                <Animated.View
                  key={mode.id}
                  style={{ transform: [{ scale: selectedMode === mode.id ? bounceAnim : 1 }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.audioModeOption,
                      selectedMode === mode.id && styles.audioModeSelected,
                      mode.isSpecial && styles.thomasModeOption
                    ]}
                    onPress={() => handleModeChange(mode.id)}
                  >
                    <Ionicons
                      name={mode.icon || 'musical-notes-outline'}
                      size={22}
                      color={selectedMode === mode.id ? '#fff' : config.COLORS.PRIMARY}
                    />
                    <Text
                      style={[
                        styles.audioModeText,
                        selectedMode === mode.id && styles.audioModeTextSelected
                      ]}
                    >
                      {mode.name}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* Componente AudioPlayer */}
          {audioUrl ? (
              <AudioPlayerThomas
                key={audioUrl}
                audioUrl={audioUrl}
                autoPlay={autoPlayPref}
                onError={handleAudioError}
                ref={audioPlayerRef}
              />
          ) : (
              <View style={styles.audioPlayerPlaceholder}>
                 <Ionicons name="musical-notes" size={40} color={config.COLORS.PRIMARY} />
                 <Text style={styles.audioPlayerPlaceholderText}>🎵 Buscando audio...</Text>
              </View>
          )}

          {/* Display Audio Error */}
          {audioError && (
              <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={20} color={config.COLORS.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
              </View>
          )}

          {/* Botón Volver a Inicio con estilo Thomas */}
          <Button
            title="🏠 Volver a Inicio"
            icon={<Ionicons name="home" size={22} color={config.COLORS.PRIMARY} style={{marginRight: 8}} />}
            onPress={handleGoHome}
            buttonStyle={styles.goHomeButton}
            titleStyle={styles.goHomeButtonTitle}
            containerStyle={styles.goHomeButtonContainer}
          />

        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// --- Estilos específicos para el modo Thomas ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND,
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    position: 'relative',
    backgroundColor: config.COLORS.LIGHT_ACCENT + '40',
    borderRadius: 20,
    margin: 10,
    overflow: 'hidden',
  },
  pieceImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: config.COLORS.LIGHT_ACCENT + '60',
  },
  placeholderText: {
    fontSize: 18,
    color: config.COLORS.PRIMARY,
    marginTop: 10,
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  imageOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  overlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    paddingTop: 15,
  },
  title: {
    fontSize: 32,
    color: config.COLORS.TEXT,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: config.COLORS.LIGHT_ACCENT + '80',
    height: 3,
    borderRadius: 2,
  },
  audioModesContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    color: config.COLORS.TEXT,
    marginBottom: 15,
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  audioModeSelector: {
    paddingVertical: 10,
  },
  audioModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: config.COLORS.PRIMARY + '90',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioModeSelected: {
    backgroundColor: config.COLORS.PRIMARY,
    borderColor: config.COLORS.PRIMARY,
    transform: [{ scale: 1.05 }],
  },
  thomasModeOption: {
    borderColor: config.COLORS.THOMAS_BLUE,
    backgroundColor: config.COLORS.THOMAS_BLUE + '10',
  },
  audioModeText: {
    fontSize: 16,
    color: config.COLORS.PRIMARY,
    marginLeft: 10,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  audioModeTextSelected: {
    color: '#fff',
  },
  audioPlayerPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: config.COLORS.LIGHT_ACCENT + '30',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
  },
  audioPlayerPlaceholderText: {
    fontFamily: 'industrial',
    color: config.COLORS.DARK_ACCENT,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },
  audioErrorContainer: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: config.COLORS.SECONDARY + '20',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  audioErrorText: {
    flex: 1,
    color: config.COLORS.SECONDARY,
    fontFamily: 'industrial',
    fontSize: 14,
    marginLeft: 8,
  },
  goHomeButtonContainer: {
    marginTop: 30,
    marginBottom: 10,
    alignItems: 'center',
  },
  goHomeButton: {
    backgroundColor: '#fff',
    borderColor: config.COLORS.PRIMARY,
    borderWidth: 2,
    borderRadius: 35,
    paddingVertical: 12,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  goHomeButtonTitle: {
    color: config.COLORS.PRIMARY,
    fontFamily: 'railway',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: config.COLORS.BACKGROUND,
  },
  errorTitle: {
    fontSize: 26,
    color: config.COLORS.TEXT,
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: config.COLORS.DARK_ACCENT,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'industrial',
    lineHeight: 25,
  },
  errorButton: {
    backgroundColor: config.COLORS.PRIMARY,
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 35,
  },
  errorButtonTitle: {
    fontFamily: 'railway',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userSelectedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: config.COLORS.DARK_ACCENT,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 12,
    fontFamily: 'industrial',
  },
});

export default ResultScreenThomas; 