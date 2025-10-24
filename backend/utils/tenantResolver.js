const path = require('path');
const fs = require('fs');

/**
 * Resuelve los paths de archivos para un tenant específico
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Objeto con los paths resueltos
 */
function getTenantPaths(tenantId) {
  const backendDir = path.join(__dirname, '..');
  const tenantDir = path.join(backendDir, 'tenants', tenantId);

  return {
    // Directorios base
    tenantDir: tenantDir,
    modelsDir: path.join(tenantDir, 'models'),
    embeddingsDir: path.join(tenantDir, 'embeddings'),
    audioDir: path.join(tenantDir, 'audio'),

    // Archivos específicos
    primaryModelPath: path.join(tenantDir, 'models', 'swin_t_best_model.onnx'),
    secondaryModelPath: path.join(tenantDir, 'models', 'efficientnet_b0_model.onnx'),
    embeddingsPath: path.join(tenantDir, 'embeddings', 'dataset_embeddings.json'),

    // Configuración del tenant (opcional)
    configPath: path.join(tenantDir, 'config.json')
  };
}

/**
 * Verifica si un tenant tiene todos los archivos necesarios
 * @param {string} tenantId - ID del tenant
 * @returns {Object} Objeto con el estado de cada archivo
 */
function validateTenantFiles(tenantId) {
  const paths = getTenantPaths(tenantId);
  
  return {
    tenantId: tenantId,
    modelsDir: fs.existsSync(paths.modelsDir),
    embeddingsDir: fs.existsSync(paths.embeddingsDir),
    audioDir: fs.existsSync(paths.audioDir),
    primaryModel: fs.existsSync(paths.primaryModelPath),
    secondaryModel: fs.existsSync(paths.secondaryModelPath),
    embeddings: fs.existsSync(paths.embeddingsPath),
    config: fs.existsSync(paths.configPath)
  };
}

/**
 * Lista todos los tenants disponibles con su estado
 * @returns {Object} Objeto con información de todos los tenants
 */
function listTenantsStatus() {
  const tenantsConfigPath = path.join(__dirname, '../config/tenants.json');
  
  try {
    const tenantsConfig = JSON.parse(fs.readFileSync(tenantsConfigPath, 'utf8'));
    const status = {};

    for (const [tenantId, config] of Object.entries(tenantsConfig)) {
      status[tenantId] = {
        config: config,
        files: validateTenantFiles(tenantId)
      };
    }

    return status;
  } catch (error) {
    console.error('Error loading tenants config:', error);
    return {};
  }
}

/**
 * Obtiene la configuración de un tenant específico
 * @param {string} tenantId - ID del tenant
 * @returns {Object|null} Configuración del tenant o null si no existe
 */
function getTenantConfig(tenantId) {
  const tenantsConfigPath = path.join(__dirname, '../config/tenants.json');
  
  try {
    const tenantsConfig = JSON.parse(fs.readFileSync(tenantsConfigPath, 'utf8'));
    return tenantsConfig[tenantId] || null;
  } catch (error) {
    console.error('Error loading tenants config:', error);
    return null;
  }
}

/**
 * Busca el mejor modelo disponible para un tenant
 * @param {string} tenantId - ID del tenant
 * @returns {string|null} Path del mejor modelo disponible
 */
function getBestAvailableModel(tenantId) {
  const paths = getTenantPaths(tenantId);
  
  // Prioridad: swin_t_best_model.onnx > efficientnet_b0_model.onnx
  if (fs.existsSync(paths.primaryModelPath)) {
    return paths.primaryModelPath;
  } else if (fs.existsSync(paths.secondaryModelPath)) {
    return paths.secondaryModelPath;
  }
  
  return null;
}

module.exports = {
  getTenantPaths,
  validateTenantFiles,
  listTenantsStatus,
  getTenantConfig,
  getBestAvailableModel
};
