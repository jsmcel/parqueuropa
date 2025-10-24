import React, { useState, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { View, Text, StyleSheet, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
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
          compress: 0.75,
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
          navigation.navigate('ResultThomas', {
            imageUri: photo.uri,
            recognitionResult: data.recognitionResult,
          });
        } else if (data.low_confidence === true && data.suggestions && data.suggestions.length > 0) {
          console.log('Low confidence, suggestions received:', data.suggestions);
          // navigation.navigate('SuggestionScreen', {
          //   imageUri: manipResult.uri,
          //   imageBase64: manipResult.base64,
          //   suggestions: data.suggestions,
          //   originalRecognitionResult: data.recognitionResult 
          // });
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
                Centra el monumento y toca para capturar
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// Estilos (sin cambios necesarios aquí)
const styles = StyleSheet.create({
  container: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50, // Ajusta según sea necesario para tu dispositivo
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  controlButton: {
    padding: 10,
  },
  bottomContainer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  captureButton: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'white',
  },
  capturingIndicator: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 3, borderColor: 'red',
    justifyContent: 'center', alignItems: 'center',
  },
  capturingIndicatorInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'red',
  },
  guideContainer: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 10,
  },
  guideText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: 'red', textAlign: 'center',
    marginBottom: 20, fontSize: 16,
  },
  processingIndicator: {
    // Mantenido igual, se superpone correctamente
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
  },
  processingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  }
});