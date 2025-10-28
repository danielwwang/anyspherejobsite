/**
 * Analytics API Endpoint for Cursor Careers
 * Copyright Anysphere Inc.
 * 
 * Handles analytics data collection, processing, and storage
 */

const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'http://localhost:3000',
  'http://localhost:8000'
];

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

// In-memory storage for demo (use database in production)
const analyticsData = {
  events: [],
  sessions: new Map(),
  users: new Map(),
  metrics: {
    totalEvents: 0,
    totalSessions: 0,
    totalUsers: 0,
    totalPageViews: 0,
    totalErrors: 0
  }
};

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (process.env.NODE_ENV === 'development' || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function validateAnalyticsPayload(payload) {
  const errors = [];
  
  if (!payload || typeof payload !== 'object') {
    errors.push('Invalid payload format');
    return errors;
  }
  
  if (!Array.isArray(payload.events)) {
    errors.push('Events must be an array');
  } else if (payload.events.length > MAX_EVENTS_PER_REQUEST) {
    errors.push(`Too many events (max ${MAX_EVENTS_PER_REQUEST})`);
  }
  
  if (!payload.sessionId || typeof payload.sessionId !== 'string') {
    errors.push('Invalid session ID');
  }
  
  if (!payload.timestamp || typeof payload.timestamp !== 'number') {
    errors.push('Invalid timestamp');
  }
  
  // Validate individual events
  payload.events?.forEach((event, index) => {
    if (!event.id || typeof event.id !== 'string') {
      errors.push(`Event ${index}: Missing or invalid ID`);
    }
    
    if (!event.name || typeof event.name !== 'string') {
      errors.push(`Event ${index}: Missing or invalid name`);
    }
    
    if (!event.properties || typeof event.properties !== 'object') {
      errors.push(`Event ${index}: Missing or invalid properties`);
    }
  });
  
  return errors;
}

function sanitizeEvent(event) {
  // Remove or hash any potentially sensitive data
  const sanitized = {
    id: event.id,
    name: event.name,
    properties: {
      ...event.properties
    }
  };
  
  // Remove sensitive properties
  const sensitiveKeys = ['password', 'token', 'key', 'secret'];
  sensitiveKeys.forEach(key => {
    delete sanitized.properties[key];
  });
  
  // Hash IP addresses and user agents for privacy
  if (sanitized.properties.userAgent) {
    sanitized.properties.userAgent = hashString(sanitized.properties.userAgent);
  }
  
  return sanitized;
}

function hashString(str) {
  // Simple hash function for demo (use crypto.createHash in production)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

function processAnalyticsData(payload) {
  const { events, sessionId, userId, timestamp } = payload;
  
  // Update session data
  if (!analyticsData.sessions.has(sessionId)) {
    analyticsData.sessions.set(sessionId, {
      id: sessionId,
      userId: userId || null,
      startTime: timestamp,
      lastActivity: timestamp,
      events: [],
      pageViews: 0,
      errors: 0
    });
    analyticsData.metrics.totalSessions++;
  }
  
  const session = analyticsData.sessions.get(sessionId);
  session.lastActivity = timestamp;
  
  // Update user data
  if (userId && !analyticsData.users.has(userId)) {
    analyticsData.users.set(userId, {
      id: userId,
      firstSeen: timestamp,
      lastSeen: timestamp,
      sessions: new Set([sessionId]),
      totalEvents: 0
    });
    analyticsData.metrics.totalUsers++;
  }
  
  if (userId) {
    const user = analyticsData.users.get(userId);
    user.lastSeen = timestamp;
    user.sessions.add(sessionId);
  }
  
  // Process individual events
  events.forEach(event => {
    const sanitizedEvent = sanitizeEvent(event);
    
    // Add metadata
    sanitizedEvent.sessionId = sessionId;
    sanitizedEvent.userId = userId || null;
    sanitizedEvent.receivedAt = Date.now();
    
    // Store event
    analyticsData.events.push(sanitizedEvent);
    session.events.push(sanitizedEvent.id);
    
    // Update metrics
    analyticsData.metrics.totalEvents++;
    
    if (event.name === 'page_view') {
      session.pageViews++;
      analyticsData.metrics.totalPageViews++;
    }
    
    if (event.name === 'error') {
      session.errors++;
      analyticsData.metrics.totalErrors++;
    }
    
    if (userId) {
      const user = analyticsData.users.get(userId);
      user.totalEvents++;
    }
    
    // Log important events
    if (['application_submit', 'error', 'job_click'].includes(event.name)) {
      console.log(`📊 Analytics: ${event.name}`, {
        sessionId,
        userId,
        properties: sanitizedEvent.properties
      });
    }
  });
  
  // Clean up old data (keep last 10000 events)
  if (analyticsData.events.length > 10000) {
    analyticsData.events = analyticsData.events.slice(-10000);
  }
}

function generateAnalyticsReport(timeRange = '24h') {
  const now = Date.now();
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const rangeMs = ranges[timeRange] || ranges['24h'];
  const cutoff = now - rangeMs;
  
  // Filter events by time range
  const recentEvents = analyticsData.events.filter(
    event => event.properties.timestamp >= cutoff
  );
  
  // Calculate metrics
  const eventsByType = {};
  const pageViews = {};
  const errors = [];
  const jobClicks = {};
  const applications = [];
  
  recentEvents.forEach(event => {
    // Count events by type
    eventsByType[event.name] = (eventsByType[event.name] || 0) + 1;
    
    // Track page views
    if (event.name === 'page_view') {
      const page = event.properties.page || 'unknown';
      pageViews[page] = (pageViews[page] || 0) + 1;
    }
    
    // Track errors
    if (event.name === 'error') {
      errors.push({
        message: event.properties.message,
        timestamp: event.properties.timestamp,
        url: event.properties.url
      });
    }
    
    // Track job clicks
    if (event.name === 'job_click') {
      const jobId = event.properties.jobId;
      jobClicks[jobId] = (jobClicks[jobId] || 0) + 1;
    }
    
    // Track applications
    if (event.name === 'application_submit') {
      applications.push({
        jobId: event.properties.jobId,
        timestamp: event.properties.timestamp,
        sessionId: event.sessionId
      });
    }
  });
  
  // Calculate conversion rates
  const totalJobClicks = Object.values(jobClicks).reduce((sum, count) => sum + count, 0);
  const totalApplications = applications.length;
  const conversionRate = totalJobClicks > 0 ? (totalApplications / totalJobClicks) * 100 : 0;
  
  return {
    timeRange,
    period: {
      start: cutoff,
      end: now,
      duration: rangeMs
    },
    overview: {
      totalEvents: recentEvents.length,
      uniqueSessions: new Set(recentEvents.map(e => e.sessionId)).size,
      uniqueUsers: new Set(recentEvents.filter(e => e.userId).map(e => e.userId)).size,
      pageViews: eventsByType.page_view || 0,
      errors: eventsByType.error || 0
    },
    engagement: {
      jobClicks: totalJobClicks,
      applications: totalApplications,
      conversionRate: Math.round(conversionRate * 100) / 100
    },
    topPages: Object.entries(pageViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10),
    topJobs: Object.entries(jobClicks)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10),
    eventBreakdown: eventsByType,
    recentErrors: errors.slice(-10),
    recentApplications: applications.slice(-10)
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests for analytics dashboard
  if (req.method === 'GET') {
    try {
      const timeRange = req.query.range || '24h';
      const report = generateAnalyticsReport(timeRange);
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating analytics report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
    return;
  }

  // Handle POST requests for data collection
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST', 'GET', 'OPTIONS']
    });
  }

  try {
    // Check request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > MAX_REQUEST_SIZE) {
      return res.status(413).json({
        success: false,
        error: 'Request too large'
      });
    }

    const payload = req.body;
    
    // Validate payload
    const validationErrors = validateAnalyticsPayload(payload);
    if (validationErrors.length > 0) {
      console.error('Analytics validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Process the analytics data
    processAnalyticsData(payload);
    
    // Log successful data collection
    console.log('📊 Analytics data received:', {
      sessionId: payload.sessionId,
      eventCount: payload.events.length,
      timestamp: new Date(payload.timestamp).toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Analytics data received',
      eventsProcessed: payload.events.length
    });

  } catch (error) {
    console.error('Analytics API error:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Export analytics data for testing
export function getAnalyticsData() {
  return analyticsData;
}

export function clearAnalyticsData() {
  analyticsData.events = [];
  analyticsData.sessions.clear();
  analyticsData.users.clear();
  analyticsData.metrics = {
    totalEvents: 0,
    totalSessions: 0,
    totalUsers: 0,
    totalPageViews: 0,
    totalErrors: 0
  };
}