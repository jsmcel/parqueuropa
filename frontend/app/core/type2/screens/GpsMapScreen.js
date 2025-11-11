import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useTenant } from '../../shared/context/TenantContext.js';
import { useTriggerMode } from '../../shared/context/TriggerModeContext.js';
import { usePlayback } from '../../shared/context/PlaybackContext.js';
import { fetchAllCoordinates } from '../services/gpsApi.js';

const DEFAULT_RADIUS_METERS = 35;

const toArrayFromObject = (obj = {}) =>
  Object.entries(obj).map(([id, value]) => ({
    id,
    ...(value || {}),
  }));

const assignIdentifiers = (items = []) =>
  items
    .filter((item) => !!item)
    .map((item, index) => {
      const identifier = item.id || item.slug || item.identifier;
      return {
        ...item,
        id: identifier || `monument-${index + 1}`,
      };
    });

const normalizeMonumentsPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return assignIdentifiers(payload);
  }
  if (typeof payload === 'object') {
    if (payload.monuments) {
      return normalizeMonumentsPayload(payload.monuments);
    }
    return assignIdentifiers(toArrayFromObject(payload));
  }
  return [];
};

const toLeafletHtml = (
  monuments,
  userLocation,
  nearest,
  radiusMeters,
  colors = {},
  { enableParentMessaging = false } = {},
) => {
  const primaryHex = (colors.PRIMARY || '#2E8B57').replace('#', '');
  const goldHex = (colors.GOLD || '#FFD700').replace('#', '');
  const markers = (monuments || []).map((monument) => ({
    id: monument.id,
    name: monument.name || monument.id,
    lat: monument.coordinates?.latitude,
    lng: monument.coordinates?.longitude,
    country: monument.original_country || '',
    city: monument.original_city || '',
  })).filter((marker) => typeof marker.lat === 'number' && typeof marker.lng === 'number');

  const user = userLocation
    ? { lat: userLocation.latitude, lng: userLocation.longitude }
    : null;

  const highlightedId = nearest?.id || null;
  const parentMessagingFlag = enableParentMessaging ? 'true' : 'false';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          #map { width: 100%; height: 100%; }
          .leaflet-tooltip { font-size: 13px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const markers = ${JSON.stringify(markers)};
          const user = ${user ? JSON.stringify(user) : 'null'};
          const highlightedId = ${highlightedId ? `'${highlightedId}'` : 'null'};
          const triggerRadius = ${radiusMeters};
          const canUseParentMessaging = ${parentMessagingFlag};

          const postSelectionMessage = (payload) => {
            const message = JSON.stringify(payload);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(message);
            } else if (canUseParentMessaging && window.parent) {
              window.parent.postMessage(message, '*');
            }
          };

          function init() {
            const map = L.map('map', { zoomControl: true, attributionControl: true });

            if (markers.length === 0 && !user) {
              map.setView([0, 0], 2);
            }

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            const markerPoints = [];

            markers.forEach((marker) => {
              const isHighlighted = highlightedId && marker.id === highlightedId;
              const circle = L.circleMarker([marker.lat, marker.lng], {
                radius: isHighlighted ? 11 : 7,
                color: isHighlighted ? '#${goldHex}' : '#${primaryHex}',
                weight: isHighlighted ? 3 : 2,
                fillColor: isHighlighted ? '#${goldHex}' : '#${primaryHex}',
                fillOpacity: 0.85,
              }).addTo(map);

              circle.bindTooltip('<div>' + marker.name + '</div>', { permanent: false, direction: 'top' });

              circle.on('click', () => {
                postSelectionMessage({
                  type: 'MARKER_SELECTED',
                  monumentId: marker.id,
                });
              });

              markerPoints.push([marker.lat, marker.lng]);
            });

            if (user) {
              const userMarker = L.circleMarker([user.lat, user.lng], {
                radius: 8,
                color: '#1E90FF',
                weight: 2,
                fillColor: '#1E90FF',
                fillOpacity: 0.9,
              }).addTo(map);
              userMarker.bindTooltip('<div>Estás aquí</div>', { permanent: false, direction: 'top' });
              markerPoints.push([user.lat, user.lng]);

              if (triggerRadius > 0) {
                L.circle([user.lat, user.lng], {
                  radius: triggerRadius,
                  color: '#1E90FF',
                  weight: 1,
                  fillOpacity: 0.05,
                }).addTo(map);
              }
            }

            if (user && highlightedId) {
              const nearest = markers.find((marker) => marker.id === highlightedId);
              if (nearest) {
                L.polyline([
                  [user.lat, user.lng],
                  [nearest.lat, nearest.lng]
                ], {
                  color: '#${goldHex}',
                  weight: 3,
                  dashArray: '6,6'
                }).addTo(map);
              }
            }

            if (markerPoints.length > 0) {
              map.fitBounds(markerPoints, { padding: [40, 40], maxZoom: 18 });
            } else {
              map.setView([40.4581, -3.4708], 15);
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
          } else {
            init();
          }
        </script>
      </body>
    </html>
  `;
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (distance) => {
  if (distance == null) return '—';
  if (distance < 100) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(2)} km`;
};

const GpsMapScreen = ({ navigation, tenantConfig }) => {
  const { config } = useTenant();
  const colors = config.COLORS || {};
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gpsSettings = config.GPS || tenantConfig?.gps || {};
  const triggerRadius =
    gpsSettings.defaultTriggerRadiusMeters || DEFAULT_RADIUS_METERS;
  const isWeb = Platform.OS === 'web';
  const fallbackMonumentsConfig = gpsSettings?.fallbackMonuments;
  const fallbackMonuments = useMemo(
    () => normalizeMonumentsPayload(fallbackMonumentsConfig),
    [fallbackMonumentsConfig],
  );

  const [monuments, setMonuments] = useState(() =>
    fallbackMonuments.length ? fallbackMonuments : [],
  );
  const [isLoading, setIsLoading] = useState(!fallbackMonuments.length);
  const [loadError, setLoadError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [nearestMonument, setNearestMonument] = useState(null);
  const [isWebMapLoaded, setIsWebMapLoaded] = useState(!isWeb);
  const [pendingAutoMessage, setPendingAutoMessage] = useState(null);
  const { mode: triggerMode } = useTriggerMode();
  const isAutoMode = triggerMode === 'auto';
  const { isPlaying } = usePlayback();
  const iframeStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      border: '0',
      backgroundColor: 'transparent',
    }),
    [],
  );

  const watchSubscriptionRef = useRef(null);
  const lastTriggeredRef = useRef(null);
  const pendingMonumentRef = useRef(null);

  useEffect(() => {
    if (!isAutoMode) {
      pendingMonumentRef.current = null;
      setPendingAutoMessage(null);
    }
  }, [isAutoMode]);

  useEffect(() => {
    let isMounted = true;

    const tryUseFallback = () => {
      if (!isMounted || !fallbackMonuments.length) {
        return false;
      }
      setMonuments(fallbackMonuments);
      setLoadError(null);
      return true;
    };

    const loadMonuments = async () => {
      if (!fallbackMonuments.length) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const response = await fetchAllCoordinates();
        if (!isMounted) return;

        const remoteMonuments = normalizeMonumentsPayload(response);
        if (remoteMonuments.length) {
          setMonuments(remoteMonuments);
        } else if (!tryUseFallback()) {
          setMonuments([]);
          setLoadError('No se pudieron cargar las coordenadas.');
        }
      } catch (error) {
        console.error('GpsMapScreen: Error loading coordinates', error);
        if (!tryUseFallback() && isMounted) {
          setMonuments([]);
          setLoadError('No se pudieron cargar las coordenadas.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMonuments();

    return () => {
      isMounted = false;
    };
  }, [fallbackMonuments]);

  const navigateToMonument = useCallback((monument, manualSelection) => {
    if (!monument) return;

    pendingMonumentRef.current = null;
    setPendingAutoMessage(null);

    navigation.navigate('ResultScreen', {
      recognitionResult: {
        pieceName: monument.id,
        confidence: 1,
        userSelected: manualSelection,
        triggeredBy: 'gps',
        coordinates: monument.coordinates,
      },
      audioMode: 'normal',
    });
  }, [navigation, setPendingAutoMessage]);

  const evaluateProximity = useCallback((coords, referenceMonuments) => {
    const points = referenceMonuments || monuments;
    if (!coords || !Array.isArray(points) || points.length === 0) {
      setNearestMonument(null);
      return;
    }

    let nearest = null;
    let minDistance = Number.POSITIVE_INFINITY;

    points.forEach((monument) => {
      const { coordinates } = monument || {};
      if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
        const distance = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          coordinates.latitude,
          coordinates.longitude,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = { ...monument, distance };
        }
      }
    });

    setNearestMonument(nearest);

    if (!nearest) return;

    const lastTriggered = lastTriggeredRef.current;

    if (nearest.distance <= triggerRadius) {
      if (!isAutoMode) {
        return;
      }

      if (isPlaying) {
        pendingMonumentRef.current = nearest;
        setPendingAutoMessage(
          `Reproducción en curso. Abriremos ${nearest.name || nearest.id} al terminar.`,
        );
        lastTriggeredRef.current = { id: nearest.id, distance: nearest.distance };
        return;
      }

      if (!lastTriggered || lastTriggered.id !== nearest.id) {
        lastTriggeredRef.current = { id: nearest.id, distance: nearest.distance };
        setPendingAutoMessage(null);
        navigateToMonument(nearest, false);
      } else {
        lastTriggeredRef.current = { ...lastTriggered, distance: nearest.distance };
      }
    } else if (lastTriggered && lastTriggered.id === nearest.id && nearest.distance > triggerRadius * 1.5) {
      lastTriggeredRef.current = null;
    }
  }, [monuments, triggerRadius, isAutoMode, isPlaying, navigateToMonument]);

  useEffect(() => {
    if (!monuments.length) return undefined;

    if (Platform.OS === 'web') {
      const hasGeolocation = typeof navigator !== 'undefined' && !!navigator.geolocation;
      if (!hasGeolocation) {
        setLocationStatus('unsupported');
        setLoadError('Tu navegador no soporta geolocalización. Usa HTTPS o un navegador compatible.');
        return () => {};
      }

      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setLocationStatus('denied');
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            setLocationStatus('granted');
          } else if (result.state === 'denied') {
            setLocationStatus('denied');
          }
        };
      }).catch(() => {});
    }

    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          setLocationStatus('denied');
          if (Platform.OS !== 'web') {
            Alert.alert(
              'Permiso de ubicación requerido',
              'Necesitamos acceder a tu ubicación para activar las audioguías cercanas.',
            );
          }
          return;
        }

        setLocationStatus('granted');

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        const initialCoords = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };

        setUserLocation(initialCoords);
        evaluateProximity(initialCoords, monuments);

        watchSubscriptionRef.current = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 5,
          timeInterval: 4000,
        }, (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          evaluateProximity(coords, monuments);
        });
      } catch (error) {
        console.error('GpsMapScreen: Error obtaining location', error);
        setLocationStatus('error');
        Alert.alert('Error de ubicación', 'No pudimos acceder a tu ubicación.');
      }
    };

    requestLocation();

    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, [monuments, evaluateProximity]);

  useEffect(() => {
    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, []);

  const handleMarkerSelectionPayload = useCallback((payload) => {
    if (!payload || payload.type !== 'MARKER_SELECTED' || !payload.monumentId) {
      return;
    }
    const monument = monuments.find((item) => item.id === payload.monumentId);
    if (monument) {
      lastTriggeredRef.current = { id: monument.id, distance: 0 };
      navigateToMonument(monument, true);
    }
  }, [monuments, navigateToMonument]);

  const handleMarkerSelected = useCallback((event) => {
    try {
      const rawData = event?.nativeEvent?.data ?? event?.data ?? event;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      handleMarkerSelectionPayload(data);
    } catch (error) {
      console.warn('GpsMapScreen: Error handling map message', error);
    }
  }, [handleMarkerSelectionPayload]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;

    const listener = (event) => handleMarkerSelected(event);
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [isWeb, handleMarkerSelected]);

  useEffect(() => {
    if (!isAutoMode) return;
    if (!isPlaying && pendingMonumentRef.current) {
      const pending = pendingMonumentRef.current;
      pendingMonumentRef.current = null;
      setPendingAutoMessage(null);
      navigateToMonument(pending, false);
    }
  }, [isAutoMode, isPlaying, navigateToMonument]);

  const sortedMonuments = useMemo(() => {
    if (!Array.isArray(monuments)) return [];

    return monuments
      .map((monument) => {
        const distance = (userLocation && monument.coordinates)
          ? calculateDistanceMeters(
              userLocation.latitude,
              userLocation.longitude,
              monument.coordinates.latitude,
              monument.coordinates.longitude,
            )
          : null;

        return { ...monument, distance };
      })
      .sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
  }, [monuments, userLocation]);

  const mapHtml = useMemo(
    () =>
      toLeafletHtml(
        sortedMonuments,
        userLocation,
        nearestMonument,
        triggerRadius,
        colors,
        { enableParentMessaging: isWeb },
      ),
    [sortedMonuments, userLocation, nearestMonument, triggerRadius, colors, isWeb],
  );

  const iframeSrc = useMemo(() => {
    if (!isWeb || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return null;
    }
    try {
      const blob = new Blob([mapHtml], { type: 'text/html' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('GpsMapScreen: Unable to create blob URL for map', error);
      return null;
    }
  }, [isWeb, mapHtml]);

  useEffect(() => {
    if (!iframeSrc || typeof URL === 'undefined') return undefined;
    return () => {
      URL.revokeObjectURL(iframeSrc);
    };
  }, [iframeSrc]);

  const handleManualSelect = useCallback((monument) => {
    lastTriggeredRef.current = { id: monument.id, distance: 0 };
    navigateToMonument(monument, true);
  }, [navigateToMonument]);

  useEffect(() => {
    if (isWeb) {
      setIsWebMapLoaded(false);
    }
  }, [isWeb, iframeSrc, mapHtml]);

  const renderStatus = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY || '#2E8B57'} />
          <Text style={styles.loaderText}>Cargando mapa y rutas...</Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.loaderContainer}>
          <Ionicons name="alert-circle" size={32} color="red" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      );
    }

    if (locationStatus === 'unsupported') {
      return (
        <View style={styles.loaderContainer}>
          <Ionicons name="location" size={32} color={colors.PRIMARY || '#2E8B57'} />
          <Text style={styles.errorText}>Este navegador no soporta geolocalización. Usa HTTPS o un navegador compatible.</Text>
        </View>
      );
    }

    if (locationStatus === 'denied') {
      return (
        <View style={styles.loaderContainer}>
          <Ionicons name="location" size={32} color={colors.PRIMARY || '#2E8B57'} />
          <Text style={styles.errorText}>Activa los permisos de ubicación para ver el mapa interactivo.</Text>
          {Platform.OS === 'web' && (
            <Text style={styles.infoHint}>En el navegador, ve al icono del candado y permite “Ubicación”.</Text>
          )}
        </View>
      );
    }

    return null;
  };

  const statusContent = renderStatus();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Parque Europa</Text>
          <Text style={styles.subtitle}>Sigue la ruta, descubre monumentos y escucha sus historias</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={colors.PRIMARY || '#2E8B57'} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {statusContent || (
          isWeb ? (
            <View style={styles.webMapWrapper}>
              {!isWebMapLoaded && (
                <View style={styles.webMapOverlay}>
                  <ActivityIndicator size="large" color={colors.PRIMARY || '#2E8B57'} />
                  <Text style={styles.loaderText}>Preparando mapa...</Text>
                </View>
              )}
              <iframe
                title="gps-map"
                key={iframeSrc || mapHtml}
                src={iframeSrc || undefined}
                srcDoc={iframeSrc ? undefined : mapHtml}
                style={iframeStyle}
                sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
                allow="geolocation *; fullscreen *"
                loading="lazy"
                onLoad={() => setIsWebMapLoaded(true)}
              />
            </View>
          ) : (
            <WebView
              originWhitelist={['*']}
              style={styles.map}
              source={{ html: mapHtml }}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleMarkerSelected}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={colors.PRIMARY || '#2E8B57'} />
                  <Text style={styles.loaderText}>Preparando mapa...</Text>
                </View>
              )}
            />
          )
        )}
      </View>

      <View style={styles.infoPanel}>
        <View style={styles.infoHeader}>
          <Ionicons name="walk-outline" size={20} color={colors.PRIMARY || '#2E8B57'} />
          <Text style={styles.infoTitle}>Monumentos cercanos</Text>
        </View>
        {!isAutoMode && (
          <View style={styles.infoHintCard}>
            <Ionicons name="hand-left-outline" size={18} color={colors.PRIMARY || '#2E8B57'} />
            <Text style={styles.infoHintText}>Modo manual activo: abre cada parada desde el mapa o la lista.</Text>
          </View>
        )}
        {pendingAutoMessage && isAutoMode && (
          <View style={styles.infoHintCard}>
            <Ionicons name="musical-notes-outline" size={18} color={colors.PRIMARY || '#2E8B57'} />
            <Text style={styles.infoHintText}>{pendingAutoMessage}</Text>
          </View>
        )}
        {nearestMonument && (
          <View style={styles.nearestCard}>
            <Ionicons name="radio-outline" size={20} color={colors.PRIMARY || '#2E8B57'} />
            <View style={styles.nearestContent}>
              <Text style={styles.nearestTitle}>{nearestMonument.name || nearestMonument.id}</Text>
              <Text style={styles.nearestSubtitle}>
                A {formatDistance(nearestMonument.distance)} · El audio se activará al llegar
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleManualSelect(nearestMonument)} style={styles.playButton}>
              <Ionicons name="play-circle" size={28} color={colors.PRIMARY || '#2E8B57'} />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {sortedMonuments.map((monument) => (
            <TouchableOpacity
              key={monument.id}
              style={[styles.monumentCard, nearestMonument?.id === monument.id && styles.monumentCardActive]}
              onPress={() => handleManualSelect(monument)}
            >
              <View style={styles.monumentIcon}>
                <Ionicons name="location-outline" size={20} color={colors.PRIMARY || '#2E8B57'} />
              </View>
              <View style={styles.monumentInfo}>
                <Text style={styles.monumentName}>{monument.name || monument.id}</Text>
                <Text style={styles.monumentDetails}>
                  {monument.original_country || ''}
                  {monument.original_city ? ` · ${monument.original_city}` : ''}
                </Text>
              </View>
              <Text style={styles.monumentDistance}>{formatDistance(monument.distance)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 60 : 30,
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitles: {
      flex: 1,
      marginRight: 16,
    },
    title: {
      fontSize: 22,
      fontFamily: 'railway',
      color: colors.PRIMARY || '#2E8B57',
    },
    subtitle: {
      fontSize: 14,
      marginTop: 4,
      color: colors.DARK_ACCENT || '#228B22',
      fontFamily: 'industrial',
    },
    settingsButton: {
      padding: 10,
      borderRadius: 24,
      backgroundColor: `${colors.PRIMARY || '#2E8B57'}11`,
    },
    mapContainer: {
      height: '50%',
      backgroundColor: '#f5f5f5',
    },
    map: {
      flex: 1,
    },
    webMapWrapper: {
      flex: 1,
      position: 'relative',
    },
    webMapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffffee',
      zIndex: 1,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loaderText: {
      marginTop: 12,
      fontSize: 16,
      fontFamily: 'industrial',
      color: colors.TEXT || '#2F4F4F',
    },
    errorText: {
      marginTop: 12,
      fontSize: 15,
      textAlign: 'center',
      color: '#d9534f',
      fontFamily: 'industrial',
    },
    infoHint: {
      marginTop: 8,
      fontSize: 13,
      textAlign: 'center',
      color: '#555',
      fontFamily: 'industrial',
    },
    infoPanel: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: '#fff',
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoHintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.PRIMARY || '#2E8B57'}15`,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
    },
    infoHintText: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'industrial',
      color: colors.TEXT || '#2F4F4F',
      marginLeft: 8,
    },
    infoTitle: {
      fontSize: 16,
      fontFamily: 'railway',
      color: colors.TEXT || '#2F4F4F',
      marginLeft: 8,
    },
    nearestCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.PRIMARY || '#2E8B57'}12`,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    nearestContent: {
      flex: 1,
      marginLeft: 12,
    },
    nearestTitle: {
      fontSize: 16,
      fontFamily: 'railway',
      color: colors.PRIMARY || '#2E8B57',
    },
    nearestSubtitle: {
      fontSize: 13,
      marginTop: 2,
      fontFamily: 'industrial',
      color: colors.TEXT || '#2F4F4F',
    },
    playButton: {
      paddingLeft: 12,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 40,
    },
    monumentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#f7f7f7',
    },
    monumentCardActive: {
      backgroundColor: `${colors.PRIMARY || '#2E8B57'}18`,
      borderWidth: 1,
      borderColor: `${colors.PRIMARY || '#2E8B57'}55`,
    },
    monumentIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.PRIMARY || '#2E8B57'}22`,
      marginRight: 12,
    },
    monumentInfo: {
      flex: 1,
    },
    monumentName: {
      fontSize: 15,
      fontFamily: 'railway',
      color: colors.TEXT || '#2F4F4F',
    },
    monumentDetails: {
      fontSize: 12,
      marginTop: 2,
      fontFamily: 'industrial',
      color: '#666',
    },
    monumentDistance: {
      fontSize: 13,
      fontFamily: 'industrial',
      color: colors.PRIMARY || '#2E8B57',
    },
  });

export default GpsMapScreen;
