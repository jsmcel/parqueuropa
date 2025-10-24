/**
 * Analytics Models
 * MongoDB schemas for tracking API events, recognitions, audio plays, and user feedback
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================
// API Event Schema - General API tracking
// ============================================
const ApiEventSchema = new Schema({
  endpoint: { type: String, required: true, index: true },
  method: { type: String, required: true }, // GET, POST, etc.
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // milliseconds
  ip: { type: String },
  userAgent: { type: String },
  sessionId: { type: String, index: true }, // Hash of IP + UserAgent for session tracking
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'api_events',
  timestamps: true
});

// Indexes for common queries
ApiEventSchema.index({ timestamp: -1 });
ApiEventSchema.index({ endpoint: 1, timestamp: -1 });

// ============================================
// Recognition Event Schema - Image recognition tracking
// ============================================
const RecognitionEventSchema = new Schema({
  pieceName: { type: String, index: true }, // Recognized piece name
  confidence: { type: Number }, // Confidence score (0-1)
  success: { type: Boolean, required: true, index: true }, // Was recognition successful?
  lowConfidence: { type: Boolean, default: false }, // Was it a low confidence result?
  notATrain: { type: Boolean, default: false }, // Was it classified as "otros"?
  suggestions: [{ 
    pieceName: String, 
    confidence: Number 
  }], // Alternative suggestions if low confidence
  fallbackUsed: { type: String, enum: ['none', 'secondary_model', 'suggestions'] }, // Which fallback was used
  responseTime: { type: Number }, // milliseconds
  sessionId: { type: String, index: true },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'recognition_events',
  timestamps: true
});

// Indexes for analytics queries
RecognitionEventSchema.index({ pieceName: 1, timestamp: -1 });
RecognitionEventSchema.index({ success: 1, timestamp: -1 });
RecognitionEventSchema.index({ timestamp: -1 });

// ============================================
// Audio Event Schema - Audio playback tracking
// ============================================
const AudioEventSchema = new Schema({
  pieceId: { type: String, required: true, index: true }, // Piece identifier
  audioMode: { 
    type: String, 
    required: true,
    enum: ['normal', 'infantil', 'experto', 'cachondo'],
    index: true
  },
  success: { type: Boolean, required: true }, // Was audio found and served?
  sessionId: { type: String, index: true },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'audio_events',
  timestamps: true
});

// Indexes for analytics queries
AudioEventSchema.index({ pieceId: 1, audioMode: 1, timestamp: -1 });
AudioEventSchema.index({ audioMode: 1, timestamp: -1 });
AudioEventSchema.index({ timestamp: -1 });

// ============================================
// User Feedback Schema - Ratings and comments from users
// ============================================
const UserFeedbackSchema = new Schema({
  rating: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 5,
    index: true
  }, // 0 for support messages, 1-5 stars
  comment: { type: String, default: '' }, // Optional user comment
  appVersion: { type: String }, // App version that sent the feedback
  deviceInfo: {
    platform: String, // iOS, Android, Web
    osVersion: String,
    model: String
  },
  sessionId: { type: String, index: true },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  // Optional fields for context
  wasHelpful: { type: Boolean }, // Did they find the app helpful?
  resolved: { type: Boolean, default: false } // For developer: mark as reviewed/resolved
}, {
  collection: 'user_feedback',
  timestamps: true
});

// Indexes for feedback queries
UserFeedbackSchema.index({ rating: 1, timestamp: -1 });
UserFeedbackSchema.index({ timestamp: -1 });
UserFeedbackSchema.index({ resolved: 1, timestamp: -1 });

// ============================================
// Session Summary Schema - Aggregated session data
// ============================================
const SessionSummarySchema = new Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  firstSeen: { type: Date, required: true },
  lastSeen: { type: Date, required: true },
  totalRecognitions: { type: Number, default: 0 },
  successfulRecognitions: { type: Number, default: 0 },
  totalAudioPlays: { type: Number, default: 0 },
  uniquePiecesViewed: [String], // Array of piece names
  feedbackGiven: { type: Boolean, default: false },
  ip: { type: String },
  userAgent: { type: String }
}, {
  collection: 'session_summaries',
  timestamps: true
});

SessionSummarySchema.index({ firstSeen: -1 });
SessionSummarySchema.index({ lastSeen: -1 });

// ============================================
// Export Models
// ============================================
const ApiEvent = mongoose.model('ApiEvent', ApiEventSchema);
const RecognitionEvent = mongoose.model('RecognitionEvent', RecognitionEventSchema);
const AudioEvent = mongoose.model('AudioEvent', AudioEventSchema);
const UserFeedback = mongoose.model('UserFeedback', UserFeedbackSchema);
const SessionSummary = mongoose.model('SessionSummary', SessionSummarySchema);

module.exports = {
  ApiEvent,
  RecognitionEvent,
  AudioEvent,
  UserFeedback,
  SessionSummary
};

