/**
 * Script para importar embeddings desde JSON a MongoDB
 * Versión con conexión IPv4 explícita
 * Fecha: 2025-04-15
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`);
};

const success = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ÉXITO: ${message}`);
};

const warn = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ADVERTENCIA: ${message}`);
};

const error = (message) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
};

const detail = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DETALLE: ${message}`);
};

const args = process.argv.slice(2);
let embeddingsFile = '';
let mongoUri = 'mongodb://127.0.0.1:27017/guideitor';

if (args.length > 0) {
  embeddingsFile = args[0];
  log(`Usando archivo de embeddings personalizado: ${embeddingsFile}`);
} else {
  embeddingsFile = path.join(__dirname, '..', 'embeddings', 'dataset_embeddings.json');
  log(`Usando archivo de embeddings por defecto: ${embeddingsFile}`);
}

if (args.length > 1) {
  mongoUri = args[1];
  log(`Usando URI de MongoDB personalizada: ${mongoUri}`);
} else {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (key.trim() === 'MONGODB_URI' && value) {
            mongoUri = value.trim();
            mongoUri = mongoUri.replace('localhost', '127.0.0.1');
            break;
          }
        }
      }
    }
  } catch (err) {
    warn(`No se pudo cargar el archivo .env: ${err.message}`);
  }
  
  log(`Usando URI de MongoDB: ${mongoUri}`);
}

const embeddingSchema = new mongoose.Schema({
  pieza_id: String,
  nombre_archivo: String,
  vector: [Number],
  dimensiones: Number,
  fecha_creacion: { type: Date, default: Date.now },
  __v: { type: Number, default: 0 }
});

const Embedding = mongoose.model('Embedding', embeddingSchema);

async function importEmbeddings() {
  try {
    if (!fs.existsSync(embeddingsFile)) {
      error(`Archivo de embeddings no encontrado: ${embeddingsFile}`);
      process.exit(1);
    }
    
    log(`Leyendo archivo de embeddings: ${embeddingsFile}`);
    const fileContent = fs.readFileSync(embeddingsFile, 'utf8');
    let embeddings;
    
    try {
      embeddings = JSON.parse(fileContent);
      success(`Archivo JSON leído correctamente. Contiene ${Object.keys(embeddings).length} embeddings.`);
    } catch (jsonError) {
      error(`Error al parsear JSON: ${jsonError.message}`);
      process.exit(1);
    }
    
    log('Conectando a MongoDB...');
    detail(`Usando URI: ${mongoUri} (IPv4 explícito)`);
    
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4
    };
    
    try {
      await mongoose.connect(mongoUri, mongooseOptions);
      success('Conectado a MongoDB correctamente');
    } catch (mongoError) {
      error(`Error al conectar a MongoDB: ${mongoError.message}`);
      detail(mongoError.stack);
      process.exit(1);
    }
    
    log('Eliminando embeddings existentes...');
    await Embedding.deleteMany({});
    success('Embeddings existentes eliminados.');
    
    log('Importando embeddings a MongoDB...');
    let importedCount = 0;
    let errorCount = 0;
    
    for (const [key, value] of Object.entries(embeddings)) {
      try {
        const filename = key;
        const parts = filename.split('_');
        let pieceId = parts[0];
        
        if (!pieceId || pieceId === filename) {
          pieceId = filename.replace('.jpg', '').replace('.jpeg', '').replace('.png', '');
        }
        
        const embeddingDoc = new Embedding({
          pieza_id: pieceId,
          nombre_archivo: filename,
          vector: value,
          dimensiones: value.length
        });
        
        await embeddingDoc.save();
        importedCount++;
        
        if (importedCount % 10 === 0 || importedCount === Object.keys(embeddings).length) {
          detail(`Progreso: ${importedCount}/${Object.keys(embeddings).length} embeddings importados`);
        }
      } catch (importError) {
        errorCount++;
        warn(`Error al importar embedding ${key}: ${importError.message}`);
      }
    }
    
    log('Importación completada.');
    success(`Total de embeddings en archivo: ${Object.keys(embeddings).length}`);
    success(`Embeddings importados: ${importedCount}`);
    
    if (errorCount > 0) {
      warn(`Embeddings con errores: ${errorCount}`);
    } else {
      success('Todos los embeddings fueron importados correctamente.');
    }
    
    const count = await Embedding.countDocuments();
    success(`Embeddings en MongoDB: ${count}`);
    
    const examples = await Embedding.find().limit(3);
    if (examples.length > 0) {
      detail('Ejemplos de embeddings importados:');
      examples.forEach((example, index) => {
        detail(`Ejemplo ${index + 1}:`);
        detail(`  ID: ${example.pieza_id}`);
        detail(`  Archivo: ${example.nombre_archivo}`);
        detail(`  Dimensiones: ${example.dimensiones}`);
        detail(`  Vector (primeros 5 valores): [${example.vector.slice(0, 5).join(', ')}...]`);
      });
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    log('Colecciones en la base de datos:');
    collections.forEach(collection => {
      detail(`- ${collection.name}`);
    });
    
    mongoose.connection.close();
    success('Conexión a MongoDB cerrada.');
    
  } catch (err) {
    error(`Error general: ${err.message}`);
    detail(err.stack);
    try {
      mongoose.connection.close();
    } catch (closeError) {}
    process.exit(1);
  }
}

log('Script de importación de embeddings a MongoDB (IPv4)');
log('----------------------------------------');
log('Este script importa embeddings desde un archivo JSON a MongoDB.');
log('Usa conexión IPv4 explícita para evitar problemas de conexión.');
log('Uso: node importEmbeddings_ipv4.js [ruta_archivo_embeddings] [mongodb_uri]');
log('Si no se especifica una ruta, se usará la ruta por defecto:');
log(`${path.join(__dirname, '..', 'embeddings', 'dataset_embeddings.json')}`);
log('Si no se especifica una URI, se usará:');
log(`${mongoUri}`);
log('----------------------------------------');

importEmbeddings();
