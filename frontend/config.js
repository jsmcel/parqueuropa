export default {
  // Configuración de la API
  API_URL: 'https://parqueuropa.ethcuela.es',
  

  // Configuración de colores para Parque Europa
  COLORS: {
    PRIMARY: '#2E8B57', // Verde Europa
    SECONDARY: '#4169E1', // Azul real
    ACCENT: '#F0F8FF', // Blanco azulado
    TEXT: '#2F4F4F', // Gris oscuro
    BACKGROUND: '#F5F5DC', // Beige claro
    DARK_ACCENT: '#228B22', // Verde bosque
    LIGHT_ACCENT: '#90EE90', // Verde claro
    EUROPE_BLUE: '#003399', // Azul bandera Europa
    GOLD: '#FFD700' // Dorado
  },

  // Configuración de la aplicación
  APP_NAME: 'Guía Parque Europa',
  TENANT_ID: 'parque_europa',

  // Modos de audio disponibles
  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Información estándar para todos los públicos' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Explicaciones adaptadas para niños' },
    { id: 'experto', name: 'Experto', icon: 'school-outline', description: 'Detalles técnicos y contexto histórico avanzado' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Versión con humor y curiosidades divertidas' }
  ],

  // Categorías del Parque Europa
  CATEGORIES: [
    {
      id: 'monumentos_europeos',
      name: 'Monumentos Europeos',
      icon: 'library-outline',
      description: 'Réplicas de los monumentos más emblemáticos de Europa: Torre Eiffel, Puerta de Brandeburgo, Torre de Pisa y más.',
      image: require('./assets/categories/vapor.jpg')
    },
    {
      id: 'jardines_tematicos',
      name: 'Jardines Temáticos',
      icon: 'leaf-outline',
      description: 'Espacios verdes únicos que representan la diversidad natural y cultural de los diferentes países europeos.',
      image: require('./assets/categories/diesel.jpg')
    },
    {
      id: 'actividades_familiares',
      name: 'Actividades Familiares',
      icon: 'people-outline',
      description: 'Zona de entretenimiento con atracciones y actividades diseñadas para disfrutar en familia.',
      image: require('./assets/categories/electricas.jpg')
    },
    {
      id: 'gastronomia_europea',
      name: 'Gastronomía Europea',
      icon: 'restaurant-outline',
      description: 'Puntos de restauración que ofrecen la mejor gastronomía de los países europeos representados.',
      image: require('./assets/categories/automotores.jpg')
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
      website: 'https://www.parqueeuropa.es/'
    },
    description: 'Parque Europa es un espacio único de 233.000 m² que alberga réplicas de los monumentos más emblemáticos de Europa, convirtiéndose en un viaje por la cultura europea sin salir de Madrid.',
    history: 'Inaugurado en 2010, el parque representa la diversidad cultural europea a través de réplicas a escala de monumentos icónicos de 17 países europeos.',
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
