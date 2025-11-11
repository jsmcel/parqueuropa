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
    heroBanner: require('./assets/hero-banner.jpg'),
    placeholderSmall: require('./assets/placeholder_small.jpg'),
    placeholderLarge: require('./assets/placeholder_large.jpg'),
    splashImage: require('./assets/splash.png'),
    appIcon: require('./assets/icon.png'),
    adaptiveIcon: require('./assets/adaptive-icon.png'),
  },

  APP_NAME: 'Bembibre Audio Tour',
  TENANT_ID: 'bembibre',
  PRIMARY_ACTION_LABEL: 'Comenzar recorrido urbano',

  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Narracion completa con tono divulgativo.' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Version dinamica con pistas para familias.' },
    { id: 'experto', name: 'Experto', icon: 'library-outline', description: 'Contexto historico y datos de archivo.' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Humor berciano y anecdotas curiosas.' }
  ],
  HOME_INTRO_AUDIO: {
    pieceId: 'home-intro',
    mode: 'normal',
    language: 'es',
    title: 'Bienvenida sonora',
    description: 'Un minuto de contexto antes de empezar la ruta.',
  },

  HERO_CHIPS: [
    { icon: 'home-outline', label: 'Inicio en la Casa de las Culturas' },
    { icon: 'walk-outline', label: 'Recorrido de 1.4 km / 85 min' },
    { icon: 'sunny-outline', label: 'Final panoramico en el santuario' },
  ],
  HERO_SLUGS: [
    'casa-de-las-culturas-bembibre',
    'plaza-mayor-bembibre',
    'santuario-ecce-homo-bembibre',
  ],

  CATEGORIES: [
    {
      id: 'casco_historico',
      name: 'Casco historico vivo',
      icon: 'business-outline',
      description: 'Plaza Mayor, antigua sinagoga y Villavieja unidos por soportales y pendientes.'
    },
    {
      id: 'museos',
      name: 'Museos y cultura',
      icon: 'school-outline',
      description: 'Casa de las Culturas y Museo Alto Bierzo condensan archivos, talleres y colecciones.'
    },
    {
      id: 'miradores',
      name: 'Miradores y romeria',
      icon: 'navigate-outline',
      description: 'Del barrio de La Villavieja al santuario del Ecce Homo con vistas sobre el Boeza.'
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
    description: 'Itinerario auto-guiado que arranca en la Casa de las Culturas, recorre plaza e iglesia y termina en el santuario del Ecce Homo.',
    highlights: [
      'Bienvenida y oficina de turismo en la Casa de las Culturas',
      'Museo Alto Bierzo con piezas arqueologicas y etnograficas',
      'Plaza Mayor e Iglesia de San Pedro como nucleo historico',
      'Mirador y devocion en el santuario del Ecce Homo'
    ]
  },

  ITINERARY_LENGTH_KM: 1.4,
  ITINERARY_DURATION_MIN: 85,
  ITINERARY_TOTAL_STOPS: 8,
  ITINERARY_SECTION_TITLE: 'Itinerario Bembibre Historico',
  ITINERARY_STOPS: [
    { order: 1, id: 'casa-de-las-culturas-bembibre', name: 'Casa de las Culturas', description: 'Bienvenida, lucernario y servicios culturales y turisticos.' },
    { order: 2, id: 'museo-alto-bierzo-bembibre', name: 'Museo Alto Bierzo', description: 'Colecciones arqueologicas y etnograficas dentro de la Casa de las Culturas.' },
    { order: 3, id: 'plaza-mayor-bembibre', name: 'Plaza Mayor y Casa Consistorial', description: 'Soportales comerciales y ayuntamiento contemporaneo sobre el regimiento historico.' },
    { order: 4, id: 'iglesia-san-pedro-bembibre', name: 'Iglesia de San Pedro', description: 'Antigua sinagoga con portada romanica y el Cristo Rojo.' },
    { order: 5, id: 'edificio-villarejo-bembibre', name: 'Edificio Villarejo', description: 'Fachada de 1919 y ferreteria centenaria que simboliza el auge comercial.' },
    { order: 6, id: 'ruta-modernista-bembibre', name: 'Ruta Modernista', description: 'Fachadas burguesas de la avenida Susana Gonzalez tras el edificio Villarejo.' },
    { order: 7, id: 'villavieja-castillo-bembibre', name: 'La Villavieja y casa fuerte', description: 'Restos del castillo y vistas al valle del Boeza.' },
    { order: 8, id: 'santuario-ecce-homo-bembibre', name: 'Santuario del Ecce Homo', description: 'Templo barroco-neoclasico y romeria del patron.' }
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
