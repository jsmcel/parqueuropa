/**
 * Analytics Routes
 * API endpoints for analytics data and user feedback
 */

const express = require('express');
const path = require('path');
const router = express.Router();
const {
  trackRecognition,
  trackAudio,
  saveFeedback,
  getStatsSummary,
  getRecognitionStats,
  getAudioStats,
  getPopularPieces,
  getTimeline,
  getFeedbackList,
  getDashboardData
} = require('../controllers/analyticsController');

function resolveTenantScope(req, defaultScope = 'all') {
  const query = req.query || {};
  const requested =
    query.tenantId ||
    query.tenant ||
    query.tenant_id ||
    query.scope;

  if (typeof requested === 'string' && requested.trim().length > 0) {
    return requested.trim();
  }

  if (defaultScope === 'detected') {
    return req.tenant?.id || req.headers['x-tenant-id'] || 'global';
  }

  return defaultScope;
}

// ============================================
// JSON API Endpoints (for dashboard data)
// ============================================

/**
 * GET /api/dev/analytics/summary
 * Get general statistics summary
 */
router.get('/api/dev/analytics/summary', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const tenantScope = resolveTenantScope(req);
    const summary = await getStatsSummary(period, tenantScope);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/recognitions
 * Get recognition statistics
 */
router.get('/api/dev/analytics/recognitions', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const tenantScope = resolveTenantScope(req);
    const stats = await getRecognitionStats(period, tenantScope);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting recognition stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/audio
 * Get audio statistics
 */
router.get('/api/dev/analytics/audio', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const tenantScope = resolveTenantScope(req);
    const stats = await getAudioStats(period, tenantScope);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting audio stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/popular
 * Get popular pieces ranking
 */
router.get('/api/dev/analytics/popular', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const limit = parseInt(req.query.limit) || 20;
    const tenantScope = resolveTenantScope(req);
    const popular = await getPopularPieces(period, limit, tenantScope);
    res.json({ success: true, data: popular });
  } catch (error) {
    console.error('Error getting popular pieces:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/timeline
 * Get timeline data for charts
 */
router.get('/api/dev/analytics/timeline', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const granularity = req.query.granularity || 'day';
    const tenantScope = resolveTenantScope(req);
    const timeline = await getTimeline(period, granularity, tenantScope);
    res.json({ success: true, data: timeline });
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/feedback
 * Get feedback list with filters
 */
router.get('/api/dev/analytics/feedback', async (req, res) => {
  try {
    const tenantScope = resolveTenantScope(req);
    const filters = {
      minRating: req.query.minRating,
      since: req.query.since,
      resolved: req.query.resolved,
      limit: parseInt(req.query.limit) || 50,
      tenantId: tenantScope
    };
    
    const feedback = await getFeedbackList(filters);
    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dev/analytics/dashboard-data
 * Get complete dashboard data
 */
router.get('/api/dev/analytics/dashboard-data', async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const tenantScope = resolveTenantScope(req);
    const data = await getDashboardData(period, tenantScope);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST Endpoints (from frontend)
// ============================================

/**
 * POST /api/feedback
 * Save user feedback (rating and comment)
 */
router.post('/api/feedback', async (req, res) => {
  try {
    const { rating, comment, deviceInfo, appVersion } = req.body;
    const tenantId = resolveTenantScope(req, 'detected');
    
    // Validation (rating can be 0 for support messages)
    if (rating !== 0 && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be between 1 and 5, or 0 for support messages' 
      });
    }

    const feedbackData = {
      rating: parseInt(rating),
      comment: comment || '',
      deviceInfo: deviceInfo || {},
      appVersion: appVersion || '1.0.1',
      sessionId: req.analyticsSessionId || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      tenantId
    };

    const feedback = await saveFeedback(feedbackData);
    
    res.json({ 
      success: true, 
      message: 'Feedback saved successfully',
      data: { id: feedback._id }
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HTML Dashboard
// ============================================

/**
 * GET /dev/dashboard
 * Serve the analytics dashboard HTML
 */
router.get('/dev/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

module.exports = router;
