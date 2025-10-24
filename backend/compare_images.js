/**
 * Código JavaScript para comparar imágenes usando modelo ONNX
 * ==========================================================
 * Este script utiliza un modelo ONNX entrenado para comparar imágenes
 * y clasificarlas según su similitud con las clases conocidas.
 */

const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');
const { createCanvas, loadImage } = require('canvas');

// Configuración
const CONFIG = {
  // Rutas de archivos (ajustar según sea necesario)
  MODEL_PATH: './models/efficientnet_model.onnx',
  EMBEDDINGS_PATH: './embeddings/dataset_embeddings.json',
  
  // Parámetros del modelo
  IMG_SIZE: 224,
  
  // Umbral de similitud para clasificación
  SIMILARITY_THRESHOLD: 0.6
};

// Función para cargar el modelo ONNX
async function loadModel(modelPath) {
  try {
    console.log(`Cargando modelo desde ${modelPath}...`);
    const session = await ort.InferenceSession.create(modelPath);
    console.log('✅ Modelo cargado correctamente');
    return session;
  } catch (error) {
    console.error(`❌ Error al cargar el modelo: ${error.message}`);
    throw error;
  }
}

// Función para cargar los embeddings de referencia
function loadEmbeddings(embeddingsPath) {
  try {
    console.log(`Cargando embeddings desde ${embeddingsPath}...`);
    const data = fs.readFileSync(embeddingsPath, 'utf8');
    const embeddingsData = JSON.parse(data);
    console.log(`✅ Embeddings cargados: ${embeddingsData.label_names.length} clases`);
    return embeddingsData;
  } catch (error) {
    console.error(`❌ Error al cargar embeddings: ${error.message}`);
    throw error;
  }
}

