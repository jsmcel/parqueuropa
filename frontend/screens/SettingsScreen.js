/**
 * SettingsScreen.js
 *
 * Screen for managing application settings, cache, history, and information.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,             // Keep Switch for Autoplay
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  ActivityIndicator // Import ActivityIndicator for cache clearing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Rating, Input } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import config from '../config.js';
import { sendFeedback } from '../services/apiService.js';

const SettingsScreen = () => {
  // State for settings that remain
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [cacheSize, setCacheSize] = useState('Calculando...');
  const [isClearingCache, setIsClearingCache] = useState(false);
  
  // State for feedback
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    loadSettings();
    calculateCacheSize();
  }, []);

  const loadSettings = async () => {
    try {
      // Load only the remaining settings
      const settings = await AsyncStorage.multiGet([
        'autoPlayAudio',
      ]);

      const autoPlaySetting = settings[0][1];
      setAutoPlayAudio(autoPlaySetting !== null ? autoPlaySetting === 'true' : true);

    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const calculateCacheSize = async () => {
    setCacheSize('Calculando...');
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
          setCacheSize('Indeterminado');
          console.warn('Cache directory is null or undefined.');
          return;
      }
      const cacheInfo = await FileSystem.getInfoAsync(cacheDir, {size: true});

      let totalSize = 0;
       if (cacheInfo.exists && cacheInfo.isDirectory) {
            if (cacheInfo.size === undefined || cacheInfo.size === 0) {
                console.log("Directory size not directly available, reading contents...");
                const files = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of files) {
                    try {
                        const filePath = `${cacheDir}${file}`;
                        const fileInfo = await FileSystem.getInfoAsync(filePath, {size: true});
                        if (fileInfo.exists && fileInfo.size) {
                            totalSize += fileInfo.size;
                        }
                    } catch (fileError){
                         console.warn(`Could not get size for file ${file}:`, fileError);
                    }
                }
             } else {
                  totalSize = cacheInfo.size;
             }
       } else if (cacheInfo.exists) {
            totalSize = cacheInfo.size || 0;
       }

      if (totalSize === 0) {
        setCacheSize('0 MB');
      } else {
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        setCacheSize(`${sizeInMB} MB`);
      }
    } catch (error) {
      console.error('Error al calcular tamaño de caché:', error);
      setCacheSize('Error');
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Error al guardar ${key}:`, error);
    }
  };

  const handleAutoPlayToggle = (value) => {
    setAutoPlayAudio(value);
    saveSetting('autoPlayAudio', value);
  };

  const handleClearCache = async () => {
      Alert.alert(
        'Limpiar Caché',
        `¿Limpiar ${cacheSize} de datos en caché?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Limpiar',
            style: 'destructive',
            onPress: async () => {
              setIsClearingCache(true);
              try {
                const cacheDir = FileSystem.cacheDirectory;
                if (!cacheDir) throw new Error('Cache directory not found');
                const items = await FileSystem.readDirectoryAsync(cacheDir);
                for (const item of items) {
                    try {
                        await FileSystem.deleteAsync(`${cacheDir}${item}`, { idempotent: true });
                    } catch (delError) {
                        console.warn(`Could not delete cache item ${item}:`, delError);
                    }
                }
                Alert.alert('Caché Limpiada', 'Se han eliminado los datos en caché.');
                await calculateCacheSize();
              } catch (error) {
                console.error('Error al limpiar caché:', error);
                Alert.alert('Error', 'No se pudo limpiar la caché.');
              } finally {
                  setIsClearingCache(false);
              }
            },
          }
        ]
      );
  };

  const handleClearHistory = async () => {
      Alert.alert(
        'Borrar Historial',
        '¿Borrar todo el historial de piezas reconocidas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Borrar',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('recognitionHistory');
                Alert.alert('Historial Borrado', 'Se ha eliminado el historial.');
              } catch (error) {
                console.error('Error al borrar historial:', error);
                Alert.alert('Error', 'No se pudo borrar el historial.');
              }
            },
          }
        ]
      );
  };

  const handleResetSettings = async () => {
      Alert.alert(
        'Restablecer Configuración',
        '¿Restablecer las preferencias a sus valores predeterminados?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restablecer',
            style: 'destructive',
            onPress: async () => {
              try {
                setAutoPlayAudio(true);
                await AsyncStorage.multiSet([
                  ['autoPlayAudio', 'true'],
                ]);
                Alert.alert('Configuración Restablecida', 'Preferencias restauradas.');
                // Optionally clear cache/history on reset
                // await handleClearCache();
                // await handleClearHistory();
                await calculateCacheSize();
              } catch (error) {
                console.error('Error al restablecer configuración:', error);
                Alert.alert('Error', 'No se pudo restablecer la configuración.');
              }
            },
          }
        ]
      );
  };

   const handleContactSupport = () => {
     // Mostrar formulario de soporte
     Alert.prompt(
       'Contactar Soporte',
       'Describe tu problema o sugerencia:',
       [
         { text: 'Cancelar', style: 'cancel' },
         { 
           text: 'Enviar', 
           onPress: async (message) => {
             if (message && message.trim()) {
               try {
                 await sendFeedback(0, `[SOPORTE] ${message}`, {
                   platform: Platform.OS,
                   version: Platform.Version,
                   type: 'support_request'
                 });
                 Alert.alert('Mensaje Enviado', 'Tu consulta ha sido enviada. Te responderemos pronto.');
               } catch (error) {
                 console.error('Error sending support message:', error);
                 Alert.alert('Error', 'No se pudo enviar el mensaje. Inténtalo de nuevo.');
               }
             }
           }
         }
       ],
       'plain-text',
       '',
       'default'
     );
   };

   const handleVisitWebsite = () => {
     const website = config.MUSEUM_INFO?.contact?.website || 'https://www.guiaferroviaria.com';
     Linking.openURL(website);
   };

   const handleSubmitFeedback = async () => {
     if (rating === 0) {
       Alert.alert('Error', 'Por favor selecciona una calificación antes de enviar.');
       return;
     }

     setIsSubmittingFeedback(true);
     try {
       const deviceInfo = {
         platform: Platform.OS,
         version: Platform.Version,
         model: Platform.select({
           ios: 'iOS Device',
           android: 'Android Device',
           default: 'Unknown'
         })
       };

       await sendFeedback(rating, comment, deviceInfo);
       
       setFeedbackSubmitted(true);
       setRating(0);
       setComment('');
       
       Alert.alert(
         '¡Gracias!', 
         'Tu valoración ha sido enviada correctamente. ¡Apreciamos tu feedback!',
         [{ text: 'OK' }]
       );
     } catch (error) {
       console.error('Error sending feedback:', error);
       Alert.alert(
         'Error', 
         'No se pudo enviar tu valoración. Inténtalo de nuevo más tarde.',
         [{ text: 'OK' }]
       );
     } finally {
       setIsSubmittingFeedback(false);
     }
   };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Sección de Preferencias (Simplificada) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
             <View style={styles.settingInfo}>
               <Ionicons name="play-circle-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
               <View style={styles.settingTextContainer}>
                 <Text style={styles.settingTitle}>Reproducción automática</Text>
                 <Text style={styles.settingDescription}>Iniciar audio al ver detalles de una pieza.</Text>
               </View>
             </View>
             <Switch
               value={autoPlayAudio}
               onValueChange={handleAutoPlayToggle}
               trackColor={{ false: '#d0d0d0', true: `${config.COLORS.PRIMARY}80` }}
               thumbColor={autoPlayAudio ? config.COLORS.PRIMARY : '#f4f3f4'}
               ios_backgroundColor="#d0d0d0"
             />
          </View>
        </View>

        {/* Sección de Almacenamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Almacenamiento</Text>
          <View style={styles.storageItem}>
               <View style={styles.settingInfo}>
                  <Ionicons name="server-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Espacio en caché</Text>
                    <Text style={styles.settingDescription}>{cacheSize}</Text>
                  </View>
                </View>
                <Button
                  title={isClearingCache ? "" : "Limpiar"}
                  buttonStyle={styles.actionTextButton}
                  titleStyle={styles.actionTextButtonTitle}
                  onPress={handleClearCache}
                  disabled={isClearingCache || cacheSize === '0 MB' || cacheSize === 'Calculando...' || cacheSize === 'Error'}
                  loading={isClearingCache}
                  loadingProps={{color: config.COLORS.PRIMARY, size: 'small'}}
                  icon={isClearingCache ? <ActivityIndicator size="small" color={config.COLORS.PRIMARY} /> : null}
                />
          </View>
           <View style={[styles.storageItem, { borderBottomWidth: 0 }]}>
                <View style={styles.settingInfo}>
                   <Ionicons name="timer-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
                   <View style={styles.settingTextContainer}>
                     <Text style={styles.settingTitle}>Historial de reconocimiento</Text>
                     <Text style={styles.settingDescription}>Piezas vistas anteriormente.</Text>
                   </View>
                 </View>
                 <Button
                   title="Borrar"
                   buttonStyle={styles.actionTextButton}
                   titleStyle={styles.actionTextButtonTitle}
                   onPress={handleClearHistory}
                 />
           </View>
        </View>

        {/* Sección de Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Más Opciones</Text>
           <TouchableOpacity style={styles.actionRow} onPress={handleResetSettings}>
                <Ionicons name="refresh-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
                <Text style={styles.actionText}>Restablecer configuración</Text>
                <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={handleContactSupport}>
                <Ionicons name="mail-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
                <Text style={styles.actionText}>Soporte de la app</Text>
                <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleVisitWebsite}>
                <Ionicons name="globe-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
                <Text style={styles.actionText}>Visitar sitio web</Text>
                <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
            </TouchableOpacity>
        </View>

        {/* Sección de Valorar la App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valorar la App</Text>
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackQuestion}>¿Te gusta la aplicación?</Text>
            
            <Rating
              showRating
              onFinishRating={setRating}
              style={styles.rating}
              ratingCount={5}
              imageSize={30}
              startingValue={rating}
              ratingColor={config.COLORS.PRIMARY}
              ratingBackgroundColor={config.COLORS.LIGHT_ACCENT}
            />
            
            <Input
              placeholder="Déjanos tus comentarios (opcional)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              inputStyle={styles.commentInput}
              containerStyle={styles.commentContainer}
              placeholderTextColor={config.COLORS.DARK_ACCENT}
            />
            
            <Button
              title={isSubmittingFeedback ? "Enviando..." : "Enviar Valoración"}
              buttonStyle={styles.feedbackButton}
              titleStyle={styles.feedbackButtonTitle}
              onPress={handleSubmitFeedback}
              disabled={isSubmittingFeedback || rating === 0}
              loading={isSubmittingFeedback}
              loadingProps={{color: 'white', size: 'small'}}
            />
            
            {feedbackSubmitted && (
              <Text style={styles.feedbackThankYou}>
                ¡Gracias por tu valoración! 🎉
              </Text>
            )}
          </View>
        </View>

        {/* Sección de Descargo de Responsabilidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descargo de Responsabilidad</Text>
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              Esta aplicación no es oficial del Museo del Ferrocarril de Madrid ni está afiliada, patrocinada o respaldada por la Fundación de los Ferrocarriles Españoles (FFE).
            </Text>
            <Text style={styles.disclaimerText}>
              La información proporcionada es de carácter educativo y recreativo. Para información oficial, horarios actualizados y servicios del museo, consulta su sitio web oficial.
            </Text>
          </View>
        </View>

        {/* Sección de Información */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Acerca de la App</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Versión</Text>
              <Text style={styles.infoValue}>1.0.1</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Desarrollado por</Text>
              <Text style={styles.infoValue}>Guideitor</Text>
            </View>
            <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Año</Text>
              <Text style={styles.infoValue}>2025</Text>
            </View>
        </View>

        {/* Pie de página */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Guía Ferroviaria</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles (ensure they are complete and match the JSX)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: config.COLORS.BACKGROUND || '#f1faee',
  },
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    color: config.COLORS.PRIMARY,
    marginBottom: 18,
    fontFamily: 'railway',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  settingIcon: {
    marginRight: 15,
    width: 24,
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
    lineHeight: 18,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
  actionTextButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 5,
    paddingVertical: 5,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextButtonTitle: {
    color: config.COLORS.PRIMARY,
    fontSize: 14,
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
  actionIcon: {
    marginRight: 15,
    width: 24,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    flex: 1,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
  infoLabel: {
    fontSize: 15,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
  },
  infoValue: {
    fontSize: 15,
    color: config.COLORS.TEXT,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  disclaimerContainer: {
    paddingVertical: 10,
  },
  disclaimerText: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'justify',
  },
  feedbackContainer: {
    paddingVertical: 10,
  },
  feedbackQuestion: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    fontFamily: 'industrial',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  rating: {
    marginBottom: 20,
    alignItems: 'center',
  },
  commentContainer: {
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  commentInput: {
    fontSize: 14,
    color: config.COLORS.TEXT,
    fontFamily: 'industrial',
    textAlignVertical: 'top',
  },
  feedbackButton: {
    backgroundColor: config.COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  feedbackButtonTitle: {
    fontSize: 16,
    fontFamily: 'railway',
    fontWeight: 'bold',
  },
  feedbackThankYou: {
    fontSize: 14,
    color: config.COLORS.PRIMARY,
    fontFamily: 'industrial',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
  },
});

export default SettingsScreen;