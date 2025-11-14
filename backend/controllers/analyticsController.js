/**
 * Analytics Controller
 * Handles tracking and querying of analytics data
 */

const { 
  ApiEvent, 
  RecognitionEvent, 
  AudioEvent, 
  UserFeedback, 
  SessionSummary 
} = require('../models/Analytics');

/**
 * Track a recognition event
 */
async function trackRecognition(data) {
  try {
    const tenantId = data.tenantId || 'global';
    const recognitionEvent = new RecognitionEvent({
      tenantId,
      pieceName: data.pieceName,
      confidence: data.confidence,
      success: data.success,
      lowConfidence: data.lowConfidence || false,
      notATrain: data.notATrain || false,
      suggestions: data.suggestions || [],
      fallbackUsed: data.fallbackUsed || 'none',
      responseTime: data.responseTime,
      sessionId: data.sessionId,
      ip: data.ip,
      timestamp: new Date()
    });

    await recognitionEvent.save();
    
    // Update session summary
    await updateSessionSummary(
      data.sessionId,
      {
        totalRecognitions: 1,
        successfulRecognitions: data.success ? 1 : 0,
        uniquePiecesViewed: data.pieceName ? [data.pieceName] : []
      },
      { tenantId, ip: data.ip, userAgent: data.userAgent }
    );

    return recognitionEvent;
  } catch (error) {
    console.error('Error tracking recognition:', error);
    throw error;
  }
}

/**
 * Track an audio playback event
 */
async function trackAudio(data) {
  try {
    const tenantId = data.tenantId || 'global';
    const audioEvent = new AudioEvent({
      tenantId,
      pieceId: data.pieceId,
      audioMode: data.audioMode,
      success: data.success,
      sessionId: data.sessionId,
      ip: data.ip,
      timestamp: new Date()
    });

    await audioEvent.save();
    
    // Update session summary
    await updateSessionSummary(
      data.sessionId,
      {
        totalAudioPlays: 1
      },
      { tenantId, ip: data.ip, userAgent: data.userAgent }
    );

    return audioEvent;
  } catch (error) {
    console.error('Error tracking audio:', error);
    throw error;
  }
}

/**
 * Save user feedback (rating and comment)
 */
async function saveFeedback(data) {
  try {
    const tenantId = data.tenantId || 'global';
    const feedback = new UserFeedback({
      tenantId,
      rating: data.rating,
      comment: data.comment || '',
      appVersion: data.appVersion,
      deviceInfo: data.deviceInfo,
      sessionId: data.sessionId,
      ip: data.ip,
      timestamp: new Date()
    });

    await feedback.save();
    
    // Update session summary
    await updateSessionSummary(
      data.sessionId,
      {
        feedbackGiven: true
      },
      { tenantId, ip: data.ip, userAgent: data.userAgent }
    );

    return feedback;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
}

/**
 * Update session summary (upsert)
 */
async function updateSessionSummary(sessionId, updates = {}, options = {}) {
  try {
    if (!sessionId) return;
    const tenantId = options.tenantId || updates.tenantId || 'global';
    let sessionData = await SessionSummary.findOne({ tenantId, sessionId });
    
    if (!sessionData) {
      sessionData = await SessionSummary.findOne({
        sessionId,
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: '' }
        ]
      });
      if (sessionData) {
        sessionData.tenantId = tenantId;
      }
    }
    
    if (sessionData) {
      // Update existing session
      sessionData.lastSeen = new Date();
      sessionData.totalRecognitions += updates.totalRecognitions || 0;
      sessionData.successfulRecognitions += updates.successfulRecognitions || 0;
      sessionData.totalAudioPlays += updates.totalAudioPlays || 0;
      sessionData.tenantId = tenantId;
      
      if (options.ip) {
        sessionData.ip = options.ip;
      }
      if (options.userAgent) {
        sessionData.userAgent = options.userAgent;
      }
      
      if (updates.uniquePiecesViewed && updates.uniquePiecesViewed.length > 0) {
        updates.uniquePiecesViewed.forEach(piece => {
          if (!sessionData.uniquePiecesViewed.includes(piece)) {
            sessionData.uniquePiecesViewed.push(piece);
          }
        });
      }
      
      if (updates.feedbackGiven !== undefined) {
        sessionData.feedbackGiven = updates.feedbackGiven;
      }
      
      await sessionData.save();
    } else {
      // Create new session
      const newSession = new SessionSummary({
        tenantId,
        sessionId,
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalRecognitions: updates.totalRecognitions || 0,
        successfulRecognitions: updates.successfulRecognitions || 0,
        totalAudioPlays: updates.totalAudioPlays || 0,
        uniquePiecesViewed: updates.uniquePiecesViewed || [],
        feedbackGiven: updates.feedbackGiven || false,
        ip: options.ip || updates.ip,
        userAgent: options.userAgent || updates.userAgent
      });
      
      await newSession.save();
    }
  } catch (error) {
    console.error('Error updating session summary:', error);
  }
}

