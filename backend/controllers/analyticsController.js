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
    const recognitionEvent = new RecognitionEvent({
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
    await updateSessionSummary(data.sessionId, {
      totalRecognitions: 1,
      successfulRecognitions: data.success ? 1 : 0,
      uniquePiecesViewed: data.pieceName ? [data.pieceName] : []
    });

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
    const audioEvent = new AudioEvent({
      pieceId: data.pieceId,
      audioMode: data.audioMode,
      success: data.success,
      sessionId: data.sessionId,
      ip: data.ip,
      timestamp: new Date()
    });

    await audioEvent.save();
    
    // Update session summary
    await updateSessionSummary(data.sessionId, {
      totalAudioPlays: 1
    });

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
    const feedback = new UserFeedback({
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
    await updateSessionSummary(data.sessionId, {
      feedbackGiven: true
    });

    return feedback;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
}

/**
 * Update session summary (upsert)
 */
async function updateSessionSummary(sessionId, updates) {
  try {
    const sessionData = await SessionSummary.findOne({ sessionId });
    
    if (sessionData) {
      // Update existing session
      sessionData.lastSeen = new Date();
      sessionData.totalRecognitions += updates.totalRecognitions || 0;
      sessionData.successfulRecognitions += updates.successfulRecognitions || 0;
      sessionData.totalAudioPlays += updates.totalAudioPlays || 0;
      
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
        sessionId,
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalRecognitions: updates.totalRecognitions || 0,
        successfulRecognitions: updates.successfulRecognitions || 0,
        totalAudioPlays: updates.totalAudioPlays || 0,
        uniquePiecesViewed: updates.uniquePiecesViewed || [],
        feedbackGiven: updates.feedbackGiven || false,
        ip: updates.ip,
        userAgent: updates.userAgent
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
async function getStatsSummary(period = '7d') {
  try {
    const dateFilter = getDateFilter(period);
    
    const [
      totalRecognitions,
      successfulRecognitions,
      totalAudioPlays,
      totalSessions,
      totalFeedback,
      avgRating
    ] = await Promise.all([
      RecognitionEvent.countDocuments(dateFilter),
      RecognitionEvent.countDocuments({ ...dateFilter, success: true }),
      AudioEvent.countDocuments(dateFilter),
      SessionSummary.countDocuments(dateFilter),
      UserFeedback.countDocuments(dateFilter),
      UserFeedback.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    const successRate = totalRecognitions > 0 ? (successfulRecognitions / totalRecognitions) * 100 : 0;
    const averageRating = avgRating.length > 0 ? avgRating[0].avgRating : 0;

    return {
      period,
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
async function getRecognitionStats(period = '7d') {
  try {
    const dateFilter = getDateFilter(period);
    
    const [
      totalRecognitions,
      successRate,
      avgConfidence,
      topPieces,
      fallbackUsage
    ] = await Promise.all([
      RecognitionEvent.countDocuments(dateFilter),
      RecognitionEvent.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, successRate: { $avg: { $cond: ['$success', 1, 0] } } } }
      ]),
      RecognitionEvent.aggregate([
        { $match: { ...dateFilter, success: true } },
        { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
      ]),
      RecognitionEvent.aggregate([
        { $match: { ...dateFilter, success: true, pieceName: { $exists: true, $ne: null } } },
        { $group: { _id: '$pieceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      RecognitionEvent.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$fallbackUsed', count: { $sum: 1 } } }
      ])
    ]);

    return {
      period,
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
async function getAudioStats(period = '7d') {
  try {
    const dateFilter = getDateFilter(period);
    
    const [
      totalAudioPlays,
      modeDistribution,
      topPieces
    ] = await Promise.all([
      AudioEvent.countDocuments(dateFilter),
      AudioEvent.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$audioMode', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AudioEvent.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$pieceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      period,
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
async function getPopularPieces(period = '7d', limit = 20) {
  try {
    const dateFilter = getDateFilter(period);
    
    const popularPieces = await RecognitionEvent.aggregate([
      { $match: { ...dateFilter, success: true, pieceName: { $exists: true, $ne: null } } },
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
async function getTimeline(period = '7d', granularity = 'day') {
  try {
    const dateFilter = getDateFilter(period);
    const groupFormat = getGroupFormat(granularity);
    
    const timeline = await RecognitionEvent.aggregate([
      { $match: dateFilter },
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
    const query = {};
    
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
async function getDashboardData(period = '7d') {
  try {
    const [
      summary,
      recognitionStats,
      audioStats,
      popularPieces,
      timeline,
      recentFeedback
    ] = await Promise.all([
      getStatsSummary(period),
      getRecognitionStats(period),
      getAudioStats(period),
      getPopularPieces(period, 10),
      getTimeline(period, 'day'),
      getFeedbackList({ limit: 10 })
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
