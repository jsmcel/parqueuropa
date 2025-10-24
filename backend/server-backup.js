// Contenido para backend/server.js (Versión Simplificada)
const path = require('path'); // Ensure path is imported if not already
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Pino logger
const pino = require('pino');
let secondaryRecognitionSession = null; // For the secondary ONNX model
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

// --- Configuración ---
const PORT = process.env.BACKEND_PORT || 3000; // Renamed to avoid conflict if frontend also uses PORT
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guideitor';

// Path to the ONNX model - ensure this is relative to the backend directory or use absolute paths
const modelPath = process.env.MODEL_PATH || 'models/swin_t_model.onnx';
// Path to labels JSON - ensure this is relative to the backend directory or use absolute paths
const labelsPath = process.env.LABELS_PATH || 'embeddings/dataset_embeddings.json';
// Path to audio directory - ensure this is relative to the backend directory or use absolute paths
const audioPath = process.env.AUDIO_DIR || 'public/audio';

const CONFIG = {
    MODEL_PATH: path.isAbsolute(process.env.MODEL_PATH || 'models/swin_t_model.onnx') ? (process.env.MODEL_PATH || 'models/swin_t_model.onnx') : path.join(__dirname, process.env.MODEL_PATH || 'models/swin_t_model.onnx'),
    LABELS_PATH: path.isAbsolute(process.env.LABELS_PATH || 'embeddings/dataset_embeddings.json') ? (process.env.LABELS_PATH || 'embeddings/dataset_embeddings.json') : path.join(__dirname, process.env.LABELS_PATH || 'embeddings/dataset_embeddings.json'),
    IMG_SIZE: parseInt(process.env.IMG_SIZE, 10) || 224,
    SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.8,
    SUGGESTION_THRESHOLD: parseFloat(process.env.SUGGESTION_THRESHOLD) || 0.3,
    TOP_N_SUGGESTIONS: parseInt(process.env.TOP_N_SUGGESTIONS, 10) || 3,
    // Secondary Model Configuration
    SECONDARY_MODEL_PATH: path.isAbsolute(process.env.SECONDARY_MODEL_PATH || 'models/efficientnet_b0_model.onnx') 
                          ? (process.env.SECONDARY_MODEL_PATH || 'models/efficientnet_b0_model.onnx') 
                          : path.join(__dirname, process.env.SECONDARY_MODEL_PATH || 'models/efficientnet_b0_model.onnx'),
    SIMILARITY_THRESHOLD_SECONDARY: parseFloat(process.env.SIMILARITY_THRESHOLD_SECONDARY) || 0.7,
};
const AUDIO_DIR = path.isAbsolute(audioPath) ? audioPath : path.join(__dirname, audioPath);

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

// --- Lógica de Reconocimiento ONNX ---
let recognitionSession = null;
let labelNames = [];

// Agregar cache para evitar reprocesar imágenes idénticas
const crypto = require('crypto');
const predictionCache = new Map();

