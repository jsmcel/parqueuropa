const fallbackCoordinateData = require('./coordinates.json');

const FALLBACK_MONUMENTS = Array.isArray(fallbackCoordinateData)
  ? fallbackCoordinateData
  : Object.entries(fallbackCoordinateData?.monuments || {}).map(([id, data]) => ({
      id,
      ...(data || {}),
    }));

export default {
  API_URL: 'https://guideitor.ethcuela.es',
  APP_API_URL: 'https://guideitor.ethcuela.es',
  LEGACY_API_URL: 'https://guideitor.ethcuela.es',
  ALT_API_URLS: ['https://guideitor.ethcuela.es'],
  FRONTEND_MODE: 'gps',

  COLORS: {
    PRIMARY: '#005C5C',
    SECONDARY: '#9D4C2F',
    ACCENT: '#F5F2E9',
    TEXT: '#1F2A37',
    BACKGROUND: '#FDFBF6',
    DARK_ACCENT: '#0F3A3A',
    LIGHT_ACCENT: '#DDE4DE',
    GOLD: '#CFA15A',
  },

  ASSETS: {
    heroBanner: require('../../core/shared/assets/images/placeholder_large.png'),
    placeholderSmall: require('../../core/shared/assets/images/placeholder_small.png'),
    placeholderLarge: require('../../core/shared/assets/images/placeholder_large.png'),
    splashImage: require('../../core/shared/assets/images/placeholder_small.png'),
    appIcon: require('../parque_europa/assets/icon.png'),
    adaptiveIcon: require('../parque_europa/assets/adaptive-icon.png'),
  },

  APP_NAME: 'Bembibre Audio Tour',
  TENANT_ID: 'bembibre',
  PRIMARY_ACTION_LABEL: 'Iniciar paseo urbano',

  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Relato equilibrado para adultos.' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Version adaptada para familias y colegios.' },
    { id: 'experto', name: 'Experto', icon: 'library-outline', description: 'Detalles para amantes de la historia local.' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Dato curioso y tono distendido.' }
  ],

  HERO_CHIPS: [
    { icon: 'footsteps-outline', label: 'Itinerario urbano de 1 km' },
    { icon: 'map-outline', label: '6 paradas patrimoniales' },
    { icon: 'restaurant-outline', label: 'Sabores y compras locales' },
  ],

  CATEGORIES: [
    {
      id: 'casco_historico',
      name: 'Casco Historico',
      icon: 'business-outline',
      description: 'Plaza, iglesia y casas nobles que narran el origen de Bembibre.'
    },
    {
      id: 'museos',
      name: 'Museos y cultura',
      icon: 'school-outline',
      description: 'Colecciones municipales con arqueologia, etnografia y arte sacro.'
    },
    {
      id: 'miradores',
      name: 'Miradores y romeria',
      icon: 'navigate-outline',
      description: 'Santuario del Ecce Homo y paisajes del Bierzo Alto.'
    }
  ],

  PARK_INFO: {
    name: 'Bembibre Historico',
    address: 'Plaza Mayor, 24300 Bembibre, Leon',
    coordinates: { latitude: 42.6148, longitude: -6.4163 },
    hours: {
      monday: '10:00 - 14:00',
      tuesday: '10:00 - 14:00',
      wednesday: '10:00 - 14:00',
      thursday: '10:00 - 14:00',
      friday: '10:00 - 14:00 / 17:00 - 20:00',
      saturday: '10:00 - 13:30',
      sunday: 'Consultar apertura de museos'
    },
    contact: {
      phone: '+34 987 51 00 01',
      email: 'turismo@bembibre.es',
      website: 'https://www.bembibre.es/'
    },
    description: 'Ruta auto-guiada por el casco antiguo, museos municipales y el santuario del Ecce Homo.',
    highlights: [
      'Iglesia de San Pedro y antiguo foro comercial',
      'Museo Alto Bierzo en la Casa de las Culturas',
      'Colecciones cofrades del Museo de Arte Sacro',
      'Mirador del santuario del Ecce Homo'
    ]
  },

  ITINERARY_LENGTH_KM: 1.2,
  ITINERARY_DURATION_MIN: 75,
  ITINERARY_TOTAL_STOPS: 6,
  ITINERARY_STOPS: [
    { order: 1, id: 'Plaza-Mayor', name: 'Plaza Mayor e Iglesia de San Pedro', description: 'Antigua sinagoga y actual templo parroquial con campanario barroco.' },
    { order: 2, id: 'Museo-Alto-Bierzo', name: 'Museo Alto Bierzo', description: 'Coleccion arqueologica y etnografica del Bierzo Alto.' },
    { order: 3, id: 'Museo-Arte-Sacro', name: 'Museo de Arte Sacro', description: 'Pasos procesionales y patrimonio cofrade.' },
    { order: 4, id: 'Santuario-Ecce-Homo', name: 'Santuario del Ecce Homo', description: 'Mirador final y garita del Santo.' },
    { order: 5, id: 'Gastronomia-Bembibre', name: 'Sabores de Bembibre', description: 'Botillo, pimientos asados y tapas en la avenida Villafranca.' },
    { order: 6, id: 'Compras-Artesania', name: 'Compras y artesania', description: 'Mercado, charcuterias y talleres locales con productos del Bierzo.' }
  ],

  GPS: {
    defaultTriggerRadiusMeters: 35,
    fallbackMonuments: FALLBACK_MONUMENTS,
  },

  CAMERA: {
    ratio: '16:9',
    quality: 0.8,
    autoFocus: true,
    flashMode: 'auto'
  },

  RECOGNITION: {
    confidenceThreshold: 0.7,
    maxResults: 5,
    processingTimeout: 10000
  }
};
