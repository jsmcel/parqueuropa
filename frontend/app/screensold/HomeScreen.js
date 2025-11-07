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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

const { width, height } = Dimensions.get('window');
const placeholderSmall = require('../assets/placeholder_small.png');

const HomeScreen = ({ navigation }) => {
  const [selectedMode, setSelectedMode] = useState('normal');
  const [recentPieces, setRecentPieces] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedMode();
      loadRecentPieces();
    });
    return unsubscribe;
  }, [navigation]);

  const loadSelectedMode = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedAudioMode');
      setSelectedMode(saved || 'normal');
    } catch {}
  };

  const loadRecentPieces = async () => {
    try {
      const history = await AsyncStorage.getItem('recognitionHistory');
      const items = history ? JSON.parse(history) : [];
      const valid = items.filter(i => (i.pieceName || i.title) && (i.imageUri || i.imageUrl));
      setRecentPieces(valid.slice(0, 3));
    } catch {
      setRecentPieces([]);
    }
  };

  const handleModeSelection = async mode => {
    setSelectedMode(mode);
    try { await AsyncStorage.setItem('selectedAudioMode', mode); } catch {}
  };

  const handleOpenCamera = () => navigation.navigate('Cámara');

  const handleOpenPieceDetails = piece => {
    const name = piece.pieceName || piece.title;
    let uri = piece.imageUri || (piece.imageUrl?.startsWith('http') ? piece.imageUrl : `${config.API_URL}${piece.imageUrl}`);
    if (name && uri) {
      navigation.navigate('Result', { recognitionResult: { pieceName: name, confidence: piece.confidence }, imageUri: uri, audioMode: selectedMode });
    } else {
      Alert.alert('Error', 'No se pudieron cargar los detalles de esta pieza.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.topSpacer} />

        <ImageBackground source={require('../assets/banner_ferroviario.jpg')} style={styles.banner} resizeMode="cover">
        </ImageBackground>

        <View style={styles.actionContainer}>
          <Button
            title="Escanear Pieza"
            icon={<Ionicons name="camera-outline" size={20} style={{ marginRight: 8 }} color="#fff" />}
            onPress={handleOpenCamera}
            buttonStyle={styles.scanButton}
            titleStyle={{ color: '#fff' }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de Audio</Text>
          <View style={styles.modeSelector}>
            {config.AUDIO_MODES.map(mode => (
              <TouchableOpacity key={mode.id} style={[styles.modeOption, selectedMode === mode.id && styles.modeOptionSelected]} onPress={() => handleModeSelection(mode.id)}>
                <Ionicons name={mode.icon} size={24} color={selectedMode === mode.id ? config.COLORS.PRIMARY : config.COLORS.DARK_ACCENT} />
                <Text style={[styles.modeText, selectedMode === mode.id && styles.modeTextSelected]}>{mode.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {recentPieces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vistos Recientemente</Text>
            <View style={styles.recentPiecesContainer}>
              {recentPieces.map((p, i) => {
                const uri = p.imageUri || (p.imageUrl?.startsWith('http') ? p.imageUrl : `${config.API_URL}${p.imageUrl}`);
                const name = p.pieceName || p.title;
                return (
                  <TouchableOpacity key={i} style={styles.recentPieceCard} onPress={() => handleOpenPieceDetails(p)}>
                    <Image source={{ uri }} style={styles.recentPieceImage} defaultSource={placeholderSmall} />
                    <View style={styles.recentPieceInfo}>
                      <Text style={styles.recentPieceTitle} numberOfLines={2}>{name}</Text>
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
  safeArea: { flex: 1, backgroundColor: '#f6f6f6' },
  container: { flex: 1 },
  topSpacer: { height: height * 0.15, backgroundColor: '#f6f6f6' },
  banner: { width: '100%', height: 250, justifyContent: 'flex-end', paddingBottom: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  bannerContent: { alignItems: 'center', paddingHorizontal: 20 },
  bannerTitle: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  actionContainer: { alignItems: 'center', marginVertical: 20 },
  scanButton: { backgroundColor: config.COLORS.PRIMARY, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 30 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: config.COLORS.TEXT, marginBottom: 10, fontWeight: '600' },
  modeSelector: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2 },
  modeOption: { alignItems: 'center', flex: 1 },
  modeOptionSelected: { backgroundColor: config.COLORS.PRIMARY + '22', borderRadius: 8 },
  modeText: { marginTop: 4, fontSize: 12, color: config.COLORS.DARK_ACCENT },
  modeTextSelected: { color: config.COLORS.PRIMARY, fontWeight: '600' },
  recentPiecesContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  recentPieceCard: { width: (width - 60) / 2, backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, overflow: 'hidden', elevation: 2 },
  recentPieceImage: { width: '100%', height: 100 },
  recentPieceInfo: { padding: 8 },
  recentPieceTitle: { fontSize: 13, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 30 },
  footerText: { fontSize: 12, color: '#999' },
});

export default HomeScreen;