// Función para preprocesar una imagen
async function preprocessImage(imagePath) {
  try {
    console.log(`Preprocesando imagen ${imagePath}...`);
    
    // Cargar imagen
    const image = await loadImage(imagePath);
    
    // Crear canvas y redimensionar imagen
    const canvas = createCanvas(CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    
    // Obtener datos de píxeles
    const imageData = ctx.getImageData(0, 0, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE);
    const { data } = imageData;
    
    // Crear tensor de entrada (formato NCHW: [batch, channels, height, width])
    const input = new Float32Array(1 * 3 * CONFIG.IMG_SIZE * CONFIG.IMG_SIZE);
    
    // Valores de normalización (media y desviación estándar)
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    
    // Normalizar y reorganizar datos
    for (let y = 0; y < CONFIG.IMG_SIZE; y++) {
      for (let x = 0; x < CONFIG.IMG_SIZE; x++) {
        const pixelIndex = (y * CONFIG.IMG_SIZE + x) * 4;
        
        // Normalizar cada canal (R, G, B)
        for (let c = 0; c < 3; c++) {
          const pixelValue = data[pixelIndex + c] / 255.0;
          const normalizedValue = (pixelValue - mean[c]) / std[c];
          
          // Índice en el tensor de entrada (formato NCHW)
          const inputIndex = c * CONFIG.IMG_SIZE * CONFIG.IMG_SIZE + y * CONFIG.IMG_SIZE + x;
          input[inputIndex] = normalizedValue;
        }
      }
    }
    
    console.log('✅ Imagen preprocesada correctamente');
    return input;
  } catch (error) {
    console.error(`❌ Error al preprocesar imagen: ${error.message}`);
    throw error;
  }
}

// Función para normalizar un vector (normalización L2)
function normalizeVector(vector) {
  // Calcular la norma L2 (raíz cuadrada de la suma de cuadrados)
  const squareSum = vector.reduce((sum, val) => sum + val * val, 0);
  const norm = Math.sqrt(squareSum);
  
  // Normalizar cada elemento
  if (norm > 0) {
    return vector.map(val => val / norm);
  }
  return vector;
}

// Función para calcular la similitud coseno entre dos vectores
function cosineSimilarity(vecA, vecB) {
  // Verificar que los vectores tengan la misma longitud
  if (vecA.length !== vecB.length) {
    throw new Error('Los vectores deben tener la misma longitud');
  }
  
  // Calcular el producto escalar
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  // La similitud coseno es directamente el producto escalar para vectores normalizados
  return dotProduct;
}

// Función principal para comparar una imagen con las clases conocidas
async function compareImage(imagePath, embeddingsPath = CONFIG.EMBEDDINGS_PATH, modelPath = CONFIG.MODEL_PATH) {
  try {
    console.log('\n' + '='.repeat(50));
    console.log(`🔍 COMPARANDO IMAGEN: ${imagePath}`);
    console.log('='.repeat(50));
    
    // Cargar modelo y embeddings
    const model = await loadModel(modelPath);
    const embeddingsData = loadEmbeddings(embeddingsPath);
    
    // Preprocesar imagen
    const inputData = await preprocessImage(imagePath);
    
    // Crear tensor de entrada para el modelo
    const inputTensor = new ort.Tensor('float32', inputData, [1, 3, CONFIG.IMG_SIZE, CONFIG.IMG_SIZE]);
    const feeds = { input: inputTensor };
    
    // Ejecutar inferencia
    console.log('Ejecutando inferencia...');
    const outputMap = await model.run(feeds);
    const outputTensor = outputMap.output;
    const outputData = outputTensor.data;
    
    // Obtener el índice de la clase con mayor probabilidad
    let maxIndex = 0;
    let maxProb = outputData[0];
    for (let i = 1; i < outputData.length; i++) {
      if (outputData[i] > maxProb) {
        maxProb = outputData[i];
        maxIndex = i;
      }
    }
    
    // Aplicar softmax para obtener probabilidades
    const expSum = outputData.reduce((sum, val) => sum + Math.exp(val), 0);
    const probabilities = outputData.map(val => Math.exp(val) / expSum);
    
    // Obtener la clase predicha
    const predictedClass = embeddingsData.label_names[maxIndex];
    const confidence = probabilities[maxIndex];
    
    // Mostrar resultados
    console.log('\n📊 RESULTADOS DE CLASIFICACIÓN:');
    console.log(`Clase predicha: ${predictedClass}`);
    console.log(`Confianza: ${(confidence * 100).toFixed(2)}%`);
    
    // Verificar si la confianza supera el umbral
    if (confidence < CONFIG.SIMILARITY_THRESHOLD) {
      console.log(`⚠️ La confianza está por debajo del umbral (${CONFIG.SIMILARITY_THRESHOLD * 100}%)`);
      console.log('Clasificación: DESCONOCIDO');
    } else {
      console.log(`✅ La confianza supera el umbral (${CONFIG.SIMILARITY_THRESHOLD * 100}%)`);
      console.log(`Clasificación: ${predictedClass}`);
    }
    
    // Mostrar todas las probabilidades
    console.log('\nProbabilidades para todas las clases:');
    embeddingsData.label_names.forEach((className, i) => {
      console.log(`${className}: ${(probabilities[i] * 100).toFixed(2)}%`);
    });
    
    const resultsObject = {
      predictedClass: confidence >= CONFIG.SIMILARITY_THRESHOLD ? predictedClass : 'desconocido',
      confidence,
      probabilities: embeddingsData.label_names.map((name, i) => ({
        class: name,
        probability: probabilities[i]
      }))
    };

    console.log(JSON.stringify(resultsObject));
    
    return resultsObject;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    console.error(error.stack);
    return { error: error.message };
  }
}

// Función principal
async function main() {
  // Verificar argumentos
  if (process.argv.length < 3) {
    console.log('Uso: node compare_image.js <ruta_imagen> [ruta_embeddings] [ruta_modelo]');
    process.exit(1);
  }
  
  // Obtener ruta de la imagen
  const imagePath = process.argv[2];
  
  // Obtener rutas opcionales
  const embeddingsPath = process.argv[3] || CONFIG.EMBEDDINGS_PATH;
  const modelPath = process.argv[4] || CONFIG.MODEL_PATH;
  
  // Comparar imagen
  await compareImage(imagePath, embeddingsPath, modelPath);
}

// Ejecutar función principal si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('Error en la función principal:', error);
    process.exit(1);
  });
} else {
  // Exportar funciones para uso como módulo
  module.exports = {
    compareImage,
    loadModel,
    loadEmbeddings,
    preprocessImage,
    normalizeVector,
    cosineSimilarity
  };
}