// Función para cargar modelo y etiquetas (se llama al inicio)
async function initializeRecognition() {
    try {
        logger.info('Inicializando reconocimiento...');
        // Cargar Modelo ONNX
        if (!fs.existsSync(CONFIG.MODEL_PATH)) {
             throw new Error(`Archivo de modelo no encontrado en: ${CONFIG.MODEL_PATH}`);
        }
        recognitionSession = await ort.InferenceSession.create(CONFIG.MODEL_PATH);
        logger.info(`Modelo ONNX cargado desde ${CONFIG.MODEL_PATH}`);

        // Cargar Etiquetas/Clases
        if (!fs.existsSync(CONFIG.LABELS_PATH)) {
            throw new Error(`Archivo de etiquetas no encontrado en: ${CONFIG.LABELS_PATH}`);
        }
        const labelsData = JSON.parse(fs.readFileSync(CONFIG.LABELS_PATH, 'utf8'));
        if (!labelsData.label_names || !Array.isArray(labelsData.label_names)) {
             throw new Error(`El archivo JSON ${CONFIG.LABELS_PATH} debe contener un array 'label_names'`);
        }
        labelNames = labelsData.label_names;
        logger.info(`Etiquetas cargadas: ${labelNames.length} clases desde ${CONFIG.LABELS_PATH}`);
        logger.info('✅ Primary model recognition components initialized correctly.');

        // Agregar validación de arquitectura del modelo
        const inputNames = recognitionSession.inputNames;
        const outputNames = recognitionSession.outputNames;
        
        logger.info(`Modelo cargado - Inputs: ${inputNames}, Outputs: ${outputNames}`);
        
        if (inputNames.length !== 1 || outputNames.length !== 1) {
            throw new Error('El modelo debe tener exactamente 1 input y 1 output');
        }

    } catch (error) {
        logger.error({ err: error, message: error.message }, '❌ Error fatal al inicializar componentes del modelo primario');
        recognitionSession = null; // Asegura que no se intente usar un modelo no cargado
    }

    // Load Secondary Model
    try {
        if (CONFIG.SECONDARY_MODEL_PATH && fs.existsSync(CONFIG.SECONDARY_MODEL_PATH)) {
            secondaryRecognitionSession = await ort.InferenceSession.create(CONFIG.SECONDARY_MODEL_PATH);
            logger.info(`Secondary ONNX model loaded from ${CONFIG.SECONDARY_MODEL_PATH}`);
        } else {
            logger.warn(`Secondary model file not found or path not configured (SECONDARY_MODEL_PATH: ${CONFIG.SECONDARY_MODEL_PATH}). Fallback will rely only on primary model suggestions.`);
            secondaryRecognitionSession = null;
        }
    } catch (error) {
        logger.error({ err: error, message: error.message }, 'Error loading secondary ONNX model');
        secondaryRecognitionSession = null;
    }
}

// Función para preprocesar imagen DESDE UN BUFFER
async function preprocessImageBuffer(base64String) {
    try {
        // --- QUITAR PREFIJO SI EXISTE ---
        let cleanBase64 = base64String;
        if (base64String.startsWith('data:image/')) {
            // Quitar el prefijo "data:image/jpeg;base64," o similar
            cleanBase64 = base64String.split(',')[1];
        }
        
        // Crear buffer del base64 limpio
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        // --- RESTO DE LA FUNCIÓN IGUAL ---
        const image = await loadImage(buffer);
        const canvas = createCanvas(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
        const ctx = canvas.getContext('2d');
        
        // Limpiar canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
        
        // Calcular dimensiones manteniendo aspecto
        const scale = Math.min(CONFIG.IMG_SIZE / image.width, CONFIG.IMG_SIZE / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (CONFIG.IMG_SIZE - width) / 2;
        const y = (CONFIG.IMG_SIZE - height) / 2;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(image, x, y, width, height);
        
        // Obtener datos como array
        const imageData = ctx.getImageData(0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
        const data = imageData.data;
        
        // Convertir a tensor format [1, 3, 224, 224] RGB normalizado
        const tensor = new Float32Array(1 * 3 * CONFIG.IMG_SIZE * CONFIG.IMG_SIZE);
        
        for (let i = 0; i < CONFIG.IMG_SIZE * CONFIG.IMG_SIZE; i++) {
            const pixelIndex = i * 4;
            // Normalizar RGB a [0,1] y reorganizar a CHW format
            tensor[i] = data[pixelIndex] / 255.0;                          // R
            tensor[CONFIG.IMG_SIZE * CONFIG.IMG_SIZE + i] = data[pixelIndex + 1] / 255.0;     // G
            tensor[2 * CONFIG.IMG_SIZE * CONFIG.IMG_SIZE + i] = data[pixelIndex + 2] / 255.0; // B
        }
        
        return tensor;
        
    } catch (error) {
        console.error('Error en preprocessImageBuffer:', error);
        throw error;
    }
}

// --- Rutas Analytics ---
app.use(analyticsRoutes);

// --- Rutas API ---

// Endpoint de Estado
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        recognitionReady: recognitionSession !== null,
        secondaryModelReady: secondaryRecognitionSession !== null, // New status flag
        loadedClasses: labelNames.length
    });
});

