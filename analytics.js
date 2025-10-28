/**
 * Comprehensive Analytics System for Cursor Careers Website
 * Copyright Anysphere Inc.
 * 
 * Features:
 * - Page view tracking
 * - User interaction tracking
 * - API call monitoring
 * - Error tracking
 * - Performance monitoring
 * - A/B testing support
 * - GDPR compliant
 */

class CursorAnalytics {
  constructor(config = {}) {
    this.config = {
      debug: config.debug || false,
      apiEndpoint: config.apiEndpoint || '/api/analytics',
      batchSize: config.batchSize || 10,
      flushInterval: config.flushInterval || 30000, // 30 seconds
      enablePerformanceTracking: config.enablePerformanceTracking !== false,
      enableErrorTracking: config.enableErrorTracking !== false,
      enableUserTracking: config.enableUserTracking !== false,
      gdprCompliant: config.gdprCompliant !== false,
      ...config
    };

    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.pageStartTime = Date.now();
    this.isInitialized = false;
    
    // Performance tracking
    this.performanceObserver = null;
    this.apiCallTimes = new Map();
    
    // User consent (GDPR)
    this.hasConsent = this.checkUserConsent();
    
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.log('Initializing Cursor Analytics...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up performance monitoring
    if (this.config.enablePerformanceTracking) {
      this.setupPerformanceTracking();
    }
    
    // Set up error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }
    
    // Track initial page view
    this.trackPageView();
    
    // Set up periodic flushing
    this.setupPeriodicFlush();
    
    // Set up beforeunload handler
    this.setupUnloadHandler();
    
    this.isInitialized = true;
    this.log('Analytics initialized successfully');
  }

  // Event Tracking Methods
  trackEvent(eventName, properties = {}) {
    if (!this.hasConsent && this.config.gdprCompliant) {
      this.log('Event tracking skipped - no user consent');
      return;
    }

    const event = {
      id: this.generateEventId(),
      name: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    this.events.push(event);
    this.log('Event tracked:', event);

    // Flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }

    return event.id;
  }

  trackPageView(page = null) {
    const pageData = {
      page: page || window.location.pathname,
      title: document.title,
      loadTime: Date.now() - this.pageStartTime,
      previousPage: this.previousPage || null
    };

    this.previousPage = pageData.page;
    this.pageStartTime = Date.now();
    
    return this.trackEvent('page_view', pageData);
  }

  trackJobClick(jobId, jobTitle, position = null) {
    return this.trackEvent('job_click', {
      jobId,
      jobTitle,
      position,
      category: this.getJobCategory(jobId)
    });
  }

  trackApplicationStart(jobId, source = 'unknown') {
    return this.trackEvent('application_start', {
      jobId,
      source,
      timestamp: Date.now()
    });
  }

  trackApplicationSubmit(jobId, formData = {}) {
    const sanitizedData = {
      jobId,
      hasName: !!formData.name,
      hasEmail: !!formData.email,
      hasResume: !!formData.resume,
      hasLinkedIn: !!formData.linkedin,
      hasGitHub: !!formData.github,
      hasProjectNote: !!formData.projectNote,
      projectNoteLength: formData.projectNote ? formData.projectNote.length : 0
    };

    return this.trackEvent('application_submit', sanitizedData);
  }

  trackFormInteraction(fieldName, action, value = null) {
    const sanitizedValue = this.sanitizeFormValue(fieldName, value);
    
    return this.trackEvent('form_interaction', {
      field: fieldName,
      action, // focus, blur, change, etc.
      valueLength: sanitizedValue ? sanitizedValue.length : 0,
      hasValue: !!sanitizedValue
    });
  }

  trackAPICall(endpoint, method, duration, success, statusCode = null) {
    return this.trackEvent('api_call', {
      endpoint,
      method,
      duration,
      success,
      statusCode,
      timestamp: Date.now()
    });
  }

  trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    return this.trackEvent('error', errorData);
  }

  trackPerformance(metric, value, context = {}) {
    return this.trackEvent('performance', {
      metric,
      value,
      context,
      timestamp: Date.now()
    });
  }

  // A/B Testing Support
  trackExperiment(experimentName, variant, context = {}) {
    return this.trackEvent('experiment', {
      experimentName,
      variant,
      context,
      timestamp: Date.now()
    });
  }

  // User Identification
  identify(userId, properties = {}) {
    this.userId = userId;
    
    return this.trackEvent('identify', {
      userId,
      properties: this.sanitizeUserProperties(properties)
    });
  }

  // Setup Methods
  setupEventListeners() {
    // Track clicks on job links
    document.addEventListener('click', (e) => {
      if (e.target.matches('.job-link[data-job-id]')) {
        const jobId = e.target.getAttribute('data-job-id');
        const jobTitle = e.target.textContent.trim();
        this.trackJobClick(jobId, jobTitle);
      }
      
      // Track button clicks
      if (e.target.tagName === 'BUTTON') {
        this.trackEvent('button_click', {
          buttonText: e.target.textContent.trim(),
          buttonId: e.target.id || null,
          buttonClass: e.target.className || null
        });
      }
      
      // Track external links
      if (e.target.tagName === 'A' && e.target.href && !e.target.href.includes(window.location.hostname)) {
        this.trackEvent('external_link_click', {
          url: e.target.href,
          text: e.target.textContent.trim()
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'application-form') {
        const formData = new FormData(e.target);
        const jobId = formData.get('jobPostingId') || 'unknown';
        this.trackApplicationSubmit(jobId, Object.fromEntries(formData));
      }
    });

    // Track form field interactions
    document.addEventListener('focus', (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.trackFormInteraction(e.target.name || e.target.id, 'focus');
      }
    }, true);

    document.addEventListener('blur', (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.trackFormInteraction(e.target.name || e.target.id, 'blur', e.target.value);
      }
    }, true);

    // Track scroll depth
    let maxScroll = 0;
    document.addEventListener('scroll', this.throttle(() => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackEvent('scroll_depth', { percent: maxScroll });
        }
      }
    }, 1000));

    // Track time on page
    let timeOnPage = 0;
    setInterval(() => {
      timeOnPage += 10;
      if (timeOnPage % 30 === 0) { // Every 30 seconds
        this.trackEvent('time_on_page', { seconds: timeOnPage });
      }
    }, 10000);
  }

  setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.trackPerformance('page_load', navigation.loadEventEnd - navigation.fetchStart, {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint()
          });
        }
      }, 0);
    });

    // Track Core Web Vitals
    this.trackCoreWebVitals();
  }

  setupErrorTracking() {
    window.addEventListener('error', (e) => {
      this.trackError(e.error || new Error(e.message), {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.trackError(new Error(e.reason), {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  setupPeriodicFlush() {
    setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.events.length > 0) {
        this.flush(true); // Synchronous flush
      }
    });

    // Track session end
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        sessionDuration: Date.now() - this.startTime,
        pageViews: this.events.filter(e => e.name === 'page_view').length,
        totalEvents: this.events.length
      });
    });
  }

  // Data Transmission
  async flush(sync = false) {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    const payload = {
      events: eventsToSend,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    try {
      if (sync) {
        // Use sendBeacon for synchronous sending on page unload
        const data = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(this.config.apiEndpoint, data);
        }
      } else {
        // Use fetch for asynchronous sending
        await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
      
      this.log('Events flushed successfully:', eventsToSend.length);
    } catch (error) {
      this.log('Failed to flush events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  // Utility Methods
  generateSessionId() {
    const stored = sessionStorage.getItem('cursor_analytics_session');
    if (stored) return stored;
    
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('cursor_analytics_session', sessionId);
    return sessionId;
  }

  generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getUserId() {
    const stored = localStorage.getItem('cursor_analytics_user');
    if (stored) return stored;
    
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cursor_analytics_user', userId);
    return userId;
  }

  checkUserConsent() {
    // Check for consent cookie/localStorage
    const consent = localStorage.getItem('cursor_analytics_consent');
    return consent === 'true' || !this.config.gdprCompliant;
  }

  setUserConsent(hasConsent) {
    this.hasConsent = hasConsent;
    localStorage.setItem('cursor_analytics_consent', hasConsent.toString());
    
    if (hasConsent) {
      this.log('User consent granted, analytics enabled');
    } else {
      this.log('User consent denied, analytics disabled');
      this.events = []; // Clear any queued events
    }
  }

  getJobCategory(jobId) {
    const jobCategories = {
      '36e69353-0452-4bf6-9f35-b1e7307959a7': 'engineering',
      '0aa0650b-f93c-416e-9e2f-4fdf1556fd14': 'engineering',
      '3551cdaa-cf08-4c04-adbe-a968185bc769': 'engineering',
      '54a9cfcd-570a-4e9c-b52c-bd2336c60991': 'engineering',
      '6f92f594-f76c-47eb-8c45-09c6b140b512': 'engineering',
      '61e4677d-cf3d-458a-bf6c-02287d5d2c39': 'sales',
      '635af96e-4fd6-458f-839c-06b9dde86559': 'sales'
    };
    return jobCategories[jobId] || 'unknown';
  }

  sanitizeFormValue(fieldName, value) {
    // Don't track sensitive values
    const sensitiveFields = ['password', 'ssn', 'credit', 'card'];
    if (sensitiveFields.some(field => fieldName.toLowerCase().includes(field))) {
      return null;
    }
    
    // For email, just track domain
    if (fieldName.toLowerCase().includes('email') && value) {
      const domain = value.split('@')[1];
      return domain ? `*@${domain}` : null;
    }
    
    return value;
  }

  sanitizeUserProperties(properties) {
    const sanitized = {};
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && value.includes('@')) {
        // Email field
        const domain = value.split('@')[1];
        sanitized[key] = domain ? `*@${domain}` : null;
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : null;
  }

  trackCoreWebVitals() {
    // This would integrate with web-vitals library in a real implementation
    // For now, we'll track basic performance metrics
    
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackPerformance('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.trackPerformance('fid', entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    }
  }

  log(...args) {
    if (this.config.debug) {
      console.log('[Cursor Analytics]', ...args);
    }
  }

  // Public API for manual tracking
  track(eventName, properties) {
    return this.trackEvent(eventName, properties);
  }

  page(page) {
    return this.trackPageView(page);
  }

  // Get analytics data for debugging
  getAnalyticsData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      events: this.events,
      config: this.config,
      hasConsent: this.hasConsent
    };
  }
}

// Auto-initialize analytics if in browser environment
if (typeof window !== 'undefined') {
  window.CursorAnalytics = CursorAnalytics;
  
  // Initialize with default config
  window.analytics = new CursorAnalytics({
    debug: window.location.hostname === 'localhost',
    gdprCompliant: true
  });
  
  // Expose global tracking functions for convenience
  window.track = (eventName, properties) => window.analytics.track(eventName, properties);
  window.page = (page) => window.analytics.page(page);
  window.identify = (userId, properties) => window.analytics.identify(userId, properties);
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CursorAnalytics;
}