import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  Linking,
  SafeAreaView,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config.js';
import { responsiveStyles } from '../styles/responsiveStyles.js';

const { width, height } = Dimensions.get('window');
const placeholderSmall = require('../assets/placeholder_small.png');
// Asegúrate de que la ruta al banner sea correcta
const bannerImage = require('../assets/banner_ferroviario.jpg'); // <-- Referencia a la imagen del banner

const HomeScreen = ({ navigation }) => {
  const [selectedMode, setSelectedMode] = useState('normal');
  const [recentPieces, setRecentPieces] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log("HomeScreen focused, loading data...");
      loadSelectedMode();
      // En web, forzar recarga del historial con un pequeño delay
      if (Platform.OS === 'web') {
        setTimeout(() => {
          console.log("HomeScreen: Force reloading history on focus (web)");
          loadRecentPieces();
        }, 100);
      } else {
        loadRecentPieces();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Cargar datos al montar el componente (especialmente importante para web)
  useEffect(() => {
    console.log("HomeScreen mounted, loading initial data...");
    loadSelectedMode();
    loadRecentPieces();
  }, []);


  // Escuchar eventos de actualización del historial en web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleHistoryUpdate = (event) => {
        console.log("HomeScreen: Received historyUpdated event:", event.detail);
        
        // Si el evento incluye datos del historial, usarlos directamente
        if (event.detail && event.detail.history) {
          console.log("HomeScreen: Using history data from event:", event.detail.history);
          const valid = event.detail.history.filter(i => i.pieceName && i.imageUri);
          setRecentPieces(valid.slice(0, 6));
        } else {
          // Si no hay datos, recargar desde localStorage
          console.log("HomeScreen: No history data in event, reloading from localStorage");
          setTimeout(() => {
            loadRecentPieces();
          }, 100);
        }
      };

      // También escuchar el evento estándar sin detail
      const handleSimpleHistoryUpdate = () => {
        console.log("HomeScreen: Received simple historyUpdated event, reloading...");
        setTimeout(() => {
          loadRecentPieces();
        }, 100);
      };

      window.addEventListener('historyUpdated', handleHistoryUpdate);
      window.addEventListener('historyUpdated', handleSimpleHistoryUpdate);
      
      return () => {
        window.removeEventListener('historyUpdated', handleHistoryUpdate);
        window.removeEventListener('historyUpdated', handleSimpleHistoryUpdate);
      };
    }
  }, []);

  const loadSelectedMode = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedAudioMode');
      setSelectedMode(saved || 'normal');
    } catch (e) {
        console.error("Error loading selected mode:", e);
    }
  };

  const loadRecentPieces = async () => {
    try {
      let historyString;
      
      if (Platform.OS === 'web') {
        // En web, usar localStorage directamente
        historyString = localStorage.getItem('recognitionHistory');
        console.log("HomeScreen: Loaded from localStorage:", historyString);
      } else {
        // En móvil, usar AsyncStorage
        historyString = await AsyncStorage.getItem('recognitionHistory');
        console.log("HomeScreen: Loaded from AsyncStorage:", historyString);
      }
      
      const items = historyString ? JSON.parse(historyString) : [];
      // En web, no requerir imageUri porque puede ser null si falla la compresión
      const valid = items.filter(i => i.pieceName && (Platform.OS !== 'web' ? i.imageUri : true));
      console.log("HomeScreen: Parsed and filtered history items:", valid);
      console.log("HomeScreen: Setting recentPieces to:", valid.slice(0, 6));
      setRecentPieces(valid.slice(0, 6));
    } catch (e) {
        console.error("HomeScreen: Error loading/parsing history:", e);
      setRecentPieces([]);
    }
  };

  const handleModeSelection = async (mode) => {
    setSelectedMode(mode);
    try { await AsyncStorage.setItem('selectedAudioMode', mode); } catch {}
  };

  const handleOpenCamera = () => {
    navigation.navigate('Cámara', { screen: 'CameraCapture' });
  };

  const handleOpenPieceDetails = (piece) => {
    const name = piece.pieceName;
    const uri = piece.imageUri;

    if (name && uri) {
      console.log(`Navigating directly to Result screen for: ${name}`);
      navigation.navigate('ResultScreen', {
          recognitionResult: { pieceName: name, confidence: piece.confidence },
          imageUri: uri,
          audioMode: selectedMode
      });
    } else {
      console.warn("Attempted to open piece details with invalid data:", piece);
      Alert.alert('Error', 'No se pudieron cargar los detalles de esta pieza.');
    }
  };

  return (
    <SafeAreaView style={Platform.OS === 'web' ? responsiveStyles.responsiveSafeArea : styles.safeArea}>
      <ScrollView 
        style={Platform.OS === 'web' ? responsiveStyles.responsiveScrollView : styles.container} 
        contentContainerStyle={Platform.OS === 'web' ? responsiveStyles.responsiveScrollContent : { paddingBottom: 30 }}
      >
        {/* El ImageBackground ahora tiene más altura y el margen superior */}
        <ImageBackground
          source={bannerImage} // Usar la referencia a la imagen
          style={styles.banner}
          // Cambiado a contain para asegurar que se vea todo, ajusta el height si es necesario
          resizeMode="contain" // <-- CAMBIO: Probar 'contain' o aumentar height
          // O alternativamente, mantener 'cover' y aumentar height en styles.banner
          // resizeMode="cover"
          >
          {/* Puedes añadir contenido aquí si quieres que esté sobre el banner */}
        </ImageBackground>

        <View style={styles.actionContainer}>
          <Button
            title="Escanear Pieza"
            icon={<Ionicons name="camera-outline" size={20} style={{ marginRight: 8 }} color="#fff" />}
            onPress={handleOpenCamera}
            buttonStyle={[styles.scanButton, responsiveStyles.responsiveButtonLarge]}
            titleStyle={{ color: '#fff', fontFamily: 'railway' }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de Audio</Text>
          <View style={styles.modeSelector}>
            {config.AUDIO_MODES.map(mode => (
              <TouchableOpacity 
                key={mode.id} 
                style={[
                  styles.modeOption, 
                  selectedMode === mode.id && styles.modeOptionSelected,
                  responsiveStyles.responsiveButton
                ]} 
                onPress={() => handleModeSelection(mode.id)}
              >
                <Ionicons name={mode.icon} size={24} color={selectedMode === mode.id ? config.COLORS.PRIMARY : config.COLORS.DARK_ACCENT} />
                <Text style={[styles.modeText, selectedMode === mode.id && styles.modeTextSelected, {fontFamily: 'industrial'}]}>{mode.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {recentPieces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vistos Recientemente</Text>
            <View style={styles.recentPiecesContainer}>
              {recentPieces.map((p, i) => {
                 const uri = p.imageUri;
                 const name = p.pieceName;
                 return (
                   <TouchableOpacity 
                     key={i} 
                     style={[styles.recentPieceCard, responsiveStyles.responsiveCard]} 
                     onPress={() => handleOpenPieceDetails(p)}
                   >
                     <Image source={uri ? { uri } : placeholderSmall} style={styles.recentPieceImage} defaultSource={placeholderSmall} />
                     <View style={styles.recentPieceInfo}>
                       <Text style={styles.recentPieceTitle} numberOfLines={2}>{name || 'Nombre desconocido'}</Text>
                     </View>
                   </TouchableOpacity>
                 );
               })}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Guía Ferroviaria</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND || '#f1faee',
  },
  container: {
    flex: 1,
  },
  banner: {
    width: '100%',
    // --- CHANGE: Aumentar altura y/o usar contain ---
    height: 230, // Aumentado de 200 a 230, ajusta según necesites
    // Alternativa: Podrías calcular la altura basado en el aspect ratio y el ancho:
    // aspectRatio: 800 / 350, // Ejemplo de ratio (calcula el real de tu imagen)
    // height: undefined,
    marginTop: height * 0.15, // Margen superior del 15%
    // justifyContent y paddingBottom ya no son necesarios si usas 'contain'
    // y no pones contenido sobre el banner
    // justifyContent: 'flex-end',
    // paddingBottom: 20,
    backgroundColor: config.COLORS.BACKGROUND, // Color de fondo si 'contain' deja espacios
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: 10, // Reducir margen si 'contain' en banner añade espacio inferior
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: config.COLORS.PRIMARY,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 30
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    color: config.COLORS.TEXT,
    marginBottom: 10,
    fontWeight: '600',
    fontFamily: 'railway'
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 2
  },
  modeOption: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5
  },
  modeOptionSelected: {
    backgroundColor: config.COLORS.PRIMARY + '1A',
    borderRadius: 8,
  },
  modeText: {
    marginTop: 4,
    fontSize: 12,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial'
  },
  modeTextSelected: {
    color: config.COLORS.PRIMARY,
    fontWeight: '600'
  },
  recentPiecesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  recentPieceCard: {
    width: (width - 55) / 2,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2
  },
  recentPieceImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#eee'
  },
  recentPieceInfo: { padding: 8 },
  recentPieceTitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'industrial'
  },
  footer: {
    alignItems: 'center',
    marginTop: 30
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'industrial'
  },
});

export default HomeScreen;