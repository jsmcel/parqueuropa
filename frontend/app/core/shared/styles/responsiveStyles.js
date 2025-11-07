import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Estilos responsivos globales para web
export const responsiveStyles = StyleSheet.create({
  // Contenedor principal responsivo
  responsiveContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
    })
  },

  // SafeArea responsivo
  responsiveSafeArea: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
      paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
    })
  },

  // ScrollView responsivo
  responsiveScrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      height: '100vh',
      width: '100vw',
    })
  },

  // Contenido del ScrollView responsivo
  responsiveScrollContent: {
    paddingBottom: Platform.OS === 'web' ? 'max(env(safe-area-inset-bottom, 30px), 30px)' : 30,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
    })
  },

  // Botones responsivos
  responsiveButton: {
    ...(Platform.OS === 'web' && {
      minHeight: 44,
      minWidth: 44,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        opacity: 0.8,
      },
      '&:active': {
        transform: 'scale(0.95)',
      }
    })
  },

  // Botones grandes responsivos
  responsiveButtonLarge: {
    paddingVertical: Platform.OS === 'web' ? 15 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 30 : 25,
    borderRadius: Platform.OS === 'web' ? 30 : 25,
    minHeight: Platform.OS === 'web' ? 50 : 45,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        opacity: 0.9,
        transform: 'translateY(-1px)',
      },
      '&:active': {
        transform: 'translateY(0px)',
      }
    })
  },

  // Texto responsivo
  responsiveText: {
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
    })
  },

  // Inputs responsivos
  responsiveInput: {
    ...(Platform.OS === 'web' && {
      minHeight: 44,
      paddingVertical: 12,
    })
  },

  // Cards responsivas
  responsiveCard: {
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        shadowOpacity: 0.3,
      }
    })
  },

  // Espaciado responsivo
  responsivePadding: {
    paddingHorizontal: Platform.OS === 'web' ? 'max(20px, 5vw)' : 20,
    paddingVertical: Platform.OS === 'web' ? 'max(15px, 3vh)' : 15,
  },

  // Márgenes responsivos
  responsiveMargin: {
    marginHorizontal: Platform.OS === 'web' ? 'max(10px, 2.5vw)' : 10,
    marginVertical: Platform.OS === 'web' ? 'max(10px, 2vh)' : 10,
  },

  // Contenedor de botones fijos en la parte inferior
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingTop: 15,
    paddingBottom: Platform.OS === 'web' ? 'max(env(safe-area-inset-bottom, 25px), 25px)' : 25,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(15px)',
      borderTopWidth: 2,
      borderTopColor: 'rgba(0, 0, 0, 0.15)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
    })
  },

  // Botón flotante responsivo
  floatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 'max(env(safe-area-inset-bottom, 20px), 20px)' : 20,
    right: 20,
    width: Platform.OS === 'web' ? 60 : 56,
    height: Platform.OS === 'web' ? 60 : 56,
    borderRadius: Platform.OS === 'web' ? 30 : 28,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'scale(1.1)',
      },
      '&:active': {
        transform: 'scale(0.95)',
      }
    })
  },

  // Header responsivo
  responsiveHeader: {
    paddingTop: Platform.OS === 'web' ? 'max(env(safe-area-inset-top, 20px), 20px)' : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    })
  }
});

// Función helper para combinar estilos responsivos
export const combineResponsiveStyles = (baseStyles, responsiveStyles) => {
  return StyleSheet.create({
    ...baseStyles,
    ...Object.keys(responsiveStyles).reduce((acc, key) => {
      acc[key] = {
        ...baseStyles[key],
        ...responsiveStyles[key]
      };
      return acc;
    }, {})
  });
};

// Función helper para obtener estilos específicos de plataforma
export const getPlatformStyles = (webStyles, mobileStyles = {}) => {
  return Platform.OS === 'web' ? webStyles : mobileStyles;
};
