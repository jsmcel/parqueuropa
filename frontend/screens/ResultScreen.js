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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Divider } from 'react-native-elements'; // Button ya está importado
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import config from '../config.js';
import AudioPlayer from '../components/AudioPlayer'; // Importar componente
import { getAudioFileUrl } from '../services/apiService.js'; // Import the new service
import { responsiveStyles, combineResponsiveStyles } from '../styles/responsiveStyles.js';

// Función para comprimir imágenes en web para ahorrar espacio en localStorage
const compressImageForHistory = async (imageUri) => {
  if (Platform.OS !== 'web' || !imageUri) return imageUri;
  
  return new Promise((resolve) => {
    try {
      // Usar la sintaxis correcta para React Native Web
      const img = document.createElement('img');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Redimensionar a un tamaño medio para el historial (300x300 máximo)
          const maxSize = 300;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir con calidad media para mejor visualización
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // Calidad media (70%)
          
          console.log(`Imagen comprimida: ${imageUri.length} -> ${compressedBase64.length} caracteres`);
          resolve(compressedBase64);
        } catch (canvasError) {
          console.warn('Error in canvas operations:', canvasError);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('Error loading image for compression');
        resolve(null);
      };
      img.src = imageUri;
    } catch (error) {
      console.warn('Error creating image element:', error);
      resolve(null);
    }
  });
};

const { width } = Dimensions.get('window');
const placeholderLarge = require('../assets/placeholder_large.png');
const MAX_HISTORY_ITEMS = 15;

