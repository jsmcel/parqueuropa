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
 * Rutas de API para el sistema Guideitor
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { procesarImagen, generarEmbeddings } = require('./tensorflow');
// Modelos
const Pieza = mongoose.model('Pieza');
const Feedback = mongoose.model('Feedback');
const Reconocimiento = mongoose.model('Reconocimiento');
const Visita = mongoose.model('Visita');
// Configuración para subida de imágenes
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Endpoint para verificar estado del servidor
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor GuiEditor en funcionamiento',
    version: '1.0.0',
    mongodb_status: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    fecha: new Date()
  });
});

// Endpoint para obtener todas las piezas
router.get('/piezas', async (req, res) => {
  try {
    const piezas = await Pieza.find({}).select('-embeddings');
    res.json({
      success: true,
      count: piezas.length,
      data: piezas
    });
  } catch (error) {
    console.error('Error al obtener piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener piezas',
      error: error.message
    });
  }
});

// Endpoint para obtener una pieza específica por ID
router.get('/piezas/:id', async (req, res) => {
  try {
    const pieza = await Pieza.findById(req.params.id).select('-embeddings');
    if (!pieza) {
      return res.status(404).json({
        success: false,
        message: 'Pieza no encontrada'
      });
    }
    res.json({
      success: true,
      data: pieza
    });
  } catch (error) {
    console.error('Error al obtener pieza:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pieza',
      error: error.message
    });
  }
});

// Endpoint para reconocimiento de imágenes
router.post('/reconocer', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      });
    }

    const imagePath = req.file.path;
    const resultado = await procesarImagen(imagePath);
    
    // Guardar reconocimiento en la base de datos
    const reconocimiento = new Reconocimiento({
      imagePath: imagePath,
      resultado: resultado,
      fecha: new Date()
    });
    
    await reconocimiento.save();
    
    res.json({
      success: true,
      recognitionId: reconocimiento._id,
      resultado: resultado
    });
  } catch (error) {
    console.error('Error en reconocimiento de imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error en reconocimiento de imagen',
      error: error.message
    });
  }
});

