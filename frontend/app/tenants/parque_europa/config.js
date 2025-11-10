const fallbackCoordinateData = require('./coordinates.json');

const FALLBACK_MONUMENTS = Array.isArray(fallbackCoordinateData)
  ? fallbackCoordinateData
  : Object.entries(fallbackCoordinateData?.monuments || {}).map(([id, data]) => ({
      id,
      ...(data || {}),
    }));

export default {
  // Configuración de la API
  API_URL: 'https://guideitor.ethcuela.es',
  APP_API_URL: 'https://guideitor.ethcuela.es',
  LEGACY_API_URL: 'https://guideitor.ethcuela.es',
  ALT_API_URLS: ['https://parqueuropa.guidaitor.es', 'https://guideitor.ethcuela.es'],
  FRONTEND_MODE: 'gps',
  

  // Configuración de colores para Parque Europa
  COLORS: {
    PRIMARY: '#1F7A5C', // Verde bosque profundo
    SECONDARY: '#1B4B9B', // Azul europeo
    ACCENT: '#F6F8F2', // Marfil claro
    TEXT: '#1F2A37', // Gris-azul oscuro
    BACKGROUND: '#EFF3EB', // Verde muy suave
    DARK_ACCENT: '#155244', // Verde oscuro
    LIGHT_ACCENT: '#CDE3D7', // Verde suave
    EUROPE_BLUE: '#1B4B9B',
    GOLD: '#E8B10E'
  },

  ASSETS: {
    heroBanner: require('./assets/banner_ferroviario.jpg'),
    placeholderSmall: require('./assets/placeholder_small.png'),
    placeholderLarge: require('./assets/placeholder_large.png'),
    splashImage: require('./assets/splash.png'),
    appIcon: require('./assets/icon.png'),
    adaptiveIcon: require('./assets/adaptive-icon.png'),
  },

  FONT_FILES: {
    railway: require('./assets/fonts/Railway.ttf'),
    industrial: require('./assets/fonts/Industrial.ttf'),
  },
  FONTS: {
    railway: 'railway',
    industrial: 'industrial',
  },

  // Configuración de la aplicación
  APP_NAME: 'Parque Europa Audio Tour',
  TENANT_ID: 'parque_europa',
  PRIMARY_ACTION_LABEL: 'Iniciar ruta GPS',

  // Modos de audio disponibles
  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Información estándar para todos los públicos' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Explicaciones adaptadas para niños' },
    { id: 'experto', name: 'Experto', icon: 'school-outline', description: 'Detalles técnicos y contexto histórico avanzado' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Versión con humor y curiosidades divertidas' }
  ],

  // Categorías del Parque Europa
  HERO_CHIPS: [
    { icon: 'map', label: 'Recorrido guiado de 2.9 km' },
    { icon: 'musical-notes', label: '18 relatos inmersivos' },
    { icon: 'leaf', label: 'Naturaleza y aire libre' },
  ],

  CATEGORIES: [
    {
      id: 'iconicos',
      name: 'Iconos de Europa',
      icon: 'library-outline',
      description: 'Torre Eiffel, Puerta de Brandeburgo, Atomium… un viaje por los hitos del continente.'
    },
    {
      id: 'jardines',
      name: 'Jardines & Lagos',
      icon: 'leaf-outline',
      description: 'Zonas verdes, cascadas y miradores para pasear sin prisas.'
    },
    {
      id: 'aventura',
      name: 'Aventura & Juegos',
      icon: 'compass-outline',
      description: 'Tirolinas, barcas y actividades para toda la familia.'
    },
    {
      id: 'sabores',
      name: 'Sabores del Parque',
      icon: 'restaurant-outline',
      description: 'Gastronomía europea en food trucks y terrazas.'
    }
  ],

  // Información del Parque Europa
  PARK_INFO: {
    name: 'Parque Europa',
    address: 'Paseo de Europa, 28905 Torrejón de Ardoz, Madrid',
    coordinates: { latitude: 40.4589, longitude: -3.4707 },
    hours: {
      monday: '10:00 - 22:00',
      tuesday: '10:00 - 22:00',
      wednesday: '10:00 - 22:00',
      thursday: '10:00 - 22:00',
      friday: '10:00 - 22:00',
      saturday: '10:00 - 22:00',
      sunday: '10:00 - 22:00'
    },
    contact: {
      phone: '+34 916 75 44 00',
      email: 'info@parqueeuropa.es',
      website: 'https://parqueeuropa.es'
    },
    description: 'Descubre monumentos emblemáticos de 17 países europeos, jardines temáticos y experiencias familiares al aire libre en Torrejón de Ardoz.',
    history: 'Inaugurado en 2010, el parque ofrece réplicas a escala, espectáculos y actividades que conectan cultura, naturaleza y ocio.',
    highlights: [
      'Torre Eiffel (Francia)',
      'Puerta de Brandeburgo (Alemania)',
      'Torre de Pisa (Italia)',
      'Big Ben (Reino Unido)',
      'Molinos de viento (Países Bajos)',
      'Atomium (Bélgica)',
      'Plaza Mayor (España)'
    ],
    countries: [
      'España', 'Francia', 'Alemania', 'Italia', 'Reino Unido', 'Países Bajos',
      'Bélgica', 'Portugal', 'Austria', 'Suiza', 'Dinamarca', 'Suecia',
      'Noruega', 'Finlandia', 'Polonia', 'República Checa', 'Grecia'
    ]
  },

  ITINERARY_LENGTH_KM: 2.9,
  ITINERARY_DURATION_MIN: 45,
  ITINERARY_TOTAL_STOPS: 18,
  ITINERARY_STOPS: [
    { order: 1, id: 'Puerta-Brandeburgo', name: 'Puerta de Brandeburgo', description: 'Inicio ceremonial del recorrido' },
    { order: 2, id: 'Muro-Berlin', name: 'Muro de Berlín', description: 'Recuerdo histórico imprescindible' },
    { order: 3, id: 'Plaza-Mayor', name: 'Plaza Mayor', description: 'Escena urbana para fotos panorámicas' },
    { order: 4, id: 'La-Sirenita', name: 'La Sirenita', description: 'La esquina nórdica junto al lago' },
    { order: 5, id: 'Barco-Vikingo', name: 'Barco Vikingo', description: 'Leyendas del norte en plena laguna' },
    { order: 6, id: 'Fontana-Trevi', name: 'Fontana de Trevi', description: 'Rinconcito italiano para pedir deseos' },
    { order: 7, id: 'David-Miguel-Angel', name: 'David de Miguel Ángel', description: 'Maestría renacentista en pleno parque' },
    { order: 8, id: 'Torre-Eiffel', name: 'Torre Eiffel', description: 'Punto selfie obligado' },
    { order: 9, id: 'Manneken-Pis', name: 'Manneken Pis', description: 'El guiño más divertido de Bruselas' },
    { order: 10, id: 'Plaza-Europa', name: 'Plaza Europa', description: 'Centro neurálgico del parque' },
    { order: 11, id: 'Atomium', name: 'Atomium', description: 'Ciencia y futurismo belga' },
    { order: 12, id: 'Puerta-Alcala', name: 'Puerta de Alcalá', description: 'Orgullo madrileño al aire libre' },
    { order: 13, id: 'Las-Tres-Gracias', name: 'Las Tres Gracias', description: 'Arte clásico que da la bienvenida' },
    { order: 14, id: 'Torre-Belem', name: 'Torre de Belém', description: 'Defensa histórica junto al agua' },
    { order: 15, id: 'Puente-Van-Gogh', name: 'Puente de Van Gogh', description: 'Postales de la campiña francesa' },
    { order: 16, id: 'Molinos-Holanda', name: 'Molinos Holandeses', description: 'El rincón más fotogénico' },
    { order: 17, id: 'Puente-Londres', name: 'Puente de Londres', description: 'Ingeniería victoriana' },
    { order: 18, id: 'Teatro-Griego', name: 'Teatro Griego', description: 'Cierre cultural del itinerario' },
  ],

  GPS: {
    defaultTriggerRadiusMeters: 35,
    fallbackMonuments: FALLBACK_MONUMENTS,
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
