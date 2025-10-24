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
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// URL de conexión a MongoDB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'guideitor';

// Función para inicializar la base de datos
async function initializeDatabase() {
  console.log('Inicializando base de datos...');
  
  try {
    // Leer archivo de inicialización
    const dbInitPath = path.join(__dirname, 'db_init.json');
    
    if (!fs.existsSync(dbInitPath)) {
      console.error(`Error: No se encontró el archivo de inicialización ${dbInitPath}`);
      return false;
    }
    
    const dbInitData = JSON.parse(fs.readFileSync(dbInitPath, 'utf8'));
    
    // Conectar a MongoDB
    console.log(`Conectando a MongoDB en ${MONGO_URL}...`);
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    
    // Obtener referencia a la base de datos
    const db = client.db(dbInitData.database || DB_NAME);
    
    // Inicializar colecciones
    for (const collection of dbInitData.collections) {
      console.log(`Inicializando colección: ${collection.name}`);
      
      // Crear colección si no existe
      if (!await collectionExists(db, collection.name)) {
        await db.createCollection(collection.name);
      }
      
      // Limpiar colección
      await db.collection(collection.name).deleteMany({});
      
      // Insertar documentos
      if (collection.documents && collection.documents.length > 0) {
        await db.collection(collection.name).insertMany(collection.documents);
        console.log(`Se insertaron ${collection.documents.length} documentos en la colección ${collection.name}`);
      }
    }
    
    console.log('Base de datos inicializada correctamente.');
    await client.close();
    return true;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    return false;
  }
}

// Función para verificar si una colección existe
async function collectionExists(db, collectionName) {
  const collections = await db.listCollections().toArray();
  return collections.some(c => c.name === collectionName);
}

// Ejecutar la inicialización si este script se ejecuta directamente
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('Inicialización completada con éxito.');
        process.exit(0);
      } else {
        console.error('La inicialización falló.');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Error inesperado:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
