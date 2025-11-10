const path = require('path');
const fs = require('fs');

// Cargar configuración de tenants
const tenantsConfigPath = path.join(__dirname, '../config/tenants.json');
let tenantsConfig = {};

try {
  tenantsConfig = JSON.parse(fs.readFileSync(tenantsConfigPath, 'utf8'));
} catch (error) {
  console.error('Error loading tenants config:', error);
  process.exit(1);
}

/**
 * Middleware para detectar y validar el tenant
 * Detecta tenant por:
 * 1. Header X-Tenant-ID (prioridad alta)
 * 2. Subdomain del host
 * 3. Query param tenant_id (fallback)
 * 4. Default: primer tenant habilitado
 */
function tenantMiddleware(req, res, next) {
  let tenantId = null;
  let detectionMethod = '';

  // 1. Detectar por header X-Tenant-ID
  if (req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
    detectionMethod = 'header';
  }
  
  // 2. Detectar por subdomain
  if (!tenantId && req.headers.host) {
    const host = req.headers.host.toLowerCase();
    const hostParts = host.split('.');
    const possibleSubdomains = [];

    // Generar posibles subdominios concatenando segmentos antes del dominio principal
    for (let i = 1; i <= hostParts.length - 2; i += 1) {
      possibleSubdomains.push(hostParts.slice(0, i).join('.'));
    }

    // Buscar tenant por cualquier coincidencia de subdominio
    for (const [id, config] of Object.entries(tenantsConfig)) {
      const aliases = config.subdomains || [];
      if (aliases.some(alias => possibleSubdomains.includes(alias))) {
        tenantId = id;
        detectionMethod = 'subdomain';
        break;
      }
    }
  }

  // 3. Detectar por query param (fallback, aunque haya host sin coincidencia)
  if (!tenantId && req.query.tenant_id) {
    tenantId = req.query.tenant_id;
    detectionMethod = 'query';
  }

  // 4. Default: primer tenant habilitado
  if (!tenantId) {
    const enabledTenants = Object.entries(tenantsConfig)
      .filter(([id, config]) => config.enabled)
      .map(([id]) => id);
    
    if (enabledTenants.length > 0) {
      tenantId = enabledTenants[0];
      detectionMethod = 'default';
    }
  }

  // Validar que el tenant existe y está habilitado
  if (!tenantId || !tenantsConfig[tenantId] || !tenantsConfig[tenantId].enabled) {
    return res.status(404).json({
      error: 'Tenant not found or disabled',
      availableTenants: Object.keys(tenantsConfig).filter(id => tenantsConfig[id].enabled),
      detectedTenant: tenantId
    });
  }

  // Adjuntar información del tenant al request
  req.tenant = {
    id: tenantId,
    config: tenantsConfig[tenantId],
    detectionMethod: detectionMethod
  };

  // Log para debugging
  console.log(`Tenant detected: ${tenantId} (${detectionMethod})`);

  next();
}

module.exports = tenantMiddleware;
