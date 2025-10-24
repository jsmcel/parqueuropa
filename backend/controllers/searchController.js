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
const Embedding = require('../models/embedding');

exports.search = async (req, res) => {
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
    
    // Búsqueda básica por coincidencia de texto
    const resultados = embeddings.filter(emb => {
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
}; 