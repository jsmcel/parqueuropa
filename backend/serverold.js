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
 * Servidor básico para GuiEditor
 * Fecha: 2025-04-15
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');

// Configuración
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guideitor';

// Crear aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configurar opciones de conexión para evitar problemas de IPv6
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4 // Forzar IPv4
};

// Conectar a MongoDB
console.log(`[${new Date().toISOString()}] Conectando a MongoDB: ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log(`[${new Date().toISOString()}] Conectado a MongoDB correctamente`);
  })
  .catch(err => {
    console.error(`[${new Date().toISOString()}] Error al conectar a MongoDB: ${err.message}`);
    console.error(err.stack);
  });

// Definir esquemas
const audioSchema = new mongoose.Schema({
  filename: String,
  path: String,
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const embeddingSchema = new mongoose.Schema({
  pieza_id: String,
  nombre_archivo: String,
  vector: [Number],
  dimensiones: Number,
  fecha_creacion: { type: Date, default: Date.now }
});

// Crear modelos
const Audio = mongoose.model('Audio', audioSchema);
const Embedding = mongoose.model('Embedding', embeddingSchema);

// Rutas API
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta para obtener todos los audios
app.get('/api/audios', async (req, res) => {
  try {
    const audios = await Audio.find({});
    res.json(audios);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error al obtener audios: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para obtener todos los embeddings
app.get('/api/embeddings', async (req, res) => {
  try {
    const embeddings = await Embedding.find({});
    res.json(embeddings);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error al obtener embeddings: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para obtener estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    const audioCount = await Audio.countDocuments();
    const embeddingCount = await Embedding.countDocuments();
    
    // Obtener colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    res.json({
      audioCount,
      embeddingCount,
      collections: collectionNames,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error al obtener estadísticas: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para búsqueda de embeddings
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Se requiere un parámetro de búsqueda "query"' });
    }
    
    console.log(`[${new Date().toISOString()}] Búsqueda solicitada: "${query}"`);
    
    // Obtener todos los embeddings
    const embeddings = await Embedding.find({});
    
    if (embeddings.length === 0) {
      return res.status(404).json({ error: 'No hay embeddings disponibles para realizar la búsqueda' });
    }
    
    // Búsqueda simple (comparación de texto)
    // Podría mejorarse con comparación de vectores, pero esto es un inicio básico
    const resultados = embeddings.filter(emb => {
      // Convertir a mayúsculas para comparación no sensible a mayúsculas/minúsculas
      const nombre = emb.nombre_archivo ? emb.nombre_archivo.toUpperCase() : '';
      const piezaId = emb.pieza_id ? emb.pieza_id.toUpperCase() : '';
      const queryUpper = query.toUpperCase();
      
      return nombre.includes(queryUpper) || piezaId.includes(queryUpper);
    });
    
    console.log(`[${new Date().toISOString()}] Resultados encontrados: ${resultados.length}`);
    
    res.json({
      query,
      total: resultados.length,
      resultados: resultados.map(r => ({
        id: r._id,
        pieza_id: r.pieza_id,
        nombre_archivo: r.nombre_archivo
      }))
    });
    
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error en búsqueda: ${err.message}`);
    res.status(500).json({ error: 'Error al procesar la búsqueda' });
  }
});

// Ruta para la página principal
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>GuiEditor Backend</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          .card { background: #f9f9f9; border-radius: 5px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .success { color: green; }
          .error { color: red; }
          pre { background: #eee; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>GuiEditor Backend</h1>
          <div class="card">
            <h2>Estado del servidor</h2>
            <p class="success">Servidor en ejecución</p>
            <p>Fecha y hora: ${new Date().toISOString()}</p>
            <p>Puerto: ${PORT}</p>
          </div>
          
          <div class="card">
            <h2>API Endpoints</h2>
            <ul>
              <li><a href="/api/status">/api/status</a> - Estado del servidor</li>
              <li><a href="/api/audios">/api/audios</a> - Lista de audios</li>
              <li><a href="/api/embeddings">/api/embeddings</a> - Lista de embeddings</li>
              <li><a href="/api/stats">/api/stats</a> - Estadísticas del sistema</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Servidor iniciado en http://localhost:${PORT}`);
  // Mostrar IPs disponibles para conexión
  const nets = networkInterfaces();
  console.log(`[${new Date().toISOString()}] IPs disponibles para conexión desde dispositivos móviles:`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Mostrar solo IPv4
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`[${new Date().toISOString()}] http://${net.address}:${PORT}`);
      }
    }
  }
});
