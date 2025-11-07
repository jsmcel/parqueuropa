// Contenido para backend/server.js (Versión Multi-Tenant)
const path = require('path'); // Ensure path is imported if not already
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Pino logger
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // LOG_LEVEL can be set in .env
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined, // Use default JSON output in production
});

const express = require('express');
const mongoose = require('mongoose'); // Mongoose se mantiene por si lo usas para 'audios' u otra cosa, o para el futuro.
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const { networkInterfaces } = require('os');

// Dependencias para Reconocimiento
const ort = require('onnxruntime-node');
const { createCanvas, loadImage } = require('canvas');

// Dependencias para Analytics
const analyticsMiddleware = require('./middleware/analyticsMiddleware');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { trackRecognition, trackAudio } = require('./controllers/analyticsController');

// Multi-tenant dependencies
const tenantMiddleware = require('./middleware/tenantMiddleware');
const { getTenantPaths, validateTenantFiles, listTenantsStatus, getBestAvailableModel } = require('./utils/tenantResolver');

// --- Configuración ---
const PORT = process.env.BACKEND_PORT || 3000; // Renamed to avoid conflict if frontend also uses PORT
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guideitor';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT || 'museo_ferrocarril';

const CONFIG = {
    IMG_SIZE: parseInt(process.env.IMG_SIZE, 10) || 224,
    SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.8,
    SUGGESTION_THRESHOLD: parseFloat(process.env.SUGGESTION_THRESHOLD) || 0.3,
    TOP_N_SUGGESTIONS: parseInt(process.env.TOP_N_SUGGESTIONS, 10) || 3,
    SIMILARITY_THRESHOLD_SECONDARY: parseFloat(process.env.SIMILARITY_THRESHOLD_SECONDARY) || 0.7,
};

// Crear aplicación Express
const app = express();

// ========================================
// MIDDLEWARE DE SEGURIDAD PARA PRODUCCIÓN
// ========================================

// 1. Helmet para headers de seguridad
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. CORS configurado para producción
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 4. Compresión para mejorar rendimiento
const compression = require('compression');
app.use(compression());

// 5. Body parser con límites seguros
app.use(bodyParser.json({ 
  limit: '10mb', // Reducido de 50mb para seguridad
  verify: (req, res, buf) => {
    req.rawBody = buf; // Para validación adicional si es necesario
  }
}));
app.use(bodyParser.urlencoded({ 
  limit: '10mb', 
  extended: true 
}));

// 6. Analytics Middleware (tracking automático)
app.use(analyticsMiddleware);

// 7. Tenant Middleware (MULTI-TENANT)
app.use('/api/', tenantMiddleware);

// 7. Validación de entrada
const { body, validationResult } = require('express-validator');

// 7. Servir archivos estáticos con cache headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      // Forzar CORS solo para los dominios permitidos (el primero de la lista)
      if (process.env.CORS_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN.split(',')[0]);
      }
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

// ========================================
// CONEXIÓN MONGODB
// ========================================
const mongooseOptions = { 
  useNewUrlParser: true, 
  useUnifiedTopology: true, 
  family: 4,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => logger.info(`Conectado a MongoDB (URI: ${MONGODB_URI})`))
    .catch(err => logger.error({ err: err.message, stack: err.stack }, `Error al conectar a MongoDB`));

// ========================================
// MONITOREO Y MÉTRICAS (OPCIONAL)
// ========================================
if (process.env.ENABLE_METRICS === 'true') {
  const prometheus = require('prom-client');
  const collectDefaultMetrics = prometheus.collectDefaultMetrics;
  collectDefaultMetrics();
  
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  });
  
  logger.info('Métricas de Prometheus habilitadas en /metrics');
}

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  });
});

