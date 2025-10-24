/**
 * Script para importar embeddings a MongoDB con manejo robusto de errores
 * 
 * Este script está diseñado para manejar diferentes formatos de embeddings,
 * incluyendo arrays de números y arrays de strings.
 * 
 * Uso: node importEmbeddings_robust.js [ruta_archivo_embeddings]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Configuración de colores para los logs
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Función para imprimir logs con formato y timestamp
function log(type, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let prefix = '';
    
    switch (type) {
        case 'INFO':
            prefix = `${colors.blue}[INFO]${colors.reset}`;
            break;
        case 'ÉXITO':
            prefix = `${colors.green}[ÉXITO]${colors.reset}`;
            break;
        case 'ERROR':
            prefix = `${colors.red}[ERROR]${colors.reset}`;
            break;
        case 'ADVERTENCIA':
            prefix = `${colors.yellow}[ADVERTENCIA]${colors.reset}`;
            break;
        case 'DETALLE':
            prefix = `${colors.cyan}[DETALLE]${colors.reset}`;
            break;
        default:
            prefix = `[${type}]`;
    }
    
    console.log(`${prefix} [${timestamp}] ${message}`);
}

// Configuración de MongoDB - Usando IPv4 explícitamente
const mongoUri = 'mongodb://127.0.0.1:27017/guideitor';
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4 // Forzar IPv4
};

// Definición del esquema para embeddings con validación flexible
const embeddingSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    vector: {
        type: mongoose.Schema.Types.Mixed, // Permite cualquier tipo de datos
        required: true
    },
    label_names: {
        type: mongoose.Schema.Types.Mixed, // Permite arrays de strings o cualquier otro formato
        required: false
    }
}, { strict: false }); // Modo no estricto para permitir campos adicionales

// Modelo para embeddings
let Embedding;

// Función para limpiar la base de datos antes de importar
async function limpiarBaseDeDatos() {
    try {
        log('INFO', 'Eliminando embeddings existentes...');
        await Embedding.deleteMany({});
        log('ÉXITO', 'Base de datos limpiada correctamente.');
    } catch (error) {
        log('ADVERTENCIA', `Error al limpiar la base de datos: ${error.message}`);
        log('INFO', 'Continuando con la importación...');
    }
}

// Función para procesar y validar un embedding
function procesarEmbedding(embedding) {
    // Si no tiene label, asignar uno genérico
    if (!embedding.label) {
        embedding.label = `embedding_${Math.random().toString(36).substring(2, 10)}`;
        log('ADVERTENCIA', `Embedding sin etiqueta. Asignando etiqueta aleatoria: ${embedding.label}`);
    }
    
    // Verificar si vector existe
    if (!embedding.vector) {
        throw new Error('El embedding no tiene vector');
    }
    
    // Convertir label_names si es un array de strings
    if (embedding.label_names && Array.isArray(embedding.label_names)) {
        // Si es un array de strings, lo dejamos como está
        // MongoDB lo almacenará como Mixed
        log('DETALLE', `Label names encontrados: ${JSON.stringify(embedding.label_names)}`);
    }
    
    // Verificar si el vector es un array
    if (!Array.isArray(embedding.vector)) {
        throw new Error('El vector no es un array');
    }
    
    // Convertir elementos del vector a números si es posible
    const vectorProcesado = embedding.vector.map((valor, index) => {
        if (typeof valor === 'number') {
            return valor;
        } else if (typeof valor === 'string' && !isNaN(parseFloat(valor))) {
            return parseFloat(valor);
        } else {
            log('ADVERTENCIA', `Valor no numérico en vector[${index}]: ${valor}. Usando 0 como valor predeterminado.`);
            return 0;
        }
    });
    
    // Crear un nuevo objeto con los datos procesados
    return {
        label: embedding.label,
        vector: vectorProcesado,
        label_names: embedding.label_names
    };
}

// Función principal para importar embeddings
async function importarEmbeddings(rutaArchivo) {
    let conexion = null;
    
    try {
        // Verificar si el archivo existe
        if (!fs.existsSync(rutaArchivo)) {
            log('ERROR', `El archivo ${rutaArchivo} no existe.`);
            process.exit(1);
        }
        
        log('INFO', `Usando URI de MongoDB: ${mongoUri}`);
        log('DETALLE', 'URI de conexión: mongodb://127.0.0.1:27017/guideitor');
        
        // Conectar a MongoDB
        log('INFO', 'Conectando a MongoDB...');
        conexion = await mongoose.connect(mongoUri, mongoOptions);
        log('ÉXITO', 'Conectado a MongoDB correctamente');
        
        // Registrar el modelo
        Embedding = mongoose.model('Embedding', embeddingSchema);
        
        // Limpiar la base de datos
        await limpiarBaseDeDatos();
        
        // Leer el archivo de embeddings
        log('INFO', `Leyendo archivo de embeddings: ${rutaArchivo}`);
        const contenido = fs.readFileSync(rutaArchivo, 'utf8');
        
        // Parsear el JSON
        let datos;
        try {
            datos = JSON.parse(contenido);
        } catch (error) {
            log('ERROR', `Error al parsear el archivo JSON: ${error.message}`);
            process.exit(1);
        }
        
        // Verificar si el archivo tiene la estructura correcta
        if (!datos.embeddings || !Array.isArray(datos.embeddings)) {
            log('ERROR', 'El archivo no tiene el formato correcto. Debe contener un campo "embeddings" que sea un array.');
            process.exit(1);
        }
        
        log('INFO', `Total de embeddings en archivo: ${datos.embeddings.length}`);
        
        // Procesar y guardar cada embedding
        let importados = 0;
        let errores = 0;
        
        for (let i = 0; i < datos.embeddings.length; i++) {
            try {
                const embedding = datos.embeddings[i];
                const embeddingProcesado = procesarEmbedding(embedding);
                
                // Guardar en MongoDB
                const nuevoEmbedding = new Embedding(embeddingProcesado);
                await nuevoEmbedding.save();
                
                importados++;
                if (i % 10 === 0 || i === datos.embeddings.length - 1) {
                    log('INFO', `Progreso: ${i + 1}/${datos.embeddings.length} embeddings procesados`);
                }
            } catch (error) {
                errores++;
                log('ADVERTENCIA', `Error al importar embedding #${i + 1}: ${error.message}`);
            }
        }
        
        // Mostrar resumen
        log('ÉXITO', `Total de embeddings en archivo: ${datos.embeddings.length}`);
        log('ÉXITO', `Embeddings importados: ${importados}`);
        if (errores > 0) {
            log('ADVERTENCIA', `Embeddings con errores: ${errores}`);
        }
        
        // Verificar colecciones en la base de datos
        const colecciones = await mongoose.connection.db.listCollections().toArray();
        log('INFO', 'Colecciones en la base de datos:');
        colecciones.forEach(coleccion => {
            log('DETALLE', ` - ${coleccion.name}`);
        });
        
        log('ÉXITO', 'Conexión a MongoDB cerrada.');
        console.log(`${colors.green}[ÉXITO]${colors.reset} [${new Date().toISOString().replace('T', ' ').substring(0, 19)}] Carga de embeddings completada.`);
        
    } catch (error) {
        log('ERROR', `Error al conectar a MongoDB: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
            log('ERROR', 'No se pudo conectar a MongoDB. Asegúrate de que MongoDB esté en ejecución.');
            log('DETALLE', 'Verifica que MongoDB esté instalado y en ejecución con: sudo systemctl status mongodb');
        }
    } finally {
        // Cerrar la conexión si está abierta
        if (conexion) {
            await mongoose.connection.close();
        }
    }
}

// Punto de entrada del script
(async () => {
    try {
        // Obtener la ruta del archivo de embeddings
        const rutaArchivo = process.argv[2] || path.join(process.cwd(), 'embeddings', 'dataset_embeddings.json');
        
        log('INFO', `Iniciando importación de embeddings desde: ${rutaArchivo}`);
        
        // Importar embeddings
        await importarEmbeddings(rutaArchivo);
        
    } catch (error) {
        log('ERROR', `Error general: ${error.message}`);
        process.exit(1);
    }
})();
