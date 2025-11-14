import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Divider } from 'react-native-elements'; // Card ya no es necesaria aquí
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para leer preferencias
import config from '../config';
import AudioPlayer from '../components/AudioPlayer'; // <-- Importar componente
import { useProgress } from '../core/shared/context/ProgressContext.js';

const { width } = Dimensions.get('window');

const slugifyForHashtag = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

const buildShareCopy = (cfg) => {
  const target = cfg?.PARK_INFO?.name || cfg?.APP_NAME || 'esta ruta';
  const fallbackSlug = slugifyForHashtag(target);
  const fallbackHashtag = fallbackSlug ? `#${fallbackSlug}` : '#Audioguia';
  return {
    target,
    hashtag: cfg?.SHARE_HASHTAG || fallbackHashtag,
  };
};

// Placeholder para imagen grande (necesitas crear esta imagen en assets)
const placeholderLarge = require('../assets/placeholder_large.png');

const legacyShareCopy = buildShareCopy(config);

const ResultScreen = ({ route, navigation }) => {
  // --- Estados Simplificados ---
  const { recognitionResult, imageUri: routeImageUri, audioMode: initialAudioMode } = route.params || {};
  const { pieceName, confidence } = recognitionResult || {};
  const { markStopVisited } = useProgress();

  // Estado para manejar URI local vs remota
  const [displayImageUri, setDisplayImageUri] = useState(null);

  const [selectedMode, setSelectedMode] = useState(initialAudioMode || 'normal');
  const [audioUrl, setAudioUrl] = useState(''); // Estado para la URL del audio
  const [autoPlayPref, setAutoPlayPref] = useState(true); // Preferencia de autoplay
  const [audioError, setAudioError] = useState(null); // Para mostrar errores del player

  // Determinar la URI de imagen a mostrar (manejar local vs remota)
   useEffect(() => {
       // Si imageUri viene en la ruta (desde cámara), usarla directamente
       if (routeImageUri) {
           setDisplayImageUri(routeImageUri);
       } else if (pieceName) {
           // Si no viene (desde historial?), intentar construir URL remota
           // Asumiendo que tienes una forma de obtener la URL de la imagen desde el pieceName o API
           // Ejemplo placeholder:
           // const remoteImageUrl = `${config.API_URL}/api/images/${pieceName}`;
           // setDisplayImageUri(remoteImageUrl);
           console.warn("ResultScreen: No imageUri provided, unable to display image from history yet.");
           // Podrías hacer una llamada API aquí para obtener la URL de la imagen si es necesario
           setDisplayImageUri(null); // O un placeholder genérico si no puedes obtenerla
       }
   }, [routeImageUri, pieceName]);


  // --- Cargar Preferencia de Autoplay y modo default ---
  useEffect(() => {
    const loadPrefs = async () => {
        const savedAutoPlay = await AsyncStorage.getItem('autoPlayAudio');
        setAutoPlayPref(savedAutoPlay !== null ? savedAutoPlay === 'true' : true);

        // Cargar modo de audio predeterminado si no viene en params
        if (!initialAudioMode) {
            const savedMode = await AsyncStorage.getItem('selectedAudioMode');
            setSelectedMode(savedMode || 'normal');
        }
    };
    loadPrefs();
  }, [initialAudioMode]); // Dependencia para asegurar que se carga modo default si falta


  // --- Construir URL del Audio ---
  useEffect(() => {
    if (pieceName) {
      const tenantId = config.TENANT_ID || 'default';
      // Asegurarse que el nombre de pieza no tenga caracteres problemáticos para URL
      const encodedPieceName = encodeURIComponent(pieceName);
      const url = `${config.API_URL}/api/audio/${tenantId}/${encodedPieceName}/${selectedMode}`;
      setAudioUrl(url);
      setAudioError(null); // Limpiar error al cambiar modo/pieza
      console.log(`ResultScreen: Setting audio URL to ${url}`);
    } else {
      setAudioUrl(''); // Limpiar URL si no hay nombre
      console.warn("ResultScreen: No pieceName available to build audio URL.");
    }
  }, [pieceName, selectedMode]); // Depende de la pieza y el modo

  // --- Manejador de Cambio de Modo ---
  const handleModeChange = (mode) => {
    if (mode === selectedMode) return;
    setSelectedMode(mode);
    // El useEffect anterior se encargará de actualizar la URL
  };

  // --- Manejador de Errores del AudioPlayer ---
  const handleAudioError = useCallback((error) => {
      console.error("ResultScreen: Received error from AudioPlayer:", error.message);
      // Mostrar alerta o mensaje en la UI
      // Evitar mostrar errores de red genéricos si la URL es correcta pero inaccesible
      if (!error.message?.includes('Network') && !error.message?.includes('interrupted')) {
          setAudioError(`Error: ${error.message}`);
      } else if (error.message?.includes('Network')) {
          setAudioError("No se pudo conectar para obtener el audio.");
      } else {
          // Otros errores (interrupciones, etc.) podrían no mostrarse al usuario
          setAudioError(null); // Limpiar errores menos críticos
      }
      // Alert.alert("Error de Audio", `No se pudo cargar o reproducir el audio.\n${error.message}`);
  }, []);


  const handlePlaybackComplete = useCallback(() => {
    if (pieceName) {
      markStopVisited(pieceName);
    }
  }, [pieceName, markStopVisited]);

  // --- Compartir (sin cambios) ---
  const handleShare = async () => {
    if (!pieceName) return;
    try {
      await Share.share({
        message: `Estoy recorriendo ${legacyShareCopy.target} y la parada "${pieceName}" con la audioguia. Te va a encantar! ${legacyShareCopy.hashtag}`,
        title: `Parada: ${pieceName}`
      });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert("Error", "No se pudo compartir la información.");
    }
  };

  // --- Renderizado ---
  if (!pieceName) {
    // Pantalla de error (igual que antes)
    return (
      <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={config.COLORS.SECONDARY || 'red'} />
            <Text style={styles.errorTitle}>Información no disponible</Text>
            <Text style={styles.errorText}>No se recibió un nombre de pieza válido desde la pantalla anterior.</Text>
            <Button
              title="Volver a Escanear"
              buttonStyle={styles.errorButton} // <-- Usar estilo específico
              titleStyle={styles.errorButtonTitle}
              onPress={() => navigation.goBack()}
            />
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
                 // Asegúrate que el placeholder existe
                 defaultSource={placeholderLarge} // Usar placeholder importado
              />
          ) : (
              // Placeholder si no hay URI de imagen disponible
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
          <Divider style={styles.divider} color={config.COLORS.LIGHT_ACCENT}/>

          {/* Selector de modo */}
          <View style={styles.audioModesContainer}>
            <Text style={styles.sectionTitle}>Modo de Audio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioModeSelector} // <-- Usar contentContainerStyle
            >
              {(config.AUDIO_MODES || []).map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.audioModeOption,
                    selectedMode === mode.id && styles.audioModeSelected
                  ]}
                  onPress={() => handleModeChange(mode.id)}
                  // Podríamos deshabilitar si audioUrl está vacío, pero el Player ya lo maneja
                >
                  <Ionicons
                    name={mode.icon || 'musical-notes-outline'}
                    size={20}
                    color={selectedMode === mode.id ? '#fff' : config.COLORS.PRIMARY} // <-- Color invertido en selección
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

          {/* --- Usar el Componente AudioPlayer --- */}
          {audioUrl ? (
              <AudioPlayer
                key={audioUrl} // <-- Importante: Cambiar key fuerza re-montaje y recarga
                audioUrl={audioUrl}
                autoPlay={autoPlayPref} // Usar preferencia
                onError={handleAudioError} // Pasar callback de error
                onPlaybackComplete={handlePlaybackComplete}
                // onPlaybackStatusUpdateProp={status => console.log(status)} // Opcional para debug
              />
          ) : (
              // Mostrar algo si no hay URL (no debería pasar si hay pieceName)
              <View style={styles.audioPlayerPlaceholder}>
                 <Text style={styles.audioPlayerPlaceholderText}>Construyendo URL de audio...</Text>
              </View>
          )}

          {/* Mostrar error del player si existe */}
          {audioError && (
              <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={18} color={config.COLORS.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
              </View>
          )}

          {/* Aquí podrías añadir otras secciones de texto si las tuvieras (descripción, etc.) */}
          {/* Ejemplo: */}
          {/* <View style={styles.descriptionContainer}>
             <Text style={styles.sectionTitle}>Descripción</Text>
             <Text style={styles.descriptionText}>Aquí iría la descripción cargada de la API...</Text>
          </View> */}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Estilos (Reutilizar los de la versión anterior, ajustando si es necesario) ---
const styles = StyleSheet.create({
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
  // Estilo para placeholder si no hay imagen
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
    backgroundColor: 'rgba(26, 60, 110, 0.8)', // PRIMARIO semi-transparente
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'industrial', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    paddingTop: 15, // Menos padding superior
  },
  title: {
    fontSize: 28,
    color: config.COLORS.TEXT,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'railway', // <-- Fuente aplicada
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
    fontFamily: 'railway', // <-- Fuente aplicada
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
    fontFamily: 'industrial', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  audioModeTextSelected: {
    color: '#fff',
  },
   audioPlayerPlaceholder: {
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: config.COLORS.LIGHT_ACCENT + '30', // Fondo muy claro
      borderRadius: 15,
      padding: 20,
      marginTop: 10, // Margen superior si reemplaza al player
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
  },
  audioErrorText: {
      flex: 1,
      color: config.COLORS.SECONDARY,
      fontFamily: 'industrial',
      fontSize: 13,
      marginLeft: 8, // Espacio desde icono
  },
   // Estilos opcionales para descripción
   descriptionContainer: {
       marginTop: 25,
   },
   descriptionText: {
       fontFamily: 'industrial',
       fontSize: 15,
       color: config.COLORS.TEXT,
       lineHeight: 22,
   },
  // Estilos pantalla de error
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
    fontFamily: 'railway', // <-- Fuente aplicada
  },
  errorText: {
    fontSize: 16,
    color: config.COLORS.DARK_ACCENT,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'industrial', // <-- Fuente aplicada
    lineHeight: 23,
  },
  errorButton: {
      backgroundColor: config.COLORS.PRIMARY,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 30,
  },
  errorButtonTitle: {
      fontFamily: 'railway', // <-- Fuente aplicada
      fontSize: 16,
  }
});

export default ResultScreen;
