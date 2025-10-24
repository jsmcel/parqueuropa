export default {
  // Configuración de la API
  API_URL: 'https://guideitor.ethcuela.es',
  

  // Configuración de colores para el Museo del Ferrocarril
  COLORS: {
    PRIMARY: '#1a3c6e',
    SECONDARY: '#e63946',
    ACCENT: '#f1faee',
    TEXT: '#1d3557',
    BACKGROUND: '#f1faee',
    DARK_ACCENT: '#457b9d',
    LIGHT_ACCENT: '#a8dadc'
  },

  // Configuración de la aplicación
  APP_NAME: 'Guía Museo del Ferrocarril',
  TENANT_ID: 'museo_ferrocarril',

  // Modos de audio disponibles
  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Información estándar para todos los públicos' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Explicaciones adaptadas para niños' },
    { id: 'experto', name: 'Experto', icon: 'school-outline', description: 'Detalles técnicos y contexto histórico avanzado' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Versión con humor y curiosidades divertidas' }
  ],

  // Categorías del museo
  CATEGORIES: [
    {
      id: 'locomotoras_vapor',
      name: 'Locomotoras de Vapor',
      icon: 'train-outline',
      description: 'Colección de locomotoras históricas de vapor que representan la primera era del ferrocarril español.',
      image: require('./assets/categories/vapor.jpg')
    },
    {
      id: 'locomotoras_diesel',
      name: 'Locomotoras Diesel',
      icon: 'subway-outline',
      description: 'Exposición de locomotoras diesel que marcaron la transición tecnológica en el transporte ferroviario.',
      image: require('./assets/categories/diesel.jpg')
    },
    {
      id: 'locomotoras_electricas',
      name: 'Locomotoras Eléctricas',
      icon: 'flash-outline',
      description: 'Muestra de locomotoras eléctricas que representan la modernización del ferrocarril español.',
      image: require('./assets/categories/electricas.jpg')
    },
    {
      id: 'automotores',
      name: 'Automotores',
      icon: 'car-outline',
      description: 'Colección de automotores y unidades de tren que revolucionaron el transporte de pasajeros.',
      image: require('./assets/categories/automotores.jpg')
    }
  ],

  // Información del museo
  MUSEUM_INFO: {
    name: 'Museo del Ferrocarril de Madrid',
    address: 'Paseo de las Delicias, 61, 28045 Madrid',
    coordinates: { latitude: 40.4406, longitude: -3.6957 },
    hours: {
      monday: 'Cerrado',
      tuesday: '10:00 - 15:00',
      wednesday: '10:00 - 15:00',
      thursday: '10:00 - 15:00',
      friday: '10:00 - 15:00',
      saturday: '10:00 - 19:00',
      sunday: '10:00 - 15:00'
    },
    contact: {
      phone: '+34 902 22 88 22',
      email: 'museoferrocarril@ffe.es',
      website: 'https://www.museodelferrocarril.org/'
    },
    description: 'El Museo del Ferrocarril de Madrid está ubicado en la antigua estación de Delicias y alberga una importante colección de material histórico ferroviario.',
    history: 'La estación de Delicias fue inaugurada en 1880 y rehabilitada como museo en 1984.',
    highlights: [
      'Locomotora de vapor "Tardienta" (1858)',
      'Coche real de Alfonso XIII',
      'Locomotora eléctrica 7512',
      'Automotor diesel 9404 "Ferrobús"'
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
  }
};
