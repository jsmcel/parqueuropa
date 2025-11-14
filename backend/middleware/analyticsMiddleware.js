/**
 * Analytics Middleware
 * Transparently tracks all API requests for analytics
 */

const crypto = require('crypto');
const { ApiEvent } = require('../models/Analytics');

/**
 * Generate a session ID based on IP and User-Agent
 * This allows tracking user sessions without storing personal data
 */
function generateSessionId(ip, userAgent) {
  const combined = `${ip || 'unknown'}-${userAgent || 'unknown'}`;
  return crypto.createHash('md5').update(combined).digest('hex').substring(0, 16);
}

/**
 * Analytics middleware that tracks API requests
 * Should be registered BEFORE other routes
 */
function analyticsMiddleware(req, res, next) {
  // Skip tracking for dev endpoints to avoid noise
  if (req.path.startsWith('/api/dev/') || req.path.startsWith('/dev/')) {
    return next();
  }

  // Skip tracking for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/public/')) {
    return next();
  }

  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;

  // Generate session ID
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const sessionId = generateSessionId(ip, userAgent);

  // Add sessionId to request for use in other parts of the app
  req.analyticsSessionId = sessionId;

  // Override res.send to capture response time
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Track the API event asynchronously (don't block the response)
    setImmediate(() => {
      trackApiEvent(req, res, responseTime, sessionId, ip, userAgent).catch(err => {
        console.error('Error tracking API event:', err);
      });
    });

    return originalSend.call(this, data);
  };

  // Override res.json to capture response time
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Track the API event asynchronously (don't block the response)
    setImmediate(() => {
      trackApiEvent(req, res, responseTime, sessionId, ip, userAgent).catch(err => {
        console.error('Error tracking API event:', err);
      });
    });

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Track API event in database
 */
async function trackApiEvent(req, res, responseTime, sessionId, ip, userAgent) {
  try {
    const tenantId = resolveTenantId(req);
    const apiEvent = new ApiEvent({
      tenantId,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: responseTime,
      ip: ip,
      userAgent: userAgent,
      sessionId: sessionId,
      timestamp: new Date()
    });

    await apiEvent.save();
  } catch (error) {
    // Don't throw errors in tracking - it shouldn't affect the main app
    console.error('Failed to save API event:', error);
  }
}

function resolveTenantId(req) {
  if (!req) return 'global';
  if (req.tenant && req.tenant.id) {
    return req.tenant.id;
  }
  if (req.headers && req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }
  if (req.query) {
    if (req.query.tenantId) return req.query.tenantId;
    if (req.query.tenant_id) return req.query.tenant_id;
    if (req.query.tenant) return req.query.tenant;
  }
  return 'global';
}

module.exports = analyticsMiddleware;
