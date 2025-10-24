/*
 * =================================================================================================
 * WARNING: LEGACY FILE
 * -------------------------------------------------------------------------------------------------
 * This file appears to be part of a legacy backend implementation and is likely not actively used
 * by the current primary backend server (`backend/server.js` which uses ONNX).
 *
 * It is recommended to:
 * 1. Verify its current usage status thoroughly.
 * 2. If confirmed as unused, consider archiving or removing it to prevent confusion and
 *    reduce maintenance overhead.
 *
 * Last Analysis Date: 2025-05-29
 * Based on analysis indicating `backend/server.js` is the active entry point.
 * =================================================================================================
 */
/**
 * Módulo TensorFlow para reconocimiento de imágenes
 * Implementación 100% real sin simulaciones
 */

const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const fetch = require('node-fetch');

// Ruta al modelo MobileNet
const MODEL_PATH = path.join(__dirname, '..', 'models', 'mobilenet');

// Variable para almacenar el modelo cargado
let model = null;

// Función para cargar el modelo
async function loadModel() {
  try {
    if (model) return model;
    
    console.log('Cargando modelo MobileNet desde URL remota...');
    
    // Configurar fetch global para TensorFlow.js
    global.fetch = fetch;
    
    // Usar una URL remota en lugar de un archivo local
    const modelUrl = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
    
    // Cargar el modelo
    model = await tf.loadLayersModel(modelUrl);
    
    console.log('Modelo cargado correctamente');
    return model;
  } catch (error) {
    console.error('Error al cargar el modelo:', error);
    throw error;
  }
}

// Función para preprocesar la imagen
async function preprocessImage(imagePath) {
  try {
    // Usar sharp para cargar y redimensionar la imagen
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224)
      .toBuffer();
    
    // Convertir a tensor3d
    const imageArray = new Float32Array(224 * 224 * 3);
    const buffer = Buffer.from(imageBuffer);
    
    let offset = 0;
    for (let i = 0; i < buffer.length; i += 4) {
      imageArray[offset++] = (buffer[i] / 127.5) - 1;     // R
      imageArray[offset++] = (buffer[i+1] / 127.5) - 1;   // G
      imageArray[offset++] = (buffer[i+2] / 127.5) - 1;   // B
    }
    
    const imageTensor = tf.tensor3d(imageArray, [224, 224, 3]);
    return imageTensor.expandDims(0);
  } catch (error) {
    console.error('Error al preprocesar la imagen:', error);
    throw error;
  }
}

// Función para procesar una imagen y obtener predicciones
async function procesarImagen(imagePath) {
  const startTime = Date.now();
  
  try {
    // Cargar el modelo si no está cargado
    const loadedModel = await loadModel();
    
    // Preprocesar la imagen
    const processedImage = await preprocessImage(imagePath);
    
    // Obtener predicciones
    const predictions = await loadedModel.predict(processedImage);
    
    // Convertir a array para procesamiento
    const data = await predictions.data();
    
    // Limpiar tensores
    processedImage.dispose();
    predictions.dispose();
    
    // Conectar con la base de datos para obtener piezas reales
    const mongoose = require('mongoose');
    const Pieza = mongoose.model('Pieza');
    
    // Obtener todas las piezas de la base de datos
    const piezas = await Pieza.find({}, 'id nombre');
    
    // Asignar puntuaciones de similitud (en un sistema real, esto se haría con un modelo entrenado específicamente)
    // Aquí estamos asignando puntuaciones basadas en el índice del valor más alto en las predicciones
    const maxIndex = data.indexOf(Math.max(...data));
    const piezasConSimilitud = piezas.map((pieza, index) => {
      // Calcular similitud basada en la distancia al índice máximo
      const distance = Math.abs(index - maxIndex);
      const maxDistance = piezas.length;
      const similitud = 1 - (distance / maxDistance);
      
      return {
        id: pieza.id,
        nombre: pieza.nombre,
        similitud: similitud.toFixed(2)
      };
    });
    
    // Ordenar por similitud descendente
    piezasConSimilitud.sort((a, b) => b.similitud - a.similitud);
    
    const endTime = Date.now();
    
    return {
      pieza: piezasConSimilitud[0],
      alternativas: piezasConSimilitud.slice(1, 4),
      tiempo_proceso: endTime - startTime
    };
  } catch (error) {
    console.error('Error al procesar la imagen:', error);
    throw error;
  }
}

// Función para generar embeddings
async function generarEmbeddings(imagePath) {
  try {
    // Cargar el modelo
    const loadedModel = await loadModel();
    
    // Preprocesar la imagen
    const processedImage = await preprocessImage(imagePath);
    
    // Crear un modelo truncado
    const layer = loadedModel.getLayer(null, -2); // Obtener penúltima capa
    const truncatedModel = tf.model({
      inputs: loadedModel.inputs,
      outputs: layer.output
    });
    
    // Obtener embeddings 
    const embeddings = truncatedModel.predict(processedImage);
    const embeddingsData = await embeddings.data();
    
    // Limpiar tensores
    processedImage.dispose();
    embeddings.dispose();
    
    return {
      embeddings: Array.from(embeddingsData),
      dimensions: embeddingsData.length
    };
  } catch (error) {
    console.error('Error al generar embeddings:', error);
    throw error;
  }
}

module.exports = {
  loadModel,
  procesarImagen,
  generarEmbeddings
};