// Endpoint de Reconocimiento Simplificado
app.post('/api/recognize', async (req, res) => {
    const startTime = Date.now();
    console.log('=== SOLICITUD /api/recognize RECIBIDA ===');
    
    // Verificar si el modelo está listo
    if (!recognitionSession || labelNames.length === 0) {
        logger.error('Error: Servicio de reconocimiento no inicializado.');
        return res.status(503).json({ success: false, message: 'Servicio de reconocimiento no disponible.' });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ success: false, message: 'No se proporcionó imagen (imageBase64).' });
    }

    // Agregar validación de formato base64
    if (!imageBase64.match(/^data:image\/(jpeg|jpg|png);base64,/)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Formato de imagen base64 inválido. Debe ser JPEG o PNG.' 
        });
    }

    try {
        console.log('=== ANTES DE INFERENCIA ===');
        const imageHash = crypto.createHash('md5').update(imageBase64).digest('hex');
        if (predictionCache.has(imageHash)) {
            logger.info('Cache hit para imagen');
            return res.json(predictionCache.get(imageHash));
        }

        const inputData = await preprocessImageBuffer(imageBase64);
        
        logger.info('=== DESPUÉS DE PREPROCESAMIENTO ===');
        const inputTensor = new ort.Tensor('float32', inputData, [1, 3, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE]);
        
        // Usar nombre de input del modelo dinámicamente (asume que solo hay uno)
        const feeds = { [recognitionSession.inputNames[0]]: inputTensor };

        // 3. Ejecutar Inferencia
        logger.info('Ejecutando inferencia ONNX...');
        const outputMap = await recognitionSession.run(feeds);
        // Usar nombre de output del modelo dinámicamente (asume que solo hay uno)
        const outputTensor = outputMap[recognitionSession.outputNames[0]];
        const outputData = outputTensor.data; // Array de logits o similar

        // --- MOVER LOGS DE DIAGNÓSTICO AQUÍ (ANTES DE VALIDACIONES) ---
        logger.info(`Output tensor shape: ${outputTensor.dims}`);
        logger.info(`Output data length: ${outputData.length}`);
        logger.info(`Label names length: ${labelNames.length}`);
        logger.info(`First 5 output values: ${Array.from(outputData).slice(0, 5)}`);

        // --- AGREGAR VALIDACIÓN ---
        if (!outputData || outputData.length === 0) {
            throw new Error('El modelo no devolvió resultados válidos');
        }

        if (outputData.length !== labelNames.length) {
            throw new Error(`Mismatch: modelo devuelve ${outputData.length} clases, pero hay ${labelNames.length} etiquetas`);
        }

        // 4. Post-procesar (Softmax para obtener probabilidades)
        const expSum = outputData.reduce((sum, val) => sum + Math.exp(val), 0);
        
        // --- VALIDAR QUE expSum NO SEA 0 ---
        if (expSum === 0 || !isFinite(expSum)) {
            throw new Error('Error en cálculo de softmax: suma de exponenciales inválida');
        }
        
        const probabilities = outputData.map(val => Math.exp(val) / expSum);

        // --- AGREGAR MÁS LOGS DE DIAGNÓSTICO ---
        logger.info(`Calculated probabilities (first 5): ${probabilities.slice(0, 5)}`);
        logger.info(`ExpSum: ${expSum}`);

        // 5. Get all class probabilities with their names
        console.log('=== ANTES DEL MAPPING ===');
        console.log('probabilities type:', typeof probabilities);
        console.log('probabilities length:', probabilities.length);
        console.log('probabilities first 3:', probabilities.slice(0, 3));
        console.log('labelNames length:', labelNames.length);
        console.log('labelNames first 3:', labelNames.slice(0, 3));

        // --- FORZAR ARRAY NORMAL ---
        let allPredictions = [];  // ← CREAR ARRAY VACÍO PRIMERO
        for (let index = 0; index < probabilities.length; index++) {
            const prob = probabilities[index];
            const prediction = {
                pieceName: labelNames[index],
                confidence: prob
            };
            
            if (index < 5) {
                console.log(`Manual ${index}:`, prediction);
            }
            
            allPredictions.push(prediction);  // ← USAR PUSH EN LUGAR DE MAP
        }

        console.log('=== DESPUÉS DEL MAPPING MANUAL ===');
        console.log('allPredictions type:', typeof allPredictions);
        console.log('allPredictions.constructor.name:', allPredictions.constructor.name);
        console.log('allPredictions length:', allPredictions.length);
        console.log('allPredictions[0]:', allPredictions[0]);

        // --- VERIFICAR NaN ANTES DEL SORT ---
        console.log('=== VERIFICANDO NaN ===');
        const nanCount = allPredictions.filter(p => isNaN(p.confidence)).length;
        console.log('Predicciones con NaN confidence:', nanCount);

        if (nanCount > 0) {
            console.log('Predicciones NaN encontradas:');
            allPredictions.forEach((p, i) => {
                if (isNaN(p.confidence)) {
                    console.log(`  [${i}] ${p.pieceName}: ${p.confidence}`);
                }
            });
            
            // Filtrar NaN antes del sort
            allPredictions = allPredictions.filter(p => !isNaN(p.confidence));
            console.log('Después de filtrar NaN, quedaron:', allPredictions.length);
        }

        console.log('=== ANTES DEL SORT ===');
        console.log('allPredictions[0] antes sort:', allPredictions[0]);

        // Sort by confidence in descending order
        allPredictions.sort((a, b) => b.confidence - a.confidence);

        console.log('=== DESPUÉS DEL SORT ===');
        console.log('allPredictions[0] después sort:', allPredictions[0]);

        // --- VALIDAR QUE HAY PREDICCIONES ---
        console.log('=== ANTES DE VALIDAR PREDICCIONES ===');
        console.log('allPredictions.length después del filtrado:', allPredictions.length);
        console.log('allPredictions después del filtrado:', allPredictions);

        if (allPredictions.length === 0) {
            throw new Error('No se generaron predicciones');
        }

        const top1Prediction = allPredictions[0];
        
        // --- MÁS LOGS ---
        logger.info(`All predictions length: ${allPredictions.length}`);
        logger.info(`Top1 prediction object:`, top1Prediction);

        // --- VALIDAR top1Prediction ---
        if (!top1Prediction) {
            console.log('ERROR: top1Prediction es null/undefined');
            console.log('allPredictions:', allPredictions);
            throw new Error('top1Prediction es null o undefined');
        }

        if (typeof top1Prediction.confidence !== 'number') {
            console.log('ERROR: confidence no es un número');
            console.log('top1Prediction:', top1Prediction);
            console.log('typeof confidence:', typeof top1Prediction.confidence);
            console.log('confidence value:', top1Prediction.confidence);
            throw new Error(`Confidence no es un número: ${typeof top1Prediction.confidence}`);
        }

        logger.info(`Top prediction: ${top1Prediction.pieceName} (confidence: ${top1Prediction.confidence.toFixed(4)})`);
        const primaryDuration = Date.now() - startTime; // Renamed for clarity
        logger.info(`Tiempo total reconocimiento primario: ${primaryDuration} ms`);

        // 6. Check thresholds
        if (top1Prediction.confidence >= CONFIG.SIMILARITY_THRESHOLD) {
            // Si es "otros" con alta confianza, significa "no es un tren"
            if (top1Prediction.pieceName === 'otros') {
                logger.info(`High confidence "otros" prediction (${top1Prediction.confidence.toFixed(4)}) - not a train piece.`);
                const responseData = {
                    success: false,
                    low_confidence: false,
                    message: 'La imagen no parece ser una pieza del museo ferroviario.',
                    not_a_train: true  // ← Nueva flag específica
                };
                predictionCache.set(imageHash, responseData);
                
                // Track recognition event
                setImmediate(() => {
                    trackRecognition({
                        pieceName: 'otros',
                        confidence: top1Prediction.confidence,
                        success: false,
                        notATrain: true,
                        fallbackUsed: 'none',
                        responseTime: primaryDuration,
                        sessionId: req.analyticsSessionId,
                        ip: req.ip
                    }).catch(err => console.error('Error tracking recognition:', err));
                });
                
                return res.json(responseData);
            } else {
                // Es un tren específico con alta confianza
                logger.info(`Primary model high confidence match for ${top1Prediction.pieceName}`);
                const responseData = {
                    success: true,
                    recognitionResult: { pieceName: top1Prediction.pieceName, confidence: top1Prediction.confidence }
                };
                predictionCache.set(imageHash, responseData);
                
                // Track recognition event
                setImmediate(() => {
                    trackRecognition({
                        pieceName: top1Prediction.pieceName,
                        confidence: top1Prediction.confidence,
                        success: true,
                        fallbackUsed: 'none',
                        responseTime: primaryDuration,
                        sessionId: req.analyticsSessionId,
                        ip: req.ip
                    }).catch(err => console.error('Error tracking recognition:', err));
                });
                
                return res.json(responseData);
            }
        } 
        // Baja confianza - intentar modelo secundario o sugerencias
        else {
            logger.info(`Primary model low confidence (${top1Prediction.confidence.toFixed(4)}).`);
            
            // Intentar modelo secundario si está disponible
            if (secondaryRecognitionSession) {
                logger.info(`Primary model low confidence (${top1Prediction.confidence.toFixed(4)}). Attempting fallback with secondary model.`);
                
                const secondaryStartTime = Date.now();
                try {
                    // Secondary model uses the SAME inputTensor and feeds from primary
                    const secondaryOutputMap = await secondaryRecognitionSession.run(feeds); // 'feeds' is from primary model's input
                    const secondaryOutputTensor = secondaryOutputMap[secondaryRecognitionSession.outputNames[0]];
                    const secondaryOutputData = secondaryOutputTensor.data;

                    const secondaryExpSum = secondaryOutputData.reduce((sum, val) => sum + Math.exp(val), 0);
                    const secondaryProbabilities = secondaryOutputData.map(val => Math.exp(val) / secondaryExpSum);

                    const secondaryAllPredictions = secondaryProbabilities.map((prob, index) => ({
                        pieceName: labelNames[index], // Shared labelNames
                        confidence: prob
                    }));
                    secondaryAllPredictions.sort((a, b) => b.confidence - a.confidence);
                    const secondaryTop1Prediction = secondaryAllPredictions[0];

                    const secondaryDuration = Date.now() - secondaryStartTime;
                    logger.info({ prediction: secondaryTop1Prediction, durationMs: secondaryDuration }, 
                                `Secondary model top prediction: ${secondaryTop1Prediction.pieceName}, Confidence: ${secondaryTop1Prediction.confidence.toFixed(4)}`);

                    if (secondaryTop1Prediction.confidence >= CONFIG.SIMILARITY_THRESHOLD_SECONDARY) {
                        logger.info(`Secondary model high confidence match for ${secondaryTop1Prediction.pieceName}`);
                        const responseData = {
                            success: true,
                            recognitionResult: { 
                                pieceName: secondaryTop1Prediction.pieceName, 
                                confidence: secondaryTop1Prediction.confidence,
                                fallbackUsed: 'secondary_model' // Flag indicating secondary model was used
                            }
                        };
                        // Después de la predicción exitosa
                        predictionCache.set(imageHash, responseData);
                        
                        // Track recognition event
                        setImmediate(() => {
                            trackRecognition({
                                pieceName: secondaryTop1Prediction.pieceName,
                                confidence: secondaryTop1Prediction.confidence,
                                success: true,
                                fallbackUsed: 'secondary_model',
                                responseTime: Date.now() - startTime,
                                sessionId: req.analyticsSessionId,
                                ip: req.ip
                            }).catch(err => console.error('Error tracking recognition:', err));
                        });
                        
                        return res.json(responseData);
                    } else {
                        logger.info(`Secondary model also low confidence. Proceeding with primary model's suggestions.`);
                        // Fall through to primary model's suggestion logic (already implemented after this block)
                    }
                } catch (secondaryError) {
                    logger.error({ err: secondaryError, stack: secondaryError.stack }, "Error during secondary model inference. Proceeding with primary model's suggestions.");
                    // Fall through to primary model's suggestion logic
                }
            } else {
                logger.info("Secondary model not available/configured. Proceeding with primary model's suggestions based on its (primary's) low confidence.");
            }

            // Existing logic for suggestions based on Primary Model's low confidence:
            // This is reached if:
            // 1. Primary model confidence was < SIMILARITY_THRESHOLD AND
            // 2. ( (Secondary model not loaded) OR (secondary model inference failed) OR (secondary model confidence was < SIMILARITY_THRESHOLD_SECONDARY) )
            if (top1Prediction.confidence >= CONFIG.SUGGESTION_THRESHOLD) {
                logger.info(`Generating suggestions based on primary model (confidence: ${top1Prediction.confidence.toFixed(4)}).`);
                const suggestions = allPredictions
                    .filter(p => p.confidence >= CONFIG.SUGGESTION_THRESHOLD && p.pieceName !== 'otros')
                    .slice(0, CONFIG.TOP_N_SUGGESTIONS);

                if (suggestions.length > 0) {
                    logger.info({ suggestionsCount: suggestions.length }, `Returning ${suggestions.length} suggestions.`);
                    const responseData = {
                        success: false, 
                        low_confidence: true,
                        message: 'La confianza es baja. ¿Es alguno de estos?',
                        suggestions: suggestions,
                        recognitionResult: { 
                            pieceName: top1Prediction.pieceName,
                            confidence: top1Prediction.confidence
                        }
                    };
                    // Después de la predicción exitosa
                    predictionCache.set(imageHash, responseData);
                    
                    // Track recognition event
                    setImmediate(() => {
                        trackRecognition({
                            pieceName: top1Prediction.pieceName,
                            confidence: top1Prediction.confidence,
                            success: false,
                            lowConfidence: true,
                            suggestions: suggestions,
                            fallbackUsed: 'suggestions',
                            responseTime: Date.now() - startTime,
                            sessionId: req.analyticsSessionId,
                            ip: req.ip
                        }).catch(err => console.error('Error tracking recognition:', err));
                    });
                    
                    return res.json(responseData);
                } else {
                    logger.warn('Low confidence (primary model), but no suggestions met the criteria after filtering.');
                     const responseData = {
                        success: false,
                        low_confidence: false, 
                        message: 'No se pudo identificar la pieza con suficiente confianza (umbral de sugerencia no alcanzado por ninguna clase).'
                    };
                    // Después de la predicción exitosa
                    predictionCache.set(imageHash, responseData);
                    
                    // Track recognition event
                    setImmediate(() => {
                        trackRecognition({
                            pieceName: top1Prediction.pieceName,
                            confidence: top1Prediction.confidence,
                            success: false,
                            lowConfidence: false,
                            fallbackUsed: 'none',
                            responseTime: Date.now() - startTime,
                            sessionId: req.analyticsSessionId,
                            ip: req.ip
                        }).catch(err => console.error('Error tracking recognition:', err));
                    });
                    
                    return res.json(responseData);
                }
            } else {
                logger.info(`Confidence (${top1Prediction.confidence.toFixed(4)}) too low for any suggestions, below suggestion threshold (${CONFIG.SUGGESTION_THRESHOLD}).`);
                const responseData = {
                    success: false,
                    low_confidence: false,
                    message: 'No se pudo identificar la pieza con suficiente confianza.'
                };
                // Después de la predicción exitosa
                predictionCache.set(imageHash, responseData);
                
                // Track recognition event
                setImmediate(() => {
                    trackRecognition({
                        pieceName: top1Prediction.pieceName,
                        confidence: top1Prediction.confidence,
                        success: false,
                        lowConfidence: false,
                        fallbackUsed: 'none',
                        responseTime: Date.now() - startTime,
                        sessionId: req.analyticsSessionId,
                        ip: req.ip
                    }).catch(err => console.error('Error tracking recognition:', err));
                });
                
                return res.json(responseData);
            }
        }

    } catch (error) {
        // --- AGREGAR LOGS DE EMERGENCIA AQUÍ ---
        console.log('=== ERROR CAPTURADO ===');
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        console.log('======================');
        
        logger.error({ err: error, stack: error.stack }, `Error durante el reconocimiento`);
        return res.status(500).json({ success: false, message: 'Error interno durante el procesamiento de la imagen.' });
    }
});

