import React, { useState, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Modern imports
import { View, Text, StyleSheet, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // Importar useNavigation
import axios from 'axios'; // Importar axios (o puedes usar fetch)
// Asegúrate de tener un archivo config.js con tu API_URL
// import config from '../config'; 

// ! Descomenta la línea de arriba y crea config.js o define la URL aquí
const API_URL = 'http://192.168.63.13:3000'; // <-- ¡¡IMPORTANTE: Reemplaza con la IP y puerto de tu servidor!!

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const navigation = useNavigation(); // Hook de navegación
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Estado para indicar procesamiento en servidor

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
    
    setIsCapturing(true); // Indica que la cámara está tomando la foto

    try {
      // Captura la imagen, pide base64 para enviarla fácilmente
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Ajusta la calidad si es necesario
        base64: true, // Pide el formato base64
        skipProcessing: true, // Opcional: puede acelerar la captura
      });
      
      console.log('Foto capturada:', photo.uri);
      setIsCapturing(false); // Termina la captura en la cámara
      setIsProcessing(true); // Empieza el procesamiento en el servidor

      // --- Envío al Servidor ---
      try {
        const response = await axios.post(`${API_URL}/api/recognize`, {
          // Envía la imagen como string base64
          // El servidor necesita estar preparado para recibir esto
          imageBase64: photo.base64, 
          // Podrías enviar otros datos si fueran necesarios
          // timestamp: new Date().toISOString(), 
        }, {
          timeout: 30000 // Timeout de 30 segundos por si el reconocimiento tarda
        });

        setIsProcessing(false); // Termina el procesamiento

        // Verifica la respuesta del servidor
        if (response.data && response.data.success) {
          console.log('Reconocimiento exitoso:', response.data.recognitionResult);
          // Navega a ResultScreen pasando los datos necesarios
          navigation.navigate('Result', {
            recognitionResult: response.data.recognitionResult,
            imageUri: photo.uri // Pasa la URI local para mostrarla mientras carga la del servidor si es necesario
          });
        } else {
          // El servidor respondió pero no hubo éxito en el reconocimiento
          console.log('Reconocimiento fallido:', response.data.message);
          Alert.alert(
            'Reconocimiento Fallido', 
            response.data.message || 'No se pudo identificar el objeto en la imagen. Intenta de nuevo desde otro ángulo o con mejor luz.'
          );
        }

      } catch (serverError) {
        // Error en la comunicación con el servidor
        setIsProcessing(false);
        console.error('Error al contactar el servidor:', serverError);
        let errorMessage = 'No se pudo conectar con el servidor de reconocimiento.';
        if (serverError.response) {
          // El servidor respondió con un código de error (4xx, 5xx)
          console.error('Datos del error:', serverError.response.data);
          console.error('Status del error:', serverError.response.status);
          errorMessage = `Error del servidor (${serverError.response.status}). Intenta más tarde.`;
        } else if (serverError.request) {
          // La petición se hizo pero no se recibió respuesta (ej. timeout, red caída)
          console.error('No hubo respuesta del servidor:', serverError.request);
          errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión o la disponibilidad del servicio.';
        } else {
          // Error al configurar la petición
          console.error('Error en la configuración de la petición:', serverError.message);
          errorMessage = `Error inesperado: ${serverError.message}`;
        }
        Alert.alert('Error de Red', errorMessage);
      }
      // --- Fin Envío al Servidor ---

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
          
          {/* Botón de captura y texto guía */}
          <View style={styles.bottomContainer}>
             {/* Indicador de procesamiento */}
             {isProcessing && (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Reconociendo...</Text>
              </View>
            )}

            {/* Contenedor del botón de captura */}
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

            {/* Texto guía */}
            <View style={styles.guideContainer}>
              <Text style={styles.guideText}>
                Centra el monumento en la pantalla y toca el botón para capturar
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// Añade los nuevos estilos y ajusta los existentes
const styles = StyleSheet.create({
  container: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  camera: { flex: 1 },
  cameraOverlay: { 
    flex: 1, 
    backgroundColor: 'transparent', 
    justifyContent: 'space-between', // Asegura espacio entre controles sup e inf
  }, 
  cameraControls: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 50, // Ajusta para status bar/notch
    backgroundColor: 'rgba(0,0,0,0.2)', 
  },
  controlButton: { 
    padding: 10,
  },
  // Nuevo contenedor para agrupar botón de captura y guía
  bottomContainer: {
    paddingBottom: 30, // Espacio inferior general
    alignItems: 'center', // Centra horizontalmente el contenido
  },
  captureContainer: { 
    alignItems: 'center', 
    marginBottom: 10, // Espacio entre botón y texto guía
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
    padding: 10, // Un poco más de padding
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
  // Estilos para el indicador de procesamiento
  processingIndicator: {
    position: 'absolute', // Lo superpone a la vista de cámara
    top: 0, left: 0, right: 0, bottom: 0, // Ocupa toda la pantalla
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo semitransparente
    zIndex: 10, // Asegura que esté por encima de otros elementos
  },
  processingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5, // Hace el botón semitransparente cuando está deshabilitado
  }
});
