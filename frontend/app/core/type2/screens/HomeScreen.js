import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

import { useTenant } from '../../shared/context/TenantContext.js';
import { useTriggerMode } from '../../shared/context/TriggerModeContext.js';
import { responsiveStyles } from '../../shared/styles/responsiveStyles.js';
import { useTenantMedia } from '../../shared/context/TenantMediaContext.js';
import { getAudioFileUrl } from '../../shared/services/apiService.js';

const { width, height } = Dimensions.get('window');
const FALLBACK_PLACEHOLDER_SMALL = require('../../shared/assets/images/placeholder_small.png');
const FALLBACK_PLACEHOLDER_LARGE = require('../../shared/assets/images/placeholder_large.png');

const DEFAULT_HERO_CHIPS = [
  { icon: 'navigate', label: 'Mapa interactivo' },
  { icon: 'headset', label: 'Audioguia automatica' },
];

const MAX_HISTORY_ITEMS = 6;
const buildManifestFallbackImages = (monument) => {
  if (!monument?.wikimedia_files?.length) return [];
  return monument.wikimedia_files.map((fileTitle) => {
    const clean = (fileTitle || '').replace(/^File:/i, '');
    const encoded = encodeURIComponent(clean);
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=1600`;
    return {
      filename: clean,
      title: monument?.title || clean,
      url,
      assetUrl: url,
      credit: [monument?.city, monument?.country].filter(Boolean).join(' · '),
    };
  });
};
const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.BACKGROUND || '#f1faee',
    },
    container: {
      flex: 1,
    },
    heroCard: {
      marginTop: height * 0.12,
      marginHorizontal: 20,
      borderRadius: 24,
      backgroundColor: '#fff',
      padding: 24,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    heroTextBlock: {
      flex: 2,
    },
    heroTitle: {
      fontSize: 30,
      fontFamily: 'railway',
      color: colors.PRIMARY || '#1F7A5C',
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.TEXT || '#1F2A37',
      fontFamily: 'industrial',
    },
    heroHighlights: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.LIGHT_ACCENT || '#CDE3D7',
      borderRadius: 16,
      marginRight: 12,
      marginBottom: 8,
    },
    heroChipText: {
      marginLeft: 6,
      fontFamily: 'industrial',
      color: colors.PRIMARY || '#1F7A5C',
    },
    heroImageWrapper: {
      flex: 1.2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 16,
    },
    heroImageBackdrop: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 20,
      backgroundColor: colors.ACCENT || '#F6F8F2',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
    },
    heroSlideMeta: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    heroSlideTitle: {
      color: '#fff',
      fontSize: 14,
      fontFamily: 'railway',
    },
    heroSlideSubtitle: {
      color: '#e5e7eb',
      fontSize: 12,
      fontFamily: 'industrial',
      marginTop: 2,
    },
    heroDots: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      flexDirection: 'row',
    },
    heroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 3,
      backgroundColor: '#ffffff55',
    },
    heroDotActive: {
      backgroundColor: colors.SECONDARY || '#FFCC00',
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
    },
    statCard: {
      flexBasis: '31%',
      marginHorizontal: 6,
      marginVertical: 6,
      backgroundColor: '#fff',
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'railway',
      color: colors.PRIMARY || '#1F7A5C',
    },
    statLabel: {
      fontSize: 13,
      fontFamily: 'industrial',
      color: colors.TEXT || '#1F2A37',
    },
    statCaption: {
      fontSize: 11,
      fontFamily: 'industrial',
      color: '#6b7280',
      marginTop: 2,
    },
    actionContainer: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 20,
    },
    scanButton: {
      backgroundColor: colors.PRIMARY || '#1F7A5C',
      paddingHorizontal: 40,
      paddingVertical: 14,
      borderRadius: 32,
      shadowColor: colors.PRIMARY || '#1F7A5C',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    section: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionLink: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionLinkText: {
      fontSize: 13,
      fontFamily: 'industrial',
      color: colors.PRIMARY || '#1F7A5C',
      marginRight: 4,
    },
    sectionTitle: {
      fontSize: 18,
      color: colors.TEXT || '#1F2A37',
      marginBottom: 10,
      fontWeight: '600',
      fontFamily: 'railway',
    },
    sectionDescription: {
      fontSize: 14,
      fontFamily: 'industrial',
      color: '#4b5563',
      lineHeight: 20,
      marginBottom: 12,
    },
    homeIntroPlayer: {
      borderWidth: 1,
      borderColor: `${colors.PRIMARY || '#1F7A5C'}22`,
      borderRadius: 16,
      padding: 12,
      backgroundColor: '#fff',
    },
    homeIntroButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    homeIntroButtonText: {
      marginLeft: 10,
      fontFamily: 'industrial',
      fontSize: 15,
      color: colors.PRIMARY || '#1F7A5C',
    },
    itineraryScroller: {
      paddingVertical: 4,
      paddingRight: 20,
    },
    itineraryCard: {
      width: 200,
      marginRight: 14,
      padding: 14,
      borderRadius: 18,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: `${colors.PRIMARY || '#1F7A5C'}22`,
    },
    itineraryBadge: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: `${colors.SECONDARY || '#1B4B9B'}11`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    itineraryBadgeText: {
      fontFamily: 'railway',
      fontSize: 16,
      color: colors.SECONDARY || '#1B4B9B',
    },
    itineraryName: {
      fontSize: 15,
      fontFamily: 'railway',
      color: colors.TEXT || '#1F2A37',
    },
    itineraryDescription: {
      marginTop: 4,
      fontSize: 12,
      fontFamily: 'industrial',
      color: '#6b7280',
    },
    modeSelector: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      elevation: 2,
    },
    modeOption: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: 5,
    },
    modeOptionSelected: {
      backgroundColor: `${colors.PRIMARY || '#1F7A5C'}1A`,
      borderRadius: 8,
    },
    modeText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.DARK_ACCENT || '#155244',
      fontFamily: 'industrial',
    },
    modeTextSelected: {
      color: colors.PRIMARY || '#1F7A5C',
      fontWeight: '600',
    },
    recentPiecesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    recentPieceCard: {
      width: (width - 55) / 2,
      backgroundColor: '#fff',
      borderRadius: 10,
      marginBottom: 15,
      overflow: 'hidden',
      elevation: 2,
    },
    recentPieceImage: {
      width: '100%',
      height: 100,
      backgroundColor: '#eee',
    },
    recentPieceInfo: {
      padding: 8,
    },
    recentPieceTitle: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'industrial',
    },
    footer: {
      alignItems: 'center',
      marginTop: 30,
    },
    footerText: {
      fontSize: 12,
      color: '#999',
      fontFamily: 'industrial',
    },
    triggerModeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 18,
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    triggerModeCopy: {
      flex: 1,
      marginRight: 12,
    },
    triggerModeTitle: {
      fontSize: 16,
      fontFamily: 'railway',
      color: colors.PRIMARY || '#1F7A5C',
      marginBottom: 4,
    },
    triggerModeDescription: {
      fontSize: 13,
      fontFamily: 'industrial',
      color: colors.TEXT || '#1F2A37',
    },
  });

const HomeScreen = ({ navigation }) => {
  const { config, type, id: tenantId } = useTenant();
  const [selectedMode, setSelectedMode] = useState('normal');
  const [recentPieces, setRecentPieces] = useState([]);
  const { mode: triggerMode, setMode: setTriggerMode } = useTriggerMode();
  const isAutoMode = triggerMode === 'auto';

  const colors = config.COLORS || {};
  const styles = useMemo(() => createStyles(colors), [colors]);
  const audioModes = config.AUDIO_MODES || [];
  const isGpsTenant = type === 'type2' || config.FRONTEND_MODE === 'gps';
  const { data: mediaData } = useTenantMedia();
  const sliderMonuments = Array.isArray(mediaData?.sliderManifest?.monuments)
    ? mediaData.sliderManifest.monuments
    : [];
  const sliderManifestMap = useMemo(() => {
    const map = {};
    sliderMonuments.forEach((item) => {
      if (item?.slug) {
        map[item.slug] = item;
      }
    });
    return map;
  }, [sliderMonuments]);
  const monumentsMedia = mediaData?.monuments || {};
  const heroSlugsFromMedia = mediaData?.heroSlugs || [];

  const fallbackMonuments = Array.isArray(config.GPS?.fallbackMonuments)
    ? config.GPS.fallbackMonuments
    : Object.values(config.GPS?.fallbackMonuments || {});
  const coordinatesMap = useMemo(() => {
    const map = {};
    fallbackMonuments.forEach((monument) => {
      if (monument?.id) {
        map[monument.id] = monument;
      }
    });
    return map;
  }, [fallbackMonuments]);

  const heroSlides = useMemo(() => {
    const desiredSlugs = Array.isArray(config.HERO_SLUGS) && config.HERO_SLUGS.length
      ? config.HERO_SLUGS
      : heroSlugsFromMedia;
    const slides = [];

    const pushSlide = (slug, entry, index = 0, metaOverride = null) => {
      const meta = metaOverride || sliderManifestMap[slug] || monumentsMedia[slug];
      const title = meta?.title || entry?.title || slug;
      const subtitleParts = [meta?.city, meta?.country].filter(Boolean);
      const subtitle = subtitleParts.join(' · ');
      const assetUri = entry?.assetUrl || entry?.url || entry?.originalUrl || null;
      const imageSource =
        assetUri
          ? { uri: assetUri }
          : config.ASSETS?.heroBanner ||
            config.ASSETS?.placeholderLarge ||
            FALLBACK_PLACEHOLDER_LARGE;

      slides.push({
        key: `${slug}-${index}`,
        slug,
        title,
        subtitle,
        imageSource,
      });
    };

    desiredSlugs.forEach((slug) => {
      if (!slug) return;
      const mediaEntry = monumentsMedia[slug];
      const availableImages = Array.isArray(mediaEntry?.images) && mediaEntry.images.length
        ? mediaEntry.images
        : buildManifestFallbackImages(sliderManifestMap[slug]);
      if (availableImages.length) {
        availableImages.slice(0, 2).forEach((entry, index) =>
          pushSlide(slug, entry, index, sliderManifestMap[slug])
        );
      }
    });

    if (!slides.length && config.ASSETS?.heroBanner) {
      slides.push({
        key: 'default-hero',
        slug: 'hero',
        title: config.PARK_INFO?.name || config.APP_NAME || 'Audioguia',
        subtitle: config.PARK_INFO?.location || '',
        imageSource:
          config.ASSETS?.heroBanner ||
          config.ASSETS?.placeholderLarge ||
          FALLBACK_PLACEHOLDER_LARGE,
      });
    }

    return slides.length ? slides.slice(0, 6) : slides;
  }, [
    config.ASSETS?.heroBanner,
    config.ASSETS?.placeholderLarge,
    config.HERO_SLUGS,
    heroSlugsFromMedia,
    monumentsMedia,
    sliderManifestMap,
  ]);
  const homeIntro = config.HOME_INTRO_AUDIO;
  const homeIntroAudioUrl = useMemo(() => {
    if (!homeIntro?.pieceId || !tenantId) return null;
    const mode = homeIntro.mode || 'normal';
    const language = homeIntro.language || 'es';
    try {
      return getAudioFileUrl(tenantId, homeIntro.pieceId, mode, language);
    } catch (error) {
      console.warn('HomeScreen: Failed to build intro audio URL', error);
      return null;
    }
  }, [homeIntro, tenantId]);
  const homeIntroSoundRef = useRef(null);
  const [isPlayingHomeIntro, setIsPlayingHomeIntro] = useState(false);
  const [isLoadingHomeIntro, setIsLoadingHomeIntro] = useState(false);
  useEffect(() => {
    return () => {
      if (homeIntroSoundRef.current) {
        homeIntroSoundRef.current.unloadAsync().catch(() => {});
        homeIntroSoundRef.current = null;
      }
    };
  }, [homeIntroAudioUrl]);
  const itinerarySectionTitle =
    config.ITINERARY_SECTION_TITLE || 'Itinerario del recorrido';
  const ensureHomeIntroSound = async () => {
    if (homeIntroSoundRef.current) return homeIntroSoundRef.current;
    if (!homeIntroAudioUrl) return null;
    const { sound } = await Audio.Sound.createAsync(
      { uri: homeIntroAudioUrl },
      { shouldPlay: false },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        setIsPlayingHomeIntro(false);
        sound.setPositionAsync(0).catch(() => {});
      }
    });
    homeIntroSoundRef.current = sound;
    return sound;
  };

  const handleToggleHomeIntro = async () => {
    if (Platform.OS === 'web') return;
    if (!homeIntroAudioUrl) return;
    setIsLoadingHomeIntro(true);
    try {
      const sound = await ensureHomeIntroSound();
      if (!sound) return;
      if (isPlayingHomeIntro) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setIsPlayingHomeIntro(false);
      } else {
        await sound.replayAsync();
        setIsPlayingHomeIntro(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo reproducir el audio de bienvenida.');
    } finally {
      setIsLoadingHomeIntro(false);
    }
  };

  const handleItineraryPress = (stop) => {
    if (!stop?.id) return;
    const coordinatesEntry = coordinatesMap[stop.id];
    navigation.navigate('ResultScreen', {
      recognitionResult: {
        pieceName: stop.id,
        slug: stop.id,
        title: stop.name,
        userSelected: true,
        triggeredBy: 'home-itinerary',
        coordinates: coordinatesEntry?.coordinates,
      },
      audioMode: selectedMode,
    });
  };
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const heroAutoTimer = useRef(null);

  useEffect(() => {
    setHeroSlideIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    heroAutoTimer.current = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => {
      if (heroAutoTimer.current) {
        clearInterval(heroAutoTimer.current);
        heroAutoTimer.current = null;
      }
    };
  }, [heroSlides.length]);

  const currentHeroSlide = heroSlides[heroSlideIndex] || null;
  const heroIllustration =
    currentHeroSlide?.imageSource ||
    config.ASSETS?.heroBanner ||
    config.ASSETS?.placeholderLarge ||
    FALLBACK_PLACEHOLDER_LARGE;
  const placeholderSmall =
    config.ASSETS?.placeholderSmall || FALLBACK_PLACEHOLDER_SMALL;

  const heroTitle = config.PARK_INFO?.name || config.APP_NAME || 'Audio Guide';
  const heroSubtitle =
    config.PARK_INFO?.description ||
    'Explora y deja que la audioguia se active automaticamente.';
  const heroChips = config.HERO_CHIPS || DEFAULT_HERO_CHIPS;
  const itineraryStops = (config.ITINERARY_STOPS || []).slice().sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  });
  const totalMonuments =
    config.ITINERARY_TOTAL_STOPS || itineraryStops.length || 18;
  const itineraryLengthKm = config.ITINERARY_LENGTH_KM || 2.9;
  const itineraryDurationMin = config.ITINERARY_DURATION_MIN || 45;
  const stats = [
    { label: 'Paradas', value: totalMonuments, caption: 'monumentos' },
    {
      label: 'Recorrido',
      value: `${itineraryLengthKm.toFixed(1)} km`,
      caption: 'ruta completa',
    },
    {
      label: 'Tiempo',
      value: `${itineraryDurationMin} min`,
      caption: 'aprox. caminando',
    },
  ];

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedMode();
      if (Platform.OS === 'web') {
        setTimeout(loadRecentPieces, 100);
      } else {
        loadRecentPieces();
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadSelectedMode();
    loadRecentPieces();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    const handleHistoryUpdate = (event) => {
      if (event.detail?.history) {
        const valid = event.detail.history.filter((item) => item.pieceName);
        setRecentPieces(valid.slice(0, MAX_HISTORY_ITEMS));
        return;
      }
      setTimeout(loadRecentPieces, 100);
    };

    const handleSimpleHistoryUpdate = () => setTimeout(loadRecentPieces, 100);

    window.addEventListener('historyUpdated', handleHistoryUpdate);
    window.addEventListener('historyUpdated', handleSimpleHistoryUpdate);

    return () => {
      window.removeEventListener('historyUpdated', handleHistoryUpdate);
      window.removeEventListener('historyUpdated', handleSimpleHistoryUpdate);
    };
  }, []);

  const loadSelectedMode = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedAudioMode');
      setSelectedMode(saved || 'normal');
    } catch (error) {
      console.error('Error loading selected mode:', error);
    }
  };

  const loadRecentPieces = async () => {
    try {
      let historyString;
      if (Platform.OS === 'web') {
        historyString = localStorage.getItem('recognitionHistory');
      } else {
        historyString = await AsyncStorage.getItem('recognitionHistory');
      }

      const items = historyString ? JSON.parse(historyString) : [];
      const validItems = items.filter((item) => item.pieceName);
      setRecentPieces(validItems.slice(0, MAX_HISTORY_ITEMS));
    } catch (error) {
      console.error('Error loading history:', error);
      setRecentPieces([]);
    }
  };

  const handleModeSelection = async (mode) => {
    setSelectedMode(mode);
    try {
      await AsyncStorage.setItem('selectedAudioMode', mode);
    } catch (error) {
      console.error('Error saving audio mode preference:', error);
    }
  };

  const handlePrimaryAction = () => {
    if (isGpsTenant) {
      navigation.navigate('Mapa');
    } else {
      navigation.navigate('Camara', { screen: 'CameraCapture' });
    }
  };

  const handleOpenPieceDetails = (piece) => {
    if (piece.pieceName && piece.imageUri) {
      navigation.navigate('ResultScreen', {
        recognitionResult: {
          pieceName: piece.pieceName,
          confidence: piece.confidence || null,
          slug: piece.slug || null,
        },
        imageUri: piece.imageUri,
        audioMode: selectedMode,
      });
      return;
    }

    Alert.alert('Error', 'No se pudieron cargar los detalles de esta pieza.');
  };

  const handleTriggerModeToggle = (value) => {
    setTriggerMode(value ? 'auto' : 'manual');
  };

  const primaryActionLabel =
    config.PRIMARY_ACTION_LABEL ||
    (isGpsTenant ? 'Abrir mapa del parque' : 'Escanear monumento');
  const primaryActionIcon = isGpsTenant ? 'map-outline' : 'camera-outline';

  return (
    <SafeAreaView
      style={Platform.OS === 'web' ? responsiveStyles.responsiveSafeArea : styles.safeArea}
    >
      <ScrollView
        style={Platform.OS === 'web' ? responsiveStyles.responsiveScrollView : styles.container}
        contentContainerStyle={
          Platform.OS === 'web' ? responsiveStyles.responsiveScrollContent : { paddingBottom: 30 }
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            <View style={styles.heroHighlights}>
              {heroChips.map((chip) => (
                <View key={chip.label} style={styles.heroChip}>
                  <Ionicons name={chip.icon} size={16} color={colors.PRIMARY || '#1F7A5C'} />
                  <Text style={styles.heroChipText}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.heroImageWrapper}>
            <View style={styles.heroImageBackdrop}>
              <Image source={heroIllustration} style={styles.heroImage} resizeMode="cover" />
              {currentHeroSlide ? (
                <View style={styles.heroSlideMeta}>
                  <Text style={styles.heroSlideTitle} numberOfLines={1}>
                    {currentHeroSlide.title}
                  </Text>
                  {currentHeroSlide.subtitle ? (
                    <Text style={styles.heroSlideSubtitle} numberOfLines={1}>
                      {currentHeroSlide.subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {heroSlides.length > 1 && (
                <View style={styles.heroDots}>
                  {heroSlides.map((slide, index) => (
                    <TouchableOpacity
                      key={slide.key}
                      style={[
                        styles.heroDot,
                        index === heroSlideIndex && styles.heroDotActive,
                      ]}
                      onPress={() => setHeroSlideIndex(index)}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {homeIntroAudioUrl ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{homeIntro?.title || 'Bienvenida sonora'}</Text>
            {homeIntro?.description ? (
              <Text style={styles.sectionDescription}>{homeIntro.description}</Text>
            ) : null}
            {Platform.OS === 'web' ? (
              <View style={styles.homeIntroPlayer}>
                <audio controls src={homeIntroAudioUrl} style={{ width: '100%' }} />
              </View>
            ) : (
              <View style={styles.homeIntroPlayer}>
                <TouchableOpacity
                  style={styles.homeIntroButton}
                  onPress={handleToggleHomeIntro}
                  disabled={isLoadingHomeIntro}
                >
                  <Ionicons
                    name={isPlayingHomeIntro ? 'pause-circle' : 'play-circle'}
                    size={36}
                    color={colors.PRIMARY || '#1F7A5C'}
                  />
                  <Text style={styles.homeIntroButtonText}>
                    {isPlayingHomeIntro ? 'Detener' : 'Escuchar bienvenida'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {isGpsTenant && (
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statCaption}>{stat.caption}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionContainer}>
          <Button
            title={primaryActionLabel}
            icon={
              <Ionicons
                name={primaryActionIcon}
                size={20}
                style={{ marginRight: 8 }}
                color="#fff"
              />
            }
            onPress={handlePrimaryAction}
            buttonStyle={[styles.scanButton, responsiveStyles.responsiveButtonLarge]}
            titleStyle={{ color: '#fff', fontFamily: 'railway' }}
          />
        </View>

        {isGpsTenant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modo del mapa</Text>
            <View style={styles.triggerModeCard}>
              <View style={styles.triggerModeCopy}>
                <Text style={styles.triggerModeTitle}>
                  {isAutoMode ? 'Activación automática' : 'Control manual'}
                </Text>
                <Text style={styles.triggerModeDescription}>
                  {isAutoMode
                    ? 'Los audios se abrirán solos al acercarte a cada parada.'
                    : 'Abre cada monumento desde el mapa o la lista cuando quieras.'}
                </Text>
              </View>
              <Switch
                value={isAutoMode}
                onValueChange={handleTriggerModeToggle}
                thumbColor={isAutoMode ? colors.PRIMARY || '#1F7A5C' : '#f4f3f4'}
                trackColor={{ false: '#d5d5d5', true: `${colors.PRIMARY || '#1F7A5C'}44` }}
              />
            </View>
          </View>
        )}

        {isGpsTenant && itineraryStops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{itinerarySectionTitle}</Text>
              <TouchableOpacity
                style={styles.sectionLink}
                onPress={() => navigation.navigate('Mapa')}
              >
                <Text style={styles.sectionLinkText}>Ver en el mapa</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.PRIMARY || '#1F7A5C'} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itineraryScroller}
            >
              {itineraryStops.map((stop, index) => (
                <TouchableOpacity
                  key={stop.id || stop.name || index}
                  style={styles.itineraryCard}
                  onPress={() => handleItineraryPress(stop)}
                >
                  <View style={styles.itineraryBadge}>
                    <Text style={styles.itineraryBadgeText}>
                      {(stop.order || index + 1).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.itineraryName}>{stop.name}</Text>
                  {stop.description ? (
                    <Text style={styles.itineraryDescription}>{stop.description}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de audio</Text>
          <View style={styles.modeSelector}>
            {audioModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  selectedMode === mode.id && styles.modeOptionSelected,
                  responsiveStyles.responsiveButton,
                ]}
                onPress={() => handleModeSelection(mode.id)}
              >
                <Ionicons
                  name={mode.icon}
                  size={24}
                  color={selectedMode === mode.id ? colors.PRIMARY || '#1F7A5C' : colors.DARK_ACCENT || '#155244'}
                />
                <Text
                  style={[
                    styles.modeText,
                    selectedMode === mode.id && styles.modeTextSelected,
                    { fontFamily: 'industrial' },
                  ]}
                >
                  {mode.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {recentPieces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escuchados recientemente</Text>
            <View style={styles.recentPiecesContainer}>
              {recentPieces.map((piece, index) => (
                <TouchableOpacity
                  key={`${piece.pieceName}-${index}`}
                  style={[styles.recentPieceCard, responsiveStyles.responsiveCard]}
                  onPress={() => handleOpenPieceDetails(piece)}
                >
                  <Image
                    source={piece.imageUri ? { uri: piece.imageUri } : placeholderSmall}
                    style={styles.recentPieceImage}
                    defaultSource={placeholderSmall}
                  />
                  <View style={styles.recentPieceInfo}>
                    <Text style={styles.recentPieceTitle} numberOfLines={2}>
                      {piece.pieceName || 'Nombre desconocido'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 {config.APP_NAME || 'Audio Guide'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