const ResultScreen = ({ route, navigation }) => {
  const { recognitionResult, imageUri: routeImageUri, audioMode: initialAudioMode } = route.params || {};
  // Destructure userSelected along with pieceName and confidence
  const { pieceName, confidence, userSelected } = recognitionResult || {};

  const [displayImageUri, setDisplayImageUri] = useState(routeImageUri || null);
  const [selectedMode, setSelectedMode] = useState(initialAudioMode || 'normal');
  const [audioUrl, setAudioUrl] = useState('');
  const [autoPlayPref, setAutoPlayPref] = useState(true);
  const [audioError, setAudioError] = useState(null);
  
  // Ref para el AudioPlayer
  const audioPlayerRef = useRef(null);

  // --- Detener audio cuando se presiona el botón de retroceso ---
  useEffect(() => {
    const backAction = async () => {
      if (audioPlayerRef.current) {
        console.log("ResultScreen: Back button pressed, stopping audio");
        await audioPlayerRef.current.stop();
      }
      return false; // Permite que la navegación continúe normalmente
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  // --- Detener audio cuando la pantalla pierde el foco ---
  useFocusEffect(
    useCallback(() => {
      // Función que se ejecuta cuando la pantalla pierde el foco
      return () => {
        if (audioPlayerRef.current) {
          console.log("ResultScreen: Screen losing focus, stopping audio");
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
        console.warn("ResultScreen: No imageUri passed, potentially from history. Image might be missing.");
        setDisplayImageUri(null); // Considera buscar la URL o usar un placeholder mejor
    }
  }, [routeImageUri, pieceName]);

  // --- Cargar Preferencias ---
  useEffect(() => {
    const loadPrefs = async () => {
      const savedAutoPlay = await AsyncStorage.getItem('autoPlayAudio');
      setAutoPlayPref(savedAutoPlay !== null ? savedAutoPlay === 'true' : true);
      if (!initialAudioMode) {
        const savedMode = await AsyncStorage.getItem('selectedAudioMode');
        setSelectedMode(savedMode || 'normal');
      }
    };
    loadPrefs();
  }, [initialAudioMode]);

  // --- Construir URL de Audio ---
  useEffect(() => {
    if (pieceName) {
      const tenantId = config.TENANT_ID || 'default';
      // Use the new service function to construct the URL
      const url = getAudioFileUrl(tenantId, pieceName, selectedMode);
      if (url) {
        setAudioUrl(url);
        setAudioError(null);
        console.log(`ResultScreen: Setting audio URL to ${url}`);
      } else {
        setAudioUrl('');
        setAudioError('No se pudo construir la URL del audio. Faltan parámetros.');
        console.warn("ResultScreen: Failed to build audio URL using getAudioFileUrl. URL is null.");
      }
    } else {
      setAudioUrl('');
      console.warn("ResultScreen: No pieceName available to build audio URL.");
    }
  }, [pieceName, selectedMode]);

  // --- Guardar en Historial ---
  useEffect(() => {
    const saveToHistory = async () => {
      if (pieceName && displayImageUri) {
        console.log(`ResultScreen: Attempting to save '${pieceName}' to history.`);
        try {
          let history = [];
          
          if (Platform.OS === 'web') {
            // En web, usar localStorage directamente para mejor sincronización
            const currentHistoryString = localStorage.getItem('recognitionHistory');
            history = currentHistoryString ? JSON.parse(currentHistoryString) : [];
            console.log('ResultScreen: Loaded from localStorage:', history);
          } else {
            // En móvil, usar AsyncStorage
            const currentHistoryString = await AsyncStorage.getItem('recognitionHistory');
            history = currentHistoryString ? JSON.parse(currentHistoryString) : [];
          }
          
          // En web, comprimir la imagen antes de guardarla para ahorrar espacio
          let compressedImageUri = displayImageUri;
          if (Platform.OS === 'web' && displayImageUri) {
            try {
              // Comprimir imagen para historial (calidad muy baja para ahorrar espacio)
              compressedImageUri = await compressImageForHistory(displayImageUri);
            } catch (error) {
              console.warn('Error compressing image for history:', error);
              compressedImageUri = null; // Si falla la compresión, no guardar imagen
            }
          }
          
          const newEntry = {
            pieceName: pieceName,
            imageUri: Platform.OS === 'web' ? compressedImageUri : displayImageUri,
            timestamp: Date.now(),
          };
          
          const filteredHistory = history.filter(item => item.pieceName !== pieceName);
          const updatedHistory = [newEntry, ...filteredHistory];
          const limitedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
          
          if (Platform.OS === 'web') {
            // En web, guardar en localStorage y disparar evento
            localStorage.setItem('recognitionHistory', JSON.stringify(limitedHistory));
            console.log('ResultScreen: Saved to localStorage and dispatching event');
            
            // Disparar evento inmediatamente y también con delay para asegurar que llegue
            window.dispatchEvent(new CustomEvent('historyUpdated', {
              detail: { 
                history: limitedHistory,
                timestamp: Date.now(),
                message: 'Updated from ResultScreen useEffect'
              }
            }));
            console.log('ResultScreen: Dispatched historyUpdated event from useEffect');
            
            // También disparar un evento simple después de un delay
            setTimeout(() => {
              window.dispatchEvent(new Event('historyUpdated'));
              console.log('ResultScreen: Dispatched simple historyUpdated event after delay');
            }, 500);
          } else {
            // En móvil, usar AsyncStorage
            await AsyncStorage.setItem('recognitionHistory', JSON.stringify(limitedHistory));
          }
          
          console.log(`ResultScreen: Saved '${pieceName}'. History size: ${limitedHistory.length}`);
          console.log('ResultScreen: Full history after save:', limitedHistory);
        } catch (error) {
          console.error('ResultScreen: Error saving to history:', error);
        }
      } else {
         console.log("ResultScreen: Skipping history save (missing pieceName or displayImageUri).");
      }
    };
    saveToHistory();
  }, [pieceName, displayImageUri]);

  // --- Handlers ---
  const handleModeChange = (mode) => {
    if (mode === selectedMode) return;
    setSelectedMode(mode);
  };

  const handleAudioError = useCallback((error) => {
      console.error("ResultScreen: Received error from AudioPlayer:", error.message);
      if (!error.message?.includes('Network') && !error.message?.includes('interrupted')) {
          setAudioError(`Error: ${error.message}`);
      } else if (error.message?.includes('Network')) {
          setAudioError("No se pudo conectar para obtener el audio.");
      } else {
          setAudioError(null);
      }
  }, []);

  const handleShare = async () => {
    if (!pieceName) return;
    try {
      await Share.share({
        message: `¡Descubrí el monumento "${pieceName}" en el Parque Europa con la app Guía Parque Europa! #ParqueEuropa`,
        title: `Monumento: ${pieceName}`
      });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert("Error", "No se pudo compartir la información.");
    }
  };

  // --- NEW: Handler para volver a Inicio ---
  const handleGoHome = async () => {
      // Detener el audio antes de navegar
      if (audioPlayerRef.current) {
          console.log("ResultScreen: Stopping audio before navigating home");
          await audioPlayerRef.current.stop();
      }
      
      // Forzar actualización del historial antes de navegar
      if (pieceName && displayImageUri) {
        console.log(`ResultScreen: Force saving '${pieceName}' to history before going home`);
        try {
          let history = [];
          
          if (Platform.OS === 'web') {
            // En web, usar localStorage
            const currentHistoryString = localStorage.getItem('recognitionHistory');
            history = currentHistoryString ? JSON.parse(currentHistoryString) : [];
          } else {
            // En móvil, usar AsyncStorage
            const currentHistoryString = await AsyncStorage.getItem('recognitionHistory');
            history = currentHistoryString ? JSON.parse(currentHistoryString) : [];
          }
          
          // En web, comprimir la imagen antes de guardarla para ahorrar espacio
          let compressedImageUri = displayImageUri;
          if (Platform.OS === 'web' && displayImageUri) {
            try {
              // Comprimir imagen para historial (calidad muy baja para ahorrar espacio)
              compressedImageUri = await compressImageForHistory(displayImageUri);
            } catch (error) {
              console.warn('Error compressing image for history in handleGoHome:', error);
              compressedImageUri = null; // Si falla la compresión, no guardar imagen
            }
          }
          
          const newEntry = {
            pieceName: pieceName,
            imageUri: Platform.OS === 'web' ? compressedImageUri : displayImageUri,
            timestamp: Date.now(),
          };
          
          // Remover duplicados y poner la nueva entrada al principio
          const filteredHistory = history.filter(item => item.pieceName !== pieceName);
          const updatedHistory = [newEntry, ...filteredHistory];
          const limitedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
          
          if (Platform.OS === 'web') {
            localStorage.setItem('recognitionHistory', JSON.stringify(limitedHistory));
            console.log("ResultScreen: Force saved to localStorage before going home");
            
            // Disparar evento inmediatamente y también con delay para asegurar que llegue
            window.dispatchEvent(new CustomEvent('historyUpdated', {
              detail: { 
                history: limitedHistory,
                timestamp: Date.now(),
                message: 'Force updated from ResultScreen handleGoHome'
              }
            }));
            console.log("ResultScreen: Dispatched historyUpdated event after force save");
            
            // También disparar un evento simple después de un delay
            setTimeout(() => {
              window.dispatchEvent(new Event('historyUpdated'));
              console.log("ResultScreen: Dispatched simple historyUpdated event after force save delay");
            }, 300);
          } else {
            await AsyncStorage.setItem('recognitionHistory', JSON.stringify(limitedHistory));
          }
          
          console.log(`ResultScreen: Force saved '${pieceName}' before going home. History:`, limitedHistory);
        } catch (error) {
          console.error('ResultScreen: Error force saving history:', error);
        }
      }
      
      // Navega a la pantalla 'Inicio' dentro del contenedor de Tabs 'MainTabs'
      navigation.navigate('MainTabs', { screen: 'Inicio' });
  };

  // --- Render ---
  if (!pieceName) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { height: '100vh', width: '100vw' }]}> 
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={config.COLORS.SECONDARY || 'red'} />
          <Text style={styles.errorTitle}>Información no disponible</Text>
          <Text style={styles.errorText}>No se recibió un nombre de monumento válido.</Text>
          <Button
            title="Volver"
            buttonStyle={styles.errorButton}
            titleStyle={styles.errorButtonTitle}
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={responsiveStyles.responsiveSafeArea}> 
        <View style={responsiveStyles.responsiveContainer}>
          <ScrollView 
            style={responsiveStyles.responsiveScrollView} 
            contentContainerStyle={responsiveStyles.responsiveScrollContent}
          >
            {/* Imagen y Overlay */}
            <View style={styles.imageContainer}>
              {displayImageUri ? (
                <Image
                  source={{ uri: displayImageUri }}
                  style={styles.pieceImage}
                  resizeMode="cover"
                  defaultSource={placeholderLarge}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={80} color={config.COLORS.LIGHT_ACCENT} />
                </View>
              )}
              <View style={styles.imageOverlay}>
                <TouchableOpacity style={[styles.overlayButton, responsiveStyles.responsiveButton]} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {confidence && (
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{marginLeft: 4}}/>
                </View>
              )}
            </View>
            {/* Contenedor Principal de Información */}
            <View style={styles.infoContainer}>
              <Text style={styles.title}>{pieceName}</Text>
              {userSelected && (
                <Text style={styles.userSelectedText}>
                  (Identificación seleccionada por el usuario)
                </Text>
              )}
              <Divider style={styles.divider} color={config.COLORS.LIGHT_ACCENT}/>
              <View style={styles.audioModesContainer}>
                <Text style={styles.sectionTitle}>Modo de Audio</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.audioModeSelector}
                >
                  {(config.AUDIO_MODES || []).map(mode => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.audioModeOption,
                        selectedMode === mode.id && styles.audioModeSelected,
                        responsiveStyles.responsiveButton
                      ]}
                      onPress={() => handleModeChange(mode.id)}
                    >
                      <Ionicons
                        name={mode.icon || 'musical-notes-outline'}
                        size={20}
                        color={selectedMode === mode.id ? '#fff' : config.COLORS.PRIMARY}
                      />
                      <Text
                        style={[
                          styles.audioModeText,
                          selectedMode === mode.id && styles.audioModeTextSelected
                        ]}
                      >
                        {mode.name || mode.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {audioUrl ? (
                <AudioPlayer
                  key={audioUrl}
                  audioUrl={audioUrl}
                  autoPlay={autoPlayPref}
                  onError={handleAudioError}
                  ref={audioPlayerRef}
                />
              ) : (
                <View style={styles.audioPlayerPlaceholder}>
                  <Text style={styles.audioPlayerPlaceholderText}>Buscando audio...</Text>
                </View>
              )}
              {audioError && (
                <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={18} color={config.COLORS.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
                </View>
              )}
              
              {/* Botón Volver a Inicio dentro del contenido */}
              <View style={styles.goHomeButtonContainer}>
                <Button
                  title="🏠 Volver a Inicio"
                  onPress={handleGoHome}
                  buttonStyle={[styles.goHomeButton, responsiveStyles.responsiveButtonLarge, {
                    backgroundColor: config.COLORS.PRIMARY,
                    borderColor: config.COLORS.PRIMARY,
                    borderWidth: 2,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }]}
                  titleStyle={[styles.goHomeButtonTitle, {
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 'bold',
                  }]}
                  containerStyle={{ width: '100%' }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Imagen y Overlay */}
        <View style={styles.imageContainer}>
          {displayImageUri ? (
              <Image
                 source={{ uri: displayImageUri }}
                 style={styles.pieceImage}
                 resizeMode="cover"
                 defaultSource={placeholderLarge}
              />
          ) : (
              <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={80} color={config.COLORS.LIGHT_ACCENT} />
              </View>
          )}
           <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.overlayButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           {confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{marginLeft: 4}}/>
              </View>
           )}
        </View>

        {/* Contenedor Principal de Información */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{pieceName}</Text>
          {/* Display user-selected indicator if applicable */}
          {userSelected && (
            <Text style={styles.userSelectedText}>
              (Identificación seleccionada por el usuario)
            </Text>
          )}
          <Divider style={styles.divider} color={config.COLORS.LIGHT_ACCENT}/>

          {/* Selector de modo */}
          <View style={styles.audioModesContainer}>
            <Text style={styles.sectionTitle}>Modo de Audio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioModeSelector}
            >
              {(config.AUDIO_MODES || []).map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.audioModeOption,
                    selectedMode === mode.id && styles.audioModeSelected
                  ]}
                  onPress={() => handleModeChange(mode.id)}
                >
                  <Ionicons
                    name={mode.icon || 'musical-notes-outline'}
                    size={20}
                    color={selectedMode === mode.id ? '#fff' : config.COLORS.PRIMARY}
                  />
                  <Text
                    style={[
                      styles.audioModeText,
                      selectedMode === mode.id && styles.audioModeTextSelected
                    ]}
                  >
                    {mode.name || mode.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Componente AudioPlayer */}
          {audioUrl ? (
              <AudioPlayer
                key={audioUrl}
                audioUrl={audioUrl}
                autoPlay={autoPlayPref}
                onError={handleAudioError}
                ref={audioPlayerRef}
              />
          ) : (
              <View style={styles.audioPlayerPlaceholder}>
                 <Text style={styles.audioPlayerPlaceholderText}>Buscando audio...</Text>
              </View>
          )}

          {/* Display Audio Error */}
          {audioError && (
              <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={18} color={config.COLORS.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
              </View>
          )}

          {/* --- NEW: Botón Volver a Inicio --- */}
          <Button
            title="Volver a Inicio"
            icon={<Ionicons name="home-outline" size={20} color={config.COLORS.PRIMARY} style={{marginRight: 8}} />}
            onPress={handleGoHome}
            buttonStyle={styles.goHomeButton} // Estilo específico para este botón
            titleStyle={styles.goHomeButtonTitle}
            containerStyle={styles.goHomeButtonContainer} // Para añadir margen
          />
          {/* --- END NEW --- */}

          {/* Aquí podrías añadir otras secciones (descripción, etc.) */}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Estilos (Añadir estilos para el nuevo botón) ---
const styles = StyleSheet.create({
  // ... (todos los estilos anteriores se mantienen) ...
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND || '#f1faee',
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    position: 'relative',
    backgroundColor: config.COLORS.LIGHT_ACCENT + '40',
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
  imageOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(26, 60, 110, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    paddingTop: 15,
  },
  title: {
    fontSize: 28,
    color: config.COLORS.TEXT,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'railway',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: config.COLORS.LIGHT_ACCENT + '80',
  },
  audioModesContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    color: config.COLORS.TEXT,
    marginBottom: 12,
    fontFamily: 'railway',
  },
  audioModeSelector: {
    paddingVertical: 5,
  },
  audioModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: config.COLORS.PRIMARY + '90',
  },
  audioModeSelected: {
    backgroundColor: config.COLORS.PRIMARY,
    borderColor: config.COLORS.PRIMARY,
  },
  audioModeText: {
    fontSize: 14,
    color: config.COLORS.PRIMARY,
    marginLeft: 8,
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
      borderRadius: 15,
      padding: 20,
      marginTop: 10,
  },
  audioPlayerPlaceholderText: {
      fontFamily: 'industrial',
      color: config.COLORS.DARK_ACCENT,
      textAlign: 'center',
      fontSize: 14,
  },
  audioErrorContainer: {
      marginTop: 15,
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: config.COLORS.SECONDARY + '20',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10, // Espacio antes del botón de volver
  },
  audioErrorText: {
      flex: 1,
      color: config.COLORS.SECONDARY,
      fontFamily: 'industrial',
      fontSize: 13,
      marginLeft: 8,
  },
  // --- NEW Styles for Go Home Button ---
  goHomeButtonContainer: {
    marginTop: 30, // Espacio encima del botón
    marginBottom: 30, // Espacio debajo del botón
    alignItems: 'center', // Centrar el botón si no ocupa todo el ancho
    paddingHorizontal: 20, // Padding lateral
    ...(Platform.OS === 'web' && {
      marginBottom: 50, // Más espacio en web
    })
  },
  goHomeButton: {
    backgroundColor: '#fff', // Fondo blanco
    borderColor: config.COLORS.PRIMARY, // Borde color primario
    borderWidth: 1.5,
    borderRadius: 30, // Redondeado
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  goHomeButtonTitle: {
    color: config.COLORS.PRIMARY, // Texto color primario
    fontFamily: 'railway',
    fontSize: 16,
  },
  // --- END NEW ---
  // Error screen styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: config.COLORS.BACKGROUND || '#f1faee',
  },
  errorTitle: {
    fontSize: 24,
    color: config.COLORS.TEXT,
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'railway',
  },
  errorText: {
    fontSize: 16,
    color: config.COLORS.DARK_ACCENT,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'industrial',
    lineHeight: 23,
  },
  errorButton: {
      backgroundColor: config.COLORS.PRIMARY,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 30,
  },
  errorButtonTitle: {
      fontFamily: 'railway',
      fontSize: 16,
  },
  userSelectedText: { // Style for the user-selected indicator
    fontSize: 13,
    fontStyle: 'italic',
    color: config.COLORS.DARK_ACCENT || '#555',
    textAlign: 'center',
    marginTop: 0, // Adjusted to fit nicely below the title
    marginBottom: 12, // Space before the divider
    fontFamily: config.FONTS?.industrial || 'sans-serif',
  },
});

export default ResultScreen;