// Endpoint para Servir Audio (Implementación básica basada en nombres de archivo)
app.get('/api/audio/:tenantId/:pieceId/:mode', async (req, res) => {
    // Nota: El 'tenantId' no se usa en esta lógica simplificada, pero mantenemos la ruta por compatibilidad con ResultScreen
    const { pieceId, mode } = req.params;
    logger.info(`Solicitud de audio: Piece=${pieceId}, Mode=${mode}`);

    if (!pieceId || !mode) {
         return res.status(400).json({ error: 'Faltan parámetros pieceId o mode.' });
    }

    // Construir nombre de archivo esperado (ej. TALGO-SERIA.mp3) - Normalizar a mayúsculas
    // ¡IMPORTANTE! Asegúrate que tus archivos de audio siguen esta convención de nombres
    const audioFileName = `${pieceId.toUpperCase()}-${mode.toUpperCase()}.mp3`;
    // Construir la ruta completa al archivo dentro del directorio público de audio
    const audioPath = path.join(AUDIO_DIR, audioFileName);

    logger.info(`Buscando archivo de audio en: ${audioPath}`);

    // Verificar si el archivo existe
    fs.access(audioPath, fs.constants.R_OK, (err) => {
        if (err) {
            // El archivo no existe o no se puede leer
            logger.error({ err, path: audioPath }, `Archivo de audio no encontrado o sin permisos`);
            
            // Track audio event (failure)
            setImmediate(() => {
                trackAudio({
                    pieceId: pieceId,
                    audioMode: mode,
                    success: false,
                    sessionId: req.analyticsSessionId,
                    ip: req.ip
                }).catch(err => console.error('Error tracking audio:', err));
            });
            
            res.status(404).json({ error: 'Audio no encontrado para esta pieza y modo.' });
        } else {
            // El archivo existe y se puede leer
            logger.info(`Sirviendo audio: ${audioPath}`);
            res.setHeader('Content-Type', 'audio/mpeg'); // O el MIME type correcto para tus audios
            // Usar res.sendFile para manejar headers como Content-Length, etc.
            res.sendFile(audioPath, (errSendFile) => {
                if (errSendFile) {
                    logger.error({ err: errSendFile, path: audioPath }, `Error al enviar archivo de audio`);
                    // Evitar enviar otra respuesta si los headers ya se enviaron
                    if (!res.headersSent) {
                         res.status(500).json({ error: 'Error interno al servir el archivo de audio.' });
                    }
                } else {
                     logger.info(`Archivo de audio enviado correctamente: ${audioPath}`);
                     
                     // Track audio event
                     setImmediate(() => {
                         trackAudio({
                             pieceId: pieceId,
                             audioMode: mode,
                             success: true,
                             sessionId: req.analyticsSessionId,
                             ip: req.ip
                         }).catch(err => console.error('Error tracking audio:', err));
                     });
                }
            });
            // Alternativa con stream (mejor para archivos grandes, pero más manual):
            // const stream = fs.createReadStream(audioPath);
            // stream.on('error', (streamErr) => {
            //      logger.error({ err: streamErr, path: audioPath }, `Error en stream de audio`);
            //      if (!res.headersSent) {
            //          res.status(500).json({ error: 'Error interno al leer el archivo de audio.' });
            //      }
            // });
            // stream.pipe(res);
        }
    });
});


