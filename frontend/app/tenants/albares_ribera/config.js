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
    PRIMARY: '#2F4858',
    SECONDARY: '#C78A2A',
    ACCENT: '#F5EFE3',
    TEXT: '#1F1F1F',
    BACKGROUND: '#FCFBF6',
    DARK_ACCENT: '#1F3A3D',
    LIGHT_ACCENT: '#D8E2D0',
    GOLD: '#C79B4A',
  },

  ASSETS: {
    heroBanner: require('./assets/hero-banner.jpg'),
    placeholderSmall: require('./assets/placeholder_small.jpg'),
    placeholderLarge: require('./assets/placeholder_large.jpg'),
    splashImage: require('./assets/splash.png'),
    appIcon: require('./assets/icon.png'),
    adaptiveIcon: require('./assets/adaptive-icon.png'),
  },

  APP_NAME: 'Albares de la Ribera Audio Tour',
  TENANT_ID: 'albares_ribera',
  PRIMARY_ACTION_LABEL: 'Iniciar ruta del Boeza',

  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Narracion completa con tono divulgativo.' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Version dinamica con pistas para familias.' },
    { id: 'experto', name: 'Experto', icon: 'school-outline', description: 'Contexto historico y datos de archivo.' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Humor berciano y anecdotas curiosas.' }
  ],
  HOME_INTRO_AUDIO: {
    pieceId: 'home-intro',
    mode: 'normal',
    language: 'es',
    title: 'Bienvenida a Albares',
    description: 'Panorama inicial sobre el Boeza, sus rutas y memorias.',
  },

  HERO_CHIPS: [
    { icon: 'water-outline', label: 'Inicio junto al río Boeza' },
    { icon: 'walk-outline', label: 'Recorrido de 2 km / 95 min' },
    { icon: 'restaurant-outline', label: 'Huertas, ventas y botillo' },
  ],
  HERO_SLUGS: [
    'plaza-mayor-albares',
    'huerta-grande-albares',
    'camino-ventas-albares',
  ],

  CATEGORIES: [
    {
      id: 'historico',
      name: 'Rutas históricas',
      icon: 'compass-outline',
      description: 'El Pontón, el Camino Real y la memoria del ayuntamiento.'
    },
    {
      id: 'paisaje',
      name: 'Paisaje y agua',
      icon: 'leaf-outline',
      description: 'Reguera, fuentes y las huertas que alimentan al valle.'
    },
    {
      id: 'sabores',
      name: 'Sabores bercianos',
      icon: 'restaurant-outline',
      description: 'Barrio Botillo, ventas y productos de la ribera.'
    }
  ],

  PARK_INFO: {
    name: 'Albares de la Ribera',
    address: 'Plaza de Antonio Alonso, 24350 Albares de la Ribera, Leon',
    coordinates: { latitude: 42.6085, longitude: -6.3659 },
    hours: {
      monday: 'Siempre abierto',
      tuesday: 'Siempre abierto',
      wednesday: 'Siempre abierto',
      thursday: 'Siempre abierto',
      friday: 'Siempre abierto',
      saturday: 'Siempre abierto',
      sunday: 'Siempre abierto'
    },
    contact: {
      phone: '+34 987 51 00 01',
      email: 'junta@albaresdelaribera.es',
      website: 'https://www.torredebierzo.es/'
    },
    description: 'Ruta auto-guiada por el valle del Boeza para descubrir El Pontón, la reguera, la plaza mayor, la iglesia de San Millán y la huerta del arzobispo.',
    highlights: [
      'Cruce histórico de caminos jacobeos',
      'Reguera y linares que impulsaron la economía del lino',
      'Memoria del ayuntamiento trasladado en posguerra',
      'Huerta Grande convertida en espacio comunitario'
    ]
  },

  ITINERARY_LENGTH_KM: 2.1,
  ITINERARY_DURATION_MIN: 95,
  ITINERARY_TOTAL_STOPS: 9,
  ITINERARY_SECTION_TITLE: 'Itinerario Albares de la Ribera',
  ITINERARY_STOPS: [
    { order: 1, id: 'rio-boeza-ponton', name: 'El Pontón y las rutas jacobeas', description: 'Puente histórico sobre el Boeza y cruce de caminos peregrinos.' },
    { order: 2, id: 'la-reguera', name: 'La Reguera', description: 'Acequia comunal que alimentaba las huertas del valle.' },
    { order: 3, id: 'plaza-mayor-albares', name: 'Plaza Mayor y Casa de Sabugo', description: 'Centro civil, escenario del antiguo ayuntamiento y del film El Filandón.' },
    { order: 4, id: 'iglesia-san-millan-albares', name: 'Iglesia de San Millán', description: 'Templo mudéjar-barroco y memoria de la profanación napoleónica.' },
    { order: 5, id: 'barrio-sardon-la-era', name: 'La Era y el Barrio Sardón', description: 'El espacio comunal de trilla frente a la moderna autovía A-6.' },
    { order: 6, id: 'fuente-del-bosque-albares', name: 'Fuente del Bosque', description: 'Punto de encuentro vecinal para recoger agua y compartir noticias.' },
    { order: 7, id: 'huerta-grande-albares', name: 'Huerta Grande · Villa Antolín', description: 'La finca del arzobispo López Peláez convertida en espacio cultural.' },
    { order: 8, id: 'barrio-botillo-albares', name: 'Barrio Botillo', description: 'Epicentro de los sabores bercianos y de la I.G.P. Botillo.' },
    { order: 9, id: 'camino-ventas-albares', name: 'Camino a Las Ventas', description: 'Tramo hacia el Puente de Lagares, puerta comercial del valle.' }
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