// ========================================
// TENANT STATUS ENDPOINT
// ========================================
app.get('/api/status', (req, res) => {
  const tenantsStatus = listTenantsStatus();
  res.json({
    status: 'ok',
    tenants: tenantsStatus,
    defaultTenant: DEFAULT_TENANT,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// TENANT CONFIG ENDPOINT
// ========================================
app.get('/api/tenant-config', (req, res) => {
  const tenantId = req.tenant.id;
  const tenantConfig = req.tenant.config || {};
  const mode = tenantConfig.frontendMode || 'vision';
  const monumentsMap = getTenantCoordinates(tenantId);

  res.json({
    tenant: {
      id: tenantId,
      name: tenantConfig.name || tenantId,
      description: tenantConfig.description || null,
      frontendMode: mode,
    },
    gps: {
      coordinatesAvailable: monumentsMap !== null,
      totalMonuments: monumentsMap ? Object.keys(monumentsMap).length : 0,
      defaultTriggerRadiusMeters: GPS_DEFAULT_RADIUS_METERS,
    },
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// COORDINATES ENDPOINTS (GPS MODE)
// ========================================
app.get('/api/coordinates/all', (req, res) => {
  const tenantId = req.tenant.id;
  const monumentsMap = getTenantCoordinates(tenantId);

  if (!monumentsMap) {
    return res.status(404).json({
      error: 'No hay coordenadas configuradas para este tenant',
      tenant: tenantId,
    });
  }

  const monumentsArray = monumentsMapToArray(monumentsMap);

  res.json({
    tenant: tenantId,
    count: monumentsArray.length,
    defaultTriggerRadiusMeters: GPS_DEFAULT_RADIUS_METERS,
    monuments: monumentsArray,
  });
});

app.get('/api/coordinates/nearest', (req, res) => {
  const tenantId = req.tenant.id;
  const monumentsMap = getTenantCoordinates(tenantId);

  if (!monumentsMap) {
    return res.status(404).json({
      error: 'No hay coordenadas configuradas para este tenant',
      tenant: tenantId,
    });
  }

  const latitude = parseFloat(req.query.lat || req.query.latitude);
  const longitude = parseFloat(req.query.lng || req.query.lon || req.query.longitude);
  const radius = parseFloat(req.query.radiusMeters || req.query.radius) || GPS_DEFAULT_RADIUS_METERS;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({
      error: 'Parámetros lat y lng son requeridos',
      received: req.query,
    });
  }

  const monumentsArray = monumentsMapToArray(monumentsMap);
  const nearest = findNearestMonument(monumentsArray, latitude, longitude);

  if (!nearest) {
    return res.status(404).json({
      error: 'No se encontraron monumentos con coordenadas válidas',
      tenant: tenantId,
    });
  }

  const withinRadius = nearest.distance <= radius;

  res.json({
    tenant: tenantId,
    query: {
      latitude,
      longitude,
      radiusMeters: radius,
    },
    nearest: {
      ...nearest,
      withinRadius,
    },
  });
});

app.get('/api/coordinates/:monumentId', (req, res) => {
  const tenantId = req.tenant.id;
  const monumentsMap = getTenantCoordinates(tenantId);

  if (!monumentsMap) {
    return res.status(404).json({
      error: 'No hay coordenadas configuradas para este tenant',
      tenant: tenantId,
    });
  }

  const monument = monumentsMap[req.params.monumentId];

  if (!monument) {
    return res.status(404).json({
      error: 'Monumento no encontrado',
      monumentId: req.params.monumentId,
      tenant: tenantId,
    });
  }

  res.json({
    tenant: tenantId,
    monumentId: req.params.monumentId,
    data: monument,
  });
});

// --- Lógica de Reconocimiento ONNX Multi-Tenant ---
let tenantSessions = {}; // Map de sesiones por tenant
let tenantLabels = {}; // Map de labels por tenant

// Agregar cache para evitar reprocesar imágenes idénticas
const crypto = require('crypto');
const imageCache = new Map();
const coordinatesCache = new Map();
const itineraryCache = new Map();

const GPS_DEFAULT_RADIUS_METERS = parseFloat(process.env.GPS_TRIGGER_RADIUS_METERS) || 35;

function getTenantCoordinates(tenantId) {
  if (coordinatesCache.has(tenantId)) {
    return coordinatesCache.get(tenantId);
  }

  try {
    const paths = getTenantPaths(tenantId);
    const coordinatesPath = path.join(paths.tenantDir, 'coordinates.json');

    if (!fs.existsSync(coordinatesPath)) {
      coordinatesCache.set(tenantId, null);
      return null;
    }

    const rawData = fs.readFileSync(coordinatesPath, 'utf8');
    const parsed = JSON.parse(rawData);
    const monuments = parsed?.monuments || {};
    coordinatesCache.set(tenantId, monuments);
    itineraryCache.delete(tenantId);
    return monuments;
  } catch (error) {
    logger.error({ err: error.message }, `Error cargando coordenadas para tenant ${tenantId}`);
    coordinatesCache.set(tenantId, null);
    itineraryCache.delete(tenantId);
    return null;
  }
}

function invalidateCoordinatesCache(tenantId) {
  if (tenantId) {
    coordinatesCache.delete(tenantId);
    itineraryCache.delete(tenantId);
  } else {
    coordinatesCache.clear();
    itineraryCache.clear();
  }
}

function monumentsMapToArray(monumentsMap) {
  if (!monumentsMap) return [];
  return Object.entries(monumentsMap).map(([id, value]) => ({
    id,
    ...value,
    coordinates: value.coordinates || null,
  }));
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestMonument(monuments, latitude, longitude) {
  if (!Array.isArray(monuments) || monuments.length === 0) return null;

  return monuments
    .filter(m => m?.coordinates && typeof m.coordinates.latitude === 'number' && typeof m.coordinates.longitude === 'number')
    .map(monument => {
      const distance = calculateDistanceMeters(
        latitude,
        longitude,
        monument.coordinates.latitude,
        monument.coordinates.longitude
      );
      return {
        ...monument,
        distance,
      };
    })
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function buildItinerary(monumentsMap) {
  if (!monumentsMap || Object.keys(monumentsMap).length === 0) {
    return { order: [], totalDistanceMeters: 0 };
  }

  if (itineraryCache.has(monumentsMap)) {
    return itineraryCache.get(monumentsMap);
  }

  const monumentsArray = monumentsMapToArray(monumentsMap)
    .filter(m => m.coordinates && typeof m.coordinates.latitude === 'number' && typeof m.coordinates.longitude === 'number');

  if (monumentsArray.length === 0) {
    return { order: [], totalDistanceMeters: 0 };
  }

  // Greedy nearest-neighbour itinerary starting from the northernmost point (latitude highest)
  const remaining = [...monumentsArray];
  remaining.sort((a, b) => b.coordinates.latitude - a.coordinates.latitude);
  const start = remaining.shift();
  const itinerary = [start];
  let lastPoint = start;
  let totalDistance = 0;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const distance = calculateDistanceMeters(
        lastPoint.coordinates.latitude,
        lastPoint.coordinates.longitude,
        candidate.coordinates.latitude,
        candidate.coordinates.longitude,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const next = remaining.splice(nearestIndex, 1)[0];
    itinerary.push({ ...next, distanceFromPrevious: nearestDistance });
    totalDistance += nearestDistance;
    lastPoint = next;
  }

  // Add distanceFromPrevious for first element as 0
  itinerary[0] = { ...itinerary[0], distanceFromPrevious: 0 };

  const result = {
    order: itinerary.map((point, index) => ({
      order: index + 1,
      id: point.id,
      name: point.name,
      coordinates: point.coordinates,
      distanceFromPrevious: point.distanceFromPrevious,
      cumulativeDistance: itinerary
        .slice(0, index + 1)
        .reduce((acc, item) => acc + (item.distanceFromPrevious || 0), 0),
      originalCountry: point.original_country || null,
      originalCity: point.original_city || null,
    })),
    totalDistanceMeters: totalDistance,
  };

  itineraryCache.set(monumentsMap, result);
  return result;
}

// Función para obtener o crear sesión ONNX para un tenant
async function getOrCreateSession(tenantId) {
  if (tenantSessions[tenantId]) {
    return tenantSessions[tenantId];
  }

  try {
    const paths = getTenantPaths(tenantId);
    const modelPath = getBestAvailableModel(tenantId);
    
    if (!modelPath || !fs.existsSync(modelPath)) {
      throw new Error(`No se encontró modelo ONNX para tenant ${tenantId}`);
    }

    logger.info(`Cargando modelo ONNX para tenant ${tenantId}: ${modelPath}`);
    
    const session = await ort.InferenceSession.create(modelPath);
    tenantSessions[tenantId] = session;

    // Cargar labels
    if (fs.existsSync(paths.embeddingsPath)) {
      const embeddingsData = JSON.parse(fs.readFileSync(paths.embeddingsPath, 'utf8'));
      tenantLabels[tenantId] = embeddingsData;
      logger.info(`Cargados ${embeddingsData.length} embeddings para tenant ${tenantId}`);
    }

    return session;
  } catch (error) {
    logger.error(`Error cargando modelo para tenant ${tenantId}:`, error);
    throw error;
  }
}

// Función para procesar imagen con ONNX
async function processImageWithONNX(imageBuffer, tenantId) {
  try {
    const session = await getOrCreateSession(tenantId);
    const labels = tenantLabels[tenantId] || [];
    
    if (labels.length === 0) {
      throw new Error(`No hay embeddings disponibles para tenant ${tenantId}`);
    }

    // Procesar imagen (mismo código que antes, pero usando tenant específico)
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    
    const imageData = ctx.getImageData(0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    const { data } = imageData;
    
    // Normalizar datos de imagen
    const inputData = new Float32Array(CONFIG.IMG_SIZE * CONFIG.IMG_SIZE * 3);
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;
      
      inputData[pixelIndex] = r;
      inputData[pixelIndex + CONFIG.IMG_SIZE * CONFIG.IMG_SIZE] = g;
      inputData[pixelIndex + CONFIG.IMG_SIZE * CONFIG.IMG_SIZE * 2] = b;
    }
    
    // Crear tensor de entrada
    const inputTensor = new ort.Tensor('float32', inputData, [1, 3, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE]);
    
    // Ejecutar inferencia
    const results = await session.run({ input: inputTensor });
    const output = results.output.data;
    
    // Procesar resultados y encontrar mejor coincidencia
    const similarities = [];
    
    for (let i = 0; i < labels.length; i++) {
      const labelEmbedding = labels[i].embedding;
      let similarity = 0;
      
      for (let j = 0; j < output.length && j < labelEmbedding.length; j++) {
        similarity += output[j] * labelEmbedding[j];
      }
      
      similarities.push({
        label: labels[i].label,
        similarity: similarity,
        pieceName: labels[i].pieceName || labels[i].label
      });
    }
    
    // Ordenar por similitud descendente
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Retornar resultados
    const bestMatch = similarities[0];
    const suggestions = similarities
      .filter(s => s.similarity >= CONFIG.SUGGESTION_THRESHOLD)
      .slice(0, CONFIG.TOP_N_SUGGESTIONS);
    
    return {
      bestMatch: bestMatch,
      suggestions: suggestions,
      confidence: bestMatch ? bestMatch.similarity : 0
    };
    
  } catch (error) {
    logger.error(`Error procesando imagen para tenant ${tenantId}:`, error);
    throw error;
  }
}

// ========================================
// RUTAS API MULTI-TENANT
// ========================================

// Ruta de reconocimiento multi-tenant
app.post('/api/recognize', [
  body('image').notEmpty().withMessage('La imagen es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantMode = req.tenant?.config?.frontendMode || 'vision';
    if (tenantMode === 'gps') {
      return res.status(405).json({
        error: 'El reconocimiento por imagen está deshabilitado para este tenant',
        tenant: req.tenant.id,
      });
    }

    const { image } = req.body;
    const tenantId = req.tenant.id;
    
    logger.info(`Procesando reconocimiento para tenant: ${tenantId}`);

    // Validar que el tenant tiene archivos necesarios
    const tenantStatus = validateTenantFiles(tenantId);
    if (!tenantStatus.primaryModel && !tenantStatus.secondaryModel) {
      return res.status(404).json({
        error: 'No hay modelos disponibles para este tenant',
        tenant: tenantId
      });
    }

    // Decodificar imagen base64
    const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    // Generar hash de la imagen para cache
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    
    // Verificar cache
    if (imageCache.has(imageHash)) {
      logger.info(`Resultado desde cache para imagen hash: ${imageHash}`);
      return res.json({
        ...imageCache.get(imageHash),
        fromCache: true
      });
    }

    // Procesar imagen
    const result = await processImageWithONNX(imageBuffer, tenantId);
    
    // Guardar en cache
    imageCache.set(imageHash, result);
    
    // Tracking de analytics
    if (result.bestMatch) {
      trackRecognition(req, {
        pieceName: result.bestMatch.pieceName,
        confidence: result.confidence,
        tenant: tenantId
      });
    }

    res.json({
      pieceName: result.bestMatch ? result.bestMatch.pieceName : 'Desconocido',
      confidence: result.confidence,
      suggestions: result.suggestions,
      tenant: tenantId
    });

  } catch (error) {
    logger.error('Error en reconocimiento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ruta de audio multi-tenant
app.get('/api/audio/:tenantId/:pieceId/:mode', async (req, res) => {
  try {
    const { tenantId, pieceId, mode } = req.params;
    
    // Validar que el tenant solicitado coincide con el detectado
    if (tenantId !== req.tenant.id) {
      return res.status(400).json({
        error: 'Tenant ID no coincide con el detectado',
        requested: tenantId,
        detected: req.tenant.id
      });
    }

    const paths = getTenantPaths(tenantId);
    const audioDir = paths.audioDir;
    
    // Buscar archivo de audio
    const audioFile = path.join(audioDir, pieceId, `${mode}.mp3`);
    
    if (!fs.existsSync(audioFile)) {
      return res.status(404).json({
        error: 'Archivo de audio no encontrado',
        pieceId,
        mode,
        tenant: tenantId
      });
    }

    // Tracking de analytics
    trackAudio(req, {
      pieceId,
      mode,
      tenant: tenantId
    });

    // Servir archivo de audio
    res.sendFile(audioFile);

  } catch (error) {
    logger.error('Error sirviendo audio:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// RUTAS DE ANALYTICS
// ========================================
app.use('/api/analytics', analyticsRoutes);

// ========================================
// RUTA DE FALLBACK
// ========================================
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      '/api/status',
      '/api/recognize (POST)',
      '/api/audio/:tenantId/:pieceId/:mode (GET)',
      '/api/analytics/*'
    ]
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor multi-tenant iniciado en puerto ${PORT}`);
  logger.info(`📊 Health check disponible en: http://localhost:${PORT}/health`);
  logger.info(`📋 Status de tenants disponible en: http://localhost:${PORT}/api/status`);
  logger.info(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Mostrar información de red local
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        logger.info(`🌐 Accesible en: http://${net.address}:${PORT}`);
      }
    }
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error({ err: error.message, stack: error.stack }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason: reason.toString(), promise }, 'Unhandled Rejection');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