// Endpoint para obtener audio de una pieza
router.get('/audio/:id/:modo?', async (req, res) => {
  try {
    const pieza = await Pieza.findById(req.params.id);
    if (!pieza) {
      return res.status(404).json({
        success: false,
        message: 'Pieza no encontrada'
      });
    }
    
    const modo = req.params.modo || 'normal';
    const audioDir = path.join(__dirname, '..', 'public', 'static', 'audio', 'museo_ferrocarril');
    
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    const audioFilename = `${pieza._id}_${modo}.mp3`;
    const audioPath = path.join(audioDir, audioFilename);
    
    // Verificar si el archivo ya existe
    if (!fs.existsSync(audioPath)) {
      // Generar audio con WaveNet
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '..', '..', 'utilidades', 'wavenet', 'wavenet_tts_apikey.py'),
        'single',
        '--text', modo === 'normal' ? pieza.descripcion : pieza.descripcion_infantil,
        '--output', audioPath,
        '--voice', modo === 'infantil' ? 'infantil' : modo === 'experto' ? 'experto' : modo === 'cachondo' ? 'cachondo' : 'normal'
      ]);
      
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Error al generar audio, código de salida: ${code}`));
          }
        });
      });
    }
    
    // Enviar archivo de audio
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Error al obtener audio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener audio',
      error: error.message
    });
  }
});

// Endpoint para recibir feedback
router.post('/feedback', async (req, res) => {
  try {
    const { recognitionId, isCorrect, userFeedback } = req.body;
    
    if (!recognitionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de reconocimiento'
      });
    }
    
    // Verificar si existe el reconocimiento
    const reconocimiento = await Reconocimiento.findById(recognitionId);
    if (!reconocimiento) {
      return res.status(404).json({
        success: false,
        message: 'Reconocimiento no encontrado'
      });
    }
    
    // Guardar feedback en la base de datos
    const feedback = new Feedback({
      reconocimiento: recognitionId,
      isCorrect: isCorrect || false,
      comentario: userFeedback || '',
      fecha: new Date()
    });
    
    await feedback.save();
    
    // Actualizar el reconocimiento con el feedback
    reconocimiento.feedback = feedback._id;
    await reconocimiento.save();
    
    res.json({
      success: true,
      message: 'Feedback recibido correctamente',
      data: feedback
    });
  } catch (error) {
    console.error('Error al procesar feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar feedback',
      error: error.message
    });
  }
});

// Endpoint para estadísticas de administración
router.get('/admin/stats', async (req, res) => {
  try {
    const totalPiezas = await Pieza.countDocuments();
    const totalReconocimientos = await Reconocimiento.countDocuments();
    const totalFeedbacks = await Feedback.countDocuments();
    
    const feedbackPositivo = await Feedback.countDocuments({ isCorrect: true });
    const feedbackNegativo = await Feedback.countDocuments({ isCorrect: false });
    
    const ultimosReconocimientos = await Reconocimiento.find()
      .sort({ fecha: -1 })
      .limit(10)
      .populate('resultado.pieza', 'nombre')
      .select('fecha resultado');
    
    res.json({
      success: true,
      stats: {
        piezas: totalPiezas,
        reconocimientos: totalReconocimientos,
        feedback: {
          total: totalFeedbacks,
          positivo: feedbackPositivo,
          negativo: feedbackNegativo,
          tasaExito: totalFeedbacks > 0 ? (feedbackPositivo / totalFeedbacks) * 100 : 0
        },
        ultimosReconocimientos: ultimosReconocimientos
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// Soporte para rutas con tenant_id para compatibilidad con versiones anteriores
router.get('/pieces/:tenant_id', async (req, res) => {
  try {
    const piezas = await Pieza.find({}).select('-embeddings');
    res.json({
      success: true,
      count: piezas.length,
      data: piezas
    });
  } catch (error) {
    console.error('Error al obtener piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener piezas',
      error: error.message
    });
  }
});

router.get('/pieces/:tenant_id/:piece_id', async (req, res) => {
  try {
    const pieza = await Pieza.findById(req.params.piece_id).select('-embeddings');
    if (!pieza) {
      return res.status(404).json({
        success: false,
        message: 'Pieza no encontrada'
      });
    }
    res.json({
      success: true,
      data: pieza
    });
  } catch (error) {
    console.error('Error al obtener pieza:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pieza',
      error: error.message
    });
  }
});

router.post('/recognize/:tenant_id', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      });
    }

    const imagePath = req.file.path;
    const resultado = await procesarImagen(imagePath);
    
    // Guardar reconocimiento en la base de datos
    const reconocimiento = new Reconocimiento({
      imagePath: imagePath,
      resultado: resultado,
      fecha: new Date()
    });
    
    await reconocimiento.save();
    
    res.json({
      success: true,
      recognitionId: reconocimiento._id,
      resultado: resultado
    });
  } catch (error) {
    console.error('Error en reconocimiento de imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error en reconocimiento de imagen',
      error: error.message
    });
  }
});

router.get('/audio/:tenant_id/:piece_id/:audio_mode?', async (req, res) => {
  try {
    const pieza = await Pieza.findById(req.params.piece_id);
    if (!pieza) {
      return res.status(404).json({
        success: false,
        message: 'Pieza no encontrada'
      });
    }
    
    const modo = req.params.audio_mode || 'normal';
    const audioDir = path.join(__dirname, '..', 'public', 'static', 'audio', 'museo_ferrocarril');
    
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    const audioFilename = `${pieza._id}_${modo}.mp3`;
    const audioPath = path.join(audioDir, audioFilename);
    
    // Verificar si el archivo ya existe
    if (!fs.existsSync(audioPath)) {
      // Generar audio con WaveNet
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '..', '..', 'utilidades', 'wavenet', 'wavenet_tts_apikey.py'),
        'single',
        '--text', modo === 'normal' ? pieza.descripcion : pieza.descripcion_infantil,
        '--output', audioPath,
        '--voice', modo === 'infantil' ? 'infantil' : modo === 'experto' ? 'experto' : modo === 'cachondo' ? 'cachondo' : 'normal'
      ]);
      
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Error al generar audio, código de salida: ${code}`));
          }
        });
      });
    }
    
    // Enviar archivo de audio
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Error al obtener audio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener audio',
      error: error.message
    });
  }
});

module.exports = router;
