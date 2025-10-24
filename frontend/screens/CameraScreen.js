import React, { useState, useRef, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { View, Text, StyleSheet, TouchableOpacity, Button, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// Removed axios as it's no longer directly used here
import * as ImageManipulator from 'expo-image-manipulator';
import config from '../config.js'; // Asegúrate que la ruta sea correcta
import { recognizeImage } from '../services/apiService.js'; // Import the new service

// Usa la URL de tu config.js o defínela aquí
// const API_URL = config.API_URL || 'http://TU_IP_LOCAL:3000';
const API_URL = config.API_URL; // Usar config en lugar de hardcodear

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const [webStream, setWebStream] = useState(null);
  
  // Estados para zoom en web
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZooming, setIsZooming] = useState(false);

  // Ocultar navegación en web cuando se monta el componente
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Ocultar navegación
      const hideNavigation = () => {
        const navElements = document.querySelectorAll('[data-testid="tab-bar"], .tab-navigator, nav[role="tablist"], .navigation-container, .bottom-navigation');
        navElements.forEach(el => {
          if (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          }
        });
      };
      
      // Ejecutar inmediatamente y con un pequeño delay
      hideNavigation();
      setTimeout(hideNavigation, 100);
      
      // Ejecutar periódicamente para asegurar que se mantenga oculta
      const interval = setInterval(hideNavigation, 500);
      
      return () => {
        clearInterval(interval);
        // Restaurar navegación al desmontar
        const navElements = document.querySelectorAll('[data-testid="tab-bar"], .tab-navigator, nav[role="tablist"], .navigation-container, .bottom-navigation');
        navElements.forEach(el => {
          if (el) {
            el.style.display = '';
            el.style.visibility = '';
          }
        });
      };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const constraints = {
        video: {
          width: { 
            ideal: 4096,
            max: 7680  // 8K máximo
          },
          height: { 
            ideal: 2160,
            max: 4320  // 8K máximo
          },
          facingMode: 'environment',
          // Configuraciones adicionales para mejor calidad
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: 16/9,
          // Configuraciones de calidad
          focusMode: 'continuous',
          whiteBalanceMode: 'continuous',
          exposureMode: 'continuous'
        },
        audio: false // Desactivar audio para mejor rendimiento
      };
      // Intentar con la resolución más alta primero
      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          setWebStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log('Cámara web inicializada con resolución:', {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            });
          }
        })
        .catch(err => {
          console.warn('No se pudo obtener resolución 4K, intentando con 1080p:', err);
          
          // Fallback a 1080p si falla la resolución alta
          const fallbackConstraints = {
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              facingMode: 'environment',
              frameRate: { ideal: 30 },
              aspectRatio: 16/9
            },
            audio: false
          };
          
          return navigator.mediaDevices.getUserMedia(fallbackConstraints);
        })
        .then(stream => {
          if (stream) {
            setWebStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              console.log('Cámara web inicializada con resolución fallback:', {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
            }
          }
        })
        .catch(err => {
          console.error('Error accediendo a la cámara web:', err);
        });
    }
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.errorText}>Necesitamos tu permiso para mostrar la cámara</Text>
        <Button onPress={requestPermission} title="Conceder permiso" />
      </View>
    );
  }

  const toggleFlash = () => {
    setFlashMode(prev => (prev === 'off' ? 'on' : 'off'));
  };

  const toggleCameraType = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  // Funciones de zoom para web
  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => Math.min(prev + 0.5, 3));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 1) {
      setZoomLevel(prev => Math.max(prev - 0.5, 1));
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const captureImage = async () => {
    if (!cameraRef.current || isCapturing || isProcessing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: true,
      });

      console.log('Foto capturada (original):', photo.uri);
      setIsCapturing(false);
      setIsProcessing(true);

      // --- Image Manipulation ---
      console.log('Manipulando imagen...');
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1000 } }],
        {
          compress: 0.85, // Mejorado de 0.75 a 0.85 para mejor calidad
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      // --- AGREGAR PREFIJO DE TIPO DE DATOS ---
      const base64WithPrefix = `data:image/jpeg;base64,${manipResult.base64}`;
      console.log('Base64 con prefijo (primeros 50 chars):', base64WithPrefix.substring(0, 50) + '...');

      // --- Envío al Servidor ---
      try {
        const data = await recognizeImage(base64WithPrefix); // ← Con prefijo

        if (data.success === true && data.recognitionResult) {
          console.log('Image recognized with high confidence:', data.recognitionResult);
          navigation.navigate('ResultScreen', {
            imageUri: manipResult.uri,
            recognitionResult: data.recognitionResult,
          });
        } else if (data.low_confidence === true && data.suggestions && data.suggestions.length > 0) {
          console.log('Low confidence, suggestions received:', data.suggestions);
          navigation.navigate('SuggestionScreen', {
            imageUri: manipResult.uri,
            imageBase64: manipResult.base64,
            suggestions: data.suggestions,
            originalRecognitionResult: data.recognitionResult 
          });
        } else {
          console.warn('Recognition failed or no suggestions:', data.message);
          Alert.alert('Reconocimiento Fallido', data.message || 'No se pudo identificar la pieza. Inténtalo de nuevo.');
        }

      } catch (error) {
        console.error('Recognition API call error:', error);
        Alert.alert('Error de Reconocimiento', error.message || 'Error de conexión o del servidor. Inténtalo más tarde.');
      } finally {
        setIsProcessing(false);
      }

    } catch (captureError) {
      console.error('Error al capturar imagen:', captureError);
      setIsCapturing(false);
      setIsProcessing(false);
      Alert.alert('Error de Cámara', 'No se pudo tomar la foto.');
    }
  };

  if (Platform.OS === 'web') {
    // --- Captura de imagen desde <video> usando canvas ---
    const webCaptureImage = async () => {
      if (!videoRef.current || isCapturing || isProcessing) return;
      setIsCapturing(true);
      try {
        const video = videoRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        console.log('Capturando imagen con resolución:', { width, height });
        
        // Crear canvas con la resolución real del video
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        
        // Configuraciones para mejor calidad de imagen
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Dibujar el video en el canvas
        ctx.drawImage(video, 0, 0, width, height);
        // Obtener imagen con alta calidad
        const base64 = canvas.toDataURL('image/jpeg', 0.95); // Calidad alta (95%)
        
        console.log('Imagen capturada, tamaño base64:', base64.length);
        setIsCapturing(false);
        setIsProcessing(true);
        // Procesa igual que en móvil
        try {
          const data = await recognizeImage(base64);
          console.log('Web recognition result:', data);
          
          if (data.success === true && data.recognitionResult) {
            console.log('High confidence result, navigating to ResultScreen');
            navigation.navigate('ResultScreen', {
              imageUri: base64,
              recognitionResult: data.recognitionResult,
            });
          } else if (data.low_confidence === true && data.suggestions && data.suggestions.length > 0) {
            console.log('Low confidence, navigating to SuggestionScreen');
            navigation.navigate('SuggestionScreen', {
              imageUri: base64,
              imageBase64: base64.split(',')[1],
              suggestions: data.suggestions,
              originalRecognitionResult: data.recognitionResult 
            });
          } else {
            console.warn('Recognition failed in web:', data);
            console.log('Showing alert for failed recognition');
            
            // Usar window.alert para web ya que Alert.alert no funciona bien
            if (Platform.OS === 'web') {
              window.alert('Reconocimiento Fallido\n\n' + (data.message || 'No se pudo identificar la pieza. Inténtalo de nuevo.'));
            } else {
              Alert.alert('Reconocimiento Fallido', data.message || 'No se pudo identificar la pieza. Inténtalo de nuevo.');
            }
          }
        } catch (error) {
          console.error('Recognition API call error in web:', error);
          
          // Usar window.alert para web ya que Alert.alert no funciona bien
          if (Platform.OS === 'web') {
            window.alert('Error de Reconocimiento\n\n' + (error.message || 'Error de conexión o del servidor. Inténtalo más tarde.'));
          } else {
            Alert.alert('Error de Reconocimiento', error.message || 'Error de conexión o del servidor. Inténtalo más tarde.');
          }
        } finally {
          setIsProcessing(false);
        }
      } catch (err) {
        setIsCapturing(false);
        setIsProcessing(false);
        
        // Usar window.alert para web ya que Alert.alert no funciona bien
        if (Platform.OS === 'web') {
          window.alert('Error de Cámara\n\nNo se pudo tomar la foto.');
        } else {
          Alert.alert('Error de Cámara', 'No se pudo tomar la foto.');
        }
      }
    };

    return (
      <View style={styles.container}>
        {/* CSS personalizado para ocultar navegación en web */}
        {Platform.OS === 'web' && (
          <style>{`
            body { overflow: hidden !important; }
            #root { height: 100vh !important; overflow: hidden !important; }
            /* Ocultar footer de navegación */
            [data-testid="tab-bar"] { display: none !important; }
            .tab-navigator { display: none !important; }
            nav { display: none !important; }
            [role="tablist"] { display: none !important; }
            /* Ocultar cualquier elemento de navegación */
            .navigation-container { display: none !important; }
            .bottom-navigation { display: none !important; }
            /* Asegurar que la cámara ocupe toda la pantalla */
            .camera-fullscreen { 
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              z-index: 9999 !important;
            }
          `}</style>
        )}
        <View style={[styles.camera, { position: 'relative', overflow: 'hidden' }]} className={Platform.OS === 'web' ? 'camera-fullscreen' : undefined}> 
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              position: 'absolute', 
              top: 0, 
              left: 0,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.3s ease'
            }}
          />
          <View style={styles.cameraOverlay} pointerEvents="box-none">
            {/* Controles superiores (zoom, reset, salir) */}
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.exitButton]} 
                onPress={() => navigation.navigate('MainTabs', { screen: 'Inicio' })}
              >
                <Ionicons name={'close-outline'} size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.zoomControls}>
                <TouchableOpacity 
                  style={[styles.controlButton, zoomLevel <= 1 && styles.disabledButton]} 
                  onPress={handleZoomOut}
                  disabled={zoomLevel <= 1}
                >
                  <Ionicons name={'remove-outline'} size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.zoomText}>{zoomLevel.toFixed(1)}x</Text>
                <TouchableOpacity 
                  style={[styles.controlButton, zoomLevel >= 3 && styles.disabledButton]} 
                  onPress={handleZoomIn}
                  disabled={zoomLevel >= 3}
                >
                  <Ionicons name={'add-outline'} size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.controlButton, zoomLevel === 1 && styles.disabledButton]} 
                onPress={resetZoom}
                disabled={zoomLevel === 1}
              >
                <Ionicons name={'refresh-outline'} size={24} color="white" />
              </TouchableOpacity>
            </View>
            {/* Indicador de procesamiento */}
            {isProcessing && (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Reconociendo...</Text>
              </View>
            )}
            {/* Contenedor inferior */}
            <View style={styles.bottomContainer}>
              <View style={styles.captureContainer}>
                <TouchableOpacity
                  style={[styles.captureButton, (isCapturing || isProcessing) && styles.disabledButton]}
                  onPress={webCaptureImage}
                  disabled={isCapturing || isProcessing}
                >
                  {isCapturing ? (
                    <View style={styles.capturingIndicator}>
                      <View style={styles.capturingIndicatorInner} />
                    </View>
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.guideContainer}>
                <Text style={styles.guideText}>
                  Centra el monumento europeo y toca para capturar
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode}
      >
        <View style={styles.cameraOverlay}>
          {/* Controles superiores (flash, cambio cámara) */}
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash} disabled={isProcessing}>
              <Ionicons
                name={flashMode === 'off' ? 'flash-off' : 'flash'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType} disabled={isProcessing}>
              <Ionicons
                name={facing === 'back' ? 'camera-reverse' : 'camera'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {/* Indicador de procesamiento */}
          {isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>Reconociendo...</Text>
            </View>
          )}

          {/* Contenedor inferior */}
          <View style={styles.bottomContainer}>
            <View style={styles.captureContainer}>
              <TouchableOpacity
                style={[styles.captureButton, (isCapturing || isProcessing) && styles.disabledButton]}
                onPress={captureImage}
                disabled={isCapturing || isProcessing}
              >
                {isCapturing ? (
                  <View style={styles.capturingIndicator}>
                    <View style={styles.capturingIndicatorInner} />
                  </View>
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.guideContainer}>
              <Text style={styles.guideText}>
                Centra el monumento europeo y toca para capturar
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// Estilos optimizados para web y móvil
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999, // Asegurar que esté por encima del footer de navegación
    })
  },
  permissionContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16 
  },
  camera: { 
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9998,
    })
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
    })
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 'env(safe-area-inset-top, 20px)' : 50,
    backgroundColor: 'rgba(0,0,0,0.2)',
    ...(Platform.OS === 'web' && {
      paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
      minHeight: 60,
    })
  },
  controlButton: {
    padding: 10,
    ...(Platform.OS === 'web' && {
      minWidth: 44,
      minHeight: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    })
  },
  bottomContainer: {
    paddingBottom: Platform.OS === 'web' ? 'max(env(safe-area-inset-bottom, 80px), 80px)' : 30,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      paddingBottom: 'max(env(safe-area-inset-bottom, 100px), 100px)',
      minHeight: 150,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      backgroundColor: 'transparent',
    })
  },
  captureContainer: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 15 : 10,
  },
  captureButton: {
    width: Platform.OS === 'web' ? 80 : 70, 
    height: Platform.OS === 'web' ? 80 : 70, 
    borderRadius: Platform.OS === 'web' ? 40 : 35,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.6)',
        transform: 'scale(1.05)',
      },
      '&:active': {
        transform: 'scale(0.95)',
      }
    })
  },
  captureButtonInner: {
    width: Platform.OS === 'web' ? 70 : 60, 
    height: Platform.OS === 'web' ? 70 : 60, 
    borderRadius: Platform.OS === 'web' ? 35 : 30,
    backgroundColor: 'white',
  },
  capturingIndicator: {
    width: Platform.OS === 'web' ? 80 : 70, 
    height: Platform.OS === 'web' ? 80 : 70, 
    borderRadius: Platform.OS === 'web' ? 40 : 35,
    borderWidth: 3, 
    borderColor: 'red',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  capturingIndicatorInner: {
    width: Platform.OS === 'web' ? 60 : 50, 
    height: Platform.OS === 'web' ? 60 : 50, 
    borderRadius: Platform.OS === 'web' ? 30 : 25,
    backgroundColor: 'red',
  },
  guideContainer: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    ...(Platform.OS === 'web' && {
      maxWidth: 400,
    })
  },
  guideText: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      lineHeight: 20,
    })
  },
  errorText: {
    color: 'red', 
    textAlign: 'center',
    marginBottom: 20, 
    fontSize: 16,
  },
  processingIndicator: {
    position: 'absolute',
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
    })
  },
  processingText: {
    color: 'white',
    marginTop: 10,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    ...(Platform.OS === 'web' && {
      fontWeight: '500',
    })
  },
  disabledButton: {
    opacity: 0.5,
    ...(Platform.OS === 'web' && {
      cursor: 'not-allowed',
    })
  },
  // Estilos específicos para controles de zoom en web
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...(Platform.OS === 'web' && {
      gap: 8,
    })
  },
  zoomText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
    })
  },
  // Estilo para el botón de salida
  exitButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 0, 0, 0.9)',
        transform: 'scale(1.1)',
      }
    })
  }
});