/**
 * Get general statistics summary
 */
async function getStatsSummary(period = '7d', tenantId = 'all') {
  try {
    const dateFilter = getDateFilter(period);
    const tenantFilter = buildTenantCriteria(tenantId);
    const recognitionMatch = { ...dateFilter, ...tenantFilter };
    const audioMatch = { ...dateFilter, ...tenantFilter };
    const feedbackMatch = { ...dateFilter, ...tenantFilter };
    const sessionFilter = { ...tenantFilter };
    if (dateFilter.timestamp) {
      sessionFilter.lastSeen = dateFilter.timestamp;
    }
    
    const [
      totalRecognitions,
      successfulRecognitions,
      totalAudioPlays,
      totalSessions,
      totalFeedback,
      avgRating
    ] = await Promise.all([
      RecognitionEvent.countDocuments(recognitionMatch),
      RecognitionEvent.countDocuments({ ...recognitionMatch, success: true }),
      AudioEvent.countDocuments(audioMatch),
      SessionSummary.countDocuments(sessionFilter),
      UserFeedback.countDocuments(feedbackMatch),
      UserFeedback.aggregate([
        { $match: feedbackMatch },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    const successRate = totalRecognitions > 0 ? (successfulRecognitions / totalRecognitions) * 100 : 0;
    const averageRating = avgRating.length > 0 ? avgRating[0].avgRating : 0;

    return {
      period,
      tenant: tenantId,
      totalRecognitions,
      successfulRecognitions,
      successRate: Math.round(successRate * 100) / 100,
      totalAudioPlays,
      totalSessions,
      totalFeedback,
      averageRating: Math.round(averageRating * 100) / 100
    };
  } catch (error) {
    console.error('Error getting stats summary:', error);
    throw error;
  }
}

/**
 * Get recognition statistics
 */
async function getRecognitionStats(period = '7d', tenantId = 'all') {
  try {
    const dateFilter = getDateFilter(period);
    const tenantFilter = buildTenantCriteria(tenantId);
    const matchFilter = { ...dateFilter, ...tenantFilter };
    const successMatch = { ...matchFilter, success: true };
    const namedSuccessMatch = { 
      ...successMatch, 
      pieceName: { $exists: true, $ne: null } 
    };
    
    const [
      totalRecognitions,
      successRate,
      avgConfidence,
      topPieces,
      fallbackUsage
    ] = await Promise.all([
      RecognitionEvent.countDocuments(matchFilter),
      RecognitionEvent.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, successRate: { $avg: { $cond: ['$success', 1, 0] } } } }
      ]),
      RecognitionEvent.aggregate([
        { $match: successMatch },
        { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
      ]),
      RecognitionEvent.aggregate([
        { $match: namedSuccessMatch },
        { $group: { _id: '$pieceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      RecognitionEvent.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$fallbackUsed', count: { $sum: 1 } } }
      ])
    ]);

    return {
      period,
      tenant: tenantId,
      totalRecognitions,
      successRate: successRate.length > 0 ? Math.round(successRate[0].successRate * 10000) / 100 : 0,
      averageConfidence: avgConfidence.length > 0 ? Math.round(avgConfidence[0].avgConfidence * 1000) / 1000 : 0,
      topPieces,
      fallbackUsage
    };
  } catch (error) {
    console.error('Error getting recognition stats:', error);
    throw error;
  }
}

/**
 * Get audio statistics
 */
async function getAudioStats(period = '7d', tenantId = 'all') {
  try {
    const dateFilter = getDateFilter(period);
    const tenantFilter = buildTenantCriteria(tenantId);
    const matchFilter = { ...dateFilter, ...tenantFilter };
    
    const [
      totalAudioPlays,
      modeDistribution,
      topPieces
    ] = await Promise.all([
      AudioEvent.countDocuments(matchFilter),
      AudioEvent.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$audioMode', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AudioEvent.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$pieceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      period,
      tenant: tenantId,
      totalAudioPlays,
      modeDistribution,
      topPieces
    };
  } catch (error) {
    console.error('Error getting audio stats:', error);
    throw error;
  }
}

/**
 * Get popular pieces ranking
 */
async function getPopularPieces(period = '7d', limit = 20, tenantId = 'all') {
  try {
    const dateFilter = getDateFilter(period);
    const tenantFilter = buildTenantCriteria(tenantId);
    const matchFilter = { 
      ...dateFilter, 
      ...tenantFilter, 
      success: true, 
      pieceName: { $exists: true, $ne: null } 
    };
    
    const popularPieces = await RecognitionEvent.aggregate([
      { $match: matchFilter },
      { $group: { 
        _id: '$pieceName', 
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' }
      }},
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    return {
      period,
      tenant: tenantId,
      popularPieces
    };
  } catch (error) {
    console.error('Error getting popular pieces:', error);
    throw error;
  }
}

/**
 * Get timeline data for charts
 */
async function getTimeline(period = '7d', granularity = 'day', tenantId = 'all') {
  try {
    const dateFilter = getDateFilter(period);
    const tenantFilter = buildTenantCriteria(tenantId);
    const matchFilter = { ...dateFilter, ...tenantFilter };
    const groupFormat = getGroupFormat(granularity);
    
    const timeline = await RecognitionEvent.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$timestamp' } }
          },
          totalRecognitions: { $sum: 1 },
          successfulRecognitions: { $sum: { $cond: ['$success', 1, 0] } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    return {
      period,
      tenant: tenantId,
      granularity,
      timeline
    };
  } catch (error) {
    console.error('Error getting timeline:', error);
    throw error;
  }
}

/**
 * Get feedback list with filters
 */
async function getFeedbackList(filters = {}) {
  try {
    const tenantFilter = buildTenantCriteria(filters.tenantId);
    const query = { ...tenantFilter };
    
    if (filters.minRating) {
      query.rating = { $gte: parseInt(filters.minRating) };
    }
    
    if (filters.since) {
      query.timestamp = { $gte: new Date(filters.since) };
    }
    
    if (filters.resolved !== undefined) {
      query.resolved = filters.resolved === 'true';
    }

    const feedbacks = await UserFeedback.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 50);

    const stats = await UserFeedback.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    return {
      feedbacks,
      stats: stats.length > 0 ? stats[0] : { total: 0, avgRating: 0, ratingDistribution: [] }
    };
  } catch (error) {
    console.error('Error getting feedback list:', error);
    throw error;
  }
}

/**
 * Get complete dashboard data
 */
async function getDashboardData(period = '7d', tenantId = 'all') {
  try {
    const [
      summary,
      recognitionStats,
      audioStats,
      popularPieces,
      timeline,
      recentFeedback
    ] = await Promise.all([
      getStatsSummary(period, tenantId),
      getRecognitionStats(period, tenantId),
      getAudioStats(period, tenantId),
      getPopularPieces(period, 10, tenantId),
      getTimeline(period, 'day', tenantId),
      getFeedbackList({ limit: 10, tenantId })
    ]);

    return {
      summary,
      recognitionStats,
      audioStats,
      popularPieces,
      timeline,
      recentFeedback
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
}

/**
 * Helper function to get date filter based on period
 */
function getDateFilter(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { timestamp: { $gte: startDate } };
}

/**
 * Helper function to build tenant filter
 */
function buildTenantCriteria(tenantId) {
  if (!tenantId || tenantId === 'all' || tenantId === '*' || tenantId === 'any') {
    return {};
  }

  if (tenantId === 'unassigned') {
    return {
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' }
      ]
    };
  }

  return { tenantId };
}

/**
 * Helper function to get MongoDB date group format
 */
function getGroupFormat(granularity) {
  switch (granularity) {
    case 'hour':
      return '%Y-%m-%d %H:00';
    case 'day':
      return '%Y-%m-%d';
    case 'week':
      return '%Y-%U';
    case 'month':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
}

module.exports = {
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
};