// Ruta principal (HTML simple)
app.get('/', (req, res) => {
    res.send(`
    <html><head><title>GuiEditor Backend (Simplificado)</title></head><body>
    <h1>GuiEditor Backend (Simplificado)</h1>
    <p>Estado del reconocimiento: ${recognitionSession ? '✅ Listo' : '❌ No inicializado'}</p>
    <p>Clases cargadas: ${labelNames.length}</p>
    <p>Umbral de Confianza: ${CONFIG.SIMILARITY_THRESHOLD}</p>
    <p>Endpoints: /api/status, /api/recognize (POST), /api/audio/:tenantId/:pieceId/:mode (GET)</p>
    <p>Directorio de Audio: ${AUDIO_DIR}</p>
    <p><a href="/dev/dashboard" style="color: #1a3c6e; font-weight: bold;">📊 Ver Dashboard de Analytics</a></p>
    </body></html>
  `);
});

// Crear directorio de audio si no existe (solo como ayuda)
if (!fs.existsSync(AUDIO_DIR)){
    logger.info(`Creando directorio de audio: ${AUDIO_DIR}`);
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
} else {
    logger.info(`Directorio de audio ya existe: ${AUDIO_DIR}`);
}


// Iniciar servidor e inicializar reconocimiento
app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`Servidor iniciado en http://localhost:${PORT}`);
    // Mostrar IPs disponibles para conexión
    const nets = networkInterfaces();
    logger.info('IPs disponibles para conexión desde dispositivos móviles:');
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                logger.info(`  http://${net.address}:${PORT}`);
            }
        }
    }
    await initializeRecognition(); // Cargar modelo ONNX después de iniciar el listener
});