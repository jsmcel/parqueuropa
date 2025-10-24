import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView // <-- NUEVO: Importar SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-elements'; // Divider ya no es necesaria si usamos secciones como tarjetas
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import config from '../config';

const SettingsScreen = () => {
  // <-- Estados iniciales más robustos -->
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [highQualityImages, setHighQualityImages] = useState(false);
  const [selectedMode, setSelectedMode] = useState('normal');
  const [cacheSize, setCacheSize] = useState('Calculando...'); // <-- Estado inicial
  const [isClearingCache, setIsClearingCache] = useState(false); // <-- NUEVO: Estado para indicar limpieza

  useEffect(() => {
    loadSettings();
    calculateCacheSize();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'locationEnabled',
        'autoPlayAudio',
        'highQualityImages',
        'selectedAudioMode'
      ]);

      const locationSetting = settings[0][1];
      const autoPlaySetting = settings[1][1];
      const imageSetting = settings[2][1];
      const savedMode = settings[3][1];

      setLocationEnabled(locationSetting !== null ? locationSetting === 'true' : true); // Default true
      setAutoPlayAudio(autoPlaySetting !== null ? autoPlaySetting === 'true' : true); // Default true
      setHighQualityImages(imageSetting === 'true'); // Default false
      setSelectedMode(savedMode || 'normal'); // Default normal

    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const calculateCacheSize = async () => {
    setCacheSize('Calculando...'); // Indicar cálculo
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
          setCacheSize('Indeterminado');
          console.warn('Cache directory is null or undefined.');
          return;
      }
      const cacheInfo = await FileSystem.getInfoAsync(cacheDir, {size: true}); // Pedir tamaño explícitamente

      let totalSize = 0;
      if (cacheInfo.exists && cacheInfo.isDirectory) {
          // Leer contenido del directorio para sumar tamaños (getInfoAsync en directorio no siempre da tamaño total)
          const files = await FileSystem.readDirectoryAsync(cacheDir);
          for (const file of files) {
              try {
                  // Construir path completo correctamente en todas las plataformas
                  const filePath = `${cacheDir}${file}`;
                  const fileInfo = await FileSystem.getInfoAsync(filePath, {size: true});
                  if (fileInfo.exists) {
                      totalSize += fileInfo.size;
                  }
              } catch (fileError){
                   console.warn(`Could not get size for file ${file}:`, fileError);
              }
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

  // --- Funciones de guardado simplificadas ---
  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Error al guardar ${key}:`, error);
    }
  };

  const handleLocationToggle = (value) => {
    setLocationEnabled(value);
    saveSetting('locationEnabled', value);
  };

  const handleAutoPlayToggle = (value) => {
    setAutoPlayAudio(value);
    saveSetting('autoPlayAudio', value);
  };

  const handleImageQualityToggle = (value) => {
    setHighQualityImages(value);
    saveSetting('highQualityImages', value);
  };

  const handleModeSelection = (mode) => {
    setSelectedMode(mode);
    saveSetting('selectedAudioMode', mode);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Limpiar Caché',
      `¿Limpiar ${cacheSize} de datos en caché? (Imágenes, audios temporales)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true); // Indicar que se está limpiando
            try {
              const cacheDir = FileSystem.cacheDirectory;
              if (!cacheDir) {
                  throw new Error('Cache directory not found');
              }
              // Borrar contenido del directorio, no el directorio en sí si es posible
              const files = await FileSystem.readDirectoryAsync(cacheDir);
              for (const file of files) {
                  try {
                       const filePath = `${cacheDir}${file}`;
                       await FileSystem.deleteAsync(filePath, { idempotent: true });
                  } catch(delError){
                      console.warn(`Could not delete cache file ${file}:`, delError);
                  }
              }

              Alert.alert('Caché Limpiada', 'Se han eliminado los datos en caché.');
              await calculateCacheSize(); // Recalcular tamaño (debería ser cercano a 0)
            } catch (error) {
              console.error('Error al limpiar caché:', error);
              Alert.alert('Error', 'No se pudo limpiar la caché.');
            } finally {
                setIsClearingCache(false); // Terminar indicación
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
              // TODO: Actualizar la vista de HomeScreen si está montada
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
      '¿Restablecer todas las preferencias a sus valores predeterminados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Aplicar valores predeterminados a los estados
              setLocationEnabled(true);
              setAutoPlayAudio(true);
              setHighQualityImages(false);
              setSelectedMode('normal');

              // Guardar valores predeterminados en AsyncStorage
              await AsyncStorage.multiSet([
                ['locationEnabled', 'true'],
                ['autoPlayAudio', 'true'],
                ['highQualityImages', 'false'],
                ['selectedAudioMode', 'normal']
              ]);

              Alert.alert('Configuración Restablecida', 'Preferencias restauradas.');
            } catch (error) {
              console.error('Error al restablecer configuración:', error);
              Alert.alert('Error', 'No se pudo restablecer la configuración.');
            }
          },
        }
      ]
    );
  };

  // --- Funciones de Linking ---
   const handleContactSupport = () => {
     // Usar email de config si existe
     const email = config.MUSEUM_INFO?.contact?.email || 'soporte@guiaferroviaria.com';
     Linking.openURL(`mailto:${email}?subject=Soporte%20Guía%20Ferroviaria`);
   };

   const handleVisitWebsite = () => {
      // Usar website de config si existe
     const website = config.MUSEUM_INFO?.contact?.website || 'https://www.guiaferroviaria.com';
     Linking.openURL(website);
   };


  return (
    // <-- Envolver en SafeAreaView -->
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Sección de Preferencias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Usar ubicación</Text>
                <Text style={styles.settingDescription}>Ayuda a identificar piezas cercanas en el museo.</Text>
              </View>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: '#d0d0d0', true: `${config.COLORS.PRIMARY}80` }}
              thumbColor={locationEnabled ? config.COLORS.PRIMARY : '#f4f3f4'}
              ios_backgroundColor="#d0d0d0"
            />
          </View>

          <View style={styles.settingItem}>
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
           <View style={[styles.settingItem, { borderBottomWidth: 0 }]}> {/* Último item sin borde */}
             <View style={styles.settingInfo}>
               <Ionicons name="image-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
               <View style={styles.settingTextContainer}>
                 <Text style={styles.settingTitle}>Imágenes alta calidad</Text>
                 <Text style={styles.settingDescription}>Mayor detalle visual (consume más datos).</Text>
               </View>
             </View>
             <Switch
               value={highQualityImages}
               onValueChange={handleImageQualityToggle}
               trackColor={{ false: '#d0d0d0', true: `${config.COLORS.PRIMARY}80` }}
               thumbColor={highQualityImages ? config.COLORS.PRIMARY : '#f4f3f4'}
               ios_backgroundColor="#d0d0d0"
             />
           </View>
        </View>

        {/* Sección de Modo de Audio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de Audio Predeterminado</Text>
          {/* // <-- Estilo de selección de modo */}
          <View style={styles.modeSelectionContainer}>
            {config.AUDIO_MODES.map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOptionCard, // <-- Nuevo estilo de tarjeta
                  selectedMode === mode.id && styles.modeOptionCardSelected
                ]}
                onPress={() => handleModeSelection(mode.id)}
              >
                 <View style={styles.modeOptionHeader}>
                    <Ionicons
                      name={mode.icon}
                      size={24} // Icono tamaño normal
                      color={selectedMode === mode.id ? config.COLORS.PRIMARY : config.COLORS.DARK_ACCENT}
                    />
                    <Text
                      style={[
                        styles.modeOptionTitle, // <-- Nuevo estilo de título
                        selectedMode === mode.id && styles.modeOptionTitleSelected
                      ]}
                    >
                      {mode.name}
                    </Text>
                 </View>
                <Text style={styles.modeOptionDescription}>{mode.description}</Text>
              </TouchableOpacity>
            ))}
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
              title={isClearingCache ? "Limpiando..." : "Limpiar"} // <-- Mostrar estado
              buttonStyle={styles.actionTextButton} // <-- Nuevo estilo de botón
              titleStyle={styles.actionTextButtonTitle}
              onPress={handleClearCache}
              disabled={isClearingCache || cacheSize === '0 MB' || cacheSize === 'Calculando...' || cacheSize === 'Error'} // <-- Deshabilitar si 0 o error
              loading={isClearingCache} // <-- Mostrar indicador
              loadingProps={{color: config.COLORS.PRIMARY}}
            />
          </View>
           <View style={[styles.storageItem, { borderBottomWidth: 0 }]}> {/* Último item sin borde */}
             <View style={styles.settingInfo}>
               <Ionicons name="timer-outline" size={24} color={config.COLORS.PRIMARY} style={styles.settingIcon} />
               <View style={styles.settingTextContainer}>
                 <Text style={styles.settingTitle}>Historial de reconocimiento</Text>
                 <Text style={styles.settingDescription}>Piezas vistas anteriormente.</Text>
               </View>
             </View>
             <Button
               title="Borrar"
               buttonStyle={styles.actionTextButton} // <-- Reutilizar estilo
               titleStyle={styles.actionTextButtonTitle}
               onPress={handleClearHistory}
             />
           </View>
        </View>

        {/* Sección de Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Más Opciones</Text>
          {/* // <-- Usar botones con estilo consistente */}
          <TouchableOpacity style={styles.actionRow} onPress={handleResetSettings}>
            <Ionicons name="refresh-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
            <Text style={styles.actionText}>Restablecer configuración</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleContactSupport}>
            <Ionicons name="mail-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
            <Text style={styles.actionText}>Contactar soporte</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleVisitWebsite}>
            <Ionicons name="globe-outline" size={24} color={config.COLORS.PRIMARY} style={styles.actionIcon} />
            <Text style={styles.actionText}>Visitar sitio web</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={config.COLORS.DARK_ACCENT} />
          </TouchableOpacity>
        </View>

        {/* Sección de Información */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de la App</Text>
           <View style={styles.infoItem}>
             <Text style={styles.infoLabel}>Versión</Text>
             <Text style={styles.infoValue}>1.0.1</Text> {/* // <-- Versión actualizada? */}
           </View>
           <View style={styles.infoItem}>
             <Text style={styles.infoLabel}>Desarrollado por</Text>
             <Text style={styles.infoValue}>Guideitor</Text> {/* O tu nombre/empresa */}
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


// --- Estilos actualizados ---
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
    fontFamily: 'railway', // <-- Fuente aplicada
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
  // Nota: last-child no funciona directamente en RN StyleSheets
  // Quitar borde manualmente al último si es necesario (ver uso inline arriba)
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  settingIcon: {
    marginRight: 15,
    width: 24, // Ancho fijo para icono
    alignItems: 'center', // Centrar icono si es necesario
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'industrial', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial', // <-- Fuente aplicada
    lineHeight: 18,
  },
  modeSelectionContainer: {
    // Contenedor para las tarjetas de modo
  },
  modeOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: config.COLORS.LIGHT_ACCENT + 'A0',
  },
  modeOptionCardSelected: {
    borderColor: config.COLORS.PRIMARY,
    backgroundColor: config.COLORS.PRIMARY + '10',
  },
  modeOptionHeader: { // Contenedor para icono y título
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  modeOptionTitle: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    fontFamily: 'railway', // <-- Fuente aplicada
    fontWeight: 'bold',
    marginLeft: 10, // Espacio desde el icono
  },
  modeOptionTitleSelected: {
     color: config.COLORS.PRIMARY,
  },
  modeOptionDescription: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial', // <-- Fuente aplicada
    lineHeight: 18,
    paddingLeft: 39, // Indentar descripción (ancho icono + margen)
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
     borderBottomWidth: 1,
     borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
   // Quitar borde manualmente al último si es necesario
  actionTextButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 5, // Menos padding para que no sea tan ancho
    paddingVertical: 5,
  },
  actionTextButtonTitle: {
    color: config.COLORS.PRIMARY,
    fontSize: 14,
    fontFamily: 'railway', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
     borderBottomWidth: 1,
     borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
   // Quitar borde manualmente al último si es necesario
  actionIcon: {
    marginRight: 15,
    width: 24, // Ancho fijo
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: config.COLORS.TEXT,
    flex: 1,
    fontFamily: 'industrial', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
     borderBottomWidth: 1,
     borderBottomColor: config.COLORS.LIGHT_ACCENT + '40',
  },
   // Quitar borde manualmente al último si es necesario
  infoLabel: {
    fontSize: 15,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial', // <-- Fuente aplicada
  },
  infoValue: {
    fontSize: 15,
    color: config.COLORS.TEXT,
    fontFamily: 'industrial', // <-- Fuente aplicada
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial', // <-- Fuente aplicada
  },
});

export default SettingsScreen;