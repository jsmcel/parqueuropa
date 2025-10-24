export default {
  // Configuración de la API
  API_URL: 'http://192.168.86.250:3000', // ← CAMBIAR ESTA LÍNEA
  

  // Configuración de colores para el Modo Thomas (más infantil y divertido)
  COLORS: {
    PRIMARY: '#ff6b35', // Naranja vibrante como Thomas
    SECONDARY: '#4ecdc4', // Turquesa divertido
    ACCENT: '#ffeaa7', // Amarillo suave
    TEXT: '#2d3436', // Gris oscuro para buen contraste
    BACKGROUND: '#f8f9fa', // Blanco suave
    DARK_ACCENT: '#fd79a8', // Rosa oscuro
    LIGHT_ACCENT: '#a29bfe', // Púrpura claro
    THOMAS_BLUE: '#0984e3', // Azul Thomas
    THOMAS_RED: '#e17055' // Rojo Thomas
  },

  // Configuración de la aplicación
  APP_NAME: 'Thomas & Friends - Museo del Ferrocarril',
  TENANT_ID: 'museo_ferrocarril',

  // Modos de audio disponibles (incluyendo Thomas)
  AUDIO_MODES: [
    {
      id: 'thomas',
      name: 'Thomas',
      icon: require('./assets/categories/thomas.png'),
      description: '¡Modo especial con Thomas y sus amigos!',
      isSpecial: true
    }
  ],

  // Categorías del museo (versión Thomas)
  CATEGORIES: [
    {
      id: 'locomotoras_vapor',
      name: '🚂 Locomotoras de Vapor',
      icon: 'train-outline',
      description: '¡Las locomotoras de vapor más antiguas y fascinantes! Como Thomas y sus amigos.',
      image: require('./assets/categories/vapor.jpg')
    },
    {
      id: 'locomotoras_diesel',
      name: '🚇 Locomotoras Diesel',
      icon: 'subway-outline',
      description: '¡Las locomotoras diesel que cambiaron el mundo del ferrocarril!',
      image: require('./assets/categories/diesel.jpg')
    },
    {
      id: 'locomotoras_electricas',
      name: '⚡ Locomotoras Eléctricas',
      icon: 'flash-outline',
      description: '¡Las locomotoras eléctricas más modernas y rápidas!',
      image: require('./assets/categories/electricas.jpg')
    },
    {
      id: 'automotores',
      name: '🚌 Automotores',
      icon: 'car-outline',
      description: '¡Los automotores que revolucionaron el transporte de pasajeros!',
      image: require('./assets/categories/automotores.jpg')
    }
  ],

  // Información del museo (versión Thomas)
  MUSEUM_INFO: {
    name: '🏛️ Museo del Ferrocarril de Madrid',
    address: '📍 Paseo de las Delicias, 61, 28045 Madrid',
    coordinates: { latitude: 40.4406, longitude: -3.6957 },
    hours: {
      monday: '❌ Cerrado',
      tuesday: '🕙 10:00 - 15:00',
      wednesday: '🕙 10:00 - 15:00',
      thursday: '🕙 10:00 - 15:00',
      friday: '🕙 10:00 - 15:00',
      saturday: '🕙 10:00 - 19:00',
      sunday: '🕙 10:00 - 15:00'
    },
    contact: {
      phone: '📞 +34 902 22 88 22',
      email: '📧 museoferrocarril@ffe.es',
      website: '🌐 https://www.museodelferrocarril.org/'
    },
    description: '¡El Museo del Ferrocarril de Madrid es un lugar mágico donde puedes ver locomotoras increíbles! Está en la antigua estación de Delicias.',
    history: '🏛️ La estación de Delicias se abrió en 1880 y se convirtió en museo en 1984. ¡Es muy antigua!',
    highlights: [
      '🚂 Locomotora de vapor "Tardienta" (1858) - ¡Como Thomas!',
      '👑 Coche real de Alfonso XIII - ¡Muy elegante!',
      '⚡ Locomotora eléctrica 7512 - ¡Muy rápida!',
      '🚌 Automotor diesel 9404 "Ferrobús" - ¡Como un autobús con ruedas de tren!'
    ]
  },

  // Configuración de la cámara
  CAMERA: {
    ratio: '16:9',
    quality: 0.8,
    autoFocus: true,
    flashMode: 'auto'
  },

  // Configuración de reconocimiento
  RECOGNITION: {
    confidenceThreshold: 0.7,
    maxResults: 5,
    processingTimeout: 10000
  },

  // Configuración específica del modo Thomas
  THOMAS_MODE: {
    enabled: true,
    audioSuffix: '-THOMAS',
    theme: 'thomas',
    animations: true,
    soundEffects: true
  }
}; 