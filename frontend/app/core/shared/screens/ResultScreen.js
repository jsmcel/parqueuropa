import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Divider } from 'react-native-elements'; // Button ya está importado
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTenant } from '../context/TenantContext.js';
import AudioPlayer from '../components/AudioPlayer'; // Importar componente
import { getAudioFileUrl } from '../services/apiService.js'; // Import the new service
import { usePlayback } from '../context/PlaybackContext.js';
import { responsiveStyles } from '../styles/responsiveStyles.js';
import { useTenantMedia } from '../context/TenantMediaContext.js';
import { useProgress } from '../context/ProgressContext.js';

const resolveAssetUri = (source) => {
  if (!source) return null;
  if (Image && typeof Image.resolveAssetSource === 'function') {
    const resolved = Image.resolveAssetSource(source);
    if (resolved && resolved.uri) {
      return resolved.uri;
    }
  }
  if (typeof source === 'object' && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
};

const getItemImageUri = (item) => {
  if (!item) return null;
  if (typeof item.assetUrl === 'string') {
    return item.assetUrl;
  }
  if (typeof item.optimizedAssetUrl === 'string') {
    return item.optimizedAssetUrl;
  }
  if (typeof item.originalAssetUrl === 'string') {
    return item.originalAssetUrl;
  }
  if (typeof item.url === 'string') {
    return item.url;
  }
  if (typeof item.originalUrl === 'string') {
    return item.originalUrl;
  }
  if (item.image) {
    return resolveAssetUri(item.image);
  }
  return null;
};

const slugifyForHashtag = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

const buildShareCopy = (config) => {
  const target = config?.PARK_INFO?.name || config?.APP_NAME || 'esta ruta';
  const fallbackSlug = slugifyForHashtag(target);
  const fallbackHashtag = fallbackSlug ? `#${fallbackSlug}` : '#Audioguia';
  return {
    target,
    hashtag: config?.SHARE_HASHTAG || fallbackHashtag,
  };
};

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
const MAX_HISTORY_ITEMS = 15;
const SLIDER_IMAGE_HEIGHT = Math.min(width * 0.6, 360);
const normalizeText = (value = '') =>
  value
    ?.toString()
    ?.toLowerCase()
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
    ?.replace(/[^a-z0-9]+/g, ' ')
    ?.trim();

const buildAliasMap = (monuments, extraAliases = {}) => {
  const map = new Map();
  const addAlias = (alias, slug) => {
    if (!alias || !slug) return;
    const normalized = normalizeText(alias);
    if (!normalized) return;
    map.set(normalized, slug);
  };

  monuments.forEach((monument) => {
    if (!monument?.slug) return;
    const { slug, title, city, aliases = [] } = monument;
    addAlias(slug, slug);
    const slugWords = slug.replace(/[-_]+/g, ' ').trim();
    addAlias(slugWords, slug);
    const parts = slugWords.split(' ').filter(Boolean);
    for (let i = parts.length - 1; i >= 1; i -= 1) {
      const partial = parts.slice(0, i).join(' ');
      if (partial.length >= 3) {
        addAlias(partial, slug);
      }
    }
    addAlias(title, slug);
    addAlias(`${title || ''} ${city || ''}`.trim(), slug);
    aliases.forEach((alias) => addAlias(alias, slug));
  });

  Object.entries(extraAliases || {}).forEach(([alias, slug]) => addAlias(alias, slug));
  return map;
};

const buildManifestFallback = (monument) => {
  if (!monument?.wikimedia_files?.length) return [];
  return monument.wikimedia_files.map((fileTitle) => {
    const clean = (fileTitle || '').replace(/^File:/i, '');
    const encoded = encodeURIComponent(clean);
    return {
      title: monument.title,
      filename: clean,
      url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=1600`,
      credit: [monument.city, monument.country].filter(Boolean).join(' · '),
      license: null,
      author: null,
    };
  });
};

const ResultScreen = ({ route, navigation }) => {
  const { recognitionResult, imageUri: routeImageUri, audioMode: initialAudioMode } = route.params || {};
  // Destructure userSelected along with pieceName and confidence
  const { pieceName, confidence, userSelected } = recognitionResult || {};

  const { config, type } = useTenant();
  const { markStopVisited } = useProgress();
  const { data: mediaData } = useTenantMedia();
  const sliderMonuments = Array.isArray(mediaData?.sliderManifest?.monuments)
    ? mediaData.sliderManifest.monuments
    : [];
  const sliderMonumentsMap = useMemo(() => {
    const map = new Map();
    sliderMonuments.forEach((monument) => {
      if (monument?.slug) {
        map.set(monument.slug, monument);
      }
    });
    return map;
  }, [sliderMonuments]);
  const sliderMediaBySlug = mediaData?.monuments || {};
  const isGpsTenant = type === 'type2' || config?.FRONTEND_MODE === 'gps';
  const colors = config?.COLORS || {};
  const rawFonts = config?.FONTS || {};
  const fonts = useMemo(() => {
    const normalized = Object.entries(rawFonts).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = value;
      }
      return acc;
    }, {});
    return {
      railway: normalized.railway || 'railway',
      industrial: normalized.industrial || 'industrial',
      ...normalized,
    };
  }, [rawFonts]);
  const audioModes = config?.AUDIO_MODES || [];
  const audioLanguage = config?.AUDIO_LANGUAGE || 'es';
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const tenantId = config?.TENANT_ID || 'default';
  const placeholderLarge = config?.ASSETS?.placeholderLarge || require('../assets/images/placeholder_large.png');
  const shareCopy = useMemo(() => buildShareCopy(config), [config]);

  const [displayImageUri, setDisplayImageUri] = useState(routeImageUri || null);
  const [selectedMode, setSelectedMode] = useState(initialAudioMode || 'normal');
  const [audioUrl, setAudioUrl] = useState('');
  const [autoPlayPref, setAutoPlayPref] = useState(true);
  const [audioError, setAudioError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderAliasMap = useMemo(
    () => buildAliasMap(sliderMonuments, config?.SLIDER_ALIASES),
    [sliderMonuments, config]
  );
  const sliderSlug = useMemo(() => {
    if (!sliderAliasMap || sliderAliasMap.size === 0) {
      return null;
    }
    if (recognitionResult?.slug && sliderMonumentsMap.has(recognitionResult.slug)) {
      return recognitionResult.slug;
    }
    const candidates = [];
    if (pieceName) candidates.push(pieceName);

    const recognitionFields = ['slug', 'pieceId', 'id', 'label', 'monumentId', 'primaryName'];
    recognitionFields.forEach((field) => {
      if (recognitionResult?.[field]) {
        candidates.push(recognitionResult[field]);
      }
    });

    const itineraryStops = Array.isArray(config?.ITINERARY_STOPS) ? config.ITINERARY_STOPS : [];
    itineraryStops.forEach((stop) => {
      if (stop?.name) candidates.push(stop.name);
      if (stop?.id) candidates.push(stop.id);
      if (stop?.slug) candidates.push(stop.slug);
    });

    for (const candidate of candidates) {
      const slug = sliderAliasMap.get(normalizeText(candidate));
      if (slug) return slug;
    }
    return null;
  }, [pieceName, recognitionResult, config, sliderAliasMap]);

  const sliderMeta = useMemo(
    () => (sliderSlug ? sliderMonumentsMap.get(sliderSlug) || null : null),
    [sliderSlug, sliderMonumentsMap]
  );

  const sliderItems = useMemo(() => {
    if (!sliderSlug) return [];

    const remoteEntries = Array.isArray(sliderMediaBySlug?.[sliderSlug]?.images)
      ? sliderMediaBySlug[sliderSlug].images
      : null;

    if (remoteEntries && remoteEntries.length) {
      return remoteEntries;
    }

    if (sliderMeta) {
      return buildManifestFallback(sliderMeta);
    }

    return [];
  }, [sliderSlug, sliderMediaBySlug, sliderMeta]);

  const sliderCurrentItem =
    sliderItems.length > 0 ? sliderItems[Math.min(activeSlide, sliderItems.length - 1)] : null;
  const primaryImageSource = useMemo(() => {
    if (displayImageUri) {
      return { uri: displayImageUri };
    }
    const nextUri = getItemImageUri(sliderCurrentItem);
    return nextUri ? { uri: nextUri } : null;
  }, [displayImageUri, sliderCurrentItem]);
  const historyImageUri = useMemo(() => {
    if (displayImageUri) return displayImageUri;
    return getItemImageUri(sliderCurrentItem);
  }, [displayImageUri, sliderCurrentItem]);
  const sliderListRef = useRef(null);
  const sliderViewabilityRef = useRef(({ viewableItems }) => {
    if (viewableItems?.length && typeof viewableItems[0].index === 'number') {
      setActiveSlide(viewableItems[0].index);
    }
  });
  const sliderViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  useEffect(() => {
    setActiveSlide(0);
  }, [sliderSlug, sliderItems.length]);

  useEffect(() => {
    if (routeImageUri) {
      setDisplayImageUri(routeImageUri);
      return;
    }
    if (!sliderSlug) {
      setDisplayImageUri(null);
      return;
    }
    if (sliderItems.length === 0) return;
    const fallbackUri = getItemImageUri(sliderItems[0]);
    if (fallbackUri) {
      setDisplayImageUri(fallbackUri);
    }
  }, [routeImageUri, sliderSlug, sliderItems]);

  useEffect(() => {
    if (routeImageUri) return;
    const nextUri = getItemImageUri(sliderCurrentItem);
    if (nextUri && nextUri !== displayImageUri) {
      setDisplayImageUri(nextUri);
    }
  }, [routeImageUri, sliderCurrentItem, displayImageUri]);

  // Ref para el AudioPlayer
  const audioPlayerRef = useRef(null);
  const { setPlaybackState } = usePlayback();
  const handlePlaybackChange = useCallback((playing) => {
    const pieceId = pieceName || null;
    setPlaybackState(playing, playing ? pieceId : null);
  }, [pieceName, setPlaybackState]);

  // --- Detener audio cuando se presiona el boton de retroceso ---
  useEffect(() => {
    const backAction = async () => {
      if (audioPlayerRef.current) {
        console.log("ResultScreen: Back button pressed, stopping audio");
        await audioPlayerRef.current.stop();
        setPlaybackState(false, null);
      }
      return false; // Allow navigation to proceed
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [setPlaybackState]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (audioPlayerRef.current) {
          console.log("ResultScreen: Screen losing focus, stopping audio");
          audioPlayerRef.current.stop();
          setPlaybackState(false, null);
        }
      };
    }, [setPlaybackState])
  );

  const handleShare = async () => {
    if (!pieceName) return;
    try {
      await Share.share({
        message: `Estoy recorriendo ${shareCopy.target} y la parada "${pieceName}" con la audioguia. Te va a encantar! ${shareCopy.hashtag}`,
        title: `Parada: ${pieceName}`
      });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert("Error", "No se pudo compartir la información.");
    }
  };

  const handlePlaybackComplete = useCallback(() => {
    if (pieceName) {
      markStopVisited(pieceName);
    }
  }, [pieceName, markStopVisited]);

  // --- NEW: Handler para volver a Inicio ---
  const handleGoHome = async () => {
      // Detener el audio antes de navegar
      if (audioPlayerRef.current) {
          console.log("ResultScreen: Stopping audio before navigating home");
          await audioPlayerRef.current.stop();
          setPlaybackState(false, null);
      }
      
      // Forzar actualización del historial antes de navegar
      if (pieceName && historyImageUri) {
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
          let imageForHistory = historyImageUri;
          if (Platform.OS === 'web' && imageForHistory?.startsWith('http')) {
            try {
              // Comprimir imagen para historial (calidad muy baja para ahorrar espacio)
              const compressedImageUri = await compressImageForHistory(imageForHistory);
              if (compressedImageUri) {
                imageForHistory = compressedImageUri;
              }
            } catch (error) {
              console.warn('Error compressing image for history in handleGoHome:', error);
              // mantener imagen original
            }
          }
          
          const newEntry = {
            pieceName,
            slug: sliderSlug || recognitionResult?.slug || null,
            imageUri: imageForHistory,
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

  useEffect(() => {
    let isMounted = true;
    const loadPreferences = async () => {
      try {
        if (Platform.OS !== 'web') {
          const savedAutoPlay = await AsyncStorage.getItem('autoPlayAudio');
          if (isMounted && savedAutoPlay !== null) {
            setAutoPlayPref(savedAutoPlay === 'true');
          }
          if (!initialAudioMode) {
            const savedMode = await AsyncStorage.getItem('selectedAudioMode');
            if (isMounted && savedMode) {
              setSelectedMode(savedMode);
            }
          }
        }
      } catch (error) {
        console.warn('ResultScreen: Failed to load audio preferences', error);
      }
    };
    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [initialAudioMode]);

  useEffect(() => {
    if (!pieceName || !tenantId) {
      setAudioUrl('');
      return;
    }
    const modeToUse = selectedMode || 'normal';
    const url = getAudioFileUrl(tenantId, pieceName, modeToUse, audioLanguage);
    setAudioUrl(url);
    setAudioError(null);
  }, [tenantId, pieceName, selectedMode, audioLanguage]);

  const handleModeChange = useCallback(
    (modeId) => {
      if (!modeId || modeId === selectedMode) return;
      setSelectedMode(modeId);
      AsyncStorage.setItem('selectedAudioMode', modeId).catch((error) =>
        console.warn('ResultScreen: Failed to persist selected audio mode', error)
      );
    },
    [selectedMode]
  );

  const handleAudioError = useCallback((error) => {
    if (!error) {
      setAudioError('No se pudo reproducir el audio.');
      return;
    }
    console.error('ResultScreen: Audio playback error', error);
    const message =
      typeof error?.message === 'string' && error.message.length > 0
        ? error.message
        : 'No se pudo reproducir el audio.';
    setAudioError(message);
  }, []);

  // --- Render ---
  if (!pieceName) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { height: '100vh', width: '100vw' }]}> 
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.SECONDARY || 'red'} />
          <Text style={styles.errorTitle}>Información no disponible</Text>
          <Text style={styles.errorText}>No se recibió un nombre de pieza válido.</Text>
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

  const showConfidence = Boolean(confidence) && !isGpsTenant;

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
              {primaryImageSource ? (
                <Image
                  source={primaryImageSource}
                  style={styles.pieceImage}
                  resizeMode="cover"
                  defaultSource={placeholderLarge}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={80} color={colors.LIGHT_ACCENT} />
                </View>
              )}
              <View style={styles.imageOverlay}>
                <TouchableOpacity style={[styles.overlayButton, responsiveStyles.responsiveButton]} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {showConfidence && (
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
              <Divider style={styles.divider} color={colors.LIGHT_ACCENT}/>
              <View style={styles.audioModesContainer}>
                <Text style={styles.sectionTitle}>Modo de Audio</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.audioModeSelector}
                >
                  {(audioModes || []).map(mode => (
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
                        color={selectedMode === mode.id ? '#fff' : colors.PRIMARY}
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
                  onPlaybackComplete={handlePlaybackComplete}
                />
              ) : (
                <View style={styles.audioPlayerPlaceholder}>
                  <Text style={styles.audioPlayerPlaceholderText}>Buscando audio...</Text>
                </View>
              )}
              {audioError && (
                <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={18} color={colors.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
                </View>
              )}
              
              {/* Botón Volver a Inicio dentro del contenido */}
              <View style={styles.goHomeButtonContainer}>
                <Button
                  title="🏠 Volver a Inicio"
                  onPress={handleGoHome}
                  buttonStyle={[styles.goHomeButton, responsiveStyles.responsiveButtonLarge, {
                    backgroundColor: colors.PRIMARY,
                    borderColor: colors.PRIMARY,
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
          {primaryImageSource ? (
              <Image
                 source={primaryImageSource}
                 style={styles.pieceImage}
                 resizeMode="cover"
                 defaultSource={placeholderLarge}
              />
          ) : (
              <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={80} color={colors.LIGHT_ACCENT} />
              </View>
          )}
           <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.overlayButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              </TouchableOpacity>
           </View>
           {showConfidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{marginLeft: 4}}/>
              </View>
           )}
        </View>

        {sliderItems.length > 0 && (
          <View style={styles.sliderSection}>
            <FlatList
              ref={sliderListRef}
              data={sliderItems}
              keyExtractor={(item, index) => `${sliderSlug || 'slider'}-${item.filename || index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.sliderList}
              renderItem={({ item }) => {
                const resolvedUri = getItemImageUri(item);
                const imageSource =
                  resolvedUri ? { uri: resolvedUri } : item.image || null;
                return (
                  <View style={styles.sliderImageWrapper}>
                    <View style={styles.sliderImageFrame}>
                      {imageSource ? (
                        <Image source={imageSource} style={styles.sliderImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.sliderImage, styles.sliderImagePlaceholder]}>
                          <Ionicons
                            name="image-outline"
                            size={40}
                            color={colors.LIGHT_ACCENT || '#cfd5e6'}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
              onViewableItemsChanged={sliderViewabilityRef.current}
              viewabilityConfig={sliderViewabilityConfig.current}
              decelerationRate="fast"
              snapToAlignment="center"
            />
            {sliderItems.length > 1 && (
              <View style={styles.sliderDots}>
                {sliderItems.map((_, index) => (
                  <View
                    key={`dot-${sliderSlug || 'slider'}-${index}`}
                    style={[
                      styles.sliderDot,
                      index === activeSlide && styles.sliderDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
            <View style={styles.sliderCaption}>
              <Text style={styles.sliderCaptionTitle}>
                {sliderMeta?.title || pieceName}
              </Text>
              {sliderMeta && (
                <Text style={styles.sliderCaptionSubtitle}>
                  {[sliderMeta.city, sliderMeta.country].filter(Boolean).join(' · ')}
                </Text>
              )}
              {sliderCurrentItem?.credit && (
                <Text style={styles.sliderCreditText} numberOfLines={2}>
                  {sliderCurrentItem.credit}
                </Text>
              )}
              {(sliderCurrentItem?.license || sliderCurrentItem?.author) && (
                <Text style={styles.sliderLicenseText} numberOfLines={1}>
                  {[sliderCurrentItem.license, sliderCurrentItem.author]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Contenedor Principal de Información */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{pieceName}</Text>
          {/* Display user-selected indicator if applicable */}
          {userSelected && (
            <Text style={styles.userSelectedText}>
              (Identificación seleccionada por el usuario)
            </Text>
          )}
          <Divider style={styles.divider} color={colors.LIGHT_ACCENT}/>

          {/* Selector de modo */}
          <View style={styles.audioModesContainer}>
            <Text style={styles.sectionTitle}>Modo de Audio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audioModeSelector}
            >
              {(audioModes || []).map(mode => (
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
                    color={selectedMode === mode.id ? '#fff' : colors.PRIMARY}
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
                onPlaybackComplete={handlePlaybackComplete}
              />
          ) : (
              <View style={styles.audioPlayerPlaceholder}>
                 <Text style={styles.audioPlayerPlaceholderText}>Buscando audio...</Text>
              </View>
          )}

          {/* Display Audio Error */}
          {audioError && (
              <View style={styles.audioErrorContainer}>
                  <Ionicons name="warning-outline" size={18} color={colors.SECONDARY} style={{marginRight: 8}}/>
                  <Text style={styles.audioErrorText} numberOfLines={2}>{audioError}</Text>
              </View>
          )}

          {/* --- NEW: Botón Volver a Inicio --- */}
          <Button
            title="Volver a Inicio"
            icon={<Ionicons name="home-outline" size={20} color={colors.PRIMARY} style={{marginRight: 8}} />}
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
const createStyles = (colors, fonts) => {
  const accentBase = colors.LIGHT_ACCENT || '#dfe7ff';
  const primaryColor = colors.PRIMARY || '#1a3c6e';
  const secondaryColor = colors.SECONDARY || '#ffb347';
  const darkAccent = colors.DARK_ACCENT || '#22304d';
  const textColor = colors.TEXT || '#0b1b3a';

  return StyleSheet.create({
  // ... (todos los estilos anteriores se mantienen) ...
  safeArea: {
    flex: 1,
    backgroundColor: colors.BACKGROUND || '#f1faee',
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    position: 'relative',
    backgroundColor: `${accentBase}40`,
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
       backgroundColor: `${accentBase}60`,
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
  sliderSection: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  sliderList: {
    width: '100%',
  },
  sliderImageWrapper: {
    width,
    paddingHorizontal: 20,
  },
  sliderImageFrame: {
    width: '100%',
    height: SLIDER_IMAGE_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: `${accentBase}40`,
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  sliderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${accentBase}55`,
  },
  sliderDots: {
    flexDirection: 'row',
    marginTop: 12,
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: `${accentBase}80`,
  },
  sliderDotActive: {
    backgroundColor: primaryColor,
  },
  sliderCaption: {
    marginTop: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sliderCaptionTitle: {
    fontFamily: 'railway',
    fontSize: 18,
    color: textColor,
  },
  sliderCaptionSubtitle: {
    fontFamily: 'industrial',
    fontSize: 13,
    color: darkAccent,
    marginTop: 2,
  },
  sliderCreditText: {
    fontFamily: 'industrial',
    fontSize: 12,
    color: textColor,
    textAlign: 'center',
    marginTop: 8,
  },
  sliderLicenseText: {
    fontFamily: 'industrial',
    fontSize: 11,
    color: darkAccent,
    textAlign: 'center',
    marginTop: 2,
  },
  infoContainer: {
    padding: 20,
    paddingTop: 15,
  },
  title: {
    fontSize: 28,
    color: textColor,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'railway',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: `${accentBase}80`,
  },
  audioModesContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    color: textColor,
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
    borderColor: `${primaryColor}90`,
  },
  audioModeSelected: {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
  },
  audioModeText: {
    fontSize: 14,
    color: primaryColor,
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
      backgroundColor: `${accentBase}30`,
      borderRadius: 15,
      padding: 20,
      marginTop: 10,
  },
  audioPlayerPlaceholderText: {
      fontFamily: 'industrial',
      color: darkAccent,
      textAlign: 'center',
      fontSize: 14,
  },
  audioErrorContainer: {
      marginTop: 15,
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: `${secondaryColor}20`,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10, // Espacio antes del botón de volver
  },
  audioErrorText: {
      flex: 1,
      color: secondaryColor,
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
    borderColor: primaryColor, // Borde color primario
    borderWidth: 1.5,
    borderRadius: 30, // Redondeado
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  goHomeButtonTitle: {
    color: primaryColor, // Texto color primario
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
    backgroundColor: colors.BACKGROUND || '#f1faee',
  },
  errorTitle: {
    fontSize: 24,
    color: textColor,
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'railway',
  },
  errorText: {
    fontSize: 16,
    color: darkAccent,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'industrial',
    lineHeight: 23,
  },
  errorButton: {
      backgroundColor: colors.PRIMARY,
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
    color: darkAccent,
    textAlign: 'center',
    marginTop: 0, // Adjusted to fit nicely below the title
    marginBottom: 12, // Space before the divider
    fontFamily: fonts?.industrial || 'sans-serif',
  },
  });
};

export default ResultScreen;
