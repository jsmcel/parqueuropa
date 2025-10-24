/**
 * Script para registrar archivos de audio en la base de datos
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

let totalFiles = 0;
let processedFiles = 0;
let errorFiles = 0;

const args = process.argv.slice(2);
let audioDir = '';
let mongoUri = 'mongodb://127.0.0.1:27017/guideitor';

if (args.length > 0) {
  audioDir = args[0];
  log(`Usando directorio de audio personalizado: ${audioDir}`);
} else {
  audioDir = path.join(__dirname, '..', 'audio_output');
  log(`Usando directorio de audio por defecto: ${audioDir}`);
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

log('Conectando a MongoDB...');
detail(`URI de conexión: ${mongoUri}`);

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4
};

mongoose.connect(mongoUri, mongooseOptions)
  .then(() => {
    success('Conectado a MongoDB correctamente');
    registerAudios();
  })
  .catch(err => {
    error(`Error al conectar a MongoDB: ${err.message}`);
    detail(err.stack);
    log('Posibles soluciones para problemas de conexión:');
    detail('1. Asegúrate de que MongoDB esté en ejecución');
    detail('2. Verifica que el servicio de MongoDB esté iniciado en el Administrador de servicios de Windows');
    detail('3. Comprueba que MongoDB esté escuchando en el puerto 27017');
    detail('4. Intenta conectarte manualmente usando MongoDB Compass a 127.0.0.1:27017');
    detail('5. Verifica que no haya un firewall bloqueando la conexión');
    detail('6. Crea manualmente la base de datos "guideitor" en MongoDB Compass');
    process.exit(1);
  });

const audioSchema = new mongoose.Schema({
  filename: String,
  path: String,
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Audio = mongoose.model('Audio', audioSchema);

async function registerAudios() {
  try {
    if (!fs.existsSync(audioDir)) {
      warn(`Directorio de audios no encontrado: ${audioDir}`);
      log('Creando directorio de audios...');
      fs.mkdirSync(audioDir, { recursive: true });
      success('Directorio de audios creado.');
      detail('No hay archivos para procesar.');
      mongoose.connection.close();
      return;
    }
    
    log(`Leyendo archivos en el directorio: ${audioDir}`);
    const allFiles = fs.readdirSync(audioDir);
    detail(`Total de archivos encontrados: ${allFiles.length}`);
    
    const files = allFiles.filter(file => file.toLowerCase().endsWith('.mp3'));
    totalFiles = files.length;
    log(`Se encontraron ${totalFiles} archivos de audio MP3.`);
    
    detail('Lista de todos los archivos en el directorio:');
    allFiles.forEach(file => {
      detail(`- ${file} (${file.toLowerCase().endsWith('.mp3') ? 'MP3' : 'No MP3'})`);
    });
    
    if (totalFiles === 0) {
      warn('No se encontraron archivos MP3 en el directorio.');
      detail(`Directorio verificado: ${audioDir}`);
      try {
        const stats = fs.statSync(audioDir);
        detail(`Permisos del directorio: ${stats.mode.toString(8)}`);
        detail(`Propietario: ${stats.uid}, Grupo: ${stats.gid}`);
      } catch (statError) {
        warn(`No se pudieron verificar los permisos: ${statError.message}`);
      }
      mongoose.connection.close();
      return;
    }
    
    const existingAudios = await Audio.find({});
    detail(`Audios existentes en la base de datos: ${existingAudios.length}`);
    
    log('Eliminando registros antiguos...');
    await Audio.deleteMany({});
    success('Registros antiguos eliminados.');
    
    for (const file of files) {
      try {
        const title = file.replace('.mp3', '').replace(/_/g, ' ');
        
        const audio = new Audio({
          filename: file,
          path: `/audio_output/${file}`,
          title: title,
          description: `Audio descriptivo para ${title}`
        });
        
        await audio.save();
        processedFiles++;
        detail(`[${processedFiles}/${totalFiles}] Registrado: ${file}`);
      } catch (fileError) {
        errorFiles++;
        error(`Error al procesar archivo ${file}: ${fileError.message}`);
        detail(fileError.stack);
      }
    }
    
    log('Procesamiento de archivos completado.');
    success(`Total de archivos: ${totalFiles}`);
    success(`Archivos procesados: ${processedFiles}`);
    
    if (errorFiles > 0) {
      warn(`Archivos con errores: ${errorFiles}`);
    } else {
      success('Todos los archivos fueron procesados correctamente.');
    }
    
    const finalAudios = await Audio.find({});
    success(`Audios registrados en la base de datos: ${finalAudios.length}`);
    
    if (finalAudios.length < totalFiles) {
      warn(`Algunos archivos no fueron registrados. Registrados: ${finalAudios.length}, Total: ${totalFiles}`);
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    log('Colecciones en la base de datos:');
    collections.forEach(collection => {
      detail(`- ${collection.name}`);
    });
    
    mongoose.connection.close();
    success('Conexión a MongoDB cerrada.');
    
  } catch (error) {
    error(`Error al registrar audios: ${error.message}`);
    detail(error.stack);
    mongoose.connection.close();
    process.exit(1);
  }
}

log('Script de registro de audios flexible');
log('----------------------------------------');
log('Este script registra archivos MP3 en MongoDB para la aplicación GuiEditor.');
log('Uso: node registerAudios_ipv4.js [ruta_directorio_audio] [mongodb_uri]');
log('Si no se especifica una ruta, se usará la ruta por defecto:');
log(`${path.join(__dirname, '..', 'audio_output')}`);
log('----------------------------------------');